import React, { useState } from 'react';
import { StickyNote } from './types';
import { StickyNote as NoteIcon, Plus, Trash2, Check } from 'lucide-react';

interface NotesViewProps {
  notes: StickyNote[];
  onAddNote: (note: StickyNote) => void;
  onUpdateNote: (note: StickyNote) => void;
  onDeleteNote: (id: string) => void;
}

const NotesView: React.FC<NotesViewProps> = ({ notes, onAddNote, onUpdateNote, onDeleteNote }) => {
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  
  const defaultColor = 'bg-yellow-100 border-yellow-200 text-slate-900';

  const handleAdd = () => {
    if (!newNoteContent.trim()) return;
    onAddNote({
      id: Date.now().toString(),
      content: newNoteContent,
      color: defaultColor,
      createdAt: new Date().toLocaleDateString()
    });
    setNewNoteContent('');
  };

  const startEditing = (note: StickyNote) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const saveEdit = () => {
    if (editingId && editContent.trim()) {
      const note = notes.find(n => n.id === editingId);
      if (note) {
        onUpdateNote({ ...note, content: editContent });
      }
    }
    setEditingId(null);
    setEditContent('');
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 p-6 overflow-hidden">
       {/* Header */}
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <NoteIcon className="w-6 h-6 text-yellow-500" />
            Notas Rápidas
          </h2>
          <p className="text-slate-500 text-sm">Apuntes al azar, ideas volátiles y recordatorios simples.</p>
        </div>
      </div>

      {/* Input Area */}
      <div className="mb-8 max-w-2xl mx-auto w-full relative">
          <textarea 
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="Escribe una nota rápida aquí..."
            className="w-full p-4 pr-12 rounded-xl border border-yellow-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-500 resize-none h-24 bg-yellow-100 text-slate-900 font-bold placeholder-yellow-700/50"
            onKeyDown={(e) => {
                if(e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAdd();
                }
            }}
          />
          <button 
            onClick={handleAdd}
            disabled={!newNoteContent.trim()}
            className="absolute bottom-4 right-4 p-2 bg-yellow-400 hover:bg-yellow-500 text-white rounded-lg disabled:opacity-50 transition-colors shadow-sm"
          >
              <Plus className="w-5 h-5" />
          </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-10">
              {notes.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center text-slate-300 mt-10">
                      <NoteIcon className="w-16 h-16 mb-2 opacity-20" />
                      <p>Tus notas aparecerán aquí</p>
                  </div>
              )}
              {notes.map(note => (
                  <div 
                    key={note.id} 
                    className="p-5 rounded-lg border shadow-sm relative group bg-yellow-100 border-yellow-200 h-auto min-h-[160px] flex flex-col"
                    onClick={() => !editingId && startEditing(note)}
                  >
                      {editingId === note.id ? (
                        <div className="flex-1 flex flex-col h-full" onClick={e => e.stopPropagation()}>
                           <textarea 
                             className="w-full flex-1 bg-transparent border-none resize-none focus:outline-none font-bold text-slate-900 text-sm"
                             value={editContent}
                             onChange={e => setEditContent(e.target.value)}
                             autoFocus
                             onBlur={saveEdit}
                           />
                           <button onClick={saveEdit} className="self-end p-1 text-green-600 hover:bg-green-100 rounded">
                             <Check className="w-4 h-4" />
                           </button>
                        </div>
                      ) : (
                        <>
                          <button 
                            onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }}
                            className="absolute top-2 right-2 p-1 text-yellow-800/30 hover:text-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                              <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="flex-1 whitespace-pre-wrap font-bold text-slate-800 text-sm leading-relaxed font-sans cursor-text">
                              {note.content}
                          </div>
                          <div className="mt-4 pt-2 border-t border-black/5 text-[10px] opacity-50 flex justify-between text-slate-600">
                              <span>{note.createdAt}</span>
                          </div>
                        </>
                      )}
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
};

export default NotesView;
