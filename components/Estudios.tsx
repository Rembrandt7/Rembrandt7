import React, { useState } from 'react';
import { useLinks } from '../contexts/LinkContext';
import { Estudio } from '../types';
import { Plus, Trash2, ExternalLink, BookOpen, CheckCircle, Clock } from 'lucide-react';

const Estudios: React.FC = () => {
  const { config, updateConfig, saveToSupabase } = useLinks();
  const [nombre, setNombre] = useState('');
  const [enlace, setEnlace] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [avance, setAvance] = useState(0);

  const addEstudio = () => {
    if (!nombre) return;
    const newEstudio: Estudio = {
      id: Date.now().toString(),
      nombre,
      enlace,
      descripcion,
      avance
    };
    updateConfig({ ...config, estudios: [...(config.estudios || []), newEstudio] });
    setNombre('');
    setEnlace('');
    setDescripcion('');
    setAvance(0);
    saveToSupabase();
  };

  const deleteEstudio = (id: string) => {
    updateConfig({ ...config, estudios: config.estudios.filter(e => e.id !== id) });
    saveToSupabase();
  };

  const updateAvance = (id: string, newAvance: number) => {
    updateConfig({
      ...config,
      estudios: config.estudios.map(e => e.id === id ? { ...e, avance: Math.min(100, Math.max(0, newAvance)) } : e)
    });
    saveToSupabase();
  };

  return (
    <div className="p-6 text-white space-y-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center border-b border-gray-700 pb-4">
        <h2 className="text-3xl font-bold flex items-center gap-3">
          <BookOpen className="text-purple-400" size={32} />
          Seguimiento de Estudios
        </h2>
        <div className="text-gray-400 text-sm">
          {config.estudios?.length || 0} Temas en curso
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl space-y-4">
        <h3 className="text-lg font-semibold text-purple-300">Agregar Nuevo Tema</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-400 uppercase font-bold">Tema / Materia</label>
            <input 
              className="w-full bg-gray-900 border border-gray-700 p-2 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" 
              placeholder="Ej: React Hooks" 
              value={nombre} 
              onChange={e => setNombre(e.target.value)} 
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400 uppercase font-bold">Página / Enlace</label>
            <input 
              className="w-full bg-gray-900 border border-gray-700 p-2 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" 
              placeholder="https://..." 
              value={enlace} 
              onChange={e => setEnlace(e.target.value)} 
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400 uppercase font-bold">Descripción Corta</label>
            <input 
              className="w-full bg-gray-900 border border-gray-700 p-2 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" 
              placeholder="¿De qué trata?" 
              value={descripcion} 
              onChange={e => setDescripcion(e.target.value)} 
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400 uppercase font-bold">Avance Inicial ({avance}%)</label>
            <input 
              type="range"
              min="0"
              max="100"
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 mt-4" 
              value={avance} 
              onChange={e => setAvance(parseInt(e.target.value))} 
            />
          </div>
        </div>
        <button 
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2" 
          onClick={addEstudio}
        >
          <Plus size={20} /> Agregar Tema de Estudio
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(config.estudios || []).map(estudio => (
          <div key={estudio.id} className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-lg hover:border-purple-500/50 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1">
                <h4 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">{estudio.nombre}</h4>
                <p className="text-gray-400 text-sm line-clamp-2">{estudio.descripcion}</p>
              </div>
              <div className="flex gap-2">
                {estudio.enlace && (
                  <a 
                    href={estudio.enlace} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="p-2 bg-gray-700 hover:bg-blue-600 rounded-lg text-blue-400 hover:text-white transition-all"
                    title="Abrir enlace"
                  >
                    <ExternalLink size={18} />
                  </a>
                )}
                <button 
                  className="p-2 bg-gray-700 hover:bg-red-600 rounded-lg text-red-400 hover:text-white transition-all"
                  onClick={() => deleteEstudio(estudio.id)}
                  title="Eliminar"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-1 text-gray-400">
                  {estudio.avance === 100 ? (
                    <CheckCircle size={16} className="text-green-500" />
                  ) : (
                    <Clock size={16} className="text-yellow-500" />
                  )}
                  {estudio.avance === 100 ? 'Completado' : 'En progreso'}
                </span>
                <span className="font-bold text-purple-400">{estudio.avance || 0}%</span>
              </div>
              
              <div className="w-full bg-gray-900 rounded-full h-2.5 overflow-hidden border border-gray-700">
                <div 
                  className={`h-full transition-all duration-500 ${estudio.avance === 100 ? 'bg-green-500' : 'bg-purple-500'}`}
                  style={{ width: `${estudio.avance || 0}%` }}
                />
              </div>

              <div className="flex gap-2 pt-2">
                {[0, 25, 50, 75, 100].map(val => (
                  <button
                    key={val}
                    onClick={() => updateAvance(estudio.id, val)}
                    className={`text-[10px] px-2 py-1 rounded border transition-all ${
                      estudio.avance === val 
                        ? 'bg-purple-600 border-purple-500 text-white' 
                        : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-purple-500'
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {(config.estudios || []).length === 0 && (
        <div className="text-center py-20 bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-700">
          <BookOpen size={64} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">No hay temas de estudio registrados aún.</p>
          <p className="text-gray-500 text-sm">Agrega uno arriba para comenzar el seguimiento.</p>
        </div>
      )}
    </div>
  );
};

export default Estudios;
