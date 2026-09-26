import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLinks } from '../contexts/LinkContext';
import { FinanzasCard, FinancialItem } from '../types';
import { 
  Plus, Edit, Trash2, CreditCard, Wallet, TrendingUp, TrendingDown, 
  Save, Download, Upload, Lock, Unlock, Key, ShieldCheck, ShieldAlert, 
  ArrowLeft, FileCode2, RefreshCw, X, Check, Eye, EyeOff, FolderOpen, FilePlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../services/supabaseClient';
import { toast } from 'sonner';
import { hashPassword, verifyPassword, encryptPayload, decryptPayload } from '../utils/cryptoUtils';

export interface FinanzasFileMeta {
  id: string; // e.g. "rem"
  fileName: string; // e.g. "finanzas_rem.json"
  label: string; // e.g. "Finanzas Rem"
  isDefault?: boolean;
  hasPassword?: boolean;
  updatedAt?: number;
}

const DEFAULT_FILES: FinanzasFileMeta[] = [
  {
    id: 'rem',
    fileName: 'finanzas_rem.json',
    label: 'Finanzas Rem (Por Defecto)',
    isDefault: true,
    hasPassword: false,
  }
];

const formatCurrencyInput = (value: string | number) => {
  if (value === undefined || value === null) return '';
  const strVal = value.toString().replace(/[^0-9.]/g, '');
  if (!strVal) return '';
  const parts = strVal.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (parts.length > 2) parts.pop();
  return parts.join('.');
};

const parseCurrencyInput = (value: string) => {
  return parseFloat(value.replace(/,/g, '')) || 0;
};

const CardItem: React.FC<{ 
  card: FinanzasCard, 
  onEdit: (c: FinanzasCard) => void, 
  onDelete: (id: string) => void, 
  onAdjust: (id: string, amount: number) => void,
  onSetBalance: (id: string, amount: number) => void,
  onMarkPaid?: (id: string) => void
}> = ({ card, onEdit, onDelete, onAdjust, onSetBalance, onMarkPaid }) => {
  const [amountInput, setAmountInput] = useState('');

  const handleAction = (isPositive: boolean) => {
    const val = parseFloat(amountInput);
    if (isNaN(val) || val <= 0) return;
    onAdjust(card.id, isPositive ? val : -val);
    setAmountInput('');
  };

  const isCredit = card.type === 'credito';
  const isGreen = isCredit && card.balance < 0;

  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
  const isPaidThisMonth = isCredit && card.lastPaidMonth === currentMonthStr;

  let nextPaymentDateStr = '';
  if (isCredit && card.paymentDate) {
    const paymentDay = parseInt(card.paymentDate, 10);
    if (!isNaN(paymentDay)) {
      let nextMonth = today.getMonth();
      let nextYear = today.getFullYear();
      if (isPaidThisMonth) {
        nextMonth += 1;
        if (nextMonth > 11) {
          nextMonth = 0;
          nextYear += 1;
        }
      }
      const nextDate = new Date(nextYear, nextMonth, paymentDay);
      nextPaymentDateStr = nextDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
    }
  }

  return (
    <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-4 relative group overflow-hidden flex flex-col justify-between h-[215px] shadow-lg">
      <div className={`absolute top-0 left-0 w-full h-1 ${isCredit ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
      
      <div>
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-bold text-base sm:text-lg text-white truncate pr-14">{card.name}</h3>
          <span className={`text-xl font-black ${isGreen ? 'text-emerald-400' : (isCredit ? 'text-rose-400' : 'text-emerald-400')}`}>
            ${card.balance.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
          </span>
        </div>
        <div className="text-xs text-white/50 font-medium mb-3 flex items-center justify-between">
          <span>{card.expirationDate} {isCredit && `| Corte: ${card.cutoffDate}`}</span>
          {isCredit && nextPaymentDateStr && (
            <span className={isPaidThisMonth ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              Pago: {nextPaymentDateStr}
            </span>
          )}
          {card.annualYieldRate ? (
            <span className="flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded" title={`Rendimiento: ${card.annualYieldRate}% anual`}>
              <TrendingUp size={10} /> {card.annualYieldRate}%
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-auto relative z-10">
        <input 
          type="number"
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          placeholder="Cantidad..."
          className="w-full bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
        />
        <div className="flex gap-1.5">
          <button onClick={() => handleAction(true)} className="flex-1 px-2 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 rounded-lg text-xs font-bold transition-colors">
            + Sumar
          </button>
          <button onClick={() => handleAction(false)} className="flex-1 px-2 py-1.5 bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 rounded-lg text-xs font-bold transition-colors">
            - Restar
          </button>
        </div>
      </div>

      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-lg p-0.5 border border-white/10">
        {isCredit && onMarkPaid && (
          <button 
            onClick={() => onMarkPaid(card.id)} 
            className={`p-1.5 rounded transition-colors ${isPaidThisMonth ? 'text-emerald-400 hover:bg-emerald-500/20' : 'text-white/60 hover:text-emerald-400 hover:bg-white/10'}`} 
            title={isPaidThisMonth ? "Marcado como pagado este mes (clic para desmarcar)" : "Marcar como pagado este mes"}
          >
            <Check size={14} className={isPaidThisMonth ? "stroke-[3]" : ""} />
          </button>
        )}
        <button onClick={() => onEdit(card)} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors" title="Editar">
          <Edit size={14} />
        </button>
        <button onClick={() => onDelete(card.id)} className="p-1.5 text-white/60 hover:text-rose-400 hover:bg-white/10 rounded transition-colors" title="Eliminar">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

const FinancialItemItem: React.FC<{
  item: FinancialItem,
  onDelete: (id: string) => void,
  onEdit: (item: FinancialItem) => void,
  onMarkPaid?: (id: string) => void
}> = ({ item, onDelete, onEdit, onMarkPaid }) => {
  const isDebt = item.type === 'deuda';
  const progress = item.totalAmount > 0 
    ? Math.min(100, Math.max(0, isDebt 
        ? ((item.totalAmount - item.currentAmount) / item.totalAmount) * 100 
        : (item.currentAmount / item.totalAmount) * 100))
    : 0;

  let totalToPay = item.totalAmount;
  if (isDebt && item.annualInterestRate && item.totalPayments) {
    const monthlyRate = (item.annualInterestRate / 100) / 12;
    if (monthlyRate > 0) {
      const pmt = (item.totalAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -item.totalPayments));
      totalToPay = pmt * item.totalPayments;
    }
  }

  const today = new Date();
  let nextPaymentDateStr = '';
  if (isDebt && item.paymentDate) {
    const paymentDay = parseInt(item.paymentDate, 10);
    if (!isNaN(paymentDay)) {
      let nextMonth = today.getMonth();
      let nextYear = today.getFullYear();
      if (today.getDate() > paymentDay) {
        nextMonth += 1;
        if (nextMonth > 11) {
          nextMonth = 0;
          nextYear += 1;
        }
      }
      const nextDate = new Date(nextYear, nextMonth, paymentDay);
      nextPaymentDateStr = nextDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
    }
  }

  let finishDateStr = '';
  if (isDebt && item.totalPayments && item.paymentsMade !== undefined) {
    const remainingPayments = item.totalPayments - item.paymentsMade;
    if (remainingPayments > 0) {
      const finishDate = new Date();
      finishDate.setMonth(finishDate.getMonth() + remainingPayments);
      finishDateStr = finishDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    }
  }

  return (
    <motion.div 
      whileHover={{ scale: 1.01 }}
      className={`bg-zinc-900/70 border ${isDebt ? 'border-orange-500/30' : 'border-blue-500/30'} rounded-xl p-5 flex flex-col gap-3 shadow-lg`}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-white text-lg">{item.name}</h3>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${isDebt ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'}`}>
            {isDebt ? 'Deuda' : 'Ahorro'}
          </span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(item)} className="p-1.5 text-white/40 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors">
            <Edit size={16} />
          </button>
          <button onClick={() => onDelete(item.id)} className="p-1.5 text-white/40 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-white/60">Progreso</span>
          <span className="text-white font-mono font-bold">{progress.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            className={`h-full ${isDebt ? 'bg-orange-500' : 'bg-blue-500'}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-white/5 p-2 rounded-lg">
          <p className="text-white/40 text-[10px] uppercase tracking-wider">Mensual</p>
          <p className="text-white font-mono font-semibold">${item.monthlyAmount.toLocaleString('es-MX')}</p>
        </div>
        <div className="bg-white/5 p-2 rounded-lg">
          <p className="text-white/40 text-[10px] uppercase tracking-wider">Actual</p>
          <p className="text-white font-mono font-semibold">${item.currentAmount.toLocaleString('es-MX')}</p>
        </div>
        {isDebt && (
          <>
            <div className="bg-white/5 p-2 rounded-lg">
              <p className="text-white/40 text-[10px] uppercase tracking-wider">Pagos</p>
              <p className="text-white font-mono font-semibold">{item.paymentsMade || 0} / {item.totalPayments || '?'}</p>
            </div>
            <div className="bg-white/5 p-2 rounded-lg">
              <p className="text-white/40 text-[10px] uppercase tracking-wider">Siguiente Pago</p>
              <p className="text-white font-mono font-semibold">{nextPaymentDateStr || 'N/A'}</p>
            </div>
            {finishDateStr && (
              <div className="bg-white/5 p-2 rounded-lg col-span-2 flex justify-between items-center">
                 <span className="text-white/40 text-[10px] uppercase tracking-wider">Término est.</span>
                 <span className="text-white font-mono font-semibold text-emerald-400">{finishDateStr}</span>
              </div>
            )}
          </>
        )}
      </div>
      
      {isDebt && onMarkPaid && (
        <button 
          onClick={() => onMarkPaid(item.id)}
          className="mt-2 w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-bold transition-colors"
        >
          Ya hice el pago este mes
        </button>
      )}

      {isDebt && item.annualInterestRate && (
        <div className="text-[10px] text-white/40 text-center border-t border-white/5 pt-2 mt-2">
          Total estimado con interés: <span className="text-white font-mono">${totalToPay.toFixed(2)}</span>
        </div>
      )}
    </motion.div>
  );
};

const Finanzas: React.FC = () => {
  const { config } = useLinks();

  // Registry of known Finanzas JSON files
  const [filesRegistry, setFilesRegistry] = useState<FinanzasFileMeta[]>(() => {
    const saved = localStorage.getItem('finanzas_files_registry');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return DEFAULT_FILES;
  });

  // Active opened file. null = Show File Manager Screen
  const [activeFile, setActiveFile] = useState<FinanzasFileMeta | null>(null);
  const [filePassword, setFilePassword] = useState<string>(''); // Session memory password for active file

  // Loading states
  const [isLoadingRegistry, setIsLoadingRegistry] = useState(false);
  const [isOpeningFile, setIsOpeningFile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Financial data for active file
  const [cards, setCards] = useState<FinanzasCard[]>([]);
  const [financialItems, setFinancialItems] = useState<FinancialItem[]>([]);

  // Modals for File operations
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [unlockModalFile, setUnlockModalFile] = useState<{ file: FinanzasFileMeta; rawJson: any } | null>(null);
  const [unlockInputPassword, setUnlockInputPassword] = useState('');
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);

  // Modal to set initial password for a file
  const [isSetPasswordModalOpen, setIsSetPasswordModalOpen] = useState(false);
  const [targetFileForPassword, setTargetFileForPassword] = useState<{ file: FinanzasFileMeta; rawJson: any } | null>(null);
  const [newFilePassword, setNewFilePassword] = useState('');
  const [confirmNewFilePassword, setConfirmNewFilePassword] = useState('');
  const [showNewFilePassword, setShowNewFilePassword] = useState(false);

  // Modal to create new JSON file
  const [isCreateFileModalOpen, setIsCreateFileModalOpen] = useState(false);
  const [createFileNameInput, setCreateFileNameInput] = useState('');
  const [createFileLabelInput, setCreateFileLabelInput] = useState('');
  const [createFilePasswordInput, setCreateFilePasswordInput] = useState('');
  const [createFileConfirmPasswordInput, setCreateFileConfirmPasswordInput] = useState('');

  // Modals for Cards & Items
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<FinanzasCard | null>(null);

  // Hidden file input for import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save files registry to localStorage
  useEffect(() => {
    localStorage.setItem('finanzas_files_registry', JSON.stringify(filesRegistry));
  }, [filesRegistry]);

  // Sync files from Supabase bucket 'savejson'
  const syncRemoteFiles = useCallback(async () => {
    setIsLoadingRegistry(true);
    try {
      const { data, error } = await supabase.storage.from('savejson').list('', { limit: 100 });
      if (!error && data) {
        const remoteFinanzas = data.filter(f => f.name.startsWith('finanzas_') && f.name.endsWith('.json'));
        setFilesRegistry(prev => {
          const map = new Map<string, FinanzasFileMeta>();
          // Keep existing
          prev.forEach(item => map.set(item.fileName, item));
          // Always ensure default 'rem' exists
          if (!map.has('finanzas_rem.json')) {
            map.set('finanzas_rem.json', DEFAULT_FILES[0]);
          }
          // Add newly discovered remote files
          remoteFinanzas.forEach(rf => {
            if (!map.has(rf.name)) {
              const id = rf.name.replace(/^finanzas_/, '').replace(/\.json$/, '');
              map.set(rf.name, {
                id,
                fileName: rf.name,
                label: `Finanzas ${id.charAt(0).toUpperCase() + id.slice(1)}`,
                isDefault: id === 'rem',
                updatedAt: rf.updated_at ? new Date(rf.updated_at).getTime() : Date.now(),
              });
            }
          });
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.error('Error synchronizing remote files:', err);
    } finally {
      setIsLoadingRegistry(false);
    }
  }, []);

  // Fetch list of files on mount
  useEffect(() => {
    syncRemoteFiles();
  }, [syncRemoteFiles]);

  // Daily yield calculation effect when active file is opened
  useEffect(() => {
    if (activeFile && cards.length > 0 && !isOpeningFile) {
      const now = Date.now();
      const msPerDay = 1000 * 60 * 60 * 24;
      let hasChanges = false;

      const updatedCards = cards.map(c => {
        if ((c.type === 'debito' || c.type === 'ahorro') && c.annualYieldRate && c.lastYieldUpdate) {
           const daysPassed = Math.floor((now - c.lastYieldUpdate) / msPerDay);
           if (daysPassed > 0) {
              hasChanges = true;
              const dailyRate = (c.annualYieldRate / 100) / 365;
              let newBalance = c.balance;
              for (let i = 0; i < daysPassed; i++) {
                 newBalance += newBalance * dailyRate;
              }
              return {
                 ...c,
                 balance: newBalance,
                 lastYieldUpdate: c.lastYieldUpdate + (daysPassed * msPerDay)
              };
           }
        } else if ((c.type === 'debito' || c.type === 'ahorro') && c.annualYieldRate && !c.lastYieldUpdate) {
           hasChanges = true;
           return { ...c, lastYieldUpdate: now };
        }
        return c;
      });

      if (hasChanges) {
        setCards(updatedCards);
      }
    }
  }, [activeFile, cards, isOpeningFile]);

  // OPEN A FILE HANDLER
  const handleSelectFile = async (file: FinanzasFileMeta) => {
    setIsOpeningFile(true);
    try {
      let rawJson: any = null;
      const { data, error } = await supabase.storage.from('savejson').download(file.fileName);
      if (!error && data) {
        const text = await data.text();
        try {
          rawJson = JSON.parse(text);
        } catch (e) {
          console.error('Error parsing remote json:', e);
        }
      }

      // Fallback to local cache if offline or not in Supabase yet
      if (!rawJson) {
        const cached = localStorage.getItem(`finanzas_cache_${file.id}`);
        if (cached) {
          try { rawJson = JSON.parse(cached); } catch (e) {}
        }
      }

      // Fallback for default 'rem' if freshly installed
      if (!rawJson && file.id === 'rem') {
        rawJson = {
          finanzasCards: config.finanzasCards || [],
          financialItems: config.financialItems || [],
          hasPassword: false,
        };
      }

      if (!rawJson) {
        rawJson = {
          finanzasCards: [],
          financialItems: [],
          hasPassword: false,
        };
      }

      const isProtected = Boolean(rawJson.hasPassword || rawJson.passwordHash || rawJson.encrypted);

      if (isProtected) {
        // Show password prompt modal
        setUnlockModalFile({ file, rawJson });
        setUnlockInputPassword('');
        setIsUnlockModalOpen(true);
      } else {
        // File has no password. Ask user if they wish to set one or open directly
        setTargetFileForPassword({ file, rawJson });
        setNewFilePassword('');
        setConfirmNewFilePassword('');
        setIsSetPasswordModalOpen(true);
      }
    } catch (err) {
      console.error(err);
      toast.error(`Error al acceder al archivo ${file.fileName}`);
    } finally {
      setIsOpeningFile(false);
    }
  };

  // UNLOCK FILE WITH PASSWORD
  const handleUnlockFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockModalFile) return;
    const { file, rawJson } = unlockModalFile;

    if (!unlockInputPassword) {
      toast.error('Ingresa la contraseña del archivo');
      return;
    }

    try {
      let isValid = false;
      let loadedCards: FinanzasCard[] = [];
      let loadedItems: FinancialItem[] = [];

      if (rawJson.encrypted && rawJson.ciphertext) {
        try {
          const decrypted = await decryptPayload(
            rawJson.ciphertext,
            unlockInputPassword,
            rawJson.saltEncryption || rawJson.salt,
            rawJson.iv
          );
          loadedCards = decrypted.finanzasCards || [];
          loadedItems = decrypted.financialItems || [];
          isValid = true;
        } catch (e) {
          isValid = false;
        }
      } else if (rawJson.passwordHash && rawJson.salt) {
        isValid = await verifyPassword(unlockInputPassword, rawJson.passwordHash, rawJson.salt);
        if (isValid) {
          loadedCards = rawJson.finanzasCards || [];
          loadedItems = rawJson.financialItems || [];
        }
      }

      if (!isValid) {
        toast.error('Contraseña incorrecta. El archivo permanece bloqueado.');
        return;
      }

      // Success
      setCards(loadedCards);
      setFinancialItems(loadedItems);
      setActiveFile(file);
      setFilePassword(unlockInputPassword);
      setIsUnlockModalOpen(false);
      setUnlockModalFile(null);
      toast.success(`Archivo ${file.fileName} desbloqueado`);
    } catch (err) {
      console.error(err);
      toast.error('Error al desencriptar el archivo');
    }
  };

  // ASSIGN OR SKIP PASSWORD FOR UNPROTECTED FILE
  const handleConfirmSetPassword = async (withPassword: boolean) => {
    if (!targetFileForPassword) return;
    const { file, rawJson } = targetFileForPassword;

    if (withPassword) {
      if (!newFilePassword) {
        toast.error('Ingresa una contraseña');
        return;
      }
      if (newFilePassword.length < 4) {
        toast.error('La contraseña debe tener al menos 4 caracteres');
        return;
      }
      if (newFilePassword !== confirmNewFilePassword) {
        toast.error('Las contraseñas no coinciden');
        return;
      }
    }

    const assignedPassword = withPassword ? newFilePassword : '';
    const loadedCards = rawJson.finanzasCards || [];
    const loadedItems = rawJson.financialItems || [];

    setCards(loadedCards);
    setFinancialItems(loadedItems);
    setActiveFile(file);
    setFilePassword(assignedPassword);
    setIsSetPasswordModalOpen(false);
    setTargetFileForPassword(null);

    // Update file registry hasPassword
    setFilesRegistry(prev => prev.map(f => f.id === file.id ? { ...f, hasPassword: withPassword } : f));

    if (withPassword) {
      toast.success(`Contraseña establecida para ${file.fileName}`);
      // Save protected directly
      saveFinanzasPayload(file, assignedPassword, loadedCards, loadedItems);
    } else {
      toast.info(`Archivo ${file.fileName} abierto`);
    }
  };

  // SAVE ACTIVE FILE TO SUPABASE AND LOCAL CACHE
  const saveFinanzasPayload = async (
    file: FinanzasFileMeta,
    pwd: string,
    cardsToSave: FinanzasCard[],
    itemsToSave: FinancialItem[]
  ) => {
    setIsSaving(true);
    try {
      const fileName = file.fileName;
      let dataToSave: any;

      if (pwd) {
        const encrypted = await encryptPayload({ finanzasCards: cardsToSave, financialItems: itemsToSave }, pwd);
        const { hash, salt } = await hashPassword(pwd);
        dataToSave = {
          version: 2,
          profileName: file.id,
          fileName: file.fileName,
          updatedAt: Date.now(),
          hasPassword: true,
          passwordHash: hash,
          salt,
          encrypted: true,
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          saltEncryption: encrypted.salt,
        };
      } else {
        dataToSave = {
          version: 2,
          profileName: file.id,
          fileName: file.fileName,
          updatedAt: Date.now(),
          hasPassword: false,
          finanzasCards: cardsToSave,
          financialItems: itemsToSave,
        };
      }

      const { error } = await supabase.storage.from('savejson').upload(fileName, JSON.stringify(dataToSave, null, 2), {
        upsert: true,
        contentType: 'application/json'
      });
      if (error) throw error;

      localStorage.setItem(`finanzas_cache_${file.id}`, JSON.stringify(dataToSave));
      setFilesRegistry(prev => prev.map(f => f.id === file.id ? { ...f, hasPassword: Boolean(pwd), updatedAt: Date.now() } : f));
      toast.success(`Datos guardados en ${fileName}`);
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar archivo en la nube');
    } finally {
      setIsSaving(false);
    }
  };

  const saveActiveFile = () => {
    if (!activeFile) return;
    saveFinanzasPayload(activeFile, filePassword, cards, financialItems);
  };

  // CREATE NEW JSON FILE
  const handleCreateNewFile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = createFileNameInput.toLowerCase().replace(/[^a-z0-9_-]/g, '').trim();
    if (!cleanId) {
      toast.error('Nombre de archivo inválido');
      return;
    }

    const fileName = `finanzas_${cleanId}.json`;
    if (filesRegistry.some(f => f.fileName === fileName)) {
      toast.error(`El archivo ${fileName} ya existe`);
      return;
    }

    if (createFilePasswordInput && createFilePasswordInput !== createFileConfirmPasswordInput) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    const label = createFileLabelInput.trim() || `Finanzas ${cleanId.charAt(0).toUpperCase() + cleanId.slice(1)}`;
    const newFile: FinanzasFileMeta = {
      id: cleanId,
      fileName,
      label,
      isDefault: false,
      hasPassword: Boolean(createFilePasswordInput),
      updatedAt: Date.now(),
    };

    setFilesRegistry(prev => [...prev, newFile]);
    setIsCreateFileModalOpen(false);

    // Save initial empty payload to Supabase
    await saveFinanzasPayload(newFile, createFilePasswordInput, [], []);

    // Open it directly
    setCards([]);
    setFinancialItems([]);
    setActiveFile(newFile);
    setFilePassword(createFilePasswordInput);

    setCreateFileNameInput('');
    setCreateFileLabelInput('');
    setCreateFilePasswordInput('');
    setCreateFileConfirmPasswordInput('');
    toast.success(`Archivo ${fileName} creado con éxito`);
  };

  // EXPORT / DOWNLOAD FILE AS .JSON
  const handleExportJson = async (file: FinanzasFileMeta) => {
    try {
      let fileContent = '';
      if (activeFile?.id === file.id) {
        // If actively open, export current state
        if (filePassword) {
          const encrypted = await encryptPayload({ finanzasCards: cards, financialItems }, filePassword);
          const { hash, salt } = await hashPassword(filePassword);
          fileContent = JSON.stringify({
            version: 2,
            profileName: file.id,
            fileName: file.fileName,
            updatedAt: Date.now(),
            hasPassword: true,
            passwordHash: hash,
            salt,
            encrypted: true,
            ciphertext: encrypted.ciphertext,
            iv: encrypted.iv,
            saltEncryption: encrypted.salt,
          }, null, 2);
        } else {
          fileContent = JSON.stringify({
            version: 2,
            profileName: file.id,
            fileName: file.fileName,
            updatedAt: Date.now(),
            hasPassword: false,
            finanzasCards: cards,
            financialItems,
          }, null, 2);
        }
      } else {
        // Download from Supabase
        const { data, error } = await supabase.storage.from('savejson').download(file.fileName);
        if (error || !data) {
          const cached = localStorage.getItem(`finanzas_cache_${file.id}`);
          if (cached) fileContent = cached;
          else throw new Error('Archivo no disponible para descargar');
        } else {
          fileContent = await data.text();
        }
      }

      const blob = new Blob([fileContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Archivo ${file.fileName} descargado`);
    } catch (err) {
      console.error(err);
      toast.error('Error al exportar archivo .json');
    }
  };

  // IMPORT JSON FILE
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        let cleanId = file.name.replace(/^finanzas_/, '').replace(/\.json$/, '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
        if (!cleanId) cleanId = `import_${Date.now()}`;
        const fileName = `finanzas_${cleanId}.json`;

        const hasPwd = Boolean(parsed.hasPassword || parsed.passwordHash || parsed.encrypted);
        const importedMeta: FinanzasFileMeta = {
          id: cleanId,
          fileName,
          label: `Finanzas ${cleanId.charAt(0).toUpperCase() + cleanId.slice(1)}`,
          isDefault: false,
          hasPassword: hasPwd,
          updatedAt: Date.now(),
        };

        // Upload to Supabase
        await supabase.storage.from('savejson').upload(fileName, text, {
          upsert: true,
          contentType: 'application/json'
        });

        localStorage.setItem(`finanzas_cache_${cleanId}`, text);

        setFilesRegistry(prev => {
          const filtered = prev.filter(f => f.fileName !== fileName);
          return [...filtered, importedMeta];
        });

        toast.success(`Archivo ${fileName} importado correctamente`);
      } catch (err) {
        console.error(err);
        toast.error('El archivo importado no es un JSON válido');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // DELETE A FILE
  const handleDeleteFile = async (file: FinanzasFileMeta) => {
    if (file.isDefault) {
      toast.error('El archivo por defecto (finanzas_rem.json) no puede ser eliminado');
      return;
    }

    if (!window.confirm(`¿Estás seguro de eliminar el archivo "${file.fileName}"? Esta acción borrará sus datos permanentemente.`)) {
      return;
    }

    try {
      await supabase.storage.from('savejson').remove([file.fileName]);
      localStorage.removeItem(`finanzas_cache_${file.id}`);
      setFilesRegistry(prev => prev.filter(f => f.id !== file.id));
      if (activeFile?.id === file.id) {
        setActiveFile(null);
        setCards([]);
        setFinancialItems([]);
      }
      toast.success(`Archivo ${file.fileName} eliminado`);
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar archivo');
    }
  };

  // CLOSE ACTIVE FILE AND RETURN TO FILE LIST
  const handleCloseActiveFile = () => {
    setActiveFile(null);
    setFilePassword('');
    setCards([]);
    setFinancialItems([]);
    toast.info('Archivo cerrado y protegido');
  };

  // Form state for Cards
  const [type, setType] = useState<'credito' | 'debito' | 'deuda' | 'ahorro'>('credito');
  const [name, setName] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [cutoffDate, setCutoffDate] = useState('');
  const [balance, setBalance] = useState('');
  const [annualYieldRate, setAnnualYieldRate] = useState('');

  // Item Form state
  const [itemType, setItemType] = useState<'deuda' | 'ahorro'>('deuda');
  const [itemName, setItemName] = useState('');
  const [itemMonthly, setItemMonthly] = useState('');
  const [itemTotal, setItemTotal] = useState('');
  const [itemCurrent, setItemCurrent] = useState('');
  const [itemStart, setItemStart] = useState('');
  const [itemPayments, setItemPayments] = useState('');
  const [itemMade, setItemMade] = useState('');
  const [itemPaymentDate, setItemPaymentDate] = useState('');
  const [itemInterest, setItemInterest] = useState('');
  const [editingItem, setEditingItem] = useState<FinancialItem | null>(null);

  const handleSaveCard = () => {
    if (!name) return;

    const newCard: FinanzasCard = {
      id: editingCard ? editingCard.id : Date.now().toString(),
      type,
      name,
      expirationDate,
      paymentDate: type === 'credito' ? paymentDate : undefined,
      cutoffDate: type === 'credito' ? cutoffDate : undefined,
      balance: parseCurrencyInput(balance),
      annualYieldRate: (type === 'debito' || type === 'ahorro') && annualYieldRate ? parseFloat(annualYieldRate) : undefined,
      lastYieldUpdate: editingCard?.lastYieldUpdate || Date.now(),
    };

    let updatedCards;
    if (editingCard) {
      updatedCards = cards.map(c => c.id === editingCard.id ? newCard : c);
    } else {
      updatedCards = [...cards, newCard];
    }

    setCards(updatedCards);
    setIsModalOpen(false);
    setEditingCard(null);
  };

  const handleSaveItem = () => {
    if (!itemName) return;

    const newItem: FinancialItem = {
      id: editingItem ? editingItem.id : Date.now().toString(),
      type: itemType,
      name: itemName,
      monthlyAmount: parseCurrencyInput(itemMonthly),
      totalAmount: parseCurrencyInput(itemTotal),
      currentAmount: parseCurrencyInput(itemCurrent),
      startDate: itemStart,
      totalPayments: parseInt(itemPayments) || undefined,
      paymentsMade: parseInt(itemMade) || undefined,
      paymentDate: itemPaymentDate || undefined,
      annualInterestRate: parseFloat(itemInterest) || undefined,
    };

    let updatedItems;
    if (editingItem) {
      updatedItems = financialItems.map(i => i.id === editingItem.id ? newItem : i);
    } else {
      updatedItems = [...financialItems, newItem];
    }

    setFinancialItems(updatedItems);
    setIsItemModalOpen(false);
    setEditingItem(null);
  };

  const handleDeleteCard = (id: string) => {
    setCards(cards.filter(c => c.id !== id));
  };

  const handleDeleteItem = (id: string) => {
    setFinancialItems(financialItems.filter(i => i.id !== id));
  };

  const adjustBalance = (id: string, amount: number) => {
    setCards(cards.map(c => c.id === id ? { ...c, balance: c.balance + amount } : c));
  };

  const setCardBalance = (id: string, amount: number) => {
    setCards(cards.map(c => c.id === id ? { ...c, balance: amount } : c));
  };

  const handleMarkCardPaid = (id: string) => {
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
    setCards(cards.map(c => {
      if (c.id === id) {
        const isAlreadyPaid = c.lastPaidMonth === currentMonthStr;
        return { ...c, lastPaidMonth: isAlreadyPaid ? undefined : currentMonthStr };
      }
      return c;
    }));
  };

  const handleMarkPaidItem = (id: string) => {
    setFinancialItems(financialItems.map(i => {
      if (i.id === id && i.type === 'deuda') {
        const newMade = (i.paymentsMade || 0) + 1;
        const newCurrent = Math.max(0, i.currentAmount - i.monthlyAmount);
        return { ...i, paymentsMade: newMade, currentAmount: newCurrent };
      }
      return i;
    }));
  };

  const openModal = (card?: FinanzasCard) => {
    if (card) {
      setEditingCard(card);
      setType(card.type);
      setName(card.name);
      setExpirationDate(card.expirationDate);
      setPaymentDate(card.paymentDate || '');
      setCutoffDate(card.cutoffDate || '');
      setBalance(formatCurrencyInput(card.balance));
      setAnnualYieldRate(card.annualYieldRate?.toString() || '');
    } else {
      setEditingCard(null);
      setType('credito');
      setName('');
      setExpirationDate('');
      setPaymentDate('');
      setCutoffDate('');
      setBalance('');
      setAnnualYieldRate('');
    }
    setIsModalOpen(true);
  };

  const openItemModal = (item?: FinancialItem) => {
    if (item) {
      setEditingItem(item);
      setItemType(item.type);
      setItemName(item.name);
      setItemMonthly(formatCurrencyInput(item.monthlyAmount));
      setItemTotal(formatCurrencyInput(item.totalAmount));
      setItemCurrent(formatCurrencyInput(item.currentAmount));
      setItemStart(item.startDate);
      setItemPayments(item.totalPayments?.toString() || '');
      setItemMade(item.paymentsMade?.toString() || '');
      setItemPaymentDate(item.paymentDate || '');
      setItemInterest(item.annualInterestRate?.toString() || '');
    } else {
      setEditingItem(null);
      setItemType('deuda');
      setItemName('');
      setItemMonthly('');
      setItemTotal('');
      setItemCurrent('');
      setItemStart(new Date().toISOString().split('T')[0]);
      setItemPayments('');
      setItemMade('');
      setItemPaymentDate('');
      setItemInterest('');
    }
    setIsItemModalOpen(true);
  };

  // Calculations for dashboard
  const creditoCards = cards.filter(c => c.type === 'credito');
  const debitoCards = cards.filter(c => c.type === 'debito');
  const totalCredito = creditoCards.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0);
  const totalDebito = debitoCards.reduce((sum, c) => sum + c.balance, 0);
  const totalAhorro = cards.filter(c => c.type === 'ahorro').reduce((sum, c) => sum + c.balance, 0);
  const totalDeuda = cards.filter(c => c.type === 'deuda').reduce((sum, c) => sum + c.balance, 0);
  const totalAhorrado = totalDebito + totalAhorro + financialItems.filter(i => i.type === 'ahorro').reduce((sum, i) => sum + i.currentAmount, 0);
  const totalDeber = totalCredito + totalDeuda + financialItems.filter(i => i.type === 'deuda').reduce((sum, i) => sum + i.currentAmount, 0);
  const balanceReal = totalAhorrado - totalDeber;

  // =========================================================================
  // VIEW 1: FILE MANAGER SCREEN (When activeFile is null)
  // "en el apartado de finanzas que siempre que lo abra nuevo solo aparezca los archivos .json que tengo"
  // =========================================================================
  if (!activeFile) {
    return (
      <div className="p-4 sm:p-6 h-full flex flex-col space-y-6 overflow-y-auto custom-scrollbar w-full">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 bg-zinc-900/60 p-5 rounded-2xl border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                Bóveda de Finanzas
                <span className="text-xs font-normal text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  Archivos .json ({filesRegistry.length})
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Selecciona un archivo protegido con contraseña o crea un nuevo archivo financiero independiente.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsCreateFileModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5"
            >
              <FilePlus size={16} />
              <span>Nuevo Archivo .json</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs sm:text-sm font-semibold rounded-xl border border-white/10 transition-colors flex items-center gap-1.5"
              title="Importar un archivo .json externo"
            >
              <Upload size={15} />
              <span>Importar</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportJson} 
              accept=".json" 
              className="hidden" 
            />

            <button
              onClick={syncRemoteFiles}
              disabled={isLoadingRegistry}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl border border-white/10 transition-colors"
              title="Sincronizar archivos remotos"
            >
              <RefreshCw size={16} className={isLoadingRegistry ? 'animate-spin text-emerald-400' : ''} />
            </button>
          </div>
        </div>

        {/* Files Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filesRegistry.map((file) => (
            <motion.div
              key={file.id}
              whileHover={{ scale: 1.015 }}
              className="bg-zinc-900/80 border border-white/10 hover:border-emerald-500/40 rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all duration-200 backdrop-blur-md relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-indigo-500 opacity-60" />

              <div>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400">
                      <FileCode2 size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base truncate max-w-[180px]">{file.label}</h3>
                      <p className="font-mono text-[11px] text-zinc-400 truncate">{file.fileName}</p>
                    </div>
                  </div>

                  {file.isDefault && (
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      Por defecto
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-4 text-xs">
                  {file.hasPassword ? (
                    <span className="inline-flex items-center gap-1 text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-lg font-semibold">
                      <Lock size={12} /> Requiere Contraseña
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-zinc-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg">
                      <Unlock size={12} /> Sin Contraseña
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-6 pt-3 border-t border-white/5">
                <button
                  onClick={() => handleSelectFile(file)}
                  disabled={isOpeningFile}
                  className="flex-grow py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {file.hasPassword ? <Key size={14} /> : <FolderOpen size={14} />}
                  Abrir Archivo
                </button>

                <button
                  onClick={() => handleExportJson(file)}
                  className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl border border-white/10 transition-colors"
                  title="Descargar este archivo .json para compartir"
                >
                  <Download size={15} />
                </button>

                {!file.isDefault && (
                  <button
                    onClick={() => handleDeleteFile(file)}
                    className="p-2.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-xl border border-red-500/20 transition-colors"
                    title="Eliminar archivo"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* MODAL: UNLOCK FILE WITH PASSWORD */}
        <AnimatePresence>
          {isUnlockModalOpen && unlockModalFile && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-zinc-900 border border-white/15 rounded-2xl p-6 sm:p-7 max-w-sm w-full shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-emerald-500" />
                
                <div className="flex flex-col items-center text-center mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3 shadow-inner">
                    <Lock className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Archivo Protegido</h3>
                  <span className="font-mono text-xs text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded mt-1">
                    {unlockModalFile.file.fileName}
                  </span>
                  <p className="text-xs text-zinc-400 mt-2">
                    Ingresa la contraseña para abrir y visualizar este archivo .json.
                  </p>
                </div>

                <form onSubmit={handleUnlockFile} className="space-y-4">
                  <div className="relative">
                    <input
                      type={showUnlockPassword ? "text" : "password"}
                      value={unlockInputPassword}
                      onChange={(e) => setUnlockInputPassword(e.target.value)}
                      placeholder="Contraseña del archivo..."
                      className="w-full bg-zinc-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 pr-10 font-mono"
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

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUnlockModalOpen(false);
                        setUnlockModalFile(null);
                      }}
                      className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs rounded-xl"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-1.5"
                    >
                      <Unlock size={14} />
                      Desbloquear
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL: SET INITIAL PASSWORD FOR UNPROTECTED FILE */}
        <AnimatePresence>
          {isSetPasswordModalOpen && targetFileForPassword && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-zinc-900 border border-white/15 rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-indigo-500" />

                <div className="flex flex-col items-center text-center mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 shadow-inner">
                    <Key className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Proteger Archivo con Contraseña</h3>
                  <span className="font-mono text-xs text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded mt-1">
                    {targetFileForPassword.file.fileName}
                  </span>
                  <p className="text-xs text-zinc-400 mt-2">
                    ¿Deseas ponerle una contraseña a este archivo .json para que no sea visible para todos?
                  </p>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                      Contraseña para este archivo
                    </label>
                    <div className="relative">
                      <input
                        type={showNewFilePassword ? "text" : "password"}
                        value={newFilePassword}
                        onChange={(e) => setNewFilePassword(e.target.value)}
                        placeholder="Mínimo 4 caracteres..."
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 pr-10 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewFilePassword(!showNewFilePassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                      >
                        {showNewFilePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                      Confirmar Contraseña
                    </label>
                    <input
                      type={showNewFilePassword ? "text" : "password"}
                      value={confirmNewFilePassword}
                      onChange={(e) => setConfirmNewFilePassword(e.target.value)}
                      placeholder="Repite la contraseña..."
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleConfirmSetPassword(true)}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5"
                    >
                      <Lock size={14} />
                      Asignar Contraseña y Abrir
                    </button>

                    <button
                      type="button"
                      onClick={() => handleConfirmSetPassword(false)}
                      className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs font-medium rounded-xl"
                    >
                      Abrir sin contraseña por ahora
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL: CREATE NEW FILE */}
        <AnimatePresence>
          {isCreateFileModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-zinc-900 border border-white/15 rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative overflow-hidden"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FilePlus className="text-emerald-400" size={18} />
                    Crear Nuevo Archivo .json de Finanzas
                  </h3>
                  <button onClick={() => setIsCreateFileModalOpen(false)} className="text-zinc-400 hover:text-white">
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleCreateNewFile} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                      Identificador del Archivo
                    </label>
                    <div className="flex items-center bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm">
                      <span className="text-zinc-500 font-mono">finanzas_</span>
                      <input
                        type="text"
                        value={createFileNameInput}
                        onChange={(e) => setCreateFileNameInput(e.target.value)}
                        placeholder="personal, empresa, juan..."
                        className="bg-transparent border-0 text-white focus:outline-none focus:ring-0 font-mono flex-grow px-1"
                        required
                        autoFocus
                      />
                      <span className="text-zinc-500 font-mono">.json</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                      Nombre o Etiqueta descriptiva
                    </label>
                    <input
                      type="text"
                      value={createFileLabelInput}
                      onChange={(e) => setCreateFileLabelInput(e.target.value)}
                      placeholder="Ej. Finanzas Personales 2026..."
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                      Contraseña para protegerlo (opcional pero recomendada)
                    </label>
                    <input
                      type="password"
                      value={createFilePasswordInput}
                      onChange={(e) => setCreateFilePasswordInput(e.target.value)}
                      placeholder="Contraseña confidencial..."
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  {createFilePasswordInput && (
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                        Confirmar Contraseña
                      </label>
                      <input
                        type="password"
                        value={createFileConfirmPasswordInput}
                        onChange={(e) => setCreateFileConfirmPasswordInput(e.target.value)}
                        placeholder="Repite la contraseña..."
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                        required
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setIsCreateFileModalOpen(false)}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
                    >
                      <Check size={14} />
                      Crear y Abrir Archivo
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: ACTIVE UNLOCKED FILE DASHBOARD
  // =========================================================================
  return (
    <div className="p-4 sm:p-6 h-full flex flex-col space-y-6 overflow-y-auto custom-scrollbar w-full">
      {/* Top Navigation & Action Bar */}
      <div className="flex flex-wrap justify-between items-center gap-3 bg-zinc-900/80 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={handleCloseActiveFile}
            className="p-2 bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white rounded-xl border border-white/10 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Volver a la lista de archivos .json"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Archivos</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Wallet className="text-emerald-400" size={18} /> {activeFile.label}
              </h2>
              {filePassword ? (
                <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Lock size={11} /> Cifrado
                </span>
              ) : (
                <span className="text-[10px] text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full">
                  Sin contraseña
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono text-zinc-400">{activeFile.fileName}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Change/Set Password for this file */}
          <button
            onClick={() => {
              setTargetFileForPassword({ file: activeFile, rawJson: {} });
              setNewFilePassword('');
              setConfirmNewFilePassword('');
              setIsSetPasswordModalOpen(true);
            }}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold rounded-xl border border-white/10 transition-colors flex items-center gap-1.5"
            title="Cambiar o asignar contraseña a este archivo"
          >
            <Key size={14} className="text-purple-400" />
            <span className="hidden md:inline">Contraseña</span>
          </button>

          {/* Export JSON file */}
          <button
            onClick={() => handleExportJson(activeFile)}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold rounded-xl border border-white/10 transition-colors flex items-center gap-1.5"
            title="Descargar este archivo .json"
          >
            <Download size={14} />
            <span className="hidden md:inline">Exportar .json</span>
          </button>

          {/* Save to Supabase */}
          <button
            onClick={saveActiveFile}
            disabled={isSaving}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            title="Guardar cambios en la nube"
          >
            {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
            <span>Guardar</span>
          </button>

          <button 
            onClick={() => openItemModal()}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-lg shadow-blue-600/20"
          >
            <Plus size={16} /> <span className="hidden sm:inline">Deuda/Ahorro</span>
          </button>

          <button 
            onClick={() => openModal()}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-lg shadow-emerald-600/20"
          >
            <Plus size={16} /> <span className="hidden sm:inline">Tarjeta</span>
          </button>
        </div>
      </div>

      {/* Resumen de Balance Consolidado Real */}
      <div className="bg-zinc-950/80 border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 animate-in fade-in duration-300">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-indigo-600"></div>
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-widest leading-none flex items-center gap-1.5 select-none">
            <TrendingUp size={16} className="text-emerald-400" />
            Balance Financiero Real
          </h3>
          <p className="text-[10px] text-white/50 font-bold uppercase mt-1">
            Consolidado Neto: Ahorros y cuentas de débito menos deudas y créditos pendientes
          </p>
        </div>
        
        <div className="grid grid-cols-3 gap-4 md:w-[60%] select-none font-bold">
          <div className="bg-white/[0.02] border border-white/5 p-3 px-4 rounded-xl flex flex-col items-center justify-center">
            <span className="text-[8px] text-white/40 uppercase tracking-widest mb-1">Total Ahorrado</span>
            <span className="text-base sm:text-lg font-black text-blue-400 font-mono">
              ${totalAhorrado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-white/[0.02] border border-white/5 p-3 px-4 rounded-xl flex flex-col items-center justify-center">
            <span className="text-[8px] text-white/40 uppercase tracking-widest mb-1">Total Deudas</span>
            <span className="text-base sm:text-lg font-black text-orange-400 font-mono">
              ${totalDeber.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className={`p-3 px-4 border rounded-xl flex flex-col items-center justify-center relative overflow-hidden ${balanceReal >= 0 ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-rose-500/5 border-rose-500/10'}`}>
            <span className={`text-[8px] uppercase tracking-widest mb-1 ${balanceReal >= 0 ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
              Balance Real
            </span>
            <span className={`text-base sm:text-lg font-black font-mono ${balanceReal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ${balanceReal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="space-y-8">
        {/* Crédito Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg sm:text-xl font-bold text-rose-400">Tarjetas de Crédito</h3>
            <motion.div 
              key={totalCredito}
              initial={{ scale: 1.1, color: '#f43f5e' }}
              animate={{ scale: 1, color: '#fb7185' }}
              className="text-xl sm:text-2xl font-black text-rose-400 font-mono"
            >
              Total: ${totalCredito.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </motion.div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {creditoCards.map(card => (
              <CardItem key={card.id} card={card} onEdit={openModal} onDelete={handleDeleteCard} onAdjust={adjustBalance} onSetBalance={setCardBalance} onMarkPaid={handleMarkCardPaid} />
            ))}
            {creditoCards.length === 0 && (
              <div className="col-span-full p-6 text-center text-xs text-zinc-500 border border-dashed border-white/10 rounded-xl">
                No hay tarjetas de crédito agregadas.
              </div>
            )}
          </div>
        </div>

        {/* Débito Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg sm:text-xl font-bold text-emerald-400">Cuentas de Débito</h3>
            <motion.div 
              key={totalDebito}
              initial={{ scale: 1.1, color: '#10b981' }}
              animate={{ scale: 1, color: '#34d399' }}
              className="text-xl sm:text-2xl font-black text-emerald-400 font-mono"
            >
              Total: ${totalDebito.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </motion.div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {debitoCards.map(card => (
              <CardItem key={card.id} card={card} onEdit={openModal} onDelete={handleDeleteCard} onAdjust={adjustBalance} onSetBalance={setCardBalance} onMarkPaid={handleMarkCardPaid} />
            ))}
            {debitoCards.length === 0 && (
              <div className="col-span-full p-6 text-center text-xs text-zinc-500 border border-dashed border-white/10 rounded-xl">
                No hay cuentas de débito agregadas.
              </div>
            )}
          </div>
        </div>

        {/* Deuda / Ahorro Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-orange-400 mb-4">Deudas & Préstamos</h3>
            <div className="space-y-3">
              {financialItems.filter(i => i.type === 'deuda').map(item => (
                <FinancialItemItem key={item.id} item={item} onDelete={handleDeleteItem} onEdit={openItemModal} onMarkPaid={handleMarkPaidItem} />
              ))}
              {financialItems.filter(i => i.type === 'deuda').length === 0 && (
                <div className="p-6 text-center text-xs text-zinc-500 border border-dashed border-white/10 rounded-xl">
                  No hay deudas registradas.
                </div>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-blue-400 mb-4">Metas de Ahorro</h3>
            <div className="space-y-3">
              {financialItems.filter(i => i.type === 'ahorro').map(item => (
                <FinancialItemItem key={item.id} item={item} onDelete={handleDeleteItem} onEdit={openItemModal} />
              ))}
              {financialItems.filter(i => i.type === 'ahorro').length === 0 && (
                <div className="p-6 text-center text-xs text-zinc-500 border border-dashed border-white/10 rounded-xl">
                  No hay metas de ahorro registradas.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingCard ? 'Editar Tarjeta' : 'Nueva Tarjeta'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setType('credito')}
                    className={`py-2 rounded-lg text-sm font-medium transition-colors ${type === 'credito' ? 'bg-rose-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                  >
                    Crédito
                  </button>
                  <button
                    onClick={() => setType('debito')}
                    className={`py-2 rounded-lg text-sm font-medium transition-colors ${type === 'debito' ? 'bg-emerald-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                  >
                    Débito
                  </button>
                  <button
                    onClick={() => setType('deuda')}
                    className={`py-2 rounded-lg text-sm font-medium transition-colors ${type === 'deuda' ? 'bg-orange-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                  >
                    Deuda
                  </button>
                  <button
                    onClick={() => setType('ahorro')}
                    className={`py-2 rounded-lg text-sm font-medium transition-colors ${type === 'ahorro' ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                  >
                    Ahorro
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Nombre de la Tarjeta</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Ej. Nu, BBVA, Hey Banco..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Fecha de Vencimiento</label>
                <input 
                  type="text" 
                  value={expirationDate} 
                  onChange={e => setExpirationDate(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="MM/AA"
                />
              </div>

              {type === 'credito' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Día de Corte</label>
                    <input 
                      type="number" 
                      value={cutoffDate} 
                      onChange={e => setCutoffDate(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      placeholder="Ej. 15"
                      min="1"
                      max="31"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Día Límite de Pago</label>
                    <input 
                      type="number" 
                      value={paymentDate} 
                      onChange={e => setPaymentDate(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      placeholder="Ej. 5"
                      min="1"
                      max="31"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  {type === 'credito' ? 'Saldo a Pagar ($)' : 'Saldo Actual ($)'}
                </label>
                <input 
                  type="text" 
                  value={balance} 
                  onChange={e => setBalance(formatCurrencyInput(e.target.value))}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  placeholder="0.00"
                />
              </div>

              {(type === 'debito' || type === 'ahorro') && (
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">
                    Tasa de Rendimiento Anual (%)
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={annualYieldRate} 
                    onChange={e => setAnnualYieldRate(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
                    placeholder="Ej. 13.5 (Nu, Ualá, Klar)"
                  />
                  <p className="text-[10px] text-white/40 mt-1">Calcula y suma el rendimiento diario automáticamente a tu saldo.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveCard}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Edit/Create Modal (Deuda / Ahorro) */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingItem ? 'Editar' : 'Nueva'} {itemType === 'deuda' ? 'Deuda' : 'Meta de Ahorro'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setItemType('deuda')}
                    className={`py-2 rounded-lg text-sm font-medium transition-colors ${itemType === 'deuda' ? 'bg-orange-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                  >
                    Deuda
                  </button>
                  <button
                    onClick={() => setItemType('ahorro')}
                    className={`py-2 rounded-lg text-sm font-medium transition-colors ${itemType === 'ahorro' ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                  >
                    Ahorro
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Nombre</label>
                <input 
                  type="text" 
                  value={itemName} 
                  onChange={e => setItemName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  placeholder={itemType === 'deuda' ? "Ej. Crédito de Auto, Préstamo..." : "Ej. Fondo de Emergencia, Vacaciones..."}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Monto Mensual ($)</label>
                <input 
                  type="text" 
                  value={itemMonthly} 
                  onChange={e => setItemMonthly(formatCurrencyInput(e.target.value))}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  {itemType === 'deuda' ? 'Monto Total Original ($)' : 'Meta Total ($)'}
                </label>
                <input 
                  type="text" 
                  value={itemTotal} 
                  onChange={e => setItemTotal(formatCurrencyInput(e.target.value))}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  {itemType === 'deuda' ? 'Saldo Restante Actual ($)' : 'Ahorro Actual ($)'}
                </label>
                <input 
                  type="text" 
                  value={itemCurrent} 
                  onChange={e => setItemCurrent(formatCurrencyInput(e.target.value))}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Fecha de Inicio</label>
                <input 
                  type="date" 
                  value={itemStart} 
                  onChange={e => setItemStart(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {itemType === 'deuda' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Plazo (Meses)</label>
                      <input 
                        type="number" 
                        value={itemPayments} 
                        onChange={e => setItemPayments(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                        placeholder="Ej. 24"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Pagos Hechos</label>
                      <input 
                        type="number" 
                        value={itemMade} 
                        onChange={e => setItemMade(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                        placeholder="Ej. 5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Día de Pago</label>
                      <input 
                        type="number" 
                        value={itemPaymentDate} 
                        onChange={e => setItemPaymentDate(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                        placeholder="Ej. 15"
                        min="1"
                        max="31"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Tasa Anual (%)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={itemInterest} 
                        onChange={e => setItemInterest(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                        placeholder="Ej. 12"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setIsItemModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveItem}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN / CHANGE PASSWORD WHILE IN ACTIVE FILE */}
      <AnimatePresence>
        {isSetPasswordModalOpen && targetFileForPassword && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-white/15 rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Key size={18} className="text-purple-400" />
                  Seguridad de {targetFileForPassword.file.fileName}
                </h3>
                <button onClick={() => setIsSetPasswordModalOpen(false)} className="text-zinc-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                    Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    value={newFilePassword}
                    onChange={(e) => setNewFilePassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres..."
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                    Confirmar Contraseña
                  </label>
                  <input
                    type="password"
                    value={confirmNewFilePassword}
                    onChange={(e) => setConfirmNewFilePassword(e.target.value)}
                    placeholder="Repite la contraseña..."
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleConfirmSetPassword(true)}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-1.5"
                  >
                    <Lock size={14} />
                    Guardar Contraseña y Proteger Archivo
                  </button>

                  <button
                    type="button"
                    onClick={() => handleConfirmSetPassword(false)}
                    className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs font-medium rounded-xl"
                  >
                    Quitar contraseña (dejar libre)
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Finanzas;
