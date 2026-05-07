import React, { useRef, useState, useEffect, KeyboardEvent } from 'react';

// Stop words we don't want to autocomplete
const STOP_WORDS = new Set([
  'y', 'o', 'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 
  'de', 'del', 'a', 'al', 'en', 'por', 'con', 'para', 'sin', 'sobre',
  'es', 'son', 'ser', 'estoy', 'esta', 'estas', 'estamos', 'estan',
  'que', 'qué', 'como', 'cómo', 'cuando', 'donde', 'quien', 'cual',
  'me', 'te', 'se', 'nos', 'le', 'les', 'lo', 'la', 'mi', 'tu', 'su',
  'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas',
  'pero', 'sino', 'porque', 'aunque', 'ademas', 'muy', 'mas', 'más'
]);

interface SmartTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const SmartTextarea: React.FC<SmartTextareaProps> = ({ value, onChange, className = '', ...props }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    
    const [prediction, setPrediction] = useState('');
    const [textBeforeCursor, setTextBeforeCursor] = useState('');
    const [textAfterCursor, setTextAfterCursor] = useState('');
    
    // Store word frequencies
    const [dictionary, setDictionary] = useState<Record<string, number>>({});

    // Load from local storage
    useEffect(() => {
        try {
            const saved = localStorage.getItem('remb_textarea_dict');
            if (saved) {
                setDictionary(JSON.parse(saved));
            }
            
            // Add some base vocabulary commonly used
            if (!saved) {
               const baseDict = {
                   'envío': 10, 'planos': 10, 'arquitecto': 5, 'ingeniero': 5, 'proyecto': 5,
                   'presupuesto': 5, 'documentos': 5, 'información': 5, 'saludos': 10,
                   'correo': 5, 'mensaje': 5, 'adjunto': 8, 'adjuntos': 5, 'favor': 5
               };
               setDictionary(baseDict);
            }
        } catch(e) {}
    }, []);

    // Save on unmount/blur
    const saveDictionary = (currentDict: Record<string, number>) => {
        try {
            // keep top 500
            const sorted = Object.entries(currentDict).sort((a,b) => b[1] - a[1]).slice(0, 500);
            const trimmed = Object.fromEntries(sorted);
            localStorage.setItem('remb_textarea_dict', JSON.stringify(trimmed));
            setDictionary(trimmed);
        } catch(e) {}
    };

    const updateDictionaryFromText = (textStr: string) => {
        const newDict = { ...dictionary };
        // Valid words length >= 4
        const words = textStr.toLowerCase().match(/[a-záéíóúñA-ZÁÉÍÓÚÑ]{4,}/g) || [];
        
        let changed = false;
        words.forEach(w => {
            if (!STOP_WORDS.has(w)) {
                newDict[w] = (newDict[w] || 0) + 1;
                changed = true;
            }
        });
        
        if (changed) {
            saveDictionary(newDict);
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
        updateDictionaryFromText(value);
        setPrediction('');
        if (props.onBlur) props.onBlur(e);
    };

    const calculatePrediction = () => {
        if (!textareaRef.current) return;
        const el = textareaRef.current;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        
        if (start !== end) {
            setPrediction('');
            return;
        }

        const before = value.substring(0, start);
        const after = value.substring(start);
        
        setTextBeforeCursor(before);
        setTextAfterCursor(after);

        // Word actively being typed directly at the cursor end
        const match = before.match(/[a-záéíóúñA-ZÁÉÍÓÚÑ]+$/);
        if (match) {
            const currentWord = match[0];
            const lowerCurrent = currentWord.toLowerCase();
            
            // Require at least 2 chars to trigger suggestion
            if (lowerCurrent.length >= 2) {
                let bestMatch = '';
                let bestCount = -1;
                
                Object.keys(dictionary).forEach(dictWord => {
                    if (dictWord.startsWith(lowerCurrent) && dictWord.length > lowerCurrent.length) {
                        if (dictionary[dictWord] > bestCount) {
                            bestMatch = dictWord;
                            bestCount = dictionary[dictWord];
                        }
                    }
                });

                if (bestMatch) {
                    const suffix = bestMatch.substring(lowerCurrent.length);
                    setPrediction(suffix);
                    
                    // Sync overlay scroll whenever prediction is shown
                    setTimeout(() => {
                        if (overlayRef.current && el) {
                            overlayRef.current.scrollTop = el.scrollTop;
                            overlayRef.current.scrollLeft = el.scrollLeft;
                        }
                    }, 0);
                    return;
                }
            }
        }
        setPrediction('');
    };

    useEffect(() => {
        calculatePrediction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        // Complete the word on Tab or RightArrow
        if (prediction && (e.key === 'Tab' || e.key === 'ArrowRight')) {
            e.preventDefault();
            
            const insertText = prediction + ' '; 
            const el = textareaRef.current;
            if (!el) return;
            const start = el.selectionStart;
            
            const newText = value.substring(0, start) + insertText + value.substring(start);
            
            const syntheticEvent = {
                target: { value: newText }
            } as React.ChangeEvent<HTMLTextAreaElement>;
            
            onChange(syntheticEvent);
            
            setTimeout(() => {
                const newPos = start + insertText.length;
                el.setSelectionRange(newPos, newPos);
            }, 0);
            
            setPrediction('');
            
            // Also eagerly store the text up to here to learn new words fast
            updateDictionaryFromText(newText);
            return;
        }
        
        if (props.onKeyDown) props.onKeyDown(e);
    };

    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        if (overlayRef.current) {
            overlayRef.current.scrollTop = e.currentTarget.scrollTop;
            overlayRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
        if (props.onScroll) props.onScroll(e);
    };

    // Strip background class from overlay to prevent occlusion, 
    // force it to transparent, and set border transparent.
    // Also strip generic utility text colors just in case.
    const overlayClass = className
        .replace(/bg-[\w-]+(\/[\d]+)?/g, '') // remove "bg-gray-700" etc
        .replace(/text-[\w-]+(\/[\d]+)?/g, '') // remove "text-white" etc
        .replace(/border-[\w-]+(\/[\d]+)?/g, ''); // remove "border-gray-500" etc
        
    return (
        <div className="relative w-full h-full">
            {/* The Textarea */}
            <textarea
                ref={textareaRef}
                value={value}
                onChange={onChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                onKeyUp={() => calculatePrediction()}
                onClick={() => calculatePrediction()}
                onScroll={handleScroll}
                className={className}
                {...props}
            />

            {/* The Ghost Prediction Overlay */}
            {prediction && (
                <div 
                    ref={overlayRef}
                    aria-hidden="true"
                    className={`absolute inset-0 pointer-events-none break-words whitespace-pre-wrap overflow-hidden ${overlayClass} !bg-transparent !text-transparent !border-transparent m-0 focus:ring-0`}
                    style={{
                        // Match inner dimensions carefully
                        margin: 0,
                    }}
                >
                    <span>{textBeforeCursor}</span>
                    <span className="text-gray-400 font-medium italic opacity-60 bg-gray-600/30 rounded inline-block select-none">{prediction}</span>
                    <span>{textAfterCursor}</span>
                </div>
            )}
        </div>
    );
};

export default SmartTextarea;
