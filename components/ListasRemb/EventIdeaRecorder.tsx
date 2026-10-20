import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, Send, Check, X, ArrowRight, Loader2, Volume2, Lightbulb, Box, Briefcase, Home, ShoppingCart, GraduationCap, Flame, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface EventIdeaRecorderProps {
  onAddIdea: (idea: { title: string; category: string; notes?: string; priority?: 'Alta' | 'Media' | 'Baja' }) => void;
  availableCategories: string[];
  autoStart?: boolean;
}

export const EventIdeaRecorder: React.FC<EventIdeaRecorderProps> = ({
  onAddIdea,
  availableCategories,
  autoStart = false
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isStructuring, setIsStructuring] = useState(false);
  
  // Synchronous ref to avoid stale closures during voice dictation
  const inputTextRef = useRef('');
  useEffect(() => {
    inputTextRef.current = inputText;
  }, [inputText]);
  
  // Structured result ready to review/save
  const [structuredIdea, setStructuredIdea] = useState<{
    title: string;
    category: string;
    notes: string;
    priority: 'Alta' | 'Media' | 'Baja';
  } | null>(null);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  // Initialize SpeechRecognition if available
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-MX';

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript + ' ';
          } else {
            interim += transcript;
          }
        }

        const fullText = (final || interim).trim();
        if (fullText) {
          setInputText(prev => {
            // Append or replace smoothly
            const base = prev.trim();
            const updated = !base ? fullText : base.endsWith(fullText) ? base : `${base} ${fullText}`;
            inputTextRef.current = updated;
            return updated;
          });
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error:', e.error);
        if (e.error !== 'no-speech') {
          toast.error(`Error de micrófono: ${e.error}`);
        }
        stopRecording();
      };

      recognition.onend = () => {
        setIsRecording(false);
        clearInterval(timerRef.current);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      clearInterval(timerRef.current);
    };
  }, []);

  // Auto-start recording if requested (e.g. triggered on mobile tap)
  useEffect(() => {
    if (autoStart && recognitionRef.current && !isRecording) {
      const t = setTimeout(() => {
        startRecording();
      }, 250);
      return () => clearTimeout(t);
    }
  }, [autoStart]);

  const startRecording = () => {
    if (!recognitionRef.current) {
      toast.error('Tu navegador no soporta dictado por voz directo. Puedes escribir tu idea en el campo.');
      return;
    }

    try {
      recognitionRef.current.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
      toast.info('Escuchando... Háblale a tu recordador de ideas.');
    } catch (err) {
      console.error('Start recording error:', err);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsRecording(false);
    clearInterval(timerRef.current);

    // Auto structure idea if we captured text
    const textToProcess = inputTextRef.current.trim();
    if (textToProcess) {
      setTimeout(() => {
        try {
          const structured = classifyAndStructure(textToProcess);
          setStructuredIdea(structured);
          toast.success('¡Idea organizada y clasificada! Revisa y confirma el guardado.');
        } catch (e) {
          console.error(e);
        }
      }, 300);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Rule-based and smart structuring engine
  const classifyAndStructure = (raw: string) => {
    const text = raw.toLowerCase();

    // 1. Detect Category
    let category = 'Trabajo';
    if (
      text.includes('imprimir') || 
      text.includes('impresion') || 
      text.includes('impresión') || 
      text.includes('3d') || 
      text.includes('stl') || 
      text.includes('gcode') || 
      text.includes('boquilla') || 
      text.includes('filamento') || 
      text.includes('pla') || 
      text.includes('petg') || 
      text.includes('resina') || 
      text.includes('bambu') || 
      text.includes('ender') || 
      text.includes('cama caliente') ||
      text.includes('extrusor')
    ) {
      category = 'Impresión 3D';
    } else if (
      text.includes('programar') || 
      text.includes('programacion') || 
      text.includes('programación') || 
      text.includes('codigo') || 
      text.includes('código') || 
      text.includes('react') || 
      text.includes('typescript') || 
      text.includes('javascript') || 
      text.includes('python') || 
      text.includes('computadora') || 
      text.includes('compu') || 
      text.includes('estudio') || 
      text.includes('estudiar') || 
      text.includes('tutorial') || 
      text.includes('curso') || 
      text.includes('github') || 
      text.includes('supabase') || 
      text.includes('terminal') || 
      text.includes('ordenar archivos') || 
      text.includes('acomodar cosas de la compu')
    ) {
      category = 'Estudios';
    } else if (
      text.includes('comprar') || 
      text.includes('compra') || 
      text.includes('conseguir') || 
      text.includes('super') || 
      text.includes('súper') || 
      text.includes('tienda') || 
      text.includes('amazon') || 
      text.includes('mercado libre') || 
      text.includes('despensa') || 
      text.includes('adquirir') || 
      text.includes('precio') || 
      text.includes('cuanto cuesta')
    ) {
      category = 'Compras';
    } else if (
      text.includes('casa') || 
      text.includes('hogar') || 
      text.includes('cocina') || 
      text.includes('reparar') || 
      text.includes('arreglar') || 
      text.includes('foco') || 
      text.includes('puerta') || 
      text.includes('chapa') || 
      text.includes('sala') || 
      text.includes('baño') || 
      text.includes('jardin') || 
      text.includes('jardín') || 
      text.includes('limpiar') || 
      text.includes('cuarto') || 
      text.includes('familia')
    ) {
      category = 'Casa';
    } else {
      category = 'Trabajo';
    }

    // 2. Detect Priority
    let priority: 'Alta' | 'Media' | 'Baja' = 'Media';
    if (text.includes('urgente') || text.includes('importante') || text.includes('ya') || text.includes('asap') || text.includes('hoy mismo')) {
      priority = 'Alta';
    } else if (text.includes('después') || text.includes('despues') || text.includes('con calma') || text.includes('luego') || text.includes('cuando pueda')) {
      priority = 'Baja';
    }

    // 3. Generate concise Title and organized Notes
    let cleanText = raw.trim();
    // Remove common prefixes
    cleanText = cleanText.replace(/^(recuérdame|recordarme|ocupo|tengo que|hay que|anota que|apunta que|quiero|idea de|sugerencia de)\s+/i, '');

    // Title: First short sentence or up to 8 words capitalized
    const sentences = cleanText.split(/[.?!;\n]+/);
    let titleCandidate = sentences[0]?.trim() || cleanText;
    const words = titleCandidate.split(/\s+/);
    if (words.length > 8) {
      titleCandidate = words.slice(0, 8).join(' ') + '...';
    }
    // Capitalize first letter
    const title = titleCandidate.charAt(0).toUpperCase() + titleCandidate.slice(1);

    // Notes: structured points
    let notes = cleanText;
    if (sentences.length > 1) {
      notes = sentences.filter(s => s.trim().length > 0).map(s => `• ${s.trim()}`).join('\n');
    }

    return {
      title,
      category,
      notes,
      priority
    };
  };

  const handleStructureIdea = async () => {
    if (!inputText.trim()) {
      toast.error('Habla o escribe una idea primero.');
      return;
    }

    if (isRecording) {
      stopRecording();
    }

    setIsStructuring(true);
    try {
      // Fast intelligent structuring
      const structured = classifyAndStructure(inputText);
      setStructuredIdea(structured);
      toast.success('¡Idea organizada y clasificada! Revisa y confirma el guardado.');
    } catch (e) {
      console.error(e);
      toast.error('Error al estructurar idea.');
    } finally {
      setIsStructuring(false);
    }
  };

  const handleConfirmSave = () => {
    if (!structuredIdea || !structuredIdea.title.trim()) return;

    onAddIdea({
      title: structuredIdea.title.trim(),
      category: structuredIdea.category,
      notes: structuredIdea.notes.trim() || undefined,
      priority: structuredIdea.priority
    });

    toast.success(`Guardado en "${structuredIdea.category}": ${structuredIdea.title}`);
    // Reset form
    setStructuredIdea(null);
    setInputText('');
  };

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case 'Impresión 3D': return 'bg-cyan-600 text-white border-cyan-400';
      case 'Estudios': return 'bg-pink-600 text-white border-pink-400';
      case 'Compras': return 'bg-amber-600 text-white border-amber-400';
      case 'Casa': return 'bg-emerald-600 text-white border-emerald-400';
      case 'Trabajo': return 'bg-blue-600 text-white border-blue-400';
      default: return 'bg-purple-600 text-white border-purple-400';
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Impresión 3D': return <Box size={14} />;
      case 'Estudios': return <GraduationCap size={14} />;
      case 'Compras': return <ShoppingCart size={14} />;
      case 'Casa': return <Home size={14} />;
      case 'Trabajo': return <Briefcase size={14} />;
      default: return <Lightbulb size={14} />;
    }
  };

  return (
    <div className="w-full bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md relative overflow-hidden mb-6">
      {/* Background glowing ambient light */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-purple-500/30">
            <Sparkles size={18} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
              Recordador de Sucesos & Ideas con IA
              <span className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-400/30">
                Voz & Texto
              </span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-300">
              Háblale o escribe tu idea: se le asigna título, se ordena y se acomoda en la lista adecuada guardándose en Supabase.
            </p>
          </div>
        </div>

        {/* Recording Status indicator */}
        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-1 bg-rose-500/20 border border-rose-500/50 rounded-full text-rose-300 text-xs font-mono font-bold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Grabando ({recordingSeconds}s)</span>
          </div>
        )}
      </div>

      {/* Input / Dictation Area */}
      <div className="relative z-10 space-y-3">
        <div className="relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isRecording 
                ? "🎙️ Escuchando tu voz... Habla con naturalidad sobre lo que se te ocurrió o lo que necesitas hacer..." 
                : "Escribe o dicta cualquier suceso o idea (ej: 'Ocupo comprar boquillas de latón para la impresora 3D', 'Refactorizar el código de Supabase en React', 'Reparar la chapa de la puerta principal')..."
            }
            rows={2}
            className={`w-full bg-slate-950/80 border ${isRecording ? 'border-rose-500/60 ring-2 ring-rose-500/20' : 'border-white/10 focus:border-indigo-500/70'} rounded-xl p-3 pr-24 text-sm text-white placeholder-slate-400 focus:outline-none transition-all resize-none shadow-inner`}
          />

          {/* Action buttons inside / next to textarea */}
          <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
            {/* Mic Button */}
            <button
              type="button"
              onClick={toggleRecording}
              className={`p-2 rounded-xl text-white transition-all shadow-md flex items-center justify-center cursor-pointer ${
                isRecording 
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/50 scale-105 animate-pulse' 
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
              }`}
              title={isRecording ? "Detener grabación de voz" : "Hablar con el micrófono"}
            >
              {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            {/* Organize with AI button */}
            <button
              type="button"
              onClick={handleStructureIdea}
              disabled={isStructuring || !inputText.trim()}
              className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 text-white rounded-xl shadow-md shadow-purple-600/30 transition-all flex items-center justify-center cursor-pointer"
              title="Organizar y Clasificar con IA"
            >
              {isStructuring ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            </button>
          </div>
        </div>

        {/* Touch-Friendly Dictation Action Bar (Ideal for cell phones & quick input) */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={toggleRecording}
            className={`w-full py-2.5 sm:py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer ${
              isRecording
                ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white animate-pulse shadow-rose-600/40 ring-2 ring-rose-400'
                : 'bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30 active:scale-[0.98]'
            }`}
          >
            {isRecording ? (
              <>
                <MicOff size={19} className="animate-bounce shrink-0" />
                <span className="text-xs sm:text-sm">Detener Dictado ({recordingSeconds}s)</span>
              </>
            ) : (
              <>
                <Mic size={19} className="text-amber-300 animate-pulse shrink-0" />
                <span className="text-xs sm:text-sm">Tocar para Dictar Apunte por Voz</span>
              </>
            )}
          </button>

          {inputText.trim() && !structuredIdea && (
            <button
              type="button"
              onClick={handleStructureIdea}
              disabled={isStructuring}
              className="py-2.5 sm:py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-200 border border-purple-500/30 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
            >
              {isStructuring ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-pink-400" />}
              <span>Organizar con IA</span>
            </button>
          )}
        </div>

        {/* Structured Result Card Preview (when generated) */}
        <AnimatePresence>
          {structuredIdea && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3.5 bg-slate-950/90 border border-purple-500/40 rounded-xl space-y-3 shadow-lg"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-pink-400" />
                  Idea Organizada por IA:
                </span>
                <button
                  onClick={() => setStructuredIdea(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-md"
                  title="Descartar"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Title input */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Título Generado
                </label>
                <input
                  type="text"
                  value={structuredIdea.title}
                  onChange={(e) => setStructuredIdea({ ...structuredIdea, title: e.target.value })}
                  className="w-full bg-slate-900 border border-white/15 rounded-lg px-3 py-1.5 text-sm text-white font-semibold focus:outline-none focus:border-purple-400"
                />
              </div>

              {/* Category & Priority selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Categoría Asignada
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {availableCategories.map(cat => {
                      const isSelected = structuredIdea.category === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setStructuredIdea({ ...structuredIdea, category: cat })}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                            isSelected 
                              ? getCategoryBadgeClass(cat)
                              : 'bg-slate-900/80 text-slate-400 border-white/10 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          {getCategoryIcon(cat)}
                          <span>{cat}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                    Prioridad
                  </label>
                  <div className="flex gap-2">
                    {(['Alta', 'Media', 'Baja'] as const).map(p => {
                      const isSelected = structuredIdea.priority === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setStructuredIdea({ ...structuredIdea, priority: p })}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            isSelected
                              ? p === 'Alta' ? 'bg-rose-600 text-white border-rose-400' : p === 'Media' ? 'bg-amber-600 text-white border-amber-400' : 'bg-emerald-600 text-white border-emerald-400'
                              : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Notes / Details */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                  Detalles / Pasos Estructurados
                </label>
                <textarea
                  value={structuredIdea.notes}
                  onChange={(e) => setStructuredIdea({ ...structuredIdea, notes: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-900 border border-white/15 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-400 resize-none font-sans"
                />
              </div>

              {/* Confirm Save Button */}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStructuredIdea(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmSave}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-500/25 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Check size={16} />
                  <span>Guardar en Lista y Sincronizar en Supabase</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default EventIdeaRecorder;
