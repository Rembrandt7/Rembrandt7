import React, { useState, useEffect } from 'react';
import { Plus, X, GripVertical, Check, Edit2, Save, BookOpen, Clock, Link as LinkIcon, ExternalLink, FileText, Home, Briefcase, ShoppingCart, Mic, MicOff } from 'lucide-react';
import { useLinks } from '../contexts/LinkContext';
import { toast } from 'sonner';
import { Note, CalendarEvent } from '../types';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverEvent, DragEndEvent, useDroppable } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SortableNote = ({ note, toggleComplete, startEdit, removeNote, editingId, editText, setEditText, saveEdit, editFields, setEditFields, isEditMode }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: note.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={`flex items-start gap-2 bg-gray-800 p-4 rounded-xl border border-gray-700 ${note.completed ? 'opacity-50' : ''}`}>
      {isEditMode && (
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mt-1">
          <GripVertical className="text-gray-500" size={20} />
        </div>
      )}
      
      {note.category !== 'compras' && note.category !== 'notas' && (
        <button 
          onClick={() => toggleComplete(note.id)} 
          disabled={!isEditMode && note.category !== 'estudios'}
          className={`mt-1 p-1 rounded-full flex-shrink-0 ${note.completed ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'} ${!isEditMode && note.category !== 'estudios' ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-600'}`}
        >
          <Check size={16} />
        </button>
      )}

      {editingId === note.id ? (
        <div className="flex flex-col gap-2 flex-grow">
          {note.category === 'estudios' && (
            <>
              <input
                type="text"
                value={editFields.title}
                onChange={(e) => setEditFields({ ...editFields, title: e.target.value })}
                placeholder="Título del estudio"
                className="bg-gray-900 text-white rounded px-3 py-1 border border-gray-600 outline-none text-sm font-bold"
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-16">Progreso:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editFields.progress}
                  onChange={(e) => setEditFields({ ...editFields, progress: parseInt(e.target.value) })}
                  className="flex-grow h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <span className="text-xs text-purple-400 font-mono w-8">{editFields.progress}%</span>
              </div>
              <input
                type="text"
                value={editFields.link}
                onChange={(e) => setEditFields({ ...editFields, link: e.target.value })}
                placeholder="Enlace (opcional)"
                className="bg-gray-900 text-gray-300 rounded px-3 py-1 border border-gray-600 outline-none text-xs"
              />
            </>
          )}
          {note.category === 'compras' && (
            <input
              type="text"
              value={editFields.quantity}
              onChange={(e) => setEditFields({ ...editFields, quantity: e.target.value })}
              placeholder="Cantidad (ej: 2kg, 3 unidades)"
              className="bg-gray-900 text-white rounded px-3 py-1 border border-gray-600 outline-none text-xs"
            />
          )}
          {note.category === 'trabajo' && (
            <input
              type="date"
              value={editFields.startDate}
              onChange={(e) => setEditFields({ ...editFields, startDate: e.target.value })}
              className="bg-gray-900 text-white rounded px-3 py-1 border border-gray-600 outline-none text-xs"
            />
          )}
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            placeholder="Descripción o nota..."
            className="flex-grow bg-gray-900 text-white rounded px-3 py-2 border border-gray-600 outline-none min-h-[80px] font-mono text-sm"
            autoFocus
          />
        </div>
      ) : (
        <div className="flex-grow overflow-hidden">
          {note.category === 'compras' ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex-grow">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-none">
                  {note.text}
                </h3>
                <div className="mt-2">
                  <button 
                    onClick={() => removeNote(note.id)} 
                    className="bg-green-600 hover:bg-green-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-md transition-colors shadow-lg shadow-green-900/20 flex items-center gap-1"
                  >
                    <Check size={12} strokeWidth={3} />
                    Completado
                  </button>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <span className="text-[10px] text-red-400 font-black uppercase block leading-none mb-1">cant.</span>
                  <span className="text-xl font-black text-white leading-none">
                    {note.quantity || '1 pieza'}
                  </span>
                </div>
              </div>
            </div>
          ) : note.category === 'notas' ? (
            <div className="flex items-center justify-between gap-4">
              <div className={`flex-grow ${note.completed ? 'line-through opacity-50' : ''}`}>
                <div className="text-gray-200 prose prose-invert prose-sm max-w-none">
                  <Markdown remarkPlugins={[remarkGfm]}>{note.text}</Markdown>
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <button 
                  onClick={() => toggleComplete(note.id)} 
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                    note.completed 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {note.completed ? 'Completado' : 'Marcar Completado'}
                </button>
                {note.completed && (
                  <button 
                    onClick={() => removeNote(note.id)} 
                    className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-600/30 p-1.5 rounded-lg transition-all"
                    title="Eliminar nota completada"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {(note.category === 'estudios' || note.category === 'trabajo') && (
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`text-sm font-bold ${note.category === 'estudios' ? 'text-purple-400' : 'text-orange-400'}`}>
                      {note.title || 'Sin título'}
                    </h4>
                    {note.category === 'estudios' && note.link && (
                      <a href={note.link} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-400">
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                  {note.category === 'estudios' && (
                    <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden mb-2 border border-gray-600">
                      <div 
                        className="bg-purple-500 h-full transition-all duration-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" 
                        style={{ width: `${note.progress || 0}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
              {note.category === 'trabajo' && note.startDate && (
                <div className="mb-1 flex items-center gap-1 text-orange-400">
                  <Clock size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Inicio: {note.startDate}
                  </span>
                </div>
              )}
              <div className={`text-gray-200 prose prose-invert prose-sm max-w-none ${note.completed ? 'line-through opacity-70' : ''}`}>
                <Markdown remarkPlugins={[remarkGfm]}>{note.text}</Markdown>
              </div>
            </>
          )}
        </div>
      )}

      {isEditMode && (
        <div className="flex flex-col gap-2 mt-1">
          {editingId === note.id ? (
            <button onClick={() => saveEdit(note.id)} className="text-green-500 hover:text-green-400 p-1">
              <Save size={18} />
            </button>
          ) : (
            <button onClick={() => startEdit(note)} className="text-gray-500 hover:text-blue-500 p-1">
              <Edit2 size={18} />
            </button>
          )}
          
          {note.category !== 'notas' && (
            <button onClick={() => removeNote(note.id)} className="text-gray-500 hover:text-red-500 p-1">
              <X size={18} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const DroppableNoteContainer = ({ id, title, icon, colorClass, onAdd, onSave, isSaving, children, jsonFile, isEditMode }: any) => {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`flex-1 p-4 rounded-xl border ${colorClass} flex flex-col transition-all duration-300 ${isEditMode ? 'ring-2 ring-white/20 shadow-lg shadow-white/5' : ''}`}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">{icon} {title}</h3>
          {jsonFile && <span className="text-[10px] text-gray-400 font-mono mt-1">Archivo: {jsonFile}</span>}
        </div>
        <div className="flex gap-2">
          {onSave && (
            <button 
              onClick={onSave}
              disabled={isSaving}
              className={`p-1 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Guardar cambios"
            >
              {isSaving ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Save size={18} />}
            </button>
          )}
          <button 
            onClick={onAdd}
            className={`p-1 rounded-lg transition-all duration-300 ${isEditMode ? 'bg-white text-gray-900 scale-110 shadow-lg' : 'bg-white/10 hover:bg-white/20 text-white'}`}
            title={isEditMode ? "Cerrar edición" : "Activar edición"}
          >
            {isEditMode ? <X size={18} /> : <Plus size={18} />}
          </button>
        </div>
      </div>
      {isEditMode && (
        <div className="mb-3 px-2 py-1 bg-white/5 rounded text-[10px] text-white/60 font-medium uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Modo Edición Activo
        </div>
      )}
      <div className="space-y-3 min-h-[100px] flex-grow">{children}</div>
    </div>
  );
};

const NotesTab: React.FC = () => {
  const { 
    config, 
    updateConfig, 
    saveToSupabase, 
    fetchConfigFromSupabaseManual,
    isShoppingEditMode,
    setShoppingEditMode,
    isNotesEditMode,
    setNotesEditMode,
    isEstudiosEditMode,
    setEstudiosEditMode
  } = useLinks();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editFields, setEditFields] = useState({ title: '', progress: 0, link: '', quantity: '', startDate: '' });
  const [addingToCategory, setAddingToCategory] = useState<'estudios' | 'recientes' | 'notas' | 'trabajo' | 'compras' | null>(null);

  // Helper to check if a category is in edit mode
  const isCategoryEditMode = (category: string) => {
    if (category === 'compras') return isShoppingEditMode;
    if (category === 'estudios') return isEstudiosEditMode;
    if (category === 'notas' || category === 'recientes') return isNotesEditMode;
    if (category === 'trabajo') return true; // Trabajo doesn't have a separate file yet, or always editable?
    return false;
  };

  const toggleCategoryEditMode = (category: string) => {
    if (category === 'compras') setShoppingEditMode(!isShoppingEditMode);
    else if (category === 'estudios') setEstudiosEditMode(!isEstudiosEditMode);
    else if (category === 'notas' || category === 'recientes') setNotesEditMode(!isNotesEditMode);
  };

  const [newNoteFields, setNewNoteFields] = useState({ 
    text: '', 
    title: '', 
    progress: 0, 
    link: '', 
    quantity: '', 
    startDate: new Date().toISOString().split('T')[0],
    jobCategory: 'trabajos mios' as 'trabajos mios' | 'javer' | 'proyectos personales'
  });
  const [isLoading, setIsLoading] = useState(!config.notes);

  useEffect(() => {
    if (config.notes) {
      setIsLoading(false);
    }
  }, [config.notes]);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      await fetchConfigFromSupabaseManual();
      toast.success('Datos actualizados correctamente');
    } catch (error) {
      toast.error('Error al actualizar datos');
    } finally {
      setIsLoading(false);
    }
  };

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const saveNotes = (updatedNotes: Note[]) => {
    // Deduplicate before saving
    const seen = new Set();
    const uniqueNotes = updatedNotes.filter(note => {
      if (seen.has(note.id)) return false;
      seen.add(note.id);
      return true;
    });
    
    updateConfig({ ...config, notes: uniqueNotes });
  };

  const addNote = (category: 'estudios' | 'recientes' | 'notas' | 'trabajo' | 'compras') => {
    if (!newNoteFields.text.trim() && !newNoteFields.title.trim()) return;
    
    const uniqueId = `note-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    if (category === 'trabajo') {
      const newEvent: CalendarEvent = {
        id: uniqueId,
        title: newNoteFields.title.trim() || newNoteFields.text.substring(0, 20) || 'Nueva tarea de trabajo',
        description: newNoteFields.text.trim(),
        date: newNoteFields.startDate,
        type: 'trabajo',
        jobCategory: newNoteFields.jobCategory
      };
      updateConfig(prev => ({ ...prev, calendarEvents: [...(prev.calendarEvents || []), newEvent] }));
    } else if (category === 'compras') {
      // Find lowest available 6-digit ID
      const existingIds = (config.notes || [])
        .filter(n => n.category === 'compras' && /^\d{6}$/.test(n.id))
        .map(n => parseInt(n.id, 10))
        .sort((a, b) => a - b);
      
      let nextIdNum = 1;
      for (const id of existingIds) {
        if (id === nextIdNum) {
          nextIdNum++;
        } else if (id > nextIdNum) {
          break;
        }
      }
      const nextId = nextIdNum.toString().padStart(6, '0');

      // Strictly follow the requested structure for 'compras'
      const note: Note = {
        id: nextId,
        text: newNoteFields.text.trim() || newNoteFields.title.trim(),
        category: 'compras',
        completed: false,
        quantity: newNoteFields.quantity.trim() || '1 pieza'
      };
      
      const updatedNotes = [...(config.notes || []), note];
      saveNotes(updatedNotes);
    } else if (category === 'notas') {
      const note: Note = {
        id: uniqueId,
        text: newNoteFields.text.trim(),
        category: 'notas',
        completed: false
      };
      const updatedNotes = [...(config.notes || []), note];
      saveNotes(updatedNotes);
    } else if (category === 'estudios') {
      const note: Note = {
        id: uniqueId,
        title: newNoteFields.title.trim(),
        text: newNoteFields.text.trim(),
        category: 'estudios',
        progress: newNoteFields.progress,
        link: newNoteFields.link.trim(),
        completed: false
      };
      const updatedNotes = [...(config.notes || []), note];
      saveNotes(updatedNotes);
    } else {
      const note: Note = { 
        id: uniqueId, 
        text: newNoteFields.text.trim(), 
        completed: false, 
        category,
        title: newNoteFields.title.trim(),
        progress: newNoteFields.progress,
        link: newNoteFields.link.trim(),
        quantity: newNoteFields.quantity.trim(),
        startDate: newNoteFields.startDate
      };
      const updatedNotes = [...(config.notes || []), note];
      saveNotes(updatedNotes);
    }
    setNewNoteFields({ text: '', title: '', progress: 0, link: '', quantity: '', startDate: new Date().toISOString().split('T')[0], jobCategory: 'trabajos mios' });
    setAddingToCategory(null);
  };

  const removeNote = (id: string) => {
    const note = (config.notes || []).find(n => n.id === id);
    const isTrabajo = config.calendarEvents?.some(e => e.id === id);
    
    // For 'compras' and 'notas' (when completed), we allow deletion via the custom buttons even without edit mode
    // as per the user's specific request
    const canDeleteWithoutEdit = (note?.category === 'compras') || (note?.category === 'notas' && note?.completed);

    if (note && !canDeleteWithoutEdit && !isCategoryEditMode(note.category)) {
      toast.error('Activa el modo edición (botón +) para borrar');
      return;
    }

    if (isTrabajo) {
      updateConfig(prev => ({
        ...prev,
        calendarEvents: prev.calendarEvents?.filter(e => e.id !== id)
      }));
    } else {
      const updatedNotes = (config.notes || []).filter(n => n.id !== id);
      saveNotes(updatedNotes);
    }
  };

  const toggleComplete = (id: string) => {
    const note = (config.notes || []).find(n => n.id === id);
    
    // Allow 'compras', 'notas', and 'estudios' to toggle complete without edit mode
    const canToggleWithoutEdit = (note?.category === 'compras') || (note?.category === 'notas') || (note?.category === 'estudios');

    if (note && !canToggleWithoutEdit && !isCategoryEditMode(note.category)) {
      toast.error('Activa el modo edición (botón +) para marcar como completado');
      return;
    }

    if (note?.category === 'estudios') {
      const updatedNotes = (config.notes || []).filter(n => n.id !== id);
      saveNotes(updatedNotes);
      toast.success('Estudio completado y eliminado');
      return;
    }

    const isTrabajo = config.calendarEvents?.some(e => e.id === id);
    if (isTrabajo) {
      updateConfig(prev => ({
        ...prev,
        calendarEvents: prev.calendarEvents?.map(e => e.id === id ? { ...e, isFinished: !e.isFinished } : e)
      }));
    } else {
      const updatedNotes = (config.notes || []).map(n => n.id === id ? { ...n, completed: !n.completed } : n);
      saveNotes(updatedNotes);
    }
  };

  const startEdit = (note: Note) => {
    if (!isCategoryEditMode(note.category)) {
      toast.error('Activa el modo edición (botón +) para editar');
      return;
    }
    setEditingId(note.id);
    setEditText(note.text);
    setEditFields({
      title: note.title || '',
      progress: note.progress || 0,
      link: note.link || '',
      quantity: note.quantity || '',
      startDate: note.startDate || ''
    });
  };

  const saveEdit = (id: string) => {
    const updatedNotes = (config.notes || []).map(n => n.id === id ? { 
      ...n, 
      text: editText,
      title: editFields.title,
      progress: editFields.progress,
      link: editFields.link,
      quantity: editFields.quantity,
      startDate: editFields.startDate
    } : n);
    saveNotes(updatedNotes);
    setEditingId(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeNote = (config.notes || []).find(n => n.id === activeId);
    const overCategory = ['estudios', 'recientes', 'notas', 'trabajo', 'compras'].includes(overId) 
      ? overId 
      : (config.notes || []).find(n => n.id === overId)?.category;

    if (activeNote && overCategory && activeNote.category !== overCategory) {
      if (!isCategoryEditMode(activeNote.category) || !isCategoryEditMode(overCategory)) {
        return;
      }
      const updatedNotes = (config.notes || []).map(n => n.id === activeId ? { ...n, category: overCategory as any } : n);
      updateConfig({ ...config, notes: updatedNotes });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeNote = (config.notes || []).find(n => n.id === activeId);
    if (activeNote && !isCategoryEditMode(activeNote.category)) {
      return;
    }

    if (activeId !== overId) {
      const oldIndex = (config.notes || []).findIndex(n => n.id === activeId);
      const newIndex = (config.notes || []).findIndex(n => n.id === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newNotes = arrayMove(config.notes || [], oldIndex, newIndex);
        saveNotes(newNotes);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const estudiosNotes = (config.notes || []).filter(n => n.category === 'estudios');
  const generalNotes = (config.notes || []).filter(n => n.category === 'notas');
  const comprasNotes = (config.notes || []).filter(n => n.category === 'compras');

  return (
    <div className="p-6 space-y-6 overflow-x-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Notas y Trabajo</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-full border border-gray-700">
            <div className={`w-2 h-2 rounded-full ${isShoppingEditMode ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
            <span className="text-[10px] text-gray-400 uppercase font-bold">Compras Sync</span>
          </div>
          <button onClick={refreshData} className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-600 transition-colors">
            Actualizar
          </button>
        </div>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 items-start min-w-[1200px]">
          <DroppableNoteContainer 
            id="estudios" 
            title="Estudios" 
            icon={<BookOpen size={20} />} 
            colorClass="bg-purple-900/20 border-purple-700"
            onAdd={() => toggleCategoryEditMode('estudios')}
            isEditMode={isEstudiosEditMode}
            jsonFile="estudios.json"
          >
            {isEstudiosEditMode && (
              <div className="bg-gray-800 p-4 rounded-xl border border-purple-500 space-y-3 mb-3 shadow-xl">
                <input
                  type="text"
                  value={newNoteFields.title}
                  onChange={(e) => setNewNoteFields({ ...newNoteFields, title: e.target.value })}
                  placeholder="Título del tema..."
                  className="w-full bg-gray-900 text-white rounded p-2 text-sm outline-none font-bold"
                  autoFocus
                />
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-gray-400 uppercase tracking-wider">
                    <span>Progreso</span>
                    <span>{newNoteFields.progress}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={newNoteFields.progress}
                    onChange={(e) => setNewNoteFields({ ...newNoteFields, progress: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>
                <input
                  type="text"
                  value={newNoteFields.link}
                  onChange={(e) => setNewNoteFields({ ...newNoteFields, link: e.target.value })}
                  placeholder="Link (opcional)..."
                  className="w-full bg-gray-900 text-gray-300 rounded p-2 text-xs outline-none"
                />
                <textarea
                  value={newNoteFields.text}
                  onChange={(e) => setNewNoteFields({ ...newNoteFields, text: e.target.value })}
                  placeholder="Descripción..."
                  className="w-full bg-gray-900 text-white rounded p-2 text-sm outline-none min-h-[60px]"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={() => setEstudiosEditMode(false)} className="text-xs text-gray-400 hover:text-white px-2">Cerrar</button>
                  <button onClick={() => addNote('estudios')} className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors">Guardar</button>
                </div>
              </div>
            )}
            <SortableContext items={estudiosNotes.map(n => n.id)} strategy={verticalListSortingStrategy}>
              {estudiosNotes.map((note) => (
                <SortableNote 
                  key={note.id} 
                  note={note} 
                  toggleComplete={toggleComplete} 
                  startEdit={startEdit} 
                  removeNote={removeNote} 
                  editingId={editingId} 
                  editText={editText} 
                  setEditText={setEditText} 
                  saveEdit={saveEdit}
                  editFields={editFields}
                  setEditFields={setEditFields}
                  isEditMode={isEstudiosEditMode}
                />
              ))}
            </SortableContext>
          </DroppableNoteContainer>

          <DroppableNoteContainer 
            id="notas" 
            title="Notas" 
            icon={<Home size={20} />} 
            colorClass="bg-green-900/20 border-green-700"
            onAdd={() => toggleCategoryEditMode('notas')}
            isEditMode={isNotesEditMode}
            jsonFile="notas.json"
          >
            {isNotesEditMode && (
              <div className="bg-gray-800 p-3 rounded-xl border border-green-500 space-y-2 mb-3">
                <div className="relative">
                  <textarea
                    value={newNoteFields.text}
                    onChange={(e) => setNewNoteFields({ ...newNoteFields, text: e.target.value })}
                    placeholder="Nota..."
                    className="w-full bg-gray-900 text-white rounded p-2 text-sm outline-none min-h-[80px] pr-10"
                    autoFocus
                  />
                  <button 
                    onClick={() => {
                      const recognition = new (window as any).webkitSpeechRecognition();
                      recognition.lang = 'es-ES';
                      recognition.onresult = (event: any) => {
                        const transcript = event.results[0][0].transcript;
                        setNewNoteFields({ ...newNoteFields, text: newNoteFields.text + ' ' + transcript });
                      };
                      recognition.start();
                    }}
                    className="absolute top-2 right-2 p-2 bg-green-600 hover:bg-green-500 rounded-full text-white transition-colors"
                    title="Dictar nota"
                  >
                    <Mic size={16} />
                  </button>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setNotesEditMode(false)} className="text-xs text-gray-400 hover:text-white px-2">Cerrar</button>
                  <button onClick={() => addNote('notas')} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 transition-colors">Guardar</button>
                </div>
              </div>
            )}
            <SortableContext items={generalNotes.map(n => n.id)} strategy={verticalListSortingStrategy}>
              {generalNotes.map((note) => (
                <SortableNote 
                  key={note.id} 
                  note={note} 
                  toggleComplete={toggleComplete} 
                  startEdit={startEdit} 
                  removeNote={removeNote} 
                  editingId={editingId} 
                  editText={editText} 
                  setEditText={setEditText} 
                  saveEdit={saveEdit}
                  editFields={editFields}
                  setEditFields={setEditFields}
                  isEditMode={isNotesEditMode}
                />
              ))}
            </SortableContext>
          </DroppableNoteContainer>

          <DroppableNoteContainer 
            id="trabajo" 
            title="Trabajo" 
            icon={<Briefcase size={20} />} 
            colorClass="bg-orange-900/20 border-orange-700"
            onAdd={() => setAddingToCategory('trabajo')}
          >
            {addingToCategory === 'trabajo' && (
              <div className="bg-gray-800 p-3 rounded-xl border border-orange-500 space-y-2 mb-3">
                <input
                  type="text"
                  value={newNoteFields.title}
                  onChange={(e) => setNewNoteFields({ ...newNoteFields, title: e.target.value })}
                  placeholder="Título del trabajo..."
                  className="w-full bg-gray-900 text-white rounded p-2 text-sm outline-none font-bold"
                />
                <select
                  value={newNoteFields.jobCategory}
                  onChange={(e) => setNewNoteFields({ ...newNoteFields, jobCategory: e.target.value as any })}
                  className="w-full bg-gray-900 text-white rounded p-2 text-sm outline-none"
                >
                  <option value="trabajos mios">Trabajos míos</option>
                  <option value="javer">Javer</option>
                  <option value="proyectos personales">Proyectos personales</option>
                </select>
                <input
                  type="date"
                  value={newNoteFields.startDate}
                  onChange={(e) => setNewNoteFields({ ...newNoteFields, startDate: e.target.value })}
                  className="w-full bg-gray-900 text-white rounded p-2 text-sm outline-none"
                />
                <textarea
                  value={newNoteFields.text}
                  onChange={(e) => setNewNoteFields({ ...newNoteFields, text: e.target.value })}
                  placeholder="Descripción del trabajo..."
                  className="w-full bg-gray-900 text-white rounded p-2 text-sm outline-none min-h-[80px]"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setAddingToCategory(null)} className="text-xs text-gray-400 hover:text-white px-2">Cancelar</button>
                  <button onClick={() => addNote('trabajo')} className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-700 transition-colors">Guardar</button>
                </div>
              </div>
            )}
            <SortableContext items={config.calendarEvents.filter(e => e.type === 'trabajo' && !e.isFinished).map(e => e.id)} strategy={verticalListSortingStrategy}>
              {config.calendarEvents.filter(e => e.type === 'trabajo' && !e.isFinished).map((event) => (
                <SortableNote 
                  key={event.id} 
                  note={{
                    id: event.id,
                    title: `${event.jobCategory || 'Trabajo'}: ${event.title}`,
                    text: event.description || '',
                    category: 'trabajo',
                    completed: false,
                    startDate: event.date
                  }} 
                  toggleComplete={toggleComplete} 
                  startEdit={startEdit} 
                  removeNote={removeNote} 
                  editingId={editingId} 
                  editText={editText} 
                  setEditText={setEditText} 
                  saveEdit={saveEdit}
                  editFields={editFields}
                  setEditFields={setEditFields}
                  isEditMode={true}
                />
              ))}
            </SortableContext>
          </DroppableNoteContainer>

          <DroppableNoteContainer 
            id="compras" 
            title="Compras" 
            icon={<ShoppingCart size={20} />} 
            colorClass="bg-red-900/20 border-red-700"
            onAdd={() => toggleCategoryEditMode('compras')}
            isEditMode={isShoppingEditMode}
            jsonFile="compras.json"
          >
            {isShoppingEditMode && (
              <div className="bg-gray-800 p-3 rounded-xl border border-red-500 space-y-2 mb-3">
                <input
                  type="text"
                  value={newNoteFields.quantity}
                  onChange={(e) => setNewNoteFields({ ...newNoteFields, quantity: e.target.value })}
                  placeholder="Cantidad (ej: 2kg)..."
                  className="w-full bg-gray-900 text-white rounded p-2 text-sm outline-none"
                />
                <textarea
                  value={newNoteFields.text}
                  onChange={(e) => setNewNoteFields({ ...newNoteFields, text: e.target.value })}
                  placeholder="Lista de compras..."
                  className="w-full bg-gray-900 text-white rounded p-2 text-sm outline-none min-h-[80px]"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShoppingEditMode(false)} className="text-xs text-gray-400 hover:text-white px-2">Cerrar</button>
                  <button onClick={() => addNote('compras')} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700 transition-colors">Guardar</button>
                </div>
              </div>
            )}
            <SortableContext items={comprasNotes.map(n => n.id)} strategy={verticalListSortingStrategy}>
              {comprasNotes.map((note) => (
                <SortableNote 
                  key={note.id} 
                  note={note} 
                  toggleComplete={toggleComplete} 
                  startEdit={startEdit} 
                  removeNote={removeNote} 
                  editingId={editingId} 
                  editText={editText} 
                  setEditText={setEditText} 
                  saveEdit={saveEdit}
                  editFields={editFields}
                  setEditFields={setEditFields}
                  isEditMode={isShoppingEditMode}
                />
              ))}
            </SortableContext>
          </DroppableNoteContainer>
        </div>
      </DndContext>
    </div>
  );
};

export default NotesTab;
