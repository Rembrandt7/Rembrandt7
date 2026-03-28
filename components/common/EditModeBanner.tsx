import React from 'react';
import { useLinks } from '../../contexts/LinkContext';
import { Info } from 'lucide-react';

export const EditModeBanner: React.FC = () => {
    const { isEditing, toggleEditing } = useLinks();

    if (!isEditing) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-600 text-white py-1.5 px-4 flex items-center justify-center gap-4 shadow-lg animate-fade-in">
            <div className="flex items-center gap-2">
                <Info size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Modo Edición Activo</span>
            </div>
            <p className="text-[11px] opacity-90 hidden md:block">
                Puedes editar, eliminar o mover cualquier icono de la interfaz. Pulsa "Fijar como Default" en la barra central para guardar permanentemente.
            </p>
            <button 
                onClick={toggleEditing}
                className="bg-white text-amber-700 px-3 py-0.5 rounded-full text-[10px] font-black uppercase hover:bg-amber-50 transition-colors"
            >
                Finalizar
            </button>
        </div>
    );
};
