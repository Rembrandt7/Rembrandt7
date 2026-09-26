import React, { useState, useEffect } from 'react';
import { useLinks } from '../contexts/LinkContext';
import { Credencial } from '../types';
import { Copy, Edit2, Trash2, Eye, EyeOff, Lock, Unlock, Key, Shield, ShieldAlert, ShieldCheck, Check, X, RefreshCw, HelpCircle } from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { hashPassword, verifyPassword } from '../utils/cryptoUtils';

const SortableItem = ({ 
  cred, 
  updateConfig, 
  config, 
  startEdit, 
  toggleSensitive, 
  copyToClipboard, 
  showSensitive 
}: { 
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
    backgroundColor: cred.color || '#27272a',
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="p-4 rounded-xl shadow-xl group transition-all duration-200 hover:scale-[1.02] border border-white/10 bg-gradient-to-br from-white/10 to-transparent backdrop-blur-md relative overflow-hidden"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 
          {...attributes} 
          {...listeners}
          className="font-bold text-base sm:text-lg text-white cursor-grab active:cursor-grabbing flex-grow truncate pr-2 select-none"
        >
          {cred.nombre}
        </h3>
        <div className="flex items-center gap-1.5 opacity-90 transition-opacity">
          <input
            type="color"
            value={cred.color || '#27272a'}
            onChange={(e) => updateConfig({
              ...config,
              credenciales: config.credenciales.map((c: Credencial) => c.id === cred.id ? { ...c, color: e.target.value } : c)
            })}
            className="w-5 h-5 cursor-pointer bg-transparent border-0 rounded"
            title="Cambiar color de tarjeta"
          />
          <button 
            onClick={(e) => { e.stopPropagation(); startEdit(cred); }}
            className="p-1 hover:bg-white/20 rounded transition-colors text-white/80 hover:text-white"
            title="Editar credencial"
          >
            <Edit2 size={14} />
          </button>
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              if (window.confirm(`¿Eliminar la credencial "${cred.nombre}"?`)) {
                updateConfig({ 
                  ...config, 
                  credenciales: config.credenciales.filter((c: Credencial) => c.id !== cred.id) 
                });
                toast.success('Credencial eliminada');
              }
            }}
            className="p-1 hover:bg-red-500/30 text-white/80 hover:text-red-400 rounded transition-colors"
            title="Eliminar credencial"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="space-y-1.5 text-xs text-white/90">
        {cred.usuario && (
          <div className="flex justify-between items-center bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5">
            <span className="truncate mr-1 font-mono text-white/80 select-all">
              {showSensitive[cred.id] ? cred.usuario : '••••••••'}
            </span>
            <div className="flex items-center gap-1">
              <button 
                onClick={(e) => { e.stopPropagation(); toggleSensitive(cred.id); }}
                className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors"
                title={showSensitive[cred.id] ? "Ocultar" : "Mostrar"}
              >
                {showSensitive[cred.id] ? <EyeOff size={13}/> : <Eye size={13}/>}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); copyToClipboard(cred.usuario, 'Usuario'); }}
                className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors"
                title="Copiar usuario"
              >
                <Copy size={13} />
              </button>
            </div>
          </div>
        )}

        {cred.contra && (
          <div className="flex justify-between items-center bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5">
            <span className="truncate mr-1 font-mono text-white/80 select-all">
              {showSensitive[cred.id] ? cred.contra : '••••••••••••'}
            </span>
            <div className="flex items-center gap-1">
              <button 
                onClick={(e) => { e.stopPropagation(); toggleSensitive(cred.id); }}
                className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors"
                title={showSensitive[cred.id] ? "Ocultar" : "Mostrar"}
              >
                {showSensitive[cred.id] ? <EyeOff size={13}/> : <Eye size={13}/>}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); copyToClipboard(cred.contra, 'Contraseña'); }}
                className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors"
                title="Copiar contraseña"
              >
                <Copy size={13} />
              </button>
            </div>
          </div>
        )}

        {cred.datos && (
          <div className="flex justify-between items-center bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5">
            <span className="truncate mr-1 text-white/70 select-all">{cred.datos}</span>
            <button 
              onClick={(e) => { e.stopPropagation(); copyToClipboard(cred.datos, 'Datos adicionales'); }}
              className="p-1 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors"
              title="Copiar datos adicionales"
            >
              <Copy size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const Credenciales: React.FC = () => {
  const { config, updateConfig } = useLinks();

  // Unlock state persisted during the current session
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('credenciales_unlocked') === 'true';
  });

  // Password inputs
  const [unlockPassword, setUnlockPassword] = useState('');
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Setup mode states (first time opening)
  const [setupPassword, setSetupPassword] = useState('');
  const [confirmSetupPassword, setConfirmSetupPassword] = useState('');
  const [setupHint, setSetupHint] = useState('');
  const [showSetupPassword, setShowSetupPassword] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);

  // Change password modal
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [newHint, setNewHint] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Existing Credential Form states
  const [nombre, setNombre] = useState('');
  const [usuario, setUsuario] = useState('');
  const [contra, setContra] = useState('');
  const [datos, setDatos] = useState('');
  const [color, setColor] = useState('#27272a');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});

  const hasConfiguredSecurity = Boolean(config.credencialesSecurity?.passwordHash);

  // Auto-sync if security was deleted or reset
  useEffect(() => {
    if (!hasConfiguredSecurity) {
      sessionStorage.removeItem('credenciales_unlocked');
      setIsUnlocked(false);
    }
  }, [hasConfiguredSecurity]);

  // Handle first time setup
  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupPassword) {
      toast.error('Ingresa una contraseña');
      return;
    }
    if (setupPassword.length < 4) {
      toast.error('La contraseña debe tener al menos 4 caracteres');
      return;
    }
    if (setupPassword !== confirmSetupPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setIsSettingUp(true);
    try {
      const { hash, salt } = await hashPassword(setupPassword);
      updateConfig({
        ...config,
        credencialesSecurity: {
          passwordHash: hash,
          salt,
          hint: setupHint.trim() || undefined,
        }
      });
      sessionStorage.setItem('credenciales_unlocked', 'true');
      setIsUnlocked(true);
      setSetupPassword('');
      setConfirmSetupPassword('');
      setSetupHint('');
      toast.success('¡Bóveda configurada y desbloqueada con éxito!');
    } catch (err) {
      console.error(err);
      toast.error('Error al configurar la seguridad de la bóveda');
    } finally {
      setIsSettingUp(false);
    }
  };

  // Handle unlock
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPassword) {
      toast.error('Ingresa tu contraseña para acceder');
      return;
    }

    const sec = config.credencialesSecurity;
    if (!sec || !sec.passwordHash || !sec.salt) {
      toast.error('Configuración de seguridad no encontrada');
      return;
    }

    setIsVerifying(true);
    try {
      const isValid = await verifyPassword(unlockPassword, sec.passwordHash, sec.salt);
      if (isValid) {
        sessionStorage.setItem('credenciales_unlocked', 'true');
        setIsUnlocked(true);
        setUnlockPassword('');
        setShowHint(false);
        toast.success('Bóveda desbloqueada');
      } else {
        toast.error('Contraseña incorrecta. Acceso denegado.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al verificar la contraseña');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLockVault = () => {
    sessionStorage.removeItem('credenciales_unlocked');
    setIsUnlocked(false);
    setUnlockPassword('');
    setShowHint(false);
    toast.info('Bóveda bloqueada');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const sec = config.credencialesSecurity;
    if (!sec) return;

    if (!currentPassword) {
      toast.error('Ingresa tu contraseña actual');
      return;
    }
    if (newPassword.length < 4) {
      toast.error('La nueva contraseña debe tener al menos 4 caracteres');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('La confirmación de la nueva contraseña no coincide');
      return;
    }

    setIsChangingPassword(true);
    try {
      const isCurrentValid = await verifyPassword(currentPassword, sec.passwordHash, sec.salt);
      if (!isCurrentValid) {
        toast.error('La contraseña actual es incorrecta');
        setIsChangingPassword(false);
        return;
      }

      const { hash, salt } = await hashPassword(newPassword);
      updateConfig({
        ...config,
        credencialesSecurity: {
          passwordHash: hash,
          salt,
          hint: newHint.trim() || undefined,
        }
      });

      setIsChangePasswordOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setNewHint('');
      toast.success('Contraseña de la bóveda actualizada correctamente');
    } catch (err) {
      console.error(err);
      toast.error('Error al cambiar la contraseña');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Credential items actions
  const addCredencial = () => {
    if (!nombre.trim()) {
      toast.error('El nombre de la credencial es requerido');
      return;
    }
    if (editingId) {
      updateConfig({
        ...config,
        credenciales: (config.credenciales || []).map(c => c.id === editingId ? { ...c, nombre, usuario, contra, datos, color } : c)
      });
      setEditingId(null);
      toast.success('Credencial actualizada');
    } else {
      const newCred: Credencial = { id: Date.now().toString(), nombre, usuario, contra, datos, color };
      updateConfig({ ...config, credenciales: [...(config.credenciales || []), newCred] });
      toast.success('Credencial guardada');
    }
    setNombre(''); setUsuario(''); setContra(''); setDatos(''); setColor('#27272a');
  };

  const startEdit = (cred: Credencial) => {
    setEditingId(cred.id);
    setNombre(cred.nombre); 
    setUsuario(cred.usuario); 
    setContra(cred.contra); 
    setDatos(cred.datos); 
    setColor(cred.color || '#27272a');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNombre(''); setUsuario(''); setContra(''); setDatos(''); setColor('#27272a');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copiado al portapapeles`);
    }).catch(err => {
      console.error('Error al copiar: ', err);
      toast.error('No se pudo copiar');
    });
  };

  const toggleSensitive = (id: string) => setShowSensitive(prev => ({ ...prev, [id]: !prev[id] }));

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const creds = config.credenciales || [];
      const oldIndex = creds.findIndex((c: Credencial) => c.id === active.id);
      const newIndex = creds.findIndex((c: Credencial) => c.id === over.id);
      updateConfig({
        ...config,
        credenciales: arrayMove(creds, oldIndex, newIndex),
      });
    }
  };

  // 1. FIRST TIME SETUP SCREEN (when no password has been configured yet)
  if (!hasConfiguredSecurity) {
    return (
      <div className="p-4 sm:p-6 w-full flex items-center justify-center min-h-[500px]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-900/90 border border-purple-500/30 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl backdrop-blur-xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-500" />
          
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3 shadow-inner">
              <Shield className="w-8 h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Configura tu Bóveda Segura
            </h2>
            <p className="text-xs text-zinc-400 mt-1.5 max-w-xs">
              Asigna tu contraseña maestra por primera vez. Se guardará mediante un hash criptográfico indescifrable (PBKDF2 SHA-256 + Salt).
            </p>
          </div>

          <form onSubmit={handleSetupPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Contraseña Maestra
              </label>
              <div className="relative">
                <input
                  type={showSetupPassword ? "text" : "password"}
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  placeholder="Crea una contraseña segura..."
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 pr-10 font-mono"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSetupPassword(!showSetupPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  {showSetupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Confirmar Contraseña
              </label>
              <input
                type={showSetupPassword ? "text" : "password"}
                value={confirmSetupPassword}
                onChange={(e) => setConfirmSetupPassword(e.target.value)}
                placeholder="Repite la contraseña..."
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Pista para recordar (opcional)
              </label>
              <input
                type="text"
                value={setupHint}
                onChange={(e) => setSetupHint(e.target.value)}
                placeholder="Ej. Mi fecha favorita o apodo..."
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSettingUp}
              className="w-full mt-2 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSettingUp ? (
                <>
                  <RefreshCw className="animate-spin w-4 h-4" />
                  Encriptando y guardando...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Establecer Contraseña y Entrar
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // 2. LOCKED SCREEN (requires password, zero credentials rendered)
  if (!isUnlocked) {
    return (
      <div className="p-4 sm:p-6 w-full flex items-center justify-center min-h-[500px]">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/90 border border-white/10 rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl backdrop-blur-xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-amber-500 to-purple-500" />

          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400 mb-3 shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Bóveda de Credenciales
            </h2>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
              <ShieldAlert size={14} />
              Requiere contraseña
            </div>
            <p className="text-xs text-zinc-400 mt-2 max-w-xs">
              Ingresa tu contraseña maestra para descifrar y visualizar tus cuentas y credenciales.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <div className="relative">
                <input
                  type={showUnlockPassword ? "text" : "password"}
                  value={unlockPassword}
                  onChange={(e) => setUnlockPassword(e.target.value)}
                  placeholder="Contraseña de la bóveda..."
                  className="w-full bg-zinc-950/80 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 pr-10 font-mono"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  {showUnlockPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {config.credencialesSecurity?.hint && (
              <div className="text-center">
                {showHint ? (
                  <div className="text-xs text-amber-300 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                    💡 Pista: <span className="font-semibold">{config.credencialesSecurity.hint}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowHint(true)}
                    className="text-[11px] text-zinc-400 hover:text-white inline-flex items-center gap-1 transition-colors"
                  >
                    <HelpCircle size={12} />
                    Ver pista de contraseña
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-purple-600 hover:from-amber-500 hover:to-purple-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="animate-spin w-4 h-4" />
                  Verificando...
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  Desbloquear
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // 3. UNLOCKED CREDENTIALS DASHBOARD
  const credsList = config.credenciales || [];

  return (
    <div className="p-4 sm:p-6 text-white space-y-6 w-full">
      {/* Top Header with Lock / Change Password actions */}
      <div className="flex flex-wrap justify-between items-center gap-3 bg-zinc-900/60 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white">Bóveda de Credenciales</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck size={12} /> Desbloqueada
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              {credsList.length} cuentas y contraseñas protegidas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsChangePasswordOpen(true)}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold rounded-xl border border-white/10 transition-colors flex items-center gap-1.5"
            title="Cambiar contraseña de la bóveda"
          >
            <Key size={14} className="text-purple-400" />
            <span className="hidden sm:inline">Cambiar</span> Contraseña
          </button>
          <button
            onClick={handleLockVault}
            className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
            title="Bloquear bóveda inmediatamente"
          >
            <Lock size={14} />
            Bloquear
          </button>
        </div>
      </div>

      {/* Form: Add or Edit Credential */}
      <div className="bg-zinc-900/80 border border-white/10 p-5 rounded-2xl shadow-xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            {editingId ? <Edit2 size={16} className="text-blue-400" /> : <Key size={16} className="text-purple-400" />}
            {editingId ? 'Editar Credencial' : 'Agregar Nueva Credencial'}
          </h3>
          {editingId && (
            <button 
              onClick={cancelEdit} 
              className="text-xs text-zinc-400 hover:text-white px-2 py-1 bg-white/5 rounded-lg transition-colors flex items-center gap-1"
            >
              <X size={12} /> Cancelar edición
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input 
            className="bg-zinc-950/80 border border-white/10 p-2.5 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500" 
            placeholder="Nombre del servicio (ej. Gmail, AWS)..." 
            value={nombre} 
            onChange={e => setNombre(e.target.value)} 
          />
          <input 
            className="bg-zinc-950/80 border border-white/10 p-2.5 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 font-mono" 
            placeholder="Usuario / Correo..." 
            value={usuario} 
            onChange={e => setUsuario(e.target.value)} 
          />
          <input 
            className="bg-zinc-950/80 border border-white/10 p-2.5 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 font-mono" 
            placeholder="Contraseña / Token..." 
            type="text" 
            value={contra} 
            onChange={e => setContra(e.target.value)} 
          />
          <input 
            className="bg-zinc-950/80 border border-white/10 p-2.5 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500" 
            placeholder="Datos adicionales (URL, PIN, notas)..." 
            value={datos} 
            onChange={e => setDatos(e.target.value)} 
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Color distintivo:</span>
            <input 
              type="color" 
              className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0" 
              value={color} 
              onChange={e => setColor(e.target.value)} 
              title="Color de tarjeta"
            />
          </div>
          <button 
            className={`px-5 py-2 rounded-xl font-bold text-xs sm:text-sm text-white shadow-lg transition-all flex items-center gap-2 ${
              editingId ? 'bg-blue-600 hover:bg-blue-500' : 'bg-purple-600 hover:bg-purple-500'
            }`} 
            onClick={addCredencial}
          >
            {editingId ? <Check size={16} /> : <Key size={16} />}
            {editingId ? 'Actualizar Credencial' : 'Guardar Credencial'}
          </button>
        </div>
      </div>

      {/* Grid of Credentials */}
      <DndContext sensors={undefined} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={credsList.map(c => c.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {credsList.map((cred) => (
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

      {credsList.length === 0 && (
        <div className="text-center py-12 text-zinc-500 bg-zinc-900/30 rounded-2xl border border-dashed border-white/10">
          <Key className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">Aún no has agregado ninguna credencial a tu bóveda.</p>
          <p className="text-xs mt-1">Usa el formulario superior para almacenar cuentas y claves de forma segura.</p>
        </div>
      )}

      {/* MODAL: Change Password */}
      <AnimatePresence>
        {isChangePasswordOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-white/15 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Key size={18} className="text-purple-400" />
                  Cambiar Contraseña Maestra
                </h3>
                <button onClick={() => setIsChangePasswordOpen(false)} className="text-zinc-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                    Contraseña Actual
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Tu contraseña actual..."
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                    Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres..."
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repite la nueva contraseña..."
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                    Nueva Pista (opcional)
                  </label>
                  <input
                    type="text"
                    value={newHint}
                    onChange={(e) => setNewHint(e.target.value)}
                    placeholder="Pista para recordar..."
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsChangePasswordOpen(false)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isChangingPassword ? <RefreshCw className="animate-spin w-3.5 h-3.5" /> : <Check size={14} />}
                    Actualizar Contraseña
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Credenciales;
