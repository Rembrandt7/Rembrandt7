import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, Lock, Unlock, Key, TrendingUp, Heart, FileText, 
  Eye, EyeOff, ShieldAlert, Check, X, RefreshCw, Sparkles, FolderLock
} from 'lucide-react';
import { useLinks } from '../contexts/LinkContext';
import { hashPassword, verifyPassword } from '../utils/cryptoUtils';
import { supabase } from '../services/supabaseClient';
import { toast } from 'sonner';

// Lazy load the 3 sub-sections
const Finanzas = lazy(() => import('./Finanzas'));
const Nutricion = lazy(() => import('./Nutricion'));
const Credenciales = lazy(() => import('./Credenciales'));
const NotesTab = lazy(() => import('./NotesTab'));

export type PersonalSubTab = 'finanzas' | 'nutricion' | 'boveda';
export type BovedaSubTab = 'credenciales' | 'notas';

interface PersonalTabProps {
  initialSubTab?: PersonalSubTab;
  initialBovedaTab?: BovedaSubTab;
}

export const PersonalTab: React.FC<PersonalTabProps> = ({ 
  initialSubTab = 'finanzas',
  initialBovedaTab = 'credenciales'
}) => {
  const { config, updateConfig } = useLinks();

  // Active sub-tab inside Personal
  const [activeSubTab, setActiveSubTab] = useState<PersonalSubTab>(() => {
    const saved = localStorage.getItem('rembrandt_personal_subtab');
    if (saved === 'finanzas' || saved === 'nutricion' || saved === 'boveda') {
      return saved;
    }
    return initialSubTab;
  });

  // Active sub-tab inside Boveda (Credenciales vs Notas)
  const [bovedaTab, setBovedaTab] = useState<BovedaSubTab>(() => {
    const saved = localStorage.getItem('rembrandt_boveda_subtab');
    if (saved === 'credenciales' || saved === 'notas') {
      return saved;
    }
    return initialBovedaTab;
  });

  // Master Lock state
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('personal_unlocked') === 'true';
  });

  // Security data: hash and salt
  const [securityData, setSecurityData] = useState<{ passwordHash: string; salt: string; hint?: string } | null>(() => {
    const local = localStorage.getItem('rembrandt_personal_security');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed.passwordHash && parsed.salt) return parsed;
      } catch (e) {}
    }
    // Also check if config has it
    if ((config as any).personalSecurity?.passwordHash) {
      return (config as any).personalSecurity;
    }
    // Fallback: check if credencialesSecurity exists so we can reuse that password!
    if (config.credencialesSecurity?.passwordHash && config.credencialesSecurity?.salt) {
      return config.credencialesSecurity;
    }
    return null;
  });

  // Lock Screen inputs
  const [unlockPassword, setUnlockPassword] = useState('');
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Setup Screen inputs (first time)
  const [setupPassword, setSetupPassword] = useState('');
  const [confirmSetupPassword, setConfirmSetupPassword] = useState('');
  const [setupHint, setSetupHint] = useState('');
  const [showSetupPassword, setShowSetupPassword] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);

  // Change Password Modal
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [newHint, setNewHint] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Sync security configuration from Supabase storage on mount
  useEffect(() => {
    const fetchRemoteSecurity = async () => {
      try {
        const { data, error } = await supabase.storage.from('savejson').download('personal_security.json');
        if (!error && data) {
          const text = await data.text();
          const parsed = JSON.parse(text);
          if (parsed.passwordHash && parsed.salt) {
            setSecurityData(parsed);
            localStorage.setItem('rembrandt_personal_security', JSON.stringify(parsed));
          }
        }
      } catch (e) {
        // Silent catch
      }
    };
    fetchRemoteSecurity();
  }, []);

  // Update initial subtab if prop changes
  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  useEffect(() => {
    if (initialBovedaTab) {
      setBovedaTab(initialBovedaTab);
    }
  }, [initialBovedaTab]);

  // Listen to switch-personal-subtab event
  useEffect(() => {
    const handleSwitchSubTab = (e: any) => {
      if (!e.detail) return;
      if (typeof e.detail === 'string') {
        if (e.detail === 'finanzas' || e.detail === 'nutricion' || e.detail === 'boveda') {
          setActiveSubTab(e.detail);
          localStorage.setItem('rembrandt_personal_subtab', e.detail);
        }
      } else if (typeof e.detail === 'object') {
        if (e.detail.subtab) {
          setActiveSubTab(e.detail.subtab);
          localStorage.setItem('rembrandt_personal_subtab', e.detail.subtab);
        }
        if (e.detail.bovedaTab) {
          setBovedaTab(e.detail.bovedaTab);
          localStorage.setItem('rembrandt_boveda_subtab', e.detail.bovedaTab);
        }
      }
    };
    window.addEventListener('switch-personal-subtab' as any, handleSwitchSubTab);
    return () => {
      window.removeEventListener('switch-personal-subtab' as any, handleSwitchSubTab);
    };
  }, []);

  const handleSelectSubTab = (tab: PersonalSubTab) => {
    setActiveSubTab(tab);
    localStorage.setItem('rembrandt_personal_subtab', tab);
  };

  const handleSelectBovedaTab = (tab: BovedaSubTab) => {
    setBovedaTab(tab);
    localStorage.setItem('rembrandt_boveda_subtab', tab);
  };

  // Save security data to local and Supabase
  const saveSecurityData = async (sec: { passwordHash: string; salt: string; hint?: string }) => {
    setSecurityData(sec);
    localStorage.setItem('rembrandt_personal_security', JSON.stringify(sec));

    // Also update LinkContext config
    const updatedConfig = {
      ...config,
      personalSecurity: sec,
      credencialesSecurity: sec // Keep in sync with credentials vault
    };
    updateConfig(updatedConfig);

    try {
      await supabase.storage.from('savejson').upload('personal_security.json', JSON.stringify(sec, null, 2), {
        upsert: true,
        contentType: 'application/json'
      });
    } catch (e) {
      console.warn('Could not sync personal_security to Supabase:', e);
    }
  };

  // FIRST TIME SETUP
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
      const newSec = {
        passwordHash: hash,
        salt,
        hint: setupHint.trim() || undefined
      };
      await saveSecurityData(newSec);

      // Unlock session
      setIsUnlocked(true);
      sessionStorage.setItem('personal_unlocked', 'true');
      sessionStorage.setItem('credenciales_unlocked', 'true');
      toast.success('Contraseña maestra configurada con éxito. Espacio Personal desbloqueado.');
    } catch (err: any) {
      console.error('Setup password error:', err);
      toast.error('Error al configurar contraseña');
    } finally {
      setIsSettingUp(false);
    }
  };

  // UNLOCK ACTION
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPassword) {
      toast.error('Ingresa tu contraseña');
      return;
    }
    if (!securityData) {
      toast.error('No hay contraseña configurada');
      return;
    }

    setIsVerifying(true);
    try {
      const isValid = await verifyPassword(unlockPassword, securityData.passwordHash, securityData.salt);
      if (isValid) {
        setIsUnlocked(true);
        sessionStorage.setItem('personal_unlocked', 'true');
        sessionStorage.setItem('credenciales_unlocked', 'true');
        setUnlockPassword('');
        toast.success('¡Espacio Personal desbloqueado!');
      } else {
        toast.error('Contraseña incorrecta');
      }
    } catch (err) {
      console.error('Verification error:', err);
      toast.error('Error al verificar contraseña');
    } finally {
      setIsVerifying(false);
    }
  };

  // LOCK ACTION
  const handleLock = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem('personal_unlocked');
    sessionStorage.removeItem('credenciales_unlocked');
    setUnlockPassword('');
    toast.info('Espacio Personal bloqueado');
  };

  // CHANGE PASSWORD
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Ingresa tu contraseña actual');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      toast.error('La nueva contraseña debe tener al menos 4 caracteres');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('Las nuevas contraseñas no coinciden');
      return;
    }
    if (!securityData) return;

    setIsChangingPassword(true);
    try {
      const isValid = await verifyPassword(currentPassword, securityData.passwordHash, securityData.salt);
      if (!isValid) {
        toast.error('La contraseña actual es incorrecta');
        return;
      }

      const { hash, salt } = await hashPassword(newPassword);
      const newSec = {
        passwordHash: hash,
        salt,
        hint: newHint.trim() || undefined
      };
      await saveSecurityData(newSec);

      setIsChangeModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setNewHint('');
      toast.success('Contraseña maestra actualizada con éxito');
    } catch (err) {
      console.error('Change password error:', err);
      toast.error('Error al actualizar la contraseña');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Count items for badges
  const notesCount = React.useMemo(() => {
    const seen = new Set<string>();
    return (config.notes || []).filter(n => {
      if (!n || !n.id) return false;
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    }).length;
  }, [config.notes]);

  const credsCount = config.credenciales?.length || 0;

  // 1. ONBOARDING / SETUP SCREEN (IF NO PASSWORD HAS EVER BEEN SET)
  if (!securityData) {
    return (
      <div className="w-full min-h-[550px] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-zinc-900/90 border border-amber-500/30 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6 text-center"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <ShieldCheck size={32} className="text-black" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Configura tu Contraseña de Personal
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Crea una contraseña maestra para proteger tus <strong className="text-amber-400">Finanzas</strong>, <strong className="text-rose-400">Nutrición</strong> y <strong className="text-purple-400">Bóveda</strong> (Credenciales y Notas).
            </p>
          </div>

          <form onSubmit={handleSetupPassword} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Contraseña Nueva *
              </label>
              <div className="relative">
                <input
                  type={showSetupPassword ? "text" : "password"}
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres..."
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-3 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  autoFocus
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
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Confirmar Contraseña *
              </label>
              <input
                type={showSetupPassword ? "text" : "password"}
                value={confirmSetupPassword}
                onChange={(e) => setConfirmSetupPassword(e.target.value)}
                placeholder="Repite la contraseña..."
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Pista de recuperación (opcional)
              </label>
              <input
                type="text"
                value={setupHint}
                onChange={(e) => setSetupHint(e.target.value)}
                placeholder="Ej. Nombre de mi mascota de la infancia..."
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSettingUp}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold rounded-xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isSettingUp ? <RefreshCw className="animate-spin" size={18} /> : <Lock size={18} />}
              <span>{isSettingUp ? 'Guardando...' : 'Crear Contraseña y Desbloquear'}</span>
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // 2. LOCKED SCREEN
  if (!isUnlocked) {
    return (
      <div className="w-full min-h-[550px] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-zinc-900/90 border border-white/15 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6 text-center"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Lock size={30} className="text-white animate-pulse" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Espacio Personal Protegido
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Ingresa tu contraseña para acceder a tus Finanzas, Nutrición y Bóveda.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="relative">
              <input
                type={showUnlockPassword ? "text" : "password"}
                value={unlockPassword}
                onChange={(e) => setUnlockPassword(e.target.value)}
                placeholder="Contraseña maestra..."
                className="w-full bg-zinc-950 border border-white/15 rounded-xl pl-4 pr-10 py-3 text-sm text-white focus:outline-none focus:border-amber-400 text-center font-mono placeholder:font-sans placeholder-zinc-500"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                {showUnlockPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {securityData.hint && (
              <div className="text-left">
                {showHint ? (
                  <p className="text-xs text-amber-300/90 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                    💡 Pista: {securityData.hint}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowHint(true)}
                    className="text-[11px] text-zinc-400 hover:text-amber-400 underline transition-colors"
                  >
                    Mostrar pista de contraseña
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold rounded-xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isVerifying ? <RefreshCw className="animate-spin" size={18} /> : <Unlock size={18} />}
              <span>{isVerifying ? 'Verificando...' : 'Desbloquear Todo'}</span>
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // 3. UNLOCKED VIEW: TOP NAVIGATION BAR + 3 SUB-SECTIONS (FINANZAS, NUTRICIÓN, BÓVEDA)
  return (
    <div className="w-full flex flex-col space-y-4">
      {/* HEADER: SUBTAB SWITCHER + TOOLS (CHANGE PASSWORD, LOCK) */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 px-1 sm:px-2 pt-1 pb-2 border-b border-white/10">
        {/* SEGMENTED SWITCHER: FINANZAS | NUTRICIÓN | BÓVEDA */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900/90 border border-white/10 rounded-2xl backdrop-blur-md shadow-lg overflow-x-auto max-w-full">
          {/* TAB 1: FINANZAS */}
          <button
            onClick={() => handleSelectSubTab('finanzas')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'finanzas'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <TrendingUp size={16} className={activeSubTab === 'finanzas' ? 'text-white' : 'text-emerald-400'} />
            <span>Finanzas</span>
          </button>

          {/* TAB 2: NUTRICIÓN */}
          <button
            onClick={() => handleSelectSubTab('nutricion')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'nutricion'
                ? 'bg-gradient-to-r from-rose-600 to-orange-600 text-white shadow-md shadow-rose-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Heart size={16} className={activeSubTab === 'nutricion' ? 'text-white' : 'text-rose-400'} />
            <span>Nutrición</span>
          </button>

          {/* TAB 3: BÓVEDA (CREDENCIALES & NOTAS) */}
          <button
            onClick={() => handleSelectSubTab('boveda')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'boveda'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FolderLock size={16} className={activeSubTab === 'boveda' ? 'text-white' : 'text-purple-400'} />
            <span>Bóveda</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/10 text-zinc-300">
              {credsCount + notesCount}
            </span>
          </button>
        </div>

        {/* SECURITY ACTIONS: CHANGE PASSWORD & LOCK */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setIsChangeModalOpen(true)}
            className="px-2.5 py-1.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold rounded-xl border border-white/10 transition-colors flex items-center gap-1.5 shadow-sm"
            title="Cambiar contraseña de Personal"
          >
            <Key size={13} className="text-amber-400" />
            <span className="hidden sm:inline">Cambiar Contraseña</span>
          </button>

          <button
            onClick={handleLock}
            className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 hover:text-rose-200 text-xs font-bold rounded-xl border border-rose-500/30 transition-all flex items-center gap-1.5 shadow-sm"
            title="Bloquear espacio personal ahora"
          >
            <Lock size={14} />
            <span>Bloquear</span>
          </button>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="w-full">
        {/* SUBTAB 1: FINANZAS */}
        {activeSubTab === 'finanzas' && (
          <Suspense fallback={<div className="p-8 text-center text-zinc-400">Cargando Finanzas...</div>}>
            <Finanzas />
          </Suspense>
        )}

        {/* SUBTAB 2: NUTRICIÓN */}
        {activeSubTab === 'nutricion' && (
          <Suspense fallback={<div className="p-8 text-center text-zinc-400">Cargando Nutrición...</div>}>
            <Nutricion />
          </Suspense>
        )}

        {/* SUBTAB 3: BÓVEDA (CREDENCIALES Y NOTAS) */}
        {activeSubTab === 'boveda' && (
          <div className="w-full space-y-4">
            {/* BOVEDA SUB-SWITCHER: CREDENCIALES VS NOTAS */}
            <div className="w-full flex items-center justify-center pt-1 pb-1">
              <div className="inline-flex p-1 bg-zinc-950/80 border border-white/10 rounded-2xl backdrop-blur-md shadow-inner">
                <button
                  onClick={() => handleSelectBovedaTab('credenciales')}
                  className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                    bovedaTab === 'credenciales'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Lock size={14} className="text-rose-400" />
                  <span>Credenciales</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/15">
                    {credsCount}
                  </span>
                </button>

                <button
                  onClick={() => handleSelectBovedaTab('notas')}
                  className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                    bovedaTab === 'notas'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <FileText size={14} className="text-amber-300" />
                  <span>Notas Privadas</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/15">
                    {notesCount}
                  </span>
                </button>
              </div>
            </div>

            {/* BOVEDA INNER VIEW */}
            {bovedaTab === 'credenciales' ? (
              <Suspense fallback={<div className="p-8 text-center text-zinc-400">Cargando Credenciales...</div>}>
                <Credenciales />
              </Suspense>
            ) : (
              <Suspense fallback={<div className="p-8 text-center text-zinc-400">Cargando Notas...</div>}>
                <NotesTab />
              </Suspense>
            )}
          </div>
        )}
      </div>

      {/* MODAL: CAMBIAR CONTRASEÑA */}
      <AnimatePresence>
        {isChangeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-white/15 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-white/10">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Key size={18} className="text-amber-400" />
                  Cambiar Contraseña de Personal
                </h3>
                <button onClick={() => setIsChangeModalOpen(false)} className="text-zinc-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                    Contraseña Actual *
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Contraseña actual..."
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                    Nueva Contraseña *
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres..."
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                    Confirmar Nueva Contraseña *
                  </label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repite la nueva contraseña..."
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                    Pista de recuperación (opcional)
                  </label>
                  <input
                    type="text"
                    value={newHint}
                    onChange={(e) => setNewHint(e.target.value)}
                    placeholder="Pista para recordar tu contraseña..."
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsChangeModalOpen(false)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
                  >
                    {isChangingPassword ? <RefreshCw className="animate-spin" size={14} /> : <Check size={14} />}
                    <span>{isChangingPassword ? 'Guardando...' : 'Actualizar'}</span>
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

export default PersonalTab;
