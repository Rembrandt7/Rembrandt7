import React, { useState, useEffect } from 'react';
import { useLinks } from '../contexts/LinkContext';
import { FinanzasCard, FinancialItem } from '../types';
import { Plus, Edit, Trash2, CreditCard, Wallet, TrendingUp, TrendingDown, Save, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../services/supabaseClient';
import { toast } from 'sonner';

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
    <div className="bg-zinc-900/80 border border-white/10 rounded-lg p-4 relative group overflow-hidden flex flex-col justify-between h-[210px]">
      <div className={`absolute top-0 left-0 w-full h-1 ${isCredit ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
      
      <div>
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-bold text-lg text-white truncate pr-14">{card.name}</h3>
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
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-auto relative z-10">
        <input 
          type="number"
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          placeholder="Cantidad..."
          className="w-full bg-black/50 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
        />
        <div className="flex gap-1">
          <button onClick={() => handleAction(true)} className="flex-1 px-2 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 rounded text-xs font-bold transition-colors">
            {isCredit ? 'Gasto' : 'Ingreso'}
          </button>
          <button onClick={() => handleAction(false)} className="flex-1 px-2 py-1.5 bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 rounded text-xs font-bold transition-colors">
            {isCredit ? 'Pago' : 'Gasto'}
          </button>
        </div>
        <div className="flex gap-1 mt-1">
          <button onClick={() => onSetBalance(card.id, 0)} className="flex-1 px-2 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded text-xs font-bold transition-colors">
            Limpiar
          </button>
          {isCredit && onMarkPaid && (
            <button 
              onClick={() => onMarkPaid(card.id)} 
              className={`flex-1 px-2 py-1.5 rounded text-xs font-bold transition-all border ${
                isPaidThisMonth 
                  ? 'bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border-emerald-500/30' 
                  : 'bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 border-rose-500/30'
              }`}
            >
              {isPaidThisMonth ? '✓ Pagado' : 'Ya pagué'}
            </button>
          )}
        </div>
      </div>
      
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <button onClick={() => onEdit(card)} className="p-1.5 bg-white/10 hover:bg-white/20 rounded text-white/70 hover:text-white transition-colors backdrop-blur-md">
          <Edit size={12} />
        </button>
        <button onClick={() => onDelete(card.id)} className="p-1.5 bg-rose-500/20 hover:bg-rose-500/40 rounded text-rose-400 hover:text-rose-300 transition-colors backdrop-blur-md">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};

const FinancialItemItem: React.FC<{ item: FinancialItem, onDelete: (id: string) => void, onEdit: (i: FinancialItem) => void }> = ({ item, onDelete, onEdit }) => {
  const isDebt = item.type === 'deuda';
  const totalToPay = isDebt && item.annualInterestRate 
    ? item.totalAmount + (item.totalAmount * (item.annualInterestRate / 100) * ((item.totalPayments || 12) / 12))
    : item.totalAmount;
  
  const progress = isDebt 
    ? ((item.totalAmount - item.currentAmount) / item.totalAmount) * 100 
    : (item.currentAmount / item.totalAmount) * 100;

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className={`bg-zinc-900/60 border ${isDebt ? 'border-orange-500/30' : 'border-blue-500/30'} rounded-xl p-5 flex flex-col gap-3 shadow-lg`}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-white text-lg">{item.name}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${isDebt ? 'bg-orange-500/20 text-orange-300' : 'bg-blue-500/20 text-blue-300'}`}>
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
          <p className="text-white font-mono font-semibold">${item.monthlyAmount}</p>
        </div>
        <div className="bg-white/5 p-2 rounded-lg">
          <p className="text-white/40 text-[10px] uppercase tracking-wider">Actual</p>
          <p className="text-white font-mono font-semibold">${item.currentAmount}</p>
        </div>
      </div>
      
      {isDebt && item.annualInterestRate && (
        <div className="text-[10px] text-white/40 text-center border-t border-white/5 pt-2">
          Total estimado con interés: <span className="text-white font-mono">${totalToPay.toFixed(2)}</span>
        </div>
      )}
    </motion.div>
  );
};

