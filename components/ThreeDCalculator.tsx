import React, { useState, useEffect, useCallback } from 'react';
import { Calculator, DollarSign, Zap, Clock, TrendingUp, RefreshCw, UserCheck, ShoppingBag, Copy, CheckCircle2, Plus, Trash2, Save, Download, ListChecks } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { supabase } from '../services/supabaseClient';

interface PrintItem {
  id: string;
  name: string;
  material: string;
  time: string;
  cost: number;
}

interface CalculationResults {
  filamentCost: number;
  energyCost: number;
  laborCost: number;
  maintenanceCost: number;
  baseCost: number;
  friendPrice: number;
  commercialPrice: number;
  profit: number;
}

const MATERIAL_POWER = {
  PLA: 125,
  TPU: 125,
  PETG: 155,
};

const ThreeDCalculator: React.FC = () => {
  const [pieceName, setPieceName] = useState('');
  const [material, setMaterial] = useState<keyof typeof MATERIAL_POWER>('PLA');
  const [filamentPrice, setFilamentPrice] = useState(400);
  const [weightUsed, setWeightUsed] = useState(100);
  const [printHours, setPrintHours] = useState(5);
  const [printMinutes, setPrintMinutes] = useState(0);
  const [laborCostManual, setLaborCostManual] = useState(0);
  const [markup, setMarkup] = useState(30);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Queue State
  const [printQueue, setPrintQueue] = useState<PrintItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [results, setResults] = useState<CalculationResults>({
    filamentCost: 0,
    energyCost: 0,
    laborCost: 0,
    maintenanceCost: 0,
    baseCost: 0,
    friendPrice: 0,
    commercialPrice: 0,
    profit: 0,
  });

  const calculateResults = useCallback(() => {
    const totalHours = printHours + (printMinutes / 60);
    const fCost = (filamentPrice / 1000) * weightUsed;
    const power = MATERIAL_POWER[material];
    const eCost = (power / 1000) * totalHours * 2.5;
    const mCost = totalHours * 5;
    const baseCost = fCost + eCost + mCost + laborCostManual;
    
    const friendPrice = baseCost * 1.15; 
    const commercialPrice = baseCost * (1 + markup / 100);
    const profit = commercialPrice - baseCost;

    setResults({
      filamentCost: fCost,
      energyCost: eCost,
      laborCost: laborCostManual,
      maintenanceCost: mCost,
      baseCost,
      friendPrice,
      commercialPrice,
      profit,
    });
  }, [filamentPrice, weightUsed, printHours, printMinutes, material, laborCostManual, markup]);

  useEffect(() => {
    calculateResults();
  }, [calculateResults]);

  // Supabase Persistence
  const saveQueue = async (queueToSave = printQueue) => {
    setIsSaving(true);
    try {
      const fileName = 'impresion3d.json';
      const { error } = await supabase.storage.from('savejson').upload(fileName, JSON.stringify(queueToSave), {
        upsert: true,
        contentType: 'application/json'
      });
      if (error) throw error;
      toast.success('Lista de impresión guardada');
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar lista');
    } finally {
      setIsSaving(false);
    }
  };

  const loadQueue = async () => {
    setIsLoading(true);
    try {
      const fileName = 'impresion3d.json';
      const { data, error } = await supabase.storage.from('savejson').download(fileName);
      if (error) {
        if (!error.message?.includes('Object not found')) throw error;
      } else if (data) {
        const text = await data.text();
        const json = JSON.parse(text);
        setPrintQueue(json || []);
        toast.success('Lista de impresión cargada');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar lista');
    } finally {
      setIsLoading(false);
    }
  };

  // Lifecycle Load
  useEffect(() => {
    loadQueue();
  }, []);

  const addToQueue = () => {
    const newItem: PrintItem = {
      id: Date.now().toString(),
      name: pieceName.trim() || `Pieza ${material}`,
      material,
      time: `${printHours}h ${printMinutes}m`,
      cost: results.commercialPrice
    };
    const updated = [...printQueue, newItem];
    setPrintQueue(updated);
    saveQueue(updated);
    toast.success('Agregado a la lista');
  };

  const removeFromQueue = (id: string) => {
    const updated = printQueue.filter(item => item.id !== id);
    setPrintQueue(updated);
    saveQueue(updated);
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  const handleCopy = (price: number, type: 'amigo' | 'comercial') => {
    const name = pieceName.trim() || `Pieza de ${material}`;
    const time = `${printHours}h ${printMinutes}m`;
    const priceText = formatCurrency(price);
    const text = type === 'amigo' 
      ? `¡Qué onda! Te paso la cotización de tu ${name}: El costo neto por los materiales, energía y el tiempo de impresión (${time}) queda en ${priceText}. ¡Es precio especial! Quedo a tus órdenes.`
      : `¡Hola! Con gusto te comparto la cotización de tu ${name}. Realizada en material ${material} con un tiempo de impresión de ${time}, el total sería de ${priceText}. ¡Quedo a tus órdenes para iniciar tu proyecto!`;
    
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    toast.success('Copiado');
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="bg-slate-950/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl max-w-6xl mx-auto flex flex-col xl:flex-row min-h-[600px]">
      
      {/* LEFT: CALCULATOR */}
      <div className="flex-1 border-r border-white/5 flex flex-col">
        {/* Header Compact */}
        <div className="px-8 py-5 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calculator className="text-blue-400" size={24} />
            <h3 className="text-lg font-black text-white uppercase tracking-widest italic">Calculadora Express</h3>
          </div>
          <button onClick={() => { setPieceName(''); setFilamentPrice(400); setWeightUsed(100); setPrintHours(5); setPrintMinutes(0); setLaborCostManual(0); setMarkup(30); }} className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {/* Row 1: Name and Material */}
          <div className="flex gap-6">
            <div className="flex-[2] space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nombre Pieza</label>
              <input type="text" value={pieceName} onChange={e => setPieceName(e.target.value)} placeholder="Ej: Casco Iron Man..." className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-gray-700" />
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Material</label>
              <select 
                value={material} 
                onChange={e => setMaterial(e.target.value as any)} 
                className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all cursor-pointer appearance-none"
              >
                <option value="PLA" className="bg-slate-900">PLA (125W)</option>
                <option value="PETG" className="bg-slate-900">PETG (155W)</option>
                <option value="TPU" className="bg-slate-900">TPU (125W)</option>
              </select>
            </div>
          </div>

          {/* Row 2: Price, Weight, Time */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Filamento ($/kg)</label>
              <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-green-500/30 transition-all">
                <button onClick={() => setFilamentPrice(p => Math.max(0, p-50))} className="px-3 py-3 hover:bg-white/10 text-white font-black text-lg transition-colors">-</button>
                <input type="number" value={filamentPrice || ''} onChange={e => setFilamentPrice(Number(e.target.value))} className="w-full bg-transparent text-white font-bold text-center focus:outline-none" />
                <button onClick={() => setFilamentPrice(p => p+50)} className="px-3 py-3 hover:bg-white/10 text-white font-black text-lg transition-colors">+</button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Gramos (g)</label>
              <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/30 transition-all">
                <button onClick={() => setWeightUsed(p => Math.max(0, p-10))} className="px-3 py-3 hover:bg-white/10 text-white font-black text-lg transition-colors">-</button>
                <input type="number" value={weightUsed || ''} onChange={e => setWeightUsed(Number(e.target.value))} className="w-full bg-transparent text-white font-bold text-center focus:outline-none" />
                <button onClick={() => setWeightUsed(p => p+10)} className="px-3 py-3 hover:bg-white/10 text-white font-black text-lg transition-colors">+</button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Tiempo (hh:mm)</label>
              <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-3 h-full focus-within:ring-2 focus-within:ring-orange-500/30 transition-all">
                <input type="number" value={printHours || ''} onChange={e => setPrintHours(Number(e.target.value))} className="w-full bg-transparent text-white font-bold text-right focus:outline-none pr-1 text-lg" placeholder="0" />
                <span className="text-gray-600 font-bold">:</span>
                <input type="number" value={printMinutes || ''} onChange={e => setPrintMinutes(Math.min(59, Number(e.target.value)))} className="w-full bg-transparent text-white font-bold text-left focus:outline-none pl-1 text-lg" placeholder="00" />
              </div>
            </div>
          </div>

          {/* Row 3: Labor and Markup */}
          <div className="flex gap-6">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Labor y Monitoreo</label>
              <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-purple-500/30 transition-all">
                <button onClick={() => setLaborCostManual(p => Math.max(0, p-10))} className="px-4 py-3 hover:bg-white/10 text-white font-black text-lg transition-colors">-</button>
                <input type="number" value={laborCostManual || ''} onChange={e => setLaborCostManual(Number(e.target.value))} className="w-full bg-transparent text-white font-bold text-center focus:outline-none" />
                <button onClick={() => setLaborCostManual(p => p+10)} className="px-4 py-3 hover:bg-white/10 text-white font-black text-lg transition-colors">+</button>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Margen de Venta</label>
              <div className="grid grid-cols-3 gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10 h-full">
                {[15, 20, 30].map(m => (
                  <button key={m} onClick={() => setMarkup(m)} className={`py-2 text-xs font-black rounded-xl transition-all ${markup === m ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>{m}%</button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Summary (My Costs) */}
          <div className="grid grid-cols-2 gap-4 pt-6">
            <div className="p-5 bg-yellow-500/5 border border-yellow-500/10 rounded-3xl space-y-1">
              <p className="text-[10px] text-yellow-500 font-black uppercase tracking-widest">Energía (Mi Gasto)</p>
              <p className="text-3xl font-black text-white italic">{formatCurrency(results.energyCost)}</p>
            </div>
            <div className="p-5 bg-green-500/5 border border-green-500/10 rounded-3xl space-y-1">
              <p className="text-[10px] text-green-500 font-black uppercase tracking-widest">Filamento (Mi Gasto)</p>
              <p className="text-3xl font-black text-white italic">{formatCurrency(results.filamentCost)}</p>
            </div>
          </div>

          {/* Prices & Actions */}
          <div className="grid grid-cols-2 gap-6 pt-4">
             <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-black text-white/40 uppercase tracking-widest italic border-b border-white/5 pb-2">
                   <span>Costo Base</span>
                   <span className="text-white">{formatCurrency(results.baseCost)}</span>
                </div>
                <div className="flex justify-between items-end">
                   <span className="text-xs font-black text-green-400 uppercase tracking-widest">Precio Amigo</span>
                   <span className="text-2xl font-black text-white">{formatCurrency(results.friendPrice)}</span>
                </div>
                <button onClick={() => handleCopy(results.friendPrice, 'amigo')} className="w-full flex items-center justify-center gap-2 py-3 bg-green-600/10 hover:bg-green-600/20 text-green-400 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-green-500/20 transition-all">
                  <Copy size={14} /> Copiar Cotización
                </button>
             </div>
             <div className="space-y-3">
                <div className="flex justify-between items-end">
                   <div>
                      <span className="text-xs font-black text-blue-400 uppercase tracking-widest block mb-1">Precio Comercial</span>
                      <span className="text-4xl font-black text-white tracking-tighter">{formatCurrency(results.commercialPrice)}</span>
                   </div>
                   <div className="text-right">
                      <span className="text-xs text-green-400 font-black">+{formatCurrency(results.profit)}</span>
                   </div>
                </div>
                <button onClick={() => handleCopy(results.commercialPrice, 'comercial')} className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-900/30 transition-all">
                  <ShoppingBag size={16} /> Copiar Venta
                </button>
             </div>
          </div>

          <button 
            onClick={addToQueue}
            className="w-full flex items-center justify-center gap-3 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-[2rem] font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-indigo-900/40 transition-all mt-4"
          >
            <Plus size={20} /> Agregar a la Lista de Impresión
          </button>
        </div>
      </div>

      {/* RIGHT: PRINT QUEUE */}
      <div className="w-full xl:w-[400px] bg-white/[0.01] flex flex-col">
        <div className="px-8 py-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ListChecks className="text-indigo-400" size={20} />
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Quiero Imprimir</h3>
          </div>
          <div className="flex gap-1">
            <button onClick={loadQueue} disabled={isLoading} className="p-2 text-gray-500 hover:text-blue-400 transition-all disabled:opacity-50"><Download size={16}/></button>
            <button onClick={() => saveQueue()} disabled={isSaving} className="p-2 text-gray-500 hover:text-emerald-400 transition-all disabled:opacity-50"><Save size={16}/></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[600px] custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {printQueue.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-20">
                <Zap size={48} className="mb-4" />
                <p className="text-xs font-black uppercase tracking-widest">Lista Vacía</p>
                <p className="text-[10px] mt-1">Agrega piezas para cotizar tu lote.</p>
              </div>
            ) : (
              printQueue.map((item) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-4 bg-white/[0.03] border border-white/5 rounded-3xl space-y-3 group hover:bg-white/5 transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 truncate">
                      <h4 className="text-sm font-black text-white truncate pr-2 italic uppercase">{item.name}</h4>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[9px] px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full font-bold">{item.material}</span>
                        <span className="text-[9px] px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded-full font-bold">{item.time}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeFromQueue(item.id)}
                      className="p-2 text-gray-600 hover:text-rose-500 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Est. Comercial</span>
                    <span className="text-sm font-black text-white">{formatCurrency(item.cost)}</span>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Footer Stats */}
        <div className="p-8 border-t border-white/10 bg-white/[0.02]">
           <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Total del Lote</span>
              <span className="text-xl font-black text-white">
                {formatCurrency(printQueue.reduce((acc, curr) => acc + curr.cost, 0))}
              </span>
           </div>
           <p className="text-[9px] text-gray-700 font-bold uppercase tracking-[0.2em] text-center mt-4">Rembrandt Studio Mty</p>
        </div>
      </div>
    </div>
  );
};

export default ThreeDCalculator;
