
import React, { useState, useRef, useEffect, useCallback } from 'react';
import IconButton from './common/IconButton';

// Object types
interface BoardObject {
  id: string;
  type: 'image';
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

type Action = 'none' | 'panning' | 'moving' | 'resizing';
type ResizeHandle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const Whiteboard: React.FC = () => {
  const [objects, setObjects] = useState<BoardObject[]>([]);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const [action, setAction] = useState<Action>('none');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const actionStartRef = useRef<{
    pointer: { x: number; y: number };
    view: { x: number; y: number };
    object?: BoardObject;
    handle?: ResizeHandle;
  } | null>(null);

  const getPointerPosition = (e: React.MouseEvent | MouseEvent): { x: number; y: number } => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const svgPoint = svgRef.current.createSVGPoint();
    svgPoint.x = e.clientX;
    svgPoint.y = e.clientY;
    const transformedPoint = svgPoint.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    return { x: transformedPoint.x, y: transformedPoint.y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pointer = getPointerPosition(e);
    actionStartRef.current = { pointer, view: { x: view.x, y: view.y } };

    if ((e.target as SVGElement).id === 'whiteboard-bg') {
        setAction('panning');
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    // redundant null check for safety
    if (action === 'none' || !actionStartRef.current) return;
    
    const pointer = getPointerPosition(e);
    const currentActionStart = actionStartRef.current;

    if (!currentActionStart) return; // Extra safety check

    const dx = pointer.x - currentActionStart.pointer.x;
    const dy = pointer.y - currentActionStart.pointer.y;

    if (action === 'panning') {
        // Capture view from local variable to avoid closure issues if ref changes
        const startView = currentActionStart.view;
        if (startView) {
             setView(v => ({ ...v, x: startView.x + dx, y: startView.y + dy }));
        }
    } else if (action === 'moving' && selectedObjectId) {
        const startObject = currentActionStart.object;
        if (startObject) {
            setObjects(objs => objs.map(obj => 
                obj.id === selectedObjectId 
                ? { ...obj, x: startObject.x + dx / view.zoom, y: startObject.y + dy / view.zoom } 
                : obj
            ));
        }
    } else if (action === 'resizing' && selectedObjectId) {
        const startObject = currentActionStart.object;
        const handle = currentActionStart.handle;
        
        if (startObject && handle) {
            let { x, y, width, height } = startObject;
            
            const deltaX = dx / view.zoom;
            const deltaY = dy / view.zoom;

            if(handle.includes('left')) {
                width -= deltaX;
                x += deltaX;
            }
            if(handle.includes('right')) width += deltaX;
            if(handle.includes('top')) {
                height -= deltaY;
                y += deltaY;
            }
            if(handle.includes('bottom')) height += deltaY;

            if (width > 20 && height > 20) {
                setObjects(objs => objs.map(obj => 
                    obj.id === selectedObjectId ? { ...obj, x, y, width, height } : obj
                ));
            }
        }
    }
  }, [action, selectedObjectId, view.zoom]);

  const handleMouseUp = useCallback(() => {
    setAction('none');
    actionStartRef.current = null;
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const pointer = getPointerPosition(e);
    const zoomFactor = 1.1;
    const newZoom = e.deltaY < 0 ? view.zoom * zoomFactor : view.zoom / zoomFactor;
    const clampedZoom = Math.max(0.1, Math.min(5, newZoom));
    
    const dx = (pointer.x - view.x) * (clampedZoom / view.zoom - 1);
    const dy = (pointer.y - view.y) * (clampedZoom / view.zoom - 1);

    setView({
        zoom: clampedZoom,
        x: view.x - dx,
        y: view.y - dy,
    });
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const newObject: BoardObject = {
          id: Date.now().toString(),
          type: 'image',
          src,
          x: (-view.x + (svgRef.current!.clientWidth / 2)) / view.zoom - img.width / 2,
          y: (-view.y + (svgRef.current!.clientHeight / 2)) / view.zoom - img.height / 2,
          width: img.width,
          height: img.height,
          rotation: 0,
        };
        setObjects(prev => [...prev, newObject]);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };
  
   const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);

        const assistantImageData = e.dataTransfer.getData('application/json+rembrandt-ia-image');
        if (assistantImageData) {
            const { base64, mimeType } = JSON.parse(assistantImageData);
            const src = `data:${mimeType};base64,${base64}`;
            const img = new Image();
            img.onload = () => {
                const pointer = getPointerPosition(e);
                const newObject: BoardObject = {
                    id: Date.now().toString(), type: 'image', src,
                    x: pointer.x - (img.width / 2) / view.zoom,
                    y: pointer.y - (img.height / 2) / view.zoom,
                    width: img.width, height: img.height, rotation: 0
                };
                setObjects(prev => [...prev, newObject]);
            };
            img.src = src;
        } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            Array.from(e.dataTransfer.files).forEach(processFile);
        }
    }, [view]);


  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false); };
  
  const selectObject = (id: string) => {
    setSelectedObjectId(id);
    setObjects(objs => {
        const selected = objs.find(o => o.id === id);
        if (!selected) return objs;
        return [...objs.filter(o => o.id !== id), selected]; // Bring to front
    });
  };

  const deleteSelected = () => {
    if(selectedObjectId) setObjects(objs => objs.filter(o => o.id !== selectedObjectId));
    setSelectedObjectId(null);
  }

  const selectedObject = objects.find(o => o.id === selectedObjectId);
  const handleSize = 8 / view.zoom;

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-xl w-full h-[75vh] flex flex-col"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
    >
      <div className="flex justify-between items-center mb-4">
         <h2 className="text-2xl font-bold text-center">Mixboard (Internal)</h2>
         <a href="https://labs.google.com/mixboard/welcome" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-md font-semibold transition-colors flex items-center gap-2">
            Open Google Mixboard
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
         </a>
      </div>
      
      <div className="flex-grow w-full h-full bg-gray-900/50 rounded-lg overflow-hidden relative">
        <svg ref={svgRef} className="w-full h-full cursor-grab"
            onMouseDown={handleMouseDown} onWheel={handleWheel}
        >
            <defs>
                <pattern id="grid" width={50 * view.zoom} height={50 * view.zoom} patternUnits="userSpaceOnUse" x={view.x} y={view.y}>
                    <path d={`M ${50 * view.zoom} 0 L 0 0 0 ${50 * view.zoom}`} fill="none" stroke="rgba(110, 110, 110, 0.2)" strokeWidth="1"/>
                </pattern>
            </defs>
            <rect id="whiteboard-bg" x="-100000" y="-100000" width="200000" height="200000" fill="url(#grid)" />
             <g transform={`translate(${view.x}, ${view.y}) scale(${view.zoom})`}>
                {objects.map(obj => (
                    <g key={obj.id} transform={`translate(${obj.x} ${obj.y})`} 
                       onMouseDown={(e) => {
                            e.stopPropagation();
                            setAction('moving');
                            selectObject(obj.id);
                            actionStartRef.current = { ...actionStartRef.current!, object: obj };
                        }}
                        className="cursor-move"
                    >
                        <image href={obj.src} width={obj.width} height={obj.height} />
                    </g>
                ))}
                {selectedObject && (
                    <g transform={`translate(${selectedObject.x} ${selectedObject.y})`}>
                        <rect x="0" y="0" width={selectedObject.width} height={selectedObject.height} fill="none" stroke="#4f46e5" strokeWidth={2 / view.zoom} />
                        {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as ResizeHandle[]).map(handle => {
                            const cursorMap = {
                                'top-left': 'nwse-resize', 'top-right': 'nesw-resize',
                                'bottom-left': 'nesw-resize', 'bottom-right': 'nwse-resize'
                            };
                            return (
                                <rect key={handle}
                                    x={handle.includes('right') ? selectedObject.width - handleSize : 0}
                                    y={handle.includes('bottom') ? selectedObject.height - handleSize : 0}
                                    width={handleSize} height={handleSize} fill="#4f46e5" stroke="white" strokeWidth={1 / view.zoom}
                                    className={`cursor-${cursorMap[handle]}`}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        setAction('resizing');
                                        actionStartRef.current = { ...actionStartRef.current!, object: selectedObject, handle };
                                    }}
                                />
                            )
                        })}
                    </g>
                )}
            </g>
        </svg>

        {objects.length === 0 && !isDraggingOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <p className="font-semibold">Arrastra imágenes aquí</p>
                <p className="text-sm mt-1">Desde tu equipo o desde el Asistente de IA</p>
            </div>
        )}
         {isDraggingOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/70 border-4 border-dashed border-purple-500 rounded-lg pointer-events-none">
                <p className="text-lg font-semibold text-white">Suelta la imagen para añadirla</p>
            </div>
        )}

        <div className="absolute top-2 left-2 flex gap-2">
            <IconButton tooltip="Zoom In" onClick={() => handleWheel({ deltaY: -100, preventDefault: () => {} } as React.WheelEvent)}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg></IconButton>
            <IconButton tooltip="Zoom Out" onClick={() => handleWheel({ deltaY: 100, preventDefault: () => {} } as React.WheelEvent)}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg></IconButton>
            <IconButton tooltip="Reset View" onClick={() => setView({ x: 0, y: 0, zoom: 1 })}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 10l-4.95-4.95z" clipRule="evenodd" /></svg></IconButton>
        </div>
        {selectedObjectId && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                <IconButton tooltip="Delete" className="hover:!bg-red-500" onClick={deleteSelected}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></IconButton>
            </div>
        )}
      </div>
    </div>
  );
};

export default Whiteboard;
