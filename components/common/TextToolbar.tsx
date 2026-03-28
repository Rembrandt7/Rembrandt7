
import React, { useMemo } from 'react';
import IconButton from './IconButton';

interface TextObject {
    id: string;
    type: 'text';
    text: string;
    x: number;
    y: number;
    fontSize: number;
    fontFamily: string;
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
    textDecoration: 'none' | 'underline';
    textAlign: 'left' | 'center' | 'right';
    color: string;
    strokeColor: string;
    strokeWidth: number;
    rotation: number;
    width: number;
    scale: number;
}

interface TextToolbarProps {
    object: TextObject;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    onUpdate: (updates: Partial<TextObject>) => void;
    onDelete: () => void;
    onBringForward: () => void;
    onSendToBack: () => void;
    onEdit: () => void;
}

const fontFamilies = [
    'Arial', 
    'Verdana', 
    'Times New Roman', 
    'Courier New', 
    'Georgia', 
    'Comic Sans MS', 
    'Impact',
    'Helvetica',
    'Trebuchet MS',
    'Lucida Sans'
];


const TextToolbar: React.FC<TextToolbarProps> = ({
    object,
    canvasRef,
    onUpdate,
    onDelete,
    onBringForward,
    onSendToBack,
    onEdit
}) => {
    const position = useMemo(() => {
        const canvas = canvasRef.current;
        if (!canvas) return { top: 0, left: 0, display: 'none' };

        // Obtenemos el rectángulo para calcular la escala, pero NO usamos sus coordenadas
        // top/left absolutas porque este componente vive dentro de un contenedor relativo.
        const rect = canvas.getBoundingClientRect();
        const scale = rect.width / canvas.width;

        const objHeight = (object.fontSize * object.text.split('\n').length * 1.1) * object.scale;
        const topOffset = -objHeight / 2 - 60; // Posición arriba del objeto

        const rotatedOffsetX = Math.sin(object.rotation) * topOffset;
        const rotatedOffsetY = Math.cos(object.rotation) * topOffset;
        
        // Coordenadas relativas al contenedor (0,0 es la esquina superior izquierda de la imagen)
        const top = (object.y + rotatedOffsetY) * scale;
        const left = (object.x + rotatedOffsetX) * scale;
        
        return {
            top,
            left: left,
            transform: 'translateX(-50%)',
        };
    }, [object, canvasRef]);

    return (
        <div
            style={{ position: 'absolute', ...position, zIndex: 50 }}
            className="bg-gray-900/95 backdrop-blur-md p-2 rounded-lg shadow-2xl flex items-center flex-wrap gap-2 border border-gray-600 w-max max-w-[90vw]"
            onMouseDown={(e) => e.stopPropagation()} // Prevent canvas interaction when clicking toolbar
        >
            <IconButton tooltip="Edit Text" onClick={onEdit}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg></IconButton>
            <div className="h-6 w-px bg-gray-600 mx-1"></div>
            
            <div className="relative group">
                <input type="color" value={object.color} onChange={(e) => onUpdate({ color: e.target.value })} className="w-6 h-6 p-0 border-none rounded cursor-pointer bg-transparent appearance-none [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none"/>
                 <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-black px-1 rounded whitespace-nowrap">Fill Color</span>
            </div>
            <div className="relative group">
                <input type="color" value={object.strokeColor} onChange={(e) => onUpdate({ strokeColor: e.target.value })} className="w-6 h-6 p-0 border-none rounded cursor-pointer bg-transparent appearance-none [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none"/>
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-black px-1 rounded whitespace-nowrap">Stroke Color</span>
            </div>

            <input
                type="number" min="0" max="20" value={object.strokeWidth}
                onChange={(e) => onUpdate({ strokeWidth: parseInt(e.target.value, 10) || 0 })}
                className="w-12 bg-gray-700 text-white p-1 rounded-md text-center text-sm border border-gray-600" title="Stroke Width"
            />
            <input
                type="number" min="8" max="200" value={object.fontSize}
                onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value, 10) || 12 })}
                className="w-14 bg-gray-700 text-white p-1 rounded-md text-center text-sm border border-gray-600" title="Font Size"
            />

            <select 
                value={object.fontFamily} 
                onChange={(e) => onUpdate({ fontFamily: e.target.value })}
                className="bg-gray-700 text-white p-1.5 rounded-md text-sm border border-gray-600 focus:ring-1 focus:ring-purple-500 cursor-pointer max-w-[100px]"
                title="Font Family"
            >
                {fontFamilies.map(font => <option key={font} value={font}>{font}</option>)}
            </select>

            <div className="h-6 w-px bg-gray-600 mx-1"></div>
            
            <div className="flex items-center gap-1" title="Rotation">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a1 1 0 00-1 1v1.336a7.002 7.002 0 00-4.633 4.633H3a1 1 0 100 2h1.336a7.002 7.002 0 004.633 4.633V17a1 1 0 102 0v-1.336a7.002 7.002 0 004.633-4.633H17a1 1 0 100-2h-1.336a7.002 7.002 0 00-4.633-4.633V3a1 1 0 00-1-1zm0 2a5 5 0 100 10 5 5 0 000-10z" clipRule="evenodd" /></svg>
                <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={Math.round(object.rotation * (180 / Math.PI))}
                    onChange={(e) => onUpdate({ rotation: parseInt(e.target.value, 10) * (Math.PI / 180) })}
                    className="w-20 accent-purple-500"
                />
            </div>
            
            <div className="h-6 w-px bg-gray-600 mx-1"></div>

            <IconButton tooltip="Bold" isActive={object.fontWeight === 'bold'} onClick={() => onUpdate({ fontWeight: object.fontWeight === 'bold' ? 'normal' : 'bold' })}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>
            </IconButton>
             <IconButton tooltip="Italic" isActive={object.fontStyle === 'italic'} onClick={() => onUpdate({ fontStyle: object.fontStyle === 'italic' ? 'normal' : 'italic' })}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg>
            </IconButton>
             <IconButton tooltip="Underline" isActive={object.textDecoration === 'underline'} onClick={() => onUpdate({ textDecoration: object.textDecoration === 'underline' ? 'none' : 'underline' })}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/></svg>
            </IconButton>

             <div className="h-6 w-px bg-gray-600 mx-1"></div>
            
            <IconButton tooltip="Align Left" isActive={object.textAlign === 'left'} onClick={() => onUpdate({ textAlign: 'left' })}>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z"/></svg>
            </IconButton>
            <IconButton tooltip="Align Center" isActive={object.textAlign === 'center'} onClick={() => onUpdate({ textAlign: 'center' })}>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z"/></svg>
            </IconButton>
            <IconButton tooltip="Align Right" isActive={object.textAlign === 'right'} onClick={() => onUpdate({ textAlign: 'right' })}>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z"/></svg>
            </IconButton>

            <div className="h-6 w-px bg-gray-600 mx-1"></div>

            <IconButton tooltip="Bring Forward" onClick={onBringForward}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1z" /></svg>
            </IconButton>
            <IconButton tooltip="Send to Back" onClick={onSendToBack}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M3 13a1 1 0 000 2h14a1 1 0 100-2H3zM5 9a1 1 0 000 2h10a1 1 0 100-2H5zM7 5a1 1 0 000 2h6a1 1 0 100-2H7z" /></svg>
            </IconButton>
            
            <div className="h-6 w-px bg-gray-600 mx-1"></div>
            
            <IconButton tooltip="Delete" onClick={onDelete} className="hover:bg-red-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            </IconButton>
        </div>
    );
};

export default TextToolbar;
