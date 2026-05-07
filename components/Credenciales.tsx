import React, { useState } from 'react';
import { useLinks } from '../contexts/LinkContext';
import { Credencial } from '../types';
import { Copy, Edit2, Trash2, Check, Eye, EyeOff } from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableItem = ({ cred, updateConfig, config, startEdit, toggleSensitive, copyToClipboard, showSensitive }: { 
  key: string,
  cred: Credencial, 
  updateConfig: any, 
  config: any, 
  startEdit: any, 
  toggleSensitive: any, 
  copyToClipboard: any,
  showSensitive: any
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: cred.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    backgroundColor: cred.color,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="p-4 rounded-xl shadow-lg group transition-transform hover:scale-105 border border-white/10 bg-gradient-to-br from-white/10 to-transparent backdrop-blur-sm"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 
            {...attributes} 
            {...listeners}
            className="font-bold text-lg text-white cursor-grab active:cursor-grabbing flex-grow"
        >
            {cred.nombre}
        </h3>
        <div className="flex gap-1 opacity-100 transition-opacity">
          <input
            type="color"
            value={cred.color}
            onChange={(e) => updateConfig({
              ...config,
              credenciales: config.credenciales.map((c: Credencial) => c.id === cred.id ? { ...c, color: e.target.value } : c)
            })}
            className="w-4 h-4 cursor-pointer bg-transparent"
            title="Cambiar color"
          />
          <button onClick={(e) => { e.stopPropagation(); startEdit(cred); }}><Edit2 size={14} className="text-white" /></button>
          <button onClick={(e) => { e.stopPropagation(); updateConfig({ ...config, credenciales: config.credenciales.filter((c: Credencial) => c.id !== cred.id) }); }}><Trash2 size={14} className="text-white" /></button>
        </div>
      </div>
      <div className="space-y-1 text-xs text-white/90">
        {cred.usuario && (
          <div className="flex justify-between items-center bg-black/20 p-1.5 rounded">
            <span className="truncate mr-1">{showSensitive[cred.id] ? cred.usuario : '••••••'}</span>
            <div className='flex gap-1'>
              <button onClick={(e) => { e.stopPropagation(); toggleSensitive(cred.id); }}>{showSensitive[cred.id] ? <EyeOff size={12}/> : <Eye size={12}/>}</button>
              <button onClick={(e) => { e.stopPropagation(); copyToClipboard(cred.usuario); }}><Copy size={12} /></button>
            </div>
          </div>
        )}
        {cred.contra && (
          <div className="flex justify-between items-center bg-black/20 p-1.5 rounded">
            <span className="truncate mr-1">{showSensitive[cred.id] ? cred.contra : '••••••'}</span>
            <div className='flex gap-1'>
              <button onClick={(e) => { e.stopPropagation(); toggleSensitive(cred.id); }}>{showSensitive[cred.id] ? <EyeOff size={12}/> : <Eye size={12}/>}</button>
              <button onClick={(e) => { e.stopPropagation(); copyToClipboard(cred.contra); }}><Copy size={12} /></button>
            </div>
          </div>
        )}
        {cred.datos && (
          <div className="flex justify-between items-center bg-black/20 p-1.5 rounded">
            <span className="truncate mr-1">{cred.datos}</span>
            <button onClick={(e) => { e.stopPropagation(); copyToClipboard(cred.datos); }}><Copy size={12} /></button>
          </div>
        )}
      </div>
    </div>
  );
};

const Credenciales: React.FC = () => {
  const { config, updateConfig } = useLinks();
  const [nombre, setNombre] = useState('');
  const [usuario, setUsuario] = useState('');
  const [contra, setContra] = useState('');
  const [datos, setDatos] = useState('');
  const [color, setColor] = useState('#3f3f46');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});
  const [showInputSensitive, setShowInputSensitive] = useState(false);

  const addCredencial = () => {
    if (!nombre) return;
    if (editingId) {
      updateConfig({
        ...config,
        credenciales: config.credenciales.map(c => c.id === editingId ? { ...c, nombre, usuario, contra, datos, color } : c)
      });
      setEditingId(null);
    } else {
      const newCred: Credencial = { id: Date.now().toString(), nombre, usuario, contra, datos, color };
      updateConfig({ ...config, credenciales: [...config.credenciales, newCred] });
    }
    setNombre(''); setUsuario(''); setContra(''); setDatos(''); setColor('#3f3f46');
    setShowInputSensitive(false);
  };

  const startEdit = (cred: Credencial) => {
    setEditingId(cred.id);
    setNombre(cred.nombre); setUsuario(cred.usuario); setContra(cred.contra); setDatos(cred.datos); setColor(cred.color);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
        alert('Copiado al portapapeles');
    }).catch(err => {
        console.error('Error al copiar: ', err);
    });
  };

  const toggleSensitive = (id: string) => setShowSensitive(prev => ({ ...prev, [id]: !prev[id] }));

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = config.credenciales.findIndex((c: Credencial) => c.id === active.id);
      const newIndex = config.credenciales.findIndex((c: Credencial) => c.id === over.id);
      updateConfig({
        ...config,
        credenciales: arrayMove(config.credenciales, oldIndex, newIndex),
      });
    }
  };

  return (
    <div className="p-6 text-white space-y-6">
      <h2 className="text-2xl font-bold">Credenciales</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-800 p-4 rounded-xl">
        <input className="bg-zinc-700 p-2 rounded" placeholder="Nombre" value={nombre ?? ''} onChange={e => setNombre(e.target.value)} />
        <input className="bg-zinc-700 p-2 rounded" placeholder="Usuario" value={usuario ?? ''} onChange={e => setUsuario(e.target.value)} />
        <div className="relative flex items-center">
            <input className="bg-zinc-700 p-2 rounded w-full" placeholder="Contraseña" type="text" value={contra ?? ''} onChange={e => setContra(e.target.value)} />
        </div>
        <input className="bg-zinc-700 p-2 rounded" placeholder="Datos adicionales" value={datos ?? ''} onChange={e => setDatos(e.target.value)} />
        <input type="color" className="w-full h-10 rounded cursor-pointer" value={color ?? '#3f3f46'} onChange={e => setColor(e.target.value)} />
        <button className="bg-blue-600 p-2 rounded font-bold" onClick={addCredencial}>{editingId ? 'Actualizar' : 'Agregar'}</button>
      </div>
      {/* Nota: La Memoria ADN de la IA se administra ahora desde la pestaña de Comandos */}
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={config.credenciales} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {config.credenciales.map(cred => (
              <SortableItem 
                key={cred.id} 
                cred={cred} 
                updateConfig={updateConfig} 
                config={config} 
                startEdit={startEdit} 
                toggleSensitive={toggleSensitive} 
                copyToClipboard={copyToClipboard}
                showSensitive={showSensitive}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default Credenciales;
