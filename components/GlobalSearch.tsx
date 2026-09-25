import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLinks } from '../contexts/LinkContext';
import { 
  Search, 
  Terminal, 
  Link as LinkIcon, 
  FileText, 
  Calendar, 
  CreditCard, 
  TrendingUp, 
  LayoutDashboard, 
  Settings, 
  Save, 
  RefreshCw, 
  Database, 
  ExternalLink, 
  Sparkles,
  Heart,
  Mail,
  Lock,
  Box,
  Video,
  ArrowRight,
  Clock,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LinkItem, Command, TabConfig } from '../types';
import { toast } from 'sonner';

type SearchCategory = 'all' | 'tab' | 'note' | 'calendar' | 'finance' | 'command' | 'link' | 'system';

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  category: SearchCategory;
  categoryLabel: string;
  categoryColor: string;
  icon: React.ReactNode;
  action: () => void;
}

export const GlobalSearch: React.FC = () => {
  const { 
    config, 
    activeTabId, 
    setActiveTabId, 
    toggleEditing, 
    saveToSupabase, 
    fetchConfigFromSupabaseManual 
  } = useLinks();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SearchCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut Ctrl+K / Cmd+K and Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input and reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
      setQuery('');
      setSelectedCategory('all');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keep selected item visible while navigating with arrow keys
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [selectedIndex]);

  // Build the searchable items index
  const allResults = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    const items: SearchResult[] = [];

    // Helper to find tab icon
    const getTabIcon = (key?: string) => {
      switch (key) {
        case 'Generador de Email': return <Mail size={16} className="text-purple-400" />;
        case 'Comandos': return <Terminal size={16} className="text-emerald-400" />;
        case 'Herramientas Útiles': return <Sparkles size={16} className="text-blue-400" />;
        case 'Calendario': return <Calendar size={16} className="text-emerald-400" />;
        case 'Credenciales': return <Lock size={16} className="text-rose-400" />;
        case 'Finanzas': return <TrendingUp size={16} className="text-amber-400" />;
        case 'Notas': return <FileText size={16} className="text-yellow-400" />;
        case 'Nutricion': return <Heart size={16} className="text-red-400" />;
        case 'Generador de Video': return <Video size={16} className="text-indigo-400" />;
        case 'Impresión 3D': return <Box size={16} className="text-cyan-400" />;
        case 'Base de Datos': return <Database size={16} className="text-blue-400" />;
        default: return <Layers size={16} className="text-indigo-400" />;
      }
    };

    // 1. SYSTEM & CUSTOM TABS
    config.tabs?.forEach((tab: TabConfig) => {
      const match = !q || 
        tab.label.toLowerCase().includes(q) || 
        (tab.componentKey && tab.componentKey.toLowerCase().includes(q)) ||
        tab.id.toLowerCase().includes(q);

      if (match) {
        items.push({
          id: `tab-${tab.id}`,
          title: tab.label,
          subtitle: tab.type === 'custom' ? 'Pestaña personalizada de enlaces' : `Pestaña del sistema (${tab.componentKey || tab.label})`,
          category: 'tab',
          categoryLabel: 'Pestaña',
          categoryColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          icon: getTabIcon(tab.componentKey),
          action: () => {
            setActiveTabId(tab.id);
            setIsOpen(false);
            toast.info(`Navegando a: ${tab.label}`);
          }
        });
      }
    });

    // 2. QUICK SYSTEM ACTIONS
    const systemActions = [
      {
        id: 'sys-edit-mode',
        title: 'Alternar Modo Edición / Personalizar',
        subtitle: 'Reorganizar, editar enlaces, widgets y pestañas',
        keywords: 'personalizar editar reorganizar dock widgets mover',
        icon: <Settings size={16} className="text-amber-400" />,
        action: () => {
          toggleEditing();
          setIsOpen(false);
          toast.success("Modo Edición alternado");
        }
      },
      {
        id: 'sys-save-cloud',
        title: 'Guardar configuración en Supabase',
        subtitle: 'Sincronizar cambios actuales en la nube',
        keywords: 'guardar nube supabase sync respaldo backup salvar',
        icon: <Save size={16} className="text-emerald-400" />,
        action: () => {
          saveToSupabase();
          setIsOpen(false);
        }
      },
      {
        id: 'sys-sync-cloud',
        title: 'Recargar configuración desde Supabase',
        subtitle: 'Descargar la última versión guardada en la nube',
        keywords: 'recargar actualizar descargar supabase nube sync cloud',
        icon: <RefreshCw size={16} className="text-sky-400" />,
        action: () => {
          fetchConfigFromSupabaseManual();
          setIsOpen(false);
        }
      },
      {
        id: 'sys-db-viewer',
        title: 'Visor de Base de Datos y APIs',
        subtitle: 'Gestionar tablas de Supabase, tokens y Google Calendar',
        keywords: 'base datos supabase database credenciales apis sql cloud',
        icon: <Database size={16} className="text-blue-400" />,
        action: () => {
          setActiveTabId('database');
          setIsOpen(false);
          toast.info("Abriendo visor de Base de Datos");
        }
      }
    ];

    systemActions.forEach(act => {
      const match = !q || 
        act.title.toLowerCase().includes(q) || 
        act.subtitle.toLowerCase().includes(q) || 
        act.keywords.includes(q);

      if (match) {
        items.push({
          id: act.id,
          title: act.title,
          subtitle: act.subtitle,
          category: 'system',
          categoryLabel: 'Sistema',
          categoryColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          icon: act.icon,
          action: act.action
        });
      }
    });

    // 3. NOTES
    config.notes?.forEach((note, idx) => {
      const titleMatch = note.title && note.title.toLowerCase().includes(q);
      const textMatch = note.text && note.text.toLowerCase().includes(q);
      const catMatch = note.category && note.category.toLowerCase().includes(q);

      if (!q || titleMatch || textMatch || catMatch) {
        const displayTitle = note.title || (note.text.length > 60 ? note.text.substring(0, 60) + '...' : note.text);
        items.push({
          id: `note-${note.id || idx}`,
          title: displayTitle,
          subtitle: `Categoría: ${note.category} ${note.completed ? '· (Completada)' : ''}`,
          category: 'note',
          categoryLabel: 'Nota',
          categoryColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
          icon: <FileText size={16} className="text-yellow-400" />,
          action: () => {
            setActiveTabId('notas');
            navigator.clipboard.writeText(note.text);
            toast.success("Nota copiada al portapapeles y navegando a Notas");
            setIsOpen(false);
          }
        });
      }
    });

    // 4. CALENDAR EVENTS & TOKENS
    config.calendarEvents?.forEach((ev, idx) => {
      const titleMatch = ev.title.toLowerCase().includes(q);
      const descMatch = ev.description?.toLowerCase().includes(q);
      const dateMatch = ev.date?.toLowerCase().includes(q);

      if (!q || titleMatch || descMatch || dateMatch) {
        items.push({
          id: `calev-${ev.id || idx}`,
          title: ev.title,
          subtitle: `${ev.date}${ev.time ? ` · ${ev.time}` : ''}${ev.type ? ` · ${ev.type}` : ''}${ev.description ? ` · ${ev.description}` : ''}`,
          category: 'calendar',
          categoryLabel: 'Calendario',
          categoryColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
          icon: <Calendar size={16} className="text-teal-400" />,
          action: () => {
            setActiveTabId('calendar');
            toast.info(`Evento: ${ev.title} (${ev.date})`);
            setIsOpen(false);
          }
        });
      }
    });

    config.calendarTokens?.forEach((token, idx) => {
      const match = !q || 
        token.name.toLowerCase().includes(q) || 
        token.symbol.toLowerCase().includes(q);

      if (match) {
        items.push({
          id: `caltok-${token.id || idx}`,
          title: `${token.symbol} ${token.name}`,
          subtitle: `Token recurrente cada ${token.intervalDays} días · Próximo: ${token.currentActiveDate}`,
          category: 'calendar',
          categoryLabel: 'Calendario',
          categoryColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
          icon: <Clock size={16} className="text-teal-400" />,
          action: () => {
            setActiveTabId('calendar');
            setIsOpen(false);
          }
        });
      }
    });

    // 5. FINANCES (Cards & Financial Items)
    config.finanzasCards?.forEach((card, idx) => {
      const match = !q || 
        card.name.toLowerCase().includes(q) || 
        card.type.toLowerCase().includes(q);

      if (match) {
        items.push({
          id: `fincard-${card.id || idx}`,
          title: card.name,
          subtitle: `Tarjeta ${card.type.toUpperCase()} · Saldo: $${Number(card.balance || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}${card.cutoffDate ? ` · Corte: día ${card.cutoffDate}` : ''}`,
          category: 'finance',
          categoryLabel: 'Finanzas',
          categoryColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          icon: <CreditCard size={16} className="text-amber-400" />,
          action: () => {
            setActiveTabId('finanzas');
            toast.info(`Consultando ${card.name} en Finanzas`);
            setIsOpen(false);
          }
        });
      }
    });

    config.financialItems?.forEach((fItem, idx) => {
      const match = !q || 
        fItem.name.toLowerCase().includes(q) || 
        fItem.type.toLowerCase().includes(q) ||
        fItem.description?.toLowerCase().includes(q);

      if (match) {
        items.push({
          id: `finitem-${fItem.id || idx}`,
          title: fItem.name,
          subtitle: `${fItem.type === 'deuda' ? 'Deuda' : 'Meta de Ahorro'} · Actual: $${Number(fItem.currentAmount || 0).toLocaleString('es-MX')} / Total: $${Number(fItem.totalAmount || 0).toLocaleString('es-MX')}`,
          category: 'finance',
          categoryLabel: 'Finanzas',
          categoryColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          icon: <TrendingUp size={16} className="text-amber-400" />,
          action: () => {
            setActiveTabId('finanzas');
            setIsOpen(false);
          }
        });
      }
    });

    // 6. COMMANDS & SHORTCUTS
    config.commands?.forEach((cmd: Command) => {
      const match = !q || 
        cmd.title.toLowerCase().includes(q) || 
        cmd.command.toLowerCase().includes(q) || 
        cmd.description?.toLowerCase().includes(q) ||
        cmd.program?.toLowerCase().includes(q);

      if (match) {
        items.push({
          id: `cmd-${cmd.id}`,
          title: cmd.title,
          subtitle: `${cmd.program} · ${cmd.command}`,
          category: 'command',
          categoryLabel: 'Comando',
          categoryColor: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
          icon: <Terminal size={16} className="text-violet-400" />,
          action: () => {
            if (cmd.type === 'shortcut') {
              window.open(cmd.command, '_blank');
              toast.info(`Abriendo atajo: ${cmd.title}`);
            } else {
              navigator.clipboard.writeText(cmd.command);
              toast.success(`Comando copiado: ${cmd.command}`);
            }
            setIsOpen(false);
          }
        });
      }
    });

    // 7. LINKS & BOOKMARKS
    const allLinks: { link: LinkItem; source: string }[] = [
      ...config.linksBar.map(l => ({ link: l, source: 'Barra Principal' })),
      ...config.googleDock.map(l => ({ link: l, source: 'Google Dock' })),
      ...config.aiSidebar.models.map(l => ({ link: l, source: 'Modelos IA' })),
      ...config.aiSidebar.quickAccess.map(l => ({ link: l, source: 'Accesos IA' })),
      ...config.rightSidebar.flatMap(s => s.items.map(l => ({ link: l, source: s.title }))),
      ...config.usefulTools.flatMap(s => s.items.map(l => ({ link: l, source: s.title }))),
      ...config.tabs.flatMap(t => (t.items || []).map(l => ({ link: l, source: `Pestaña ${t.label}` })))
    ];

    allLinks.forEach(({ link, source }) => {
      const match = !q || 
        link.name.toLowerCase().includes(q) || 
        link.description?.toLowerCase().includes(q) ||
        link.href.toLowerCase().includes(q);

      if (match) {
        items.push({
          id: `link-${link.id}-${source}`,
          title: link.name,
          subtitle: link.description ? `${link.description} · ${source}` : source,
          category: 'link',
          categoryLabel: 'Enlace',
          categoryColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
          icon: <ExternalLink size={16} className="text-blue-400" />,
          action: () => {
            window.open(link.href, '_blank');
            setIsOpen(false);
          }
        });
      }
    });

    return items;
  }, [config, query, setActiveTabId, toggleEditing, saveToSupabase, fetchConfigFromSupabaseManual]);

  // Filter by active category tab if selected
  const filteredResults = useMemo(() => {
    if (selectedCategory === 'all') return allResults;
    return allResults.filter(item => item.category === selectedCategory);
  }, [allResults, selectedCategory]);

  // Deduplicate results by title & category combination to avoid cluttered duplicates
  const uniqueResults = useMemo(() => {
    const seen = new Set<string>();
    const res: SearchResult[] = [];
    for (const item of filteredResults) {
      const key = `${item.category}-${item.title}-${item.subtitle}`;
      if (!seen.has(key)) {
        seen.add(key);
        res.push(item);
      }
    }
    return res;
  }, [filteredResults]);

  // Keep index clamped
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, selectedCategory]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < uniqueResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : uniqueResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (uniqueResults[selectedIndex]) {
        uniqueResults[selectedIndex].action();
      }
    }
  };

  const categories: { id: SearchCategory; label: string }[] = [
    { id: 'all', label: 'Todo' },
    { id: 'tab', label: 'Pestañas' },
    { id: 'system', label: 'Sistema' },
    { id: 'note', label: 'Notas' },
    { id: 'calendar', label: 'Calendario' },
    { id: 'finance', label: 'Finanzas' },
    { id: 'command', label: 'Comandos' },
    { id: 'link', label: 'Enlaces' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-xl z-[9999]"
            onClick={() => setIsOpen(false)}
          />

          {/* Dialog Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="fixed top-[10%] left-1/2 -translate-x-1/2 w-full max-w-3xl glass-panel-heavy rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.8)] border border-white/15 z-[10000] overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Search Input Bar */}
            <div className="flex items-center px-6 py-4.5 border-b border-white/10 bg-white/[0.03]">
              <Search className="text-purple-400 mr-3 flex-shrink-0" size={22} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar pestañas, notas, eventos, finanzas, comandos o enlaces..."
                className="flex-1 bg-transparent border-none outline-none text-white text-xl placeholder-gray-400 font-normal tracking-wide px-1"
              />
              {query && (
                <button 
                  onClick={() => setQuery('')}
                  className="text-xs text-gray-400 hover:text-white px-2 py-1 mr-2 rounded hover:bg-white/10 transition-colors"
                >
                  Limpiar
                </button>
              )}
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
                title="Cerrar (ESC)"
              >
                <kbd className="bg-white/10 border border-white/15 px-2.5 py-1 rounded-lg text-xs font-mono font-medium text-gray-300 shadow-sm">
                  ESC
                </kbd>
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 px-6 py-2.5 border-b border-white/5 bg-black/20 overflow-x-auto no-scrollbar text-xs">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full transition-all duration-150 whitespace-nowrap font-medium ${
                    selectedCategory === cat.id
                      ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(147,51,234,0.4)]'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
              <div className="ml-auto text-gray-500 font-mono text-[11px] pr-1">
                {uniqueResults.length} {uniqueResults.length === 1 ? 'resultado' : 'resultados'}
              </div>
            </div>
            
            {/* Results List */}
            <div ref={listRef} className="overflow-y-auto custom-scrollbar flex-1 p-3.5 max-h-[55vh]">
              {uniqueResults.length === 0 ? (
                <div className="py-14 text-center text-gray-400 flex flex-col items-center justify-center">
                  <Search className="mb-3 opacity-25 text-purple-400" size={44} />
                  <p className="text-base text-gray-300 font-medium">No se encontraron resultados para "{query}"</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm">
                    Prueba buscando por nombre de pestaña, evento de calendario, nota, comando o enlace.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {uniqueResults.map((result, index) => {
                    const isSelected = selectedIndex === index;
                    return (
                      <div
                        key={result.id}
                        ref={isSelected ? selectedItemRef : null}
                        onClick={result.action}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`group flex items-center gap-3.5 p-3 rounded-2xl cursor-pointer transition-all duration-150 border ${
                          isSelected 
                            ? 'bg-gradient-to-r from-purple-600/30 via-indigo-600/20 to-transparent border-purple-400/40 shadow-[0_0_20px_rgba(147,51,234,0.15)] translate-x-1' 
                            : 'hover:bg-white/[0.04] border-transparent'
                        }`}
                      >
                        {/* Icon */}
                        <div className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${
                          isSelected 
                            ? 'bg-purple-500/25 text-white ring-1 ring-purple-400/40' 
                            : 'bg-white/5 text-gray-400 group-hover:text-gray-200'
                        }`}>
                          {result.icon}
                        </div>

                        {/* Title & Subtitle */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className={`text-sm font-semibold truncate transition-colors ${
                              isSelected ? 'text-white' : 'text-gray-200 group-hover:text-white'
                            }`}>
                              {result.title}
                            </h4>
                          </div>
                          {result.subtitle && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">
                              {result.subtitle}
                            </p>
                          )}
                        </div>

                        {/* Category Badge & Action Hint */}
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border ${result.categoryColor}`}>
                            {result.categoryLabel}
                          </span>
                          <div className={`transition-opacity ${isSelected ? 'opacity-100 text-purple-300' : 'opacity-0'}`}>
                            <ArrowRight size={15} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer / Shortcuts reminder */}
            <div className="px-6 py-2.5 bg-black/40 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400 font-sans">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-300">↑</kbd>
                  <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-300">↓</kbd> Navegar
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-300">↵</kbd> Seleccionar
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-300">ESC</kbd> Cerrar
                </span>
              </div>
              <span className="text-purple-400 font-medium hidden sm:inline">
                Rembrandt IA Command Palette
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
