import React, { useState, useRef } from 'react';
import { useLinks } from '../contexts/LinkContext';
import { Copy, Plus, Trash2, Pencil, FolderPlus, Folder, ChevronDown, ChevronRight, RefreshCw, Upload, Brain } from 'lucide-react';
import { Command, CommandGroup } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableCommandCardProps {
  cmd: Command;
  onEdit: (cmd: Command) => void;
  onDelete: (id: string) => void;
  onCopy: (text: string) => void;
  onColorChange: (id: string, color: string) => void;
}

import { toast } from 'sonner';

const DroppableGroupContainer: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const { setNodeRef } = useDroppable({ id });
  return <div ref={setNodeRef} className="min-h-[100px]">{children}</div>;
};

const SortableCommandCard: React.FC<SortableCommandCardProps> = ({ cmd, onEdit, onDelete, onCopy, onColorChange }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cmd.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    borderColor: cmd.program === 'AutoCAD' ? '#dc2626' : (cmd.color || '#6b7280'),
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  const handleClick = () => {
    if (cmd.type === 'shortcut') {
      window.open(cmd.command, '_blank');
    } else {
      onCopy(cmd.command);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className="relative group flex flex-col items-center justify-center p-1 rounded-lg border-t-[6px] transition-all cursor-pointer bg-gray-800 hover:bg-gray-700 h-20 touch-none"
      title={`${cmd.description || ''}\n\n${cmd.type === 'shortcut' ? 'Acción' : 'Comando'}: ${cmd.command}`}
    >
      <div className="absolute top-[-6px] left-0 right-0 text-white text-[8px] font-bold text-center py-0.5 rounded-t-sm flex justify-center gap-1 px-1 pointer-events-none" style={{ backgroundColor: cmd.program === 'AutoCAD' ? '#dc2626' : (cmd.color || '#6b7280') }}>
        <span className="opacity-70">{cmd.program.toUpperCase()}</span>
        <span>•</span>
        <span>{cmd.type === 'shortcut' ? 'SHORTCUT' : 'COMANDO'}</span>
      </div>
      
      {cmd.type === 'shortcut' ? (
        <div className="flex flex-col items-center mt-1 w-full pointer-events-none">
          <span className="font-mono text-sm font-black text-purple-400 leading-tight drop-shadow-sm text-center break-all px-1">
            {cmd.shortcut.toUpperCase()}
          </span>
          <span className="text-[8px] text-gray-400 mt-0.5 font-bold text-center line-clamp-1 px-1 uppercase tracking-tight">
            {cmd.title}
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-center mt-1 w-full pointer-events-none">
          <span className="font-semibold text-[10px] text-center line-clamp-2 px-1 uppercase">
            {cmd.title}
          </span>
          {cmd.shortcut && (
            <span className="text-[8px] text-gray-400 mt-0.5 font-mono opacity-60">
              {cmd.shortcut.toUpperCase()}
            </span>
          )}
        </div>
      )}
      <div className="absolute top-0.5 right-0.5 flex gap-0.5">
        <input
          type="color"
          value={cmd.color || '#6b7280'}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => { e.stopPropagation(); onColorChange(cmd.id, e.target.value); }}
          className="w-3 h-3 cursor-pointer opacity-0 group-hover:opacity-100 bg-transparent"
          title="Cambiar color"
        />
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(cmd); }}
          className="text-gray-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
        >
          <Pencil size={10} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(cmd.id); }}
          className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
        >
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  );
};

interface CommandsTabProps {
  programFilter?: string;
}

