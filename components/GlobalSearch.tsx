import React, { useState, useEffect, useRef } from 'react';
import { useLinks } from '../contexts/LinkContext';
import { Search, Command as CmdIcon, Link as LinkIcon, FileText, Wrench } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LinkItem, Command } from '../types';

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: 'link' | 'command' | 'note' | 'tool';
  icon: React.ReactNode;
  action: () => void;
}

export const GlobalSearch: React.FC = () => {
  const { config } = useLinks();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const results: SearchResult[] = [];

  if (query.trim()) {
    const q = query.toLowerCase();

    // Search Links
    const allLinks: LinkItem[] = [
      ...config.linksBar,
      ...config.googleDock,
      ...config.aiSidebar.models,
      ...config.aiSidebar.quickAccess,
      ...config.rightSidebar.flatMap(s => s.items),
      ...config.usefulTools.flatMap(s => s.items),
      ...config.tabs.flatMap(t => t.items || [])
    ];

    allLinks.forEach(link => {
      if (link.name.toLowerCase().includes(q) || link.description?.toLowerCase().includes(q)) {
        results.push({
          id: link.id,
          title: link.name,
          subtitle: link.description || 'Enlace',
          type: 'link',
          icon: <LinkIcon size={16} className="text-blue-400" />,
          action: () => {
            window.open(link.href, '_blank');
            setIsOpen(false);
          }
        });
      }
    });

    // Search Commands
    config.commands?.forEach(cmd => {
      if (cmd.title.toLowerCase().includes(q) || cmd.command.toLowerCase().includes(q) || cmd.description?.toLowerCase().includes(q)) {
        results.push({
          id: cmd.id,
          title: cmd.title,
          subtitle: `${cmd.program} - ${cmd.command}`,
          type: 'command',
          icon: <CmdIcon size={16} className="text-purple-400" />,
          action: () => {
            if (cmd.type === 'shortcut') {
              window.open(cmd.command, '_blank');
            } else {
              navigator.clipboard.writeText(cmd.command);
            }
            setIsOpen(false);
          }
        });
      }
    });

    // Search Notes
    config.notes?.forEach(note => {
      if (note.text.toLowerCase().includes(q)) {
        results.push({
          id: note.id,
          title: note.text.substring(0, 50) + (note.text.length > 50 ? '...' : ''),
          subtitle: `Nota en ${note.category}`,
          type: 'note',
          icon: <FileText size={16} className="text-yellow-400" />,
          action: () => {
            // Can't easily navigate to notes tab and highlight, but we can close
            setIsOpen(false);
          }
        });
      }
    });
  }

  // Deduplicate results by ID just in case
  const uniqueResults = Array.from(new Map(results.map(item => [item.id, item])).values());

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < uniqueResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (uniqueResults[selectedIndex]) {
        uniqueResults[selectedIndex].action();
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-xl z-[9999]"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.95, y: -20, filter: 'blur(10px)' }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-3xl glass-panel-heavy rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 z-[10000] overflow-hidden flex flex-col max-h-[70vh]"
          >
            <div className="flex items-center px-6 py-5 border-b border-white/10 bg-white/5">
              <Search className="text-gray-400 mr-3" size={20} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar enlaces, comandos, notas... (Cmd+K)"
                className="flex-1 bg-transparent border-none outline-none text-white text-2xl placeholder-gray-400 font-light tracking-wide px-2"
              />
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-gray-400 hover:text-white transition-colors"
                title="Cerrar (ESC)"
              >
                <kbd className="bg-white/10 border border-white/10 backdrop-blur px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold">ESC</kbd>
              </button>
            </div>
            
            <div className="overflow-y-auto custom-scrollbar flex-1 p-3">
              {query.trim() === '' ? (
                <div className="p-8 text-center text-gray-500">
                  <Search className="mx-auto mb-3 opacity-20" size={48} />
                  <p>Escribe para buscar en todo tu espacio de trabajo.</p>
                </div>
              ) : uniqueResults.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No se encontraron resultados para "{query}".</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {uniqueResults.map((result, index) => (
                    <div
                      key={result.id}
                      onClick={result.action}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`flex items-center gap-4 p-3.5 rounded-2xl cursor-pointer transition-all duration-200 ${
                        selectedIndex === index ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/30 border border-purple-400/30 shadow-[0_0_15px_rgba(147,51,234,0.1)] scale-[1.01]' : 'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl flex items-center justify-center transition-colors ${selectedIndex === index ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-gray-400'}`}>
                        {result.icon}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <h4 className="text-white font-medium truncate">{result.title}</h4>
                        {result.subtitle && <p className="text-xs text-gray-400 truncate">{result.subtitle}</p>}
                      </div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider font-bold">
                        {result.type}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
