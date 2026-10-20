import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  CheckSquare, 
  LogOut,
  Plus,
  Trash2,
  X,
  Check,
  Users,
  StickyNote,
  User,
  Archive,
  Save,
  FolderOpen,
  Lock,
  Link as LinkIcon,
  ChevronDown,
  Cloud
} from 'lucide-react';
import { CATEGORY_ICONS } from './constants';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  lists: string[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onAddList: (name: string) => void;
  onDeleteList: (name: string) => void;
  lastModified: { dayOfWeek: string; fullDate: string; time: string; };
  username: string;
  setUsername: (name: string) => void;
  onSaveFile: () => void;
  onSaveFileAs: () => void;
  onLoadFile: () => void;
  onOpenCloud: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  listColors: Record<string, string>;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  setIsOpen, 
  lists, 
  activeFilter, 
  onFilterChange,
  onAddList,
  onDeleteList,
  lastModified,
  username,
  setUsername,
  onSaveFile,
  onSaveFileAs,
  onLoadFile,
  onOpenCloud,
  listColors
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [showUtilities, setShowUtilities] = useState(false);

  const menuItems = [
    { id: 'all', icon: LayoutDashboard, label: 'Tablero' },
    { id: 'today', icon: Calendar, label: 'Hoy' },
    { id: 'completed', icon: CheckSquare, label: 'Completado' },
  ];

  const utilityItems = [
    { id: 'contacts', icon: Users, label: 'Contactos' },
    { id: 'notes', icon: StickyNote, label: 'Notas' },
    { id: 'storage', icon: Archive, label: 'Almacén' },
    { id: 'safe', icon: Lock, label: 'Caja Fuerte' },
    { id: 'links', icon: LinkIcon, label: 'Links' },
  ];

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newListName.trim()) {
      onAddList(newListName.trim());
      setNewListName('');
      setIsAdding(false);
    }
  };

  const handleNavigation = (id: string) => {
    onFilterChange(id);
    if (window.innerWidth < 1024) setIsOpen(false);
  };

  const handleLogout = () => {
    window.location.reload();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/20 z-20 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar Container */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-[#0d1322] border-r border-slate-800 text-slate-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-2xl lg:shadow-none`}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-900/40">
              <CheckSquare className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-white tracking-tight leading-tight">Listas<br/>Remb</span>
          </div>
          
          {/* Last Modified Date */}
          <div className="flex flex-col gap-0.5 mb-4 pl-1">
             <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Última Modificación</span>
             <div className="text-sm font-semibold text-purple-400 leading-tight">
               {lastModified.dayOfWeek}
             </div>
             <div className="text-sm text-slate-300 leading-tight">
               {lastModified.fullDate}
             </div>
             <div className="text-xs text-slate-500 mt-0.5 font-mono">
               {lastModified.time}
             </div>
          </div>

          {/* User Profile Input */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/90 rounded-lg border border-slate-800 mb-2">
             <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                <User className="w-3 h-3" />
             </div>
             <input 
               type="text" 
               value={username}
               onChange={(e) => setUsername(e.target.value)}
               className="bg-transparent border-none focus:outline-none text-sm font-medium text-slate-200 placeholder:text-slate-500 w-full truncate"
               placeholder="Usuario"
             />
          </div>

          {/* Backup Controls */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 relative">
              <div className="flex-1 flex bg-blue-950/40 rounded-lg border border-blue-500/30 hover:bg-blue-900/40 transition-colors">
                  <button 
                      onClick={onSaveFile} 
                      className="flex-1 flex items-center justify-center gap-2 p-2 text-blue-300 text-xs font-medium cursor-pointer"
                      title="Guardar Copia de Seguridad"
                  >
                      <Save className="w-4 h-4" /> Guardar
                  </button>
                  <button 
                      onClick={() => setShowSaveMenu(!showSaveMenu)}
                      className="px-1 border-l border-blue-500/30 text-blue-300 hover:bg-blue-800/40 rounded-r-lg flex items-center justify-center cursor-pointer"
                  >
                      <ChevronDown className="w-3 h-3" />
                  </button>
                  
                  {/* Save Menu Dropdown */}
                  {showSaveMenu && (
                      <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowSaveMenu(false)}></div>
                          <div className="absolute top-full mt-1 left-0 w-40 bg-slate-900 shadow-xl rounded-lg border border-slate-800 py-1 z-50 flex flex-col animate-in fade-in zoom-in-95 duration-100">
                              <button 
                                  onClick={() => { onSaveFileAs(); setShowSaveMenu(false); }}
                                  className="px-4 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                              >
                                  <Save className="w-3 h-3" /> Guardar como...
                              </button>
                          </div>
                      </>
                  )}
              </div>

              <button 
                  onClick={onLoadFile}
                  className="flex-1 flex items-center justify-center gap-2 p-2 bg-amber-950/40 text-amber-300 hover:bg-amber-900/40 rounded-lg text-xs font-medium transition-colors border border-amber-500/30 cursor-pointer"
                  title="Cargar Copia de Seguridad"
              >
                  <FolderOpen className="w-4 h-4" /> Cargar
              </button>
            </div>
            
            <button 
                onClick={onOpenCloud}
                className="w-full flex items-center justify-center gap-2 p-2 bg-purple-950/40 text-purple-300 hover:bg-purple-900/40 rounded-lg text-xs font-medium transition-colors border border-purple-500/30 shadow-sm cursor-pointer"
                title="Sincronizar en la Nube"
            >
                <Cloud className="w-4 h-4" /> Sincronizar / Nube
            </button>
          </div>

        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Vistas Principales */}
          <div>
            <div className="px-3 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              Vistas
            </div>
            <ul className="space-y-1">
              {menuItems.map((item) => {
                 const isActive = activeFilter === item.id;
                 return (
                  <li key={item.id}>
                    <button 
                      onClick={() => handleNavigation(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
                        ${isActive 
                          ? 'bg-purple-600/25 text-purple-300 border border-purple-500/40 shadow-sm' 
                          : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}
                    >
                      <item.icon className={`w-5 h-5 ${isActive ? 'text-purple-300' : 'text-slate-400'}`} />
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Listas Dinámicas */}
          <div>
            <div className="px-3 mb-2 flex items-center justify-between group">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Listas</span>
              <button 
                onClick={() => setIsAdding(true)}
                className="text-slate-400 hover:text-purple-400 p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                title="Nueva lista"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <ul className="space-y-1">
              {lists.map((listName) => {
                const Icon = CATEGORY_ICONS[listName] || CATEGORY_ICONS['default'];
                const isActive = activeFilter === listName;
                const customColor = listColors[listName];
                
                return (
                  <li key={listName} className="group relative">
                    <button 
                      onClick={() => handleNavigation(listName)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
                        ${isActive 
                          ? 'bg-purple-600/25 border border-purple-500/40 shadow-sm' 
                          : 'hover:bg-slate-800/60'}`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Icon 
                           className="w-5 h-5 flex-shrink-0" 
                           style={{ color: customColor || (isActive ? '#c084fc' : '#94a3b8') }}
                        />
                        <span 
                           className="truncate"
                           style={{ color: customColor || (isActive ? '#f3e8ff' : '#cbd5e1') }}
                        >
                            {listName}
                        </span>
                      </div>
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteList(listName);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      title="Eliminar lista"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                );
              })}
              
              {isAdding && (
                <li className="px-1 py-1">
                  <form onSubmit={handleAddSubmit} className="flex items-center gap-2 p-2 bg-slate-900 rounded-lg border border-purple-500/40 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                    <input
                      autoFocus
                      type="text"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      placeholder="Nombre..."
                      className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none min-w-0"
                    />
                    <button type="submit" className="p-1 bg-purple-600 text-white rounded hover:bg-purple-500 cursor-pointer">
                      <Check className="w-3 h-3" />
                    </button>
                    <button type="button" onClick={() => setIsAdding(false)} className="p-1 text-slate-400 hover:text-red-400 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </form>
                </li>
              )}
            </ul>
            
            {!isAdding && (
               <button 
               onClick={() => setIsAdding(true)}
               className="w-full mt-2 flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-purple-300 hover:bg-slate-800/60 rounded-lg border border-dashed border-slate-800 hover:border-purple-500/40 transition-all cursor-pointer"
             >
               <Plus className="w-4 h-4" />
               <span>Añadir lista</span>
             </button>
            )}
          </div>

          {/* Utilidades Secundarias (Opcionales / Colapsables) */}
          <div className="pt-2 border-t border-slate-800">
            <button 
              type="button"
              onClick={() => setShowUtilities(!showUtilities)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-300 uppercase tracking-wider transition-colors cursor-pointer"
            >
              <span>Otras Vistas</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showUtilities ? 'rotate-180' : ''}`} />
            </button>
            {showUtilities && (
              <ul className="space-y-1 mt-1">
                {utilityItems.map((item) => {
                   const isActive = activeFilter === item.id;
                   return (
                    <li key={item.id}>
                      <button 
                        onClick={() => handleNavigation(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer
                          ${isActive 
                            ? 'bg-purple-600/25 text-purple-300 border border-purple-500/40 shadow-sm' 
                            : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`}
                      >
                        <item.icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-slate-500'}`} />
                        {item.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-1">
           <button 
             onClick={handleLogout}
             className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors cursor-pointer"
           >
            <LogOut className="w-5 h-5 text-slate-500" />
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