const Finanzas: React.FC = () => {
  const { config } = useLinks();
  const [cards, setCards] = useState<FinanzasCard[]>(config.finanzasCards || []);
  const [financialItems, setFinancialItems] = useState<FinancialItem[]>(config.financialItems || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<FinanzasCard | null>(null);

  const [profileName, setProfileName] = useState('rem');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [type, setType] = useState<'credito' | 'debito' | 'deuda' | 'ahorro'>('credito');
  const [name, setName] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [cutoffDate, setCutoffDate] = useState('');
  const [balance, setBalance] = useState('');

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

  useEffect(() => {
    // Solo carga inicial desde la config si están vacíos.
    if (cards.length === 0 && financialItems.length === 0) {
      setCards(config.finanzasCards || []);
      setFinancialItems(config.financialItems || []);
    }
  }, [config.finanzasCards, config.financialItems]);

  const fetchFinanzas = async () => {
    if (!profileName) return;
    setIsLoading(true);
    try {
      const fileName = `finanzas_${profileName}.json`;
      const { data, error } = await supabase.storage.from('savejson').download(fileName);
      if (error) {
        if (error.message?.includes('Object not found') || error.name === 'StorageApiError') {
           toast.error(`No se encontró el archivo ${fileName}`);
        } else {
           throw error;
        }
      } else if (data) {
        const text = await data.text();
        const json = JSON.parse(text);
        setCards(json.finanzasCards || []);
        setFinancialItems(json.financialItems || []);
        toast.success(`Datos cargados de ${fileName}`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar finanzas');
    } finally {
      setIsLoading(false);
    }
  };

  const saveFinanzas = async () => {
    if (!profileName) return;
    setIsSaving(true);
    try {
      const fileName = `finanzas_${profileName}.json`;
      const dataToSave = { finanzasCards: cards, financialItems };
      const { error } = await supabase.storage.from('savejson').upload(fileName, JSON.stringify(dataToSave), {
         upsert: true,
         contentType: 'application/json'
      });
      if (error) throw error;
      toast.success(`Datos guardados en ${fileName}`);
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar finanzas');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCard = () => {
    if (!name) return;

    const newCard: FinanzasCard = {
      id: editingCard ? editingCard.id : Date.now().toString(),
      type,
      name,
      expirationDate,
      paymentDate: type === 'credito' ? paymentDate : undefined,
      cutoffDate: type === 'credito' ? cutoffDate : undefined,
      balance: parseFloat(balance) || 0,
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
      monthlyAmount: parseFloat(itemMonthly) || 0,
      totalAmount: parseFloat(itemTotal) || 0,
      currentAmount: parseFloat(itemCurrent) || 0,
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

  const handleDeleteItem = (id: string) => {
    const updatedItems = financialItems.filter(i => i.id !== id);
    setFinancialItems(updatedItems);
  };

  const handleMarkCardPaid = (cardId: string) => {
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
    
    const updatedCards = cards.map(c => {
      if (c.id === cardId) {
        const isPaid = c.lastPaidMonth === currentMonthStr;
        return {
          ...c,
          lastPaidMonth: isPaid ? undefined : currentMonthStr
        };
      }
      return c;
    });
    setCards(updatedCards);
    toast.success("Estado de pago de tarjeta actualizado");
  };

  const creditoCards = cards.filter(c => c.type === 'credito');
  const debitoCards = cards.filter(c => c.type === 'debito');
  const deudaCards = cards.filter(c => c.type === 'deuda');
  const ahorroCards = cards.filter(c => c.type === 'ahorro');
  
  const totalCredito = creditoCards.reduce((sum, c) => sum + c.balance, 0);
  const totalDebito = debitoCards.reduce((sum, c) => sum + c.balance, 0);
  const totalDeuda = deudaCards.reduce((sum, c) => sum + c.balance, 0);
  const totalAhorro = ahorroCards.reduce((sum, c) => sum + c.balance, 0);

  const adjustBalance = (id: string, amount: number) => {
    const updatedCards = cards.map(c => c.id === id ? { ...c, balance: c.balance + amount } : c);
    setCards(updatedCards);
  };

  const setCardBalance = (id: string, balance: number) => {
    const updatedCards = cards.map(c => c.id === id ? { ...c, balance } : c);
    setCards(updatedCards);
  };

  const handleDeleteCard = (id: string) => {
    const updatedCards = cards.filter(c => c.id !== id);
    setCards(updatedCards);
  };

  const openItemModal = (item?: FinancialItem) => {
    if (item) {
      setEditingItem(item);
      setItemType(item.type);
      setItemName(item.name);
      setItemMonthly((item.monthlyAmount || 0).toString());
      setItemTotal((item.totalAmount || 0).toString());
      setItemCurrent((item.currentAmount || 0).toString());
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
      setItemStart('');
      setItemPayments('');
      setItemMade('');
      setItemPaymentDate('');
      setItemInterest('');
    }
    setIsItemModalOpen(true);
  };

  const openModal = (card?: FinanzasCard) => {
    if (card) {
      setEditingCard(card);
      setType(card.type);
      setName(card.name);
      setExpirationDate(card.expirationDate);
      setPaymentDate(card.paymentDate || '');
      setCutoffDate(card.cutoffDate || '');
      setBalance(card.balance.toString());
    } else {
      setEditingCard(null);
      setType('credito');
      setName('');
      setExpirationDate('');
      setPaymentDate('');
      setCutoffDate('');
      setBalance('');
    }
    setIsModalOpen(true);
  };

  return (
    <div className="p-6 h-full flex flex-col space-y-6 overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="text-emerald-400" /> Finanzas
          </h2>
          <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-lg border border-white/5">
            <span className="text-sm text-white/50">finanzas_</span>
            <input 
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-20 bg-transparent border-none text-white text-sm focus:outline-none focus:ring-0 p-0 text-center"
              placeholder="rem"
            />
            <span className="text-sm text-white/50">.json</span>
            <div className="flex gap-1 ml-2 pl-2 border-l border-white/10">
              <button 
                onClick={fetchFinanzas}
                disabled={isLoading}
                className="p-1 hover:bg-white/10 rounded text-blue-400 transition-colors disabled:opacity-50"
                title="Cargar JSON"
              >
                <Download size={16} />
              </button>
              <button 
                onClick={saveFinanzas}
                disabled={isSaving}
                className="p-1 hover:bg-white/10 rounded text-emerald-400 transition-colors disabled:opacity-50"
                title="Guardar JSON en Supabase"
              >
                <Save size={16} />
              </button>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => openItemModal()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={18} /> Agregar Deuda/Ahorro
          </button>
          <button 
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={18} /> Agregar Tarjeta
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="space-y-8">
        {/* Crédito Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-rose-400">Crédito</h3>
            <motion.div 
              key={totalCredito}
              initial={{ scale: 1.2, color: '#f43f5e' }}
              animate={{ scale: 1, color: '#fb7185' }}
              className="text-2xl font-black text-rose-400"
            >
              Total: ${totalCredito.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </motion.div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {creditoCards.map(card => (
              <CardItem key={card.id} card={card} onEdit={openModal} onDelete={handleDeleteCard} onAdjust={adjustBalance} onSetBalance={setCardBalance} onMarkPaid={handleMarkCardPaid} />
            ))}
          </div>
        </div>

        {/* Débito Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-emerald-400">Débito</h3>
            <motion.div 
              key={totalDebito}
              initial={{ scale: 1.2, color: '#10b981' }}
              animate={{ scale: 1, color: '#34d399' }}
              className="text-2xl font-black text-emerald-400"
            >
              Total: ${totalDebito.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </motion.div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {debitoCards.map(card => (
              <CardItem key={card.id} card={card} onEdit={openModal} onDelete={handleDeleteCard} onAdjust={adjustBalance} onSetBalance={setCardBalance} onMarkPaid={handleMarkCardPaid} />
            ))}
          </div>
        </div>

        {/* Deuda/Ahorro List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xl font-bold text-orange-400 mb-4">Deudas</h3>
            <div className="space-y-2">
              {financialItems.filter(i => i.type === 'deuda').map(item => (
                <FinancialItemItem key={item.id} item={item} onDelete={handleDeleteItem} onEdit={openItemModal} />
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-blue-400 mb-4">Ahorros</h3>
            <div className="space-y-2">
              {financialItems.filter(i => i.type === 'ahorro').map(item => (
                <FinancialItemItem key={item.id} item={item} onDelete={handleDeleteItem} onEdit={openItemModal} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Modal */}


      {/* Card Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
                      type="text" 
                      value={cutoffDate} 
                      onChange={e => setCutoffDate(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      placeholder="Ej. 15"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Día de Pago</label>
                    <input 
                      type="text" 
                      value={paymentDate} 
                      onChange={e => setPaymentDate(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      placeholder="Ej. 5"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  {type === 'credito' || type === 'deuda' ? 'Deuda Actual ($)' : 'Ahorro / Saldo ($)'}
                </label>
                <input 
                  type="number" 
                  value={balance} 
                  onChange={e => setBalance(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveCard}
                disabled={!name}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Edit/Create Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">{editingItem ? 'Editar Deuda/Ahorro' : 'Nueva Deuda/Ahorro'}</h3>
            
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
                  placeholder="Ej. Préstamo Auto, Fondo Emergencia..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Mensualidad ($)</label>
                  <input 
                    type="number" 
                    value={itemMonthly} 
                    onChange={e => setItemMonthly(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Total ($)</label>
                  <input 
                    type="number" 
                    value={itemTotal} 
                    onChange={e => setItemTotal(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Actual ($)</label>
                <input 
                  type="number" 
                  value={itemCurrent} 
                  onChange={e => setItemCurrent(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="0.00"
                />
              </div>

              {itemType === 'deuda' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Total Pagos</label>
                      <input 
                        type="number" 
                        value={itemPayments} 
                        onChange={e => setItemPayments(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Pagos Hechos</label>
                      <input 
                        type="number" 
                        value={itemMade} 
                        onChange={e => setItemMade(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Día de Pago</label>
                      <input 
                        type="text" 
                        value={itemPaymentDate} 
                        onChange={e => setItemPaymentDate(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                        placeholder="Ej. 15"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Interés Anual (%)</label>
                      <input 
                        type="number" 
                        value={itemInterest} 
                        onChange={e => setItemInterest(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Fecha Inicio</label>
                <input 
                  type="date" 
                  value={itemStart} 
                  onChange={e => setItemStart(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setIsItemModalOpen(false)}
                className="px-4 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveItem}
                disabled={!itemName}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finanzas;