const CommandsTab: React.FC<CommandsTabProps> = ({ programFilter: initialFilter }) => {
  const { config, updateConfig, saveToSupabase, fetchConfigFromSupabaseManual, loadConfigFromFile } = useLinks();
  const [activeFilter, setActiveFilter] = useState<string>(initialFilter || 'All');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      loadConfigFromFile(file);
      event.target.value = '';
    }
  };
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const [newCommand, setNewCommand] = useState<Omit<Command, 'id'>>({
    title: '',
    program: activeFilter !== 'All' ? activeFilter : 'Windows',
    command: '',
    description: '',
    color: '#3b82f6',
    shortcut: '',
    type: 'command',
    groupId: undefined
  });

  const commands = config.commands || [];
  const groups = config.commandGroups || [];
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ 'ungrouped': true });
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');

  const handleRenameGroup = (groupId: string) => {
    if (editingGroupName.trim()) {
      updateConfig(prev => ({
        ...prev,
        commandGroups: (prev.commandGroups || []).map(g => 
          g.id === groupId ? { ...g, name: editingGroupName.trim() } : g
        )
      }));
    }
    setEditingGroupId(null);
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const [showNewGroupPrompt, setShowNewGroupPrompt] = useState(false);
  const [promptGroupName, setPromptGroupName] = useState('');

  const handleCreateGroupFromPrompt = () => {
    if (promptGroupName.trim()) {
      const newGroup = {
        id: `group-${Date.now()}`,
        name: promptGroupName.trim(),
        color: '#6b7280'
      };
      updateConfig(prev => ({
        ...prev,
        commandGroups: [...(prev.commandGroups || []), newGroup]
      }));
      setNewCommand({ ...newCommand, groupId: newGroup.id });
    }
    setShowNewGroupPrompt(false);
    setPromptGroupName('');
  };

  const addGroup = () => {
    if (!newGroupName.trim()) return;
    const group: CommandGroup = {
      id: Date.now().toString(),
      name: newGroupName.trim(),
      color: '#6b7280'
    };
    updateConfig(prev => ({
      ...prev,
      commandGroups: [...(prev.commandGroups || []), group]
    }));
    setNewGroupName('');
  };

  const deleteGroup = (id: string) => {
    if (window.confirm('¿Borrar este grupo? Los comandos volverán a "Sin Grupo".')) {
      updateConfig(prev => ({
        ...prev,
        commandGroups: (prev.commandGroups || []).filter(g => g.id !== id),
        commands: (prev.commands || []).map(c => c.groupId === id ? { ...c, groupId: undefined } : c)
      }));
    }
  };

  const defaultCommands: Command[] = [
    { id: 'def-1', title: 'Copiar', program: 'Windows', command: 'Ctrl+C', description: 'Copiar selección', color: '#3b82f6', shortcut: 'Ctrl+C', type: 'command' },
    { id: 'def-2', title: 'Pegar', program: 'Windows', command: 'Ctrl+V', description: 'Pegar selección', color: '#3b82f6', shortcut: 'Ctrl+V', type: 'command' },
    { id: 'def-3', title: 'Escritorio', program: 'Windows', command: 'Win+D', description: 'Mostrar escritorio', color: '#3b82f6', shortcut: 'Win+D', type: 'command' },
    { id: 'def-4', title: 'Explorador', program: 'Windows', command: 'Win+E', description: 'Abrir explorador', color: '#3b82f6', shortcut: 'Win+E', type: 'command' },
    { id: 'def-5', title: 'Línea', program: 'AutoCAD', command: 'L', description: 'Dibujar línea', color: '#dc2626', shortcut: 'L', type: 'command' },
    { id: 'def-6', title: 'Círculo', program: 'AutoCAD', command: 'C', description: 'Dibujar círculo', color: '#dc2626', shortcut: 'C', type: 'command' },
    { id: 'def-7', title: 'Mover', program: 'AutoCAD', command: 'M', description: 'Mover objeto', color: '#dc2626', shortcut: 'M', type: 'command' },
    { id: 'def-8', title: 'Recortar', program: 'AutoCAD', command: 'TR', description: 'Recortar objeto', color: '#dc2626', shortcut: 'TR', type: 'command' },
    { id: 'def-9', title: 'Translate', program: 'Unreal', command: 'W', description: 'Mover objeto', color: '#7e22ce', shortcut: 'W', type: 'command' },
    { id: 'def-10', title: 'Rotate', program: 'Unreal', command: 'E', description: 'Rotar objeto', color: '#7e22ce', shortcut: 'E', type: 'command' },
    { id: 'def-11', title: 'Scale', program: 'Unreal', command: 'R', description: 'Escalar objeto', color: '#7e22ce', shortcut: 'R', type: 'command' },
    { id: 'def-12', title: 'Focus', program: 'Unreal', command: 'F', description: 'Enfocar objeto', color: '#7e22ce', shortcut: 'F', type: 'command' },
    { id: 'def-13', title: 'Google', program: 'Custom', command: 'https://google.com', description: 'Abrir Google', color: '#f59e0b', shortcut: 'G', type: 'shortcut' },
    { id: 'def-14', title: 'ChatGPT', program: 'Custom', command: 'https://chat.openai.com', description: 'Abrir ChatGPT', color: '#10b981', shortcut: 'C', type: 'shortcut' },
  ];

  React.useEffect(() => {
    if (commands.length === 0) {
      updateConfig(prev => ({
        ...prev,
        commands: defaultCommands
      }));
    }
  }, [commands.length]);

  const filteredCommands = activeFilter !== 'All'
    ? commands.filter(c => c.program === activeFilter)
    : commands;

  const [editingCommand, setEditingCommand] = useState<Command | null>(null);

  React.useEffect(() => {
    if (activeFilter !== 'All' && !editingCommand) {
      setNewCommand(prev => ({ ...prev, program: activeFilter }));
    }
  }, [activeFilter, editingCommand]);

  const addCommand = () => {
    if (newCommand.title && (newCommand.command || newCommand.shortcut)) {
      const formattedCommand = {
        ...newCommand,
        title: newCommand.title.toUpperCase(),
        // Only uppercase if it's a command, not a URL/shortcut
        command: newCommand.type === 'command' ? newCommand.command.toUpperCase() : newCommand.command,
      };
      
      const updatedCommands = editingCommand
        ? (prev: Command[]) => prev.map(c => c.id === editingCommand.id ? { ...formattedCommand, id: editingCommand.id } : c)
        : (prev: Command[]) => [...prev, { ...formattedCommand, id: Date.now().toString() }];

      updateConfig((prev) => ({
        ...prev,
        commands: updatedCommands(prev.commands || []),
      }));

      setEditingCommand(null);
      setNewCommand({ 
        title: '', 
        program: activeFilter !== 'All' ? activeFilter : 'Windows', 
        command: '', 
        description: '', 
        color: '#3b82f6', 
        shortcut: '', 
        type: 'command' 
      });
    }
  };

  const startEdit = (cmd: Command) => {
    setEditingCommand(cmd);
    setNewCommand({
      title: cmd.title,
      program: cmd.program,
      command: cmd.command,
      description: cmd.description,
      color: cmd.color || '#3b82f6',
      shortcut: cmd.shortcut || '',
      type: cmd.type || 'command',
      groupId: cmd.groupId
    });
  };

  const deleteCommand = (id: string) => {
    updateConfig((prev) => ({
      ...prev,
      commands: (prev.commands || []).filter((c) => c.id !== id),
    }));
  };

  const updateCommandColor = (id: string, color: string) => {
    updateConfig((prev) => ({
      ...prev,
      commands: (prev.commands || []).map((c) =>
        c.id === id ? { ...c, color } : c
      ),
    }));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveCommand = commands.some(c => c.id === activeId);
    const isOverCommand = commands.some(c => c.id === overId);
    const isOverGroup = groups.some(g => g.id === overId) || overId === 'ungrouped';

    if (!isActiveCommand) return;

    updateConfig((prev) => {
      const prevCommands = prev.commands || [];
      const activeIndex = prevCommands.findIndex(c => c.id === activeId);
      const activeCommand = prevCommands[activeIndex];
      
      let newGroupId: string | undefined = activeCommand.groupId;

      if (isOverCommand) {
        const overIndex = prevCommands.findIndex(c => c.id === overId);
        const overCommand = prevCommands[overIndex];
        if (activeCommand.groupId !== overCommand.groupId) {
          newGroupId = overCommand.groupId;
        } else {
          return prev; // Handled by drag end for reordering within same group
        }
      } else if (isOverGroup) {
        newGroupId = overId === 'ungrouped' ? undefined : String(overId);
        if (activeCommand.groupId === newGroupId) return prev;
      } else {
        return prev;
      }

      const newCommands = [...prevCommands];
      newCommands[activeIndex] = { ...activeCommand, groupId: newGroupId };
      return { ...prev, commands: newCommands };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = commands.findIndex((c) => c.id === active.id);
      const newIndex = commands.findIndex((c) => c.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        updateConfig((prev) => ({
          ...prev,
          commands: arrayMove(prev.commands || [], oldIndex, newIndex),
        }));
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('¡Copiado al portapapeles!');
  };

  // Update return JSX
  return (
    <div className="p-6 text-white">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Comandos</h2>
          <div className="flex gap-2 bg-gray-800 p-1 rounded-lg border border-gray-700">
            {['All', 'Windows', 'AutoCAD', 'Unreal', 'Prompt', 'Custom'].map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1 text-xs rounded-md transition-all ${activeFilter === f ? 'bg-purple-600 text-white font-bold' : 'text-gray-400 hover:text-white'}`}
              >
                {f === 'All' ? 'TODOS' : f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportJson} 
            accept=".json" 
            className="hidden" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-all shadow-lg font-bold text-sm"
            title="Cargar JSON Local"
          >
            <Upload size={16} />
            Cargar JSON
          </button>
          <button
            onClick={fetchConfigFromSupabaseManual}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all shadow-lg font-bold text-sm"
            title="Actualizar desde la nube"
          >
            <RefreshCw size={16} />
            Actualizar
          </button>
          <button
            onClick={() => setShowGroupManager(!showGroupManager)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all shadow-lg font-bold text-sm ${
              showGroupManager ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            <FolderPlus size={16} />
            Gestionar Grupos
          </button>
          <button
            onClick={() => saveToSupabase()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-lg font-bold text-sm"
            title="Guardar todos los cambios en la nube"
          >
            <Copy size={16} />
            Guardar Cambios
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showGroupManager && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
              <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">Grupos de Comandos</h3>
              <div className="flex gap-2 mb-4">
                <input
                  placeholder="Nuevo nombre de grupo..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm flex-1 outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button onClick={addGroup} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-bold">
                  Crear Grupo
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {groups.map(g => (
                  <div key={g.id} className="flex items-center gap-2 bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-700">
                    <Folder size={14} className="text-purple-400" />
                    <span className="text-sm">{g.name}</span>
                    <button onClick={() => deleteGroup(g.id)} className="text-gray-500 hover:text-red-400 ml-1">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="bg-gray-800 p-3 rounded-lg mb-6 flex gap-2 items-center flex-wrap">
        {/* Sección 1: Título */}
        <input
          placeholder="Título"
          value={newCommand.title}
          onChange={(e) => setNewCommand({ ...newCommand, title: e.target.value })}
          className="bg-gray-700 p-2 rounded flex-1 text-sm min-w-[120px]"
        />

        {/* Sección 1.5: Descripción */}
        <input
          placeholder="Descripción (Tooltip)"
          value={newCommand.description}
          onChange={(e) => setNewCommand({ ...newCommand, description: e.target.value })}
          className="bg-gray-700 p-2 rounded flex-1 text-sm min-w-[150px] border border-gray-600 focus:border-purple-500 outline-none"
        />
        
        {/* Sección 2: Comando (Solo en modo COPIAR) */}
        {newCommand.type === 'command' && (
          <input
            placeholder="Comando a copiar"
            value={newCommand.command}
            onChange={(e) => setNewCommand({ ...newCommand, command: e.target.value })}
            className="bg-gray-700 p-2 rounded flex-1 text-sm min-w-[120px] border border-gray-600 focus:border-purple-500 outline-none"
          />
        )}
        
        {/* Sección 3: Shortcut (Solo en modo EJECUTAR) */}
        {newCommand.type === 'shortcut' && (
          <div className="flex gap-1 flex-1 min-w-[150px]">
            <input
              placeholder="Presiona teclas (e.g., Ctrl+C)"
              value={newCommand.shortcut}
              readOnly
              onKeyDown={(e) => {
                e.preventDefault();
                const key = e.key;
                
                if (key === 'Backspace') {
                  setNewCommand({ ...newCommand, shortcut: '' });
                  return;
                }

                if (key === 'Escape') {
                  return;
                }

                const modifiers: string[] = [];
                if (e.ctrlKey) modifiers.push('Ctrl');
                if (e.shiftKey) modifiers.push('Shift');
                if (e.altKey) modifiers.push('Alt');
                if (e.metaKey) modifiers.push('Win');
                
                let mainKey = '';
                if (!['Control', 'Shift', 'Alt', 'Meta', 'OS'].includes(key)) {
                  mainKey = key.toUpperCase();
                }

                // Build the combination
                const currentParts = new Set<string>(newCommand.shortcut ? newCommand.shortcut.split('+') : []);
                
                modifiers.forEach(m => currentParts.add(m));
                if (mainKey) currentParts.add(mainKey);

                // Sort them a bit for consistency: Modifiers first, then main key
                const sortedParts = Array.from(currentParts).sort((a, b) => {
                  const order = ['Ctrl', 'Shift', 'Alt', 'Win'];
                  const idxA = order.indexOf(a);
                  const idxB = order.indexOf(b);
                  if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                  if (idxA !== -1) return -1;
                  if (idxB !== -1) return 1;
                  return a.localeCompare(b);
                });

                setNewCommand({ ...newCommand, shortcut: sortedParts.join('+') });
              }}
              className="bg-gray-700 p-2 rounded flex-1 text-sm cursor-pointer border border-purple-500/30 focus:border-purple-500 outline-none text-purple-300 font-mono"
              title="Presiona teclas para sumarlas. Backspace para borrar."
            />
            <button
              onClick={() => setNewCommand({ ...newCommand, shortcut: '' })}
              className="bg-gray-700 hover:bg-red-600/20 p-2 rounded text-gray-400 hover:text-red-400 border border-gray-600 transition-colors"
              title="Borrar Shortcut"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}

        {/* Sección 4: Tipo */}
        <select
          value={newCommand.type}
          onChange={(e) => setNewCommand({ ...newCommand, type: e.target.value as 'command' | 'shortcut' })}
          className="bg-gray-700 p-2 rounded flex-1 text-sm min-w-[120px] font-bold text-purple-400"
        >
          <option value="command">MODO: COPIAR</option>
          <option value="shortcut">MODO: EJECUTAR</option>
        </select>
        
        {/* Sección 5: Programa */}
        <select
          value={newCommand.program}
          onChange={(e) => {
            const prog = e.target.value;
            let color = newCommand.color;
            if (prog === 'AutoCAD') color = '#dc2626';
            if (prog === 'Unreal') color = '#7e22ce';
            if (prog === 'Windows') color = '#3b82f6';
            if (prog === 'Prompt') color = '#10b981';
            setNewCommand({ ...newCommand, program: prog, color });
          }}
          className="bg-gray-700 p-2 rounded flex-1 text-sm min-w-[120px]"
        >
          <option value="Windows">Windows</option>
          <option value="AutoCAD">AutoCAD</option>
          <option value="Unreal">Unreal</option>
          <option value="Prompt">Prompt</option>
          <option value="Custom">Custom</option>
        </select>

        {/* Sección 6: Grupo */}
        <select
          value={newCommand.groupId || ''}
          onChange={(e) => {
            if (e.target.value === 'new_group') {
              setShowNewGroupPrompt(true);
            } else {
              setNewCommand({ ...newCommand, groupId: e.target.value || undefined });
            }
          }}
          className="bg-gray-700 p-2 rounded flex-1 text-sm min-w-[120px] text-purple-300"
        >
          <option value="">SIN GRUPO</option>
          {groups.map(g => (
            <option key={g.id} value={g.id}>{g.name.toUpperCase()}</option>
          ))}
          <option value="new_group" className="text-green-400 font-bold">+ CREAR NUEVO GRUPO...</option>
        </select>
        
        <input
          type="color"
          value={newCommand.color}
          onChange={(e) => setNewCommand({ ...newCommand, color: e.target.value })}
          className="bg-gray-700 p-1 rounded w-10 h-9 cursor-pointer"
          title="Color del comando"
        />
        <button
          onClick={addCommand}
          className="bg-purple-600 hover:bg-purple-700 p-2 rounded"
          title={editingCommand ? "Actualizar Comando" : "Añadir Comando"}
        >
          {editingCommand ? "Actualizar" : <Plus size={18} />}
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-8">
          {/* Render Groups */}
          {groups.map(group => {
            const groupCommands = filteredCommands.filter(c => c.groupId === group.id);
            if (groupCommands.length === 0 && activeFilter !== 'All') return null;
            
            const isExpanded = expandedGroups[group.id] !== false;

            return (
              <DroppableGroupContainer key={group.id} id={group.id}>
                <div className="bg-gray-900/30 rounded-xl p-4 border border-gray-700/50">
                  <div className="flex items-center gap-2 mb-4 group/header">
                    <button 
                      onClick={() => toggleGroup(group.id)}
                      className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <Folder size={18} className="text-purple-500" />
                    </button>
                    
                    {editingGroupId === group.id ? (
                      <input
                        autoFocus
                        value={editingGroupName}
                        onChange={(e) => setEditingGroupName(e.target.value)}
                        onBlur={() => handleRenameGroup(group.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameGroup(group.id);
                          if (e.key === 'Escape') setEditingGroupId(null);
                        }}
                        className="bg-gray-800 text-white text-sm font-black uppercase tracking-widest px-2 py-1 rounded outline-none border border-purple-500"
                      />
                    ) : (
                      <h3 
                        onDoubleClick={() => {
                          setEditingGroupId(group.id);
                          setEditingGroupName(group.name);
                        }}
                        className="text-sm font-black uppercase tracking-widest text-gray-400 hover:text-white cursor-text transition-colors"
                        title="Doble clic para renombrar"
                      >
                        {group.name}
                      </h3>
                    )}
                    <span className="text-[10px] bg-gray-800 px-2 py-0.5 rounded-full opacity-50 text-gray-400">{groupCommands.length}</span>
                  </div>
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <SortableContext
                          items={groupCommands.map(c => c.id)}
                          strategy={rectSortingStrategy}
                        >
                          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 min-h-[50px]">
                            {groupCommands.map((cmd) => (
                              <SortableCommandCard
                                key={cmd.id}
                                cmd={cmd}
                                onEdit={startEdit}
                                onDelete={deleteCommand}
                                onCopy={copyToClipboard}
                                onColorChange={updateCommandColor}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </DroppableGroupContainer>
            );
          })}

          {/* Render Ungrouped */}
          {(() => {
            const ungroupedCommands = filteredCommands.filter(c => !c.groupId);
            if (ungroupedCommands.length === 0) return null;
            const isExpanded = expandedGroups['ungrouped'] !== false;

            return (
              <DroppableGroupContainer id="ungrouped">
                <div className="bg-gray-900/30 rounded-xl p-4 border border-gray-700/50">
                  <button 
                    onClick={() => toggleGroup('ungrouped')}
                    className="flex items-center gap-2 mb-4 text-gray-400 hover:text-white transition-colors"
                  >
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    <h3 className="text-sm font-black uppercase tracking-widest">Sin Grupo</h3>
                    <span className="text-[10px] bg-gray-800 px-2 py-0.5 rounded-full opacity-50">{ungroupedCommands.length}</span>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <SortableContext
                          items={ungroupedCommands.map(c => c.id)}
                          strategy={rectSortingStrategy}
                        >
                          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 min-h-[50px]">
                            {ungroupedCommands.map((cmd) => (
                              <SortableCommandCard
                                key={cmd.id}
                                cmd={cmd}
                                onEdit={startEdit}
                                onDelete={deleteCommand}
                                onCopy={copyToClipboard}
                                onColorChange={updateCommandColor}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </DroppableGroupContainer>
            );
          })()}
        </div>
      </DndContext>

      {/* AI Memory Section */}
      <div className="mt-12 bg-gray-900/50 rounded-2xl border border-purple-500/20 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600/20 rounded-lg">
              <Brain className="text-purple-400" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Memoria de la IA (Rembrandt)</h3>
              <p className="text-xs text-gray-400">Conocimientos generales y datos que la IA ha aprendido de ti.</p>
            </div>
          </div>
          <button 
            onClick={() => saveToSupabase()}
            className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg font-bold transition-colors"
          >
            Guardar Memoria
          </button>
        </div>
        
        <textarea
          value={config.memoria_ia || ''}
          onChange={(e) => updateConfig({ ...config, memoria_ia: e.target.value })}
          placeholder="La IA guardará aquí conocimientos generales que le proporciones..."
          className="w-full h-40 bg-gray-800 border border-gray-700 rounded-xl p-4 text-sm text-gray-300 font-mono focus:ring-2 focus:ring-purple-500 outline-none resize-none"
        />
        <p className="mt-2 text-[10px] text-gray-500 italic">
          * Esta información es utilizada por el Asistente de IA para tener contexto sobre tus preferencias y conocimientos generales.
        </p>
      </div>

      {/* Modal for new group */}
      <AnimatePresence>
        {showNewGroupPrompt && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-2xl max-w-md w-full"
            >
              <h3 className="text-lg font-bold text-white mb-4">Crear Nuevo Grupo</h3>
              <input
                type="text"
                autoFocus
                placeholder="Nombre del grupo..."
                value={promptGroupName}
                onChange={(e) => setPromptGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateGroupFromPrompt();
                  if (e.key === 'Escape') {
                    setShowNewGroupPrompt(false);
                    setPromptGroupName('');
                  }
                }}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white mb-6 outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowNewGroupPrompt(false);
                    setPromptGroupName('');
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-bold text-gray-400 hover:text-white hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateGroupFromPrompt}
                  className="px-4 py-2 rounded-lg text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Crear Grupo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CommandsTab;
