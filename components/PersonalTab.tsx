import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, Lock, Unlock, Key, TrendingUp, Heart, FileText, 
  Eye, EyeOff, ShieldAlert, Check, X, RefreshCw, Sparkles, FolderLock, Plus, UserCheck, User
} from 'lucide-react';
import { useLinks } from '../contexts/LinkContext';
import { hashPassword, verifyPassword } from '../utils/cryptoUtils';
import { supabase } from '../services/supabaseClient';
import { toast } from 'sonner';

// Lazy load the sub-sections
const Finanzas = lazy(() => import('./Finanzas'));
const Nutricion = lazy(() => import('./Nutricion'));
const Credenciales = lazy(() => import('./Credenciales'));
const NotesTab = lazy(() => import('./NotesTab'));

export type PersonalSubTab = 'finanzas' | 'nutricion' | 'boveda';
export type BovedaSubTab = 'credenciales' | 'notas';

interface PersonalProfile {
  id: string;
  label: string;
  fileName: string;
}

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

  // Profiles List
  const [profiles, setProfiles] = useState<PersonalProfile[]>(() => {
    const saved = localStorage.getItem('rembrandt_personal_profiles');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [
      { id: 'rem', label: 'Perfil Rem (Principal)', fileName: 'finanzas_rem.json' },
      { id: 'personal', label: 'Perfil Personal', fileName: 'finanzas_personal.json' }
    ];
  });

  // Active Profile ID: null by default on initial load as requested
  const [activeProfileId, setActiveProfileId] = useState<string | null>(() => {
    return sessionStorage.getItem('personal_active_profile') || null;
  });

  // Master Lock state: false by default unless an active profile is authenticated in current session
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('personal_unlocked') === 'true' && Boolean(sessionStorage.getItem('personal_active_profile'));
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
    if ((config as any).personalSecurity?.passwordHash) {
      return (config as any).personalSecurity;
    }
    if (config.credencialesSecurity?.passwordHash && config.credencialesSecurity?.salt) {
      return config.credencialesSecurity;
    }
    return null;
  });

  // Unlock Modal for Profile
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [targetProfileToUnlock, setTargetProfileToUnlock] = useState<string | null>(null);
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
      } catch (e) {}
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

  // PROFILE SELECTION & UNLOCK ACTION
  const handlePromptProfile = (profileId: string) => {
    if (isUnlocked && activeProfileId === profileId) {
      return; // Already unlocked and active
    }
    setTargetProfileToUnlock(profileId);
    setUnlockPassword('');
    setShowHint(false);
    setIsUnlockModalOpen(true);
  };

  const handleUnlockProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPassword) {
      toast.error('Ingresa tu contraseña para acceder al perfil');
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
        const profId = targetProfileToUnlock || 'rem';
        const profileObj = profiles.find(p => p.id === profId) || profiles[0];
        setActiveProfileId(profId);
        setIsUnlocked(true);
        sessionStorage.setItem('personal_active_profile', profId);
        sessionStorage.setItem('personal_unlocked', 'true');
        sessionStorage.setItem('credenciales_unlocked', 'true');
        setUnlockPassword('');
        setIsUnlockModalOpen(false);
        setTargetProfileToUnlock(null);
        toast.success(`¡${profileObj.label} cargado con éxito!`);
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

  // LOCK / LOGOUT ACTION
  const handleLock = () => {
    setIsUnlocked(false);
    setActiveProfileId(null);
    sessionStorage.removeItem('personal_active_profile');
    sessionStorage.removeItem('personal_unlocked');
    sessionStorage.removeItem('credenciales_unlocked');
    setUnlockPassword('');
    toast.info('Perfil cerrado y datos bloqueados.');
  };

  // CREATE NEW PROFILE
  const handleCreateProfile = () => {
    const name = prompt('Nombre del nuevo perfil personal (ej. Casa, Proyecto, Familiar):');
    if (!name || !name.trim()) return;

    const id = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (profiles.some(p => p.id === id)) {
      toast.error('Ya existe un perfil con ese nombre');
      return;
    }

    const newProfile: PersonalProfile = {
      id,
      label: `Perfil ${name.trim()}`,
      fileName: `finanzas_${id}.json`
    };

    const updated = [...profiles, newProfile];
    setProfiles(updated);
    localStorage.setItem('rembrandt_personal_profiles', JSON.stringify(updated));
    toast.success(`Perfil "${newProfile.label}" creado. Selecciónalo para activarlo.`);
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
      setSecurityData(newSec);
      localStorage.setItem('rembrandt_personal_security', JSON.stringify(newSec));

      const updatedConfig = {
        ...config,
        personalSecurity: newSec,
        credencialesSecurity: newSec
      };
      updateConfig(updatedConfig);

      try {
        await supabase.storage.from('savejson').upload('personal_security.json', JSON.stringify(newSec, null, 2), {
          upsert: true,
          contentType: 'application/json'
        });
      } catch (e) {}

      // Unlock default profile
      setActiveProfileId('rem');
      setIsUnlocked(true);
      sessionStorage.setItem('personal_active_profile', 'rem');
      sessionStorage.setItem('personal_unlocked', 'true');
      sessionStorage.setItem('credenciales_unlocked', 'true');
      toast.success('Contraseña maestra configurada con éxito. Espacio Personal activo.');
    } catch (err: any) {
      console.error('Setup password error:', err);
      toast.error('Error al configurar contraseña');
    } finally {
      setIsSettingUp(false);
    }
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
      setSecurityData(newSec);
      localStorage.setItem('rembrandt_personal_security', JSON.stringify(newSec));

      const updatedConfig = {
        ...config,
        personalSecurity: newSec,
        credencialesSecurity: newSec
      };
      updateConfig(updatedConfig);

      try {
        await supabase.storage.from('savejson').upload('personal_security.json', JSON.stringify(newSec, null, 2), {
          upsert: true,
          contentType: 'application/json'
        });
      } catch (e) {}

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
              Crea una contraseña maestra para proteger tus <strong className="text-amber-400">Finanzas & Tarjetas</strong>, <strong className="text-rose-400">Nutrición</strong> y <strong className="text-purple-400">Bóveda</strong>.
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
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-3 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
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
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
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

  const activeProfile = profiles.find(p => p.id === activeProfileId);

  // MAIN VIEW: Always shows Top Profiles Bar + Subtabs + Content
  return (
    <div className="w-full flex flex-col space-y-4">
      {/* 1. TOP PROFILE SELECTOR BAR */}
      <div className="w-full bg-gradient-to-r from-zinc-950 via-zinc-900/90 to-zinc-950 border border-white/10 rounded-2xl p-3 sm:p-4 backdrop-blur-xl shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-purple-600/30">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide flex items-center gap-2">
              Perfiles Personales
              {isUnlocked && activeProfile ? (
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {activeProfile.label} (Cargado)
                </span>
              ) : (
                <span className="text-[10px] font-mono text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                  Sin perfil cargado
                </span>
              )}
            </h3>
            <p className="text-[11px] text-zinc-400">
              {isUnlocked && activeProfile 
                ? `Toda tu información personal, finanzas y nutrición están sincronizadas.`
                : `Selecciona un perfil e ingresa la contraseña para desbloquear y cargar tus datos personales.`}
            </p>
          </div>
        </div>

        {/* Profile Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {profiles.map(p => {
            const isActive = activeProfileId === p.id && isUnlocked;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePromptProfile(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                  isActive 
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400/50 shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400/30'
                    : 'bg-zinc-900/80 text-zinc-300 border-white/10 hover:text-white hover:border-white/25'
                }`}
              >
                {isActive ? <Unlock size={13} className="text-emerald-200" /> : <Lock size={13} className="text-amber-400/70" />}
                <span>{p.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleCreateProfile}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white bg-white/5 border border-white/10 hover:border-white/20 transition-all flex items-center gap-1 cursor-pointer"
            title="Crear nuevo perfil"
          >
            <Plus size={13} />
            <span>Perfil</span>
          </button>

          {isUnlocked && (
            <button
              type="button"
              onClick={handleLock}
              className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 hover:text-rose-200 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ml-1"
              title="Cerrar perfil y bloquear"
            >
              <Lock size={13} />
              <span>Bloquear</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. SUBTAB SWITCHER: FINANZAS | NUTRICIÓN | BÓVEDA */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 px-1 sm:px-2 pt-1 pb-2 border-b border-white/10">
        <div className="flex items-center gap-1.5 p-1.5 bg-gradient-to-r from-zinc-950/90 via-zinc-900/90 to-zinc-950/90 border border-white/10 rounded-2xl backdrop-blur-xl shadow-xl overflow-x-auto max-w-full">
          {/* TAB 1: FINANZAS */}
          <button
            onClick={() => handleSelectSubTab('finanzas')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 select-none relative cursor-pointer ${
              activeSubTab === 'finanzas'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_4px_16px_rgba(16,185,129,0.35)] border border-emerald-400/40'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            {activeSubTab === 'finanzas' && (
              <span className="absolute inset-x-2 -top-px h-[2px] bg-gradient-to-r from-transparent via-emerald-200 to-transparent rounded-full pointer-events-none" />
            )}
            <TrendingUp size={16} className={activeSubTab === 'finanzas' ? 'text-white' : 'text-emerald-400'} />
            <span>Finanzas & Tarjetas</span>
          </button>

          {/* TAB 2: NUTRICIÓN */}
          <button
            onClick={() => handleSelectSubTab('nutricion')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 select-none relative cursor-pointer ${
              activeSubTab === 'nutricion'
                ? 'bg-gradient-to-r from-rose-600 to-orange-600 text-white shadow-[0_4px_16px_rgba(244,63,94,0.35)] border border-rose-400/40'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            {activeSubTab === 'nutricion' && (
              <span className="absolute inset-x-2 -top-px h-[2px] bg-gradient-to-r from-transparent via-rose-200 to-transparent rounded-full pointer-events-none" />
            )}
            <Heart size={16} className={activeSubTab === 'nutricion' ? 'text-white' : 'text-rose-400'} />
            <span>Nutrición & Salud</span>
          </button>

          {/* TAB 3: BÓVEDA (CREDENCIALES & NOTAS) */}
          <button
            onClick={() => handleSelectSubTab('boveda')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 select-none relative cursor-pointer ${
              activeSubTab === 'boveda'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_4px_16px_rgba(168,85,247,0.35)] border border-purple-400/40'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            {activeSubTab === 'boveda' && (
              <span className="absolute inset-x-2 -top-px h-[2px] bg-gradient-to-r from-transparent via-purple-200 to-transparent rounded-full pointer-events-none" />
            )}
            <FolderLock size={16} className={activeSubTab === 'boveda' ? 'text-white' : 'text-purple-400'} />
            <span>Bóveda</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-zinc-200 font-bold border border-white/10">
              {credsCount + notesCount}
            </span>
          </button>
        </div>

        {/* SECURITY ACTIONS: CHANGE PASSWORD */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setIsChangeModalOpen(true)}
            className="px-2.5 py-1.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold rounded-xl border border-white/10 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Cambiar contraseña maestra"
          >
            <Key size={13} className="text-amber-400" />
            <span className="hidden sm:inline">Contraseña Maestra</span>
          </button>
        </div>
      </div>

      {/* 3. CONTENT AREA */}
      <div className="w-full">
        {/* SUBTAB 1: FINANZAS */}
        {activeSubTab === 'finanzas' && (
          <Suspense fallback={<div className="p-8 text-center text-zinc-400">Cargando Finanzas...</div>}>
            <Finanzas 
              isLockedPreview={!isUnlocked || !activeProfileId}
              activeProfileId={activeProfileId}
              onSelectProfile={(id) => handlePromptProfile(id)}
            />
          </Suspense>
        )}

        {/* SUBTAB 2: NUTRICIÓN */}
        {activeSubTab === 'nutricion' && (
          <Suspense fallback={<div className="p-8 text-center text-zinc-400">Cargando Nutrición...</div>}>
            {!isUnlocked || !activeProfileId ? (
              <div className="w-full bg-gradient-to-b from-zinc-900/70 via-zinc-900/50 to-zinc-950/70 border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-xl text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-rose-600 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-rose-600/30">
                  <Heart size={26} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">Plan Nutricional & Salud Protegido</h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto leading-relaxed">
                    Las metas calóricas, macronutrientes y registros de alimentos están resguardados bajo contraseña. Selecciona tu perfil arriba para cargarlos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handlePromptProfile('rem')}
                  className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-rose-600/30 inline-flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Unlock size={16} />
                  <span>Desbloquear Nutrición</span>
                </button>
              </div>
            ) : (
              <Nutricion />
            )}
          </Suspense>
        )}

        {/* SUBTAB 3: BÓVEDA (CREDENCIALES Y NOTAS) */}
        {activeSubTab === 'boveda' && (
          <div className="w-full space-y-4">
            {!isUnlocked || !activeProfileId ? (
              <div className="w-full bg-gradient-to-b from-zinc-900/70 via-zinc-900/50 to-zinc-950/70 border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-xl text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
                  <FolderLock size={26} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">Bóveda de Credenciales & Notas Protegida</h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto leading-relaxed">
                    Tus contraseñas guardadas y notas confidenciales requieren autenticación. Selecciona tu perfil para desbloquear la bóveda.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handlePromptProfile('rem')}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-purple-600/30 inline-flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Unlock size={16} />
                  <span>Desbloquear Bóveda</span>
                </button>
              </div>
            ) : (
              <>
                {/* BOVEDA SUB-SWITCHER: CREDENCIALES VS NOTAS */}
                <div className="w-full flex items-center justify-center pt-1 pb-1">
                  <div className="inline-flex p-1 bg-zinc-950/80 border border-white/10 rounded-2xl backdrop-blur-md shadow-inner">
                    <button
                      onClick={() => handleSelectBovedaTab('credenciales')}
                      className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
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
                      className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        bovedaTab === 'notas'
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <FileText size={14} className="text-indigo-400" />
                      <span>Notas</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/15">
                        {notesCount}
                      </span>
                    </button>
                  </div>
                </div>

                {bovedaTab === 'credenciales' && (
                  <Suspense fallback={<div className="p-8 text-center text-zinc-400">Cargando Credenciales...</div>}>
                    <Credenciales />
                  </Suspense>
                )}

                {bovedaTab === 'notas' && (
                  <Suspense fallback={<div className="p-8 text-center text-zinc-400">Cargando Notas...</div>}>
                    <NotesTab />
                  </Suspense>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* 4. UNLOCK PROFILE MODAL */}
      <AnimatePresence>
        {isUnlockModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="max-w-md w-full bg-zinc-900 border border-white/15 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-center relative"
            >
              <button
                onClick={() => { setIsUnlockModalOpen(false); setTargetProfileToUnlock(null); }}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>

              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 flex items-center justify-center shadow-lg shadow-purple-500/30 text-white">
                <Lock size={26} className="animate-pulse" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Desbloquear {profiles.find(p => p.id === targetProfileToUnlock)?.label || 'Perfil'}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Ingresa tu contraseña para acceder a todas tus finanzas, tarjetas y nutrición personal.
                </p>
              </div>

              <form onSubmit={handleUnlockProfile} className="space-y-4">
                <div className="relative">
                  <input
                    type={showUnlockPassword ? "text" : "password"}
                    value={unlockPassword}
                    onChange={(e) => setUnlockPassword(e.target.value)}
                    placeholder="Contraseña..."
                    className="w-full bg-zinc-950 border border-white/15 rounded-xl pl-4 pr-10 py-3 text-sm text-white focus:outline-none focus:border-amber-400 text-center font-mono placeholder:font-sans placeholder-zinc-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    {showUnlockPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {securityData?.hint && (
                  <div className="text-left">
                    {showHint ? (
                      <p className="text-xs text-amber-300/90 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                        💡 Pista: {securityData.hint}
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowHint(true)}
                        className="text-[11px] text-zinc-400 hover:text-amber-400 underline transition-colors cursor-pointer"
                      >
                        Mostrar pista de contraseña
                      </button>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setIsUnlockModalOpen(false); setTargetProfileToUnlock(null); }}
                    className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    {isVerifying ? <RefreshCw className="animate-spin" size={16} /> : <Unlock size={16} />}
                    <span>{isVerifying ? 'Verificando...' : 'Desbloquear'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. CHANGE PASSWORD MODAL */}
      <AnimatePresence>
        {isChangeModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Key size={18} className="text-amber-400" />
                  Cambiar Contraseña Maestra
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
                    placeholder="Ingresa tu contraseña actual..."
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
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
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
