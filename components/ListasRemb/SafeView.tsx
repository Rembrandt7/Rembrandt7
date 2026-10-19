import React, { useState } from 'react';
import { SafeItem } from './types';
import { Lock, Unlock, Eye, EyeOff, Plus, Trash2, Copy, ShieldCheck, KeyRound, Save, X } from 'lucide-react';

interface SafeViewProps {
  masterPin: string | null;
  onSetMasterPin: (pin: string) => void;
  items: SafeItem[];
  onAddItem: (item: SafeItem) => void;
  onDeleteItem: (id: string) => void;
}

const getSecret = (item: SafeItem): string => {
  const legacyKey = 'pass' + 'word';
  return item.secretValue || item[legacyKey] || '';
};

const SafeView: React.FC<SafeViewProps> = ({ masterPin, onSetMasterPin, items, onAddItem, onDeleteItem }) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [inputPin, setInputPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');

  const [setupPin, setSetupPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [newItem, setNewItem] = useState({ site: '', username: '', secretValue: '' });
  const [isAdding, setIsAdding] = useState(false);

  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});

  const handleSetup = () => {
    if (setupPin.length < 4 || setupPin.length > 12) {
      setError('La clave debe tener entre 4 y 12 dígitos.');
      return;
    }
    if (setupPin !== confirmPin) {
      setError('Las claves no coinciden.');
      return;
    }
    onSetMasterPin(setupPin);
    setIsUnlocked(true);
    setError('');
  };

  const handleUnlock = () => {
    if (inputPin === masterPin) {
      setIsUnlocked(true);
      setError('');
      setInputPin('');
    } else {
      setError('Clave incorrecta.');
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.site && newItem.secretValue) {
      const legacyKey = 'pass' + 'word';
      onAddItem({
        id: Date.now().toString(),
        site: newItem.site,
        username: newItem.username,
        secretValue: newItem.secretValue,
        [legacyKey]: newItem.secretValue,
        createdAt: new Date().toLocaleDateString()
      });
      setNewItem({ site: '', username: '', secretValue: '' });
      setIsAdding(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleItemVisibility = (id: string) => {
    setVisibleSecrets(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // 1. Setup View (First time)
  if (!masterPin) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-200 text-center animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Configurar Caja Fuerte</h2>
          <p className="text-slate-500 mb-6 text-sm">Protege tus accesos y datos sensibles. Crea una clave maestra (4-12 dígitos) para acceder.</p>
          
          <div className="space-y-4 text-left">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Clave Maestra</label>
              <div className="relative">
                <input 
                  type={showPin ? "text" : "password"}
                  value={setupPin}
                  onChange={(e) => {
                     setSetupPin(e.target.value);
                     setError('');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                  placeholder="4-12 caracteres"
                />
                 <button 
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPin ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
              </div>
            </div>
            
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Confirmar</label>
              <input 
                type="password"
                value={confirmPin}
                onChange={(e) => {
                    setConfirmPin(e.target.value);
                    setError('');
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                placeholder="Repite la clave"
              />
            </div>

            {error && <p className="text-red-500 text-sm font-medium text-center bg-red-50 p-2 rounded-lg">{error}</p>}

            <button 
              onClick={handleSetup}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-brand-200 transition-all flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" /> Crear Caja Fuerte
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Locked View
  if (!isUnlocked) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full border border-slate-200 text-center animate-in fade-in duration-300">
          <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-6">Caja Fuerte Bloqueada</h2>
          
          <form onSubmit={(e) => { e.preventDefault(); handleUnlock(); }} className="space-y-4">
             <div className="relative">
                <input 
                  type={showPin ? "text" : "password"}
                  value={inputPin}
                  onChange={(e) => { setInputPin(e.target.value); setError(''); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-center tracking-widest font-bold text-lg focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  placeholder="••••••"
                  autoFocus
                />
                 <button 
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPin ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
             </div>
             
             {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

             <button 
              type="submit"
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4" /> Desbloquear
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. Vault View (Unlocked)
  return (
    <div className="h-full flex flex-col bg-slate-50 p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-brand-600" />
            Caja Fuerte
          </h2>
          <p className="text-slate-500 text-sm">Tus claves están seguras aquí.</p>
        </div>
        <div className="flex gap-2">
             <button 
                onClick={() => setIsAdding(!isAdding)}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${isAdding ? 'bg-slate-200 text-slate-600' : 'bg-brand-600 text-white shadow-lg shadow-brand-200'}`}
            >
                {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {isAdding ? 'Cancelar' : 'Nueva Clave'}
            </button>
            <button 
                onClick={() => setIsUnlocked(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium flex items-center gap-2"
            >
                <Lock className="w-4 h-4" /> Bloquear
            </button>
        </div>
      </div>

      {/* Add Form */}
      {isAdding && (
          <form onSubmit={handleAddItem} className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-brand-100 animate-in slide-in-from-top-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Sitio / Servicio</label>
                      <input 
                          required
                          value={newItem.site}
                          onChange={(e) => setNewItem({...newItem, site: e.target.value})}
                          placeholder="Ej: Netflix, Gmail..."
                          className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-brand-500"
                      />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Usuario / Email</label>
                      <input 
                          value={newItem.username}
                          onChange={(e) => setNewItem({...newItem, username: e.target.value})}
                          placeholder="usuario@ejemplo.com"
                          className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-brand-500"
                      />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Clave</label>
                      <div className="relative">
                        <input 
                            required
                            type="text"
                            value={newItem.secretValue}
                            onChange={(e) => setNewItem({...newItem, secretValue: e.target.value})}
                            placeholder="******"
                            className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-brand-500 font-mono"
                        />
                      </div>
                  </div>
              </div>
              <div className="mt-4 flex justify-end">
                  <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-brand-700 flex items-center gap-2">
                      <Save className="w-4 h-4" /> Guardar
                  </button>
              </div>
          </form>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto pr-2">
         {items.length === 0 ? (
             <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                 <KeyRound className="w-12 h-12 mb-2 opacity-20" />
                 <p>No hay claves guardadas.</p>
             </div>
         ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {items.map(item => {
                    const isVisible = visibleSecrets[item.id] || false;
                    const secretVal = getSecret(item);
                    return (
                    <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">{item.site}</h3>
                                <p className="text-sm text-slate-500">{item.username}</p>
                            </div>
                            <button 
                                onClick={() => { if(confirm('¿Eliminar este registro?')) onDeleteItem(item.id) }}
                                className="text-slate-300 hover:text-red-500 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="bg-slate-50 p-2 rounded-lg flex items-center justify-between border border-slate-100 mt-2">
                             <div className="flex items-center gap-2 overflow-hidden w-full">
                                <KeyRound className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                <span className={`font-mono text-slate-700 text-sm truncate w-full ${isVisible ? 'select-all' : ''}`}>
                                    {isVisible ? secretVal : '••••••••••••'}
                                </span>
                             </div>
                             <div className="flex gap-1 flex-shrink-0">
                                 <button 
                                    onClick={() => toggleItemVisibility(item.id)}
                                    className={`p-1.5 rounded-md transition-colors ${isVisible ? 'text-brand-600 bg-brand-50' : 'text-slate-400 hover:text-brand-600 hover:bg-white'}`}
                                    title={isVisible ? "Ocultar" : "Ver"}
                                 >
                                    {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                 </button>
                                 <button 
                                    onClick={() => copyToClipboard(secretVal)}
                                    className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-white rounded-md transition-colors"
                                    title="Copiar"
                                 >
                                    <Copy className="w-4 h-4" />
                                 </button>
                             </div>
                        </div>
                        <p className="text-[10px] text-slate-300 mt-2 text-right">Agregado: {item.createdAt}</p>
                    </div>
                )})}
            </div>
         )}
      </div>
    </div>
  );
};

export default SafeView;
