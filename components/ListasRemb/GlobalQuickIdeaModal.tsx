import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mic, Sparkles } from 'lucide-react';
import { EventIdeaRecorder } from './EventIdeaRecorder';
import { addQuickIdeaToCloud } from './services/listasSyncService';
import { DEFAULT_LISTS } from './constants';
import { toast } from 'sonner';

interface GlobalQuickIdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoStart?: boolean;
}

export const GlobalQuickIdeaModal: React.FC<GlobalQuickIdeaModalProps> = ({
  isOpen,
  onClose,
  autoStart = false
}) => {
  const [categories, setCategories] = useState<string[]>(DEFAULT_LISTS);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    try {
      const backupStr = localStorage.getItem('remb-backup-data');
      if (backupStr) {
        const parsed = JSON.parse(backupStr);
        if (parsed.lists && Array.isArray(parsed.lists) && parsed.lists.length > 0) {
          setCategories(parsed.lists);
        }
      }
    } catch (e) {}
  }, [isOpen]);

  const handleAddIdea = async (idea: {
    title: string;
    category: string;
    notes?: string;
    priority?: 'Alta' | 'Media' | 'Baja';
  }) => {
    setIsSaving(true);
    const toastId = toast.loading('Guardando idea en la nube (Listas Remb)...');
    try {
      const ok = await addQuickIdeaToCloud(idea);
      if (ok) {
        toast.success(`¡Idea guardada en "${idea.category}"!`, { id: toastId });
        onClose();
      } else {
        toast.error('Error al guardar en la nube. Se guardó localmente.', { id: toastId });
        onClose();
      }
    } catch (err) {
      toast.error('Ocurrió un error al guardar', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-gradient-to-b from-gray-950 via-gray-900 to-black border border-purple-500/30 rounded-3xl p-4 sm:p-7 shadow-[0_15px_60px_rgba(168,85,247,0.25)] relative"
          >
            {/* Top glowing ambient line */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-white/10 mb-3.5">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 p-0.5 shadow-lg shadow-purple-500/30 flex items-center justify-center shrink-0">
                  <div className="w-full h-full bg-gray-950 rounded-[14px] flex items-center justify-center">
                    <Mic size={18} className="text-pink-400 animate-pulse" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm sm:text-lg font-black text-white flex items-center gap-1.5">
                    Captura Rápida de Ideas y Voz
                    <Sparkles size={15} className="text-amber-400" />
                  </h3>
                  <p className="text-[11px] sm:text-xs text-zinc-400">
                    Habla o escribe tu idea: la IA la estructura y la guarda en tus Listas Remb al instante.
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all shrink-0 cursor-pointer"
                title="Cerrar (Esc)"
              >
                <X size={20} />
              </button>
            </div>

            {/* Recorder Body */}
            <div className="relative">
              <EventIdeaRecorder
                availableCategories={categories}
                onAddIdea={handleAddIdea}
                autoStart={autoStart}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
