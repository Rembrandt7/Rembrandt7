import React, { useState, useEffect, useCallback } from 'react';
import { Calculator, DollarSign, Zap, Clock, TrendingUp, RefreshCw, UserCheck, ShoppingBag, Copy, CheckCircle2, Plus, Trash2, Save, Download, ListChecks, Database, Palette, Edit3 } from 'lucide-react';
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

interface FilamentInventory {
  id: string;
  material: string;
  color: string;
  brand?: string;
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

  // Persistence States
  const [printQueue, setPrintQueue] = useState<PrintItem[]>([]);
  const [myFilaments, setMyFilaments] = useState<FilamentInventory[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // New Item State (for manual addition to queue)
  const [newQueueItem, setNewQueueItem] = useState<Partial<PrintItem>>({ name: '', material: 'PLA', time: '', cost: 0 });
  const [newFilament, setNewFilament] = useState<Partial<FilamentInventory>>({ material: 'PLA', color: '' });

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

  // Supabase Sync
  const syncData = async (q = printQueue, f = myFilaments) => {
    setIsSaving(true);
    try {
      const fileName = 'impresion3d.json';
      const dataToSave = { printQueue: q, myFilaments: f };
      const { error } = await supabase.storage.from('savejson').upload(fileName, JSON.stringify(dataToSave), {
        upsert: true,
        contentType: 'application/json'
      });
      if (error) throw error;
      toast.success('Datos sincronizados con Supabase');
    } catch (err) {
      console.error(err);
      toast.error('Error al sincronizar');
    } finally {
      setIsSaving(false);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const fileName = 'impresion3d.json';
      const { data, error } = await supabase.storage.from('savejson').download(fileName);
      if (error) {
        if (!error.message?.includes('Object not found')) throw error;
      } else if (data) {
        const text = await data.text();
        const json = JSON.parse(text);
        setPrintQueue(json.printQueue || []);
        setMyFilaments(json.myFilaments || []);
        toast.success('Datos cargados');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Queue Actions
  const addToQueueFromCalc = () => {
    const item: PrintItem = {
      id: Date.now().toString(),
      name: pieceName.trim() || `Pieza ${material}`,
      material,
      time: `${printHours}h ${printMinutes}m`,
      cost: results.commercialPrice
    };
    const updated = [...printQueue, item];
    setPrintQueue(updated);
    syncData(updated, myFilaments);
  };

  const addManualQueueItem = () => {
    if (!newQueueItem.name) return;
    const item: PrintItem = {
      id: Date.now().toString(),
      name: newQueueItem.name || 'Nueva Idea',
      material: newQueueItem.material || 'PLA',
      time: newQueueItem.time || '0h 0m',
      cost: newQueueItem.cost || 0
    };
    const updated = [...printQueue, item];
    setPrintQueue(updated);
    setNewQueueItem({ name: '', material: 'PLA', time: '', cost: 0 });
    syncData(updated, myFilaments);
  };

  const addFilament = () => {
    if (!newFilament.color) return;
    const item: FilamentInventory = {
      id: Date.now().toString(),
      material: newFilament.material || 'PLA',
      color: newFilament.color || 'Desconocido'
    };
    const updated = [...myFilaments, item];
    setMyFilaments(updated);
    setNewFilament({ material: 'PLA', color: '' });
    syncData(printQueue, updated);
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  const handleCopy = (price: number, type: 'amigo' | 'comercial') => {
    const name = pieceName.trim() || `Pieza de ${material}`;
    const time = `${printHours}h ${printMinutes}m`;
    const priceText = formatCurrency(price);
    const text = type === 'amigo' 
      ? `¡Qué onda! Te paso la cotización de tu ${name}: El costo neto queda en ${priceText} (${time}).`
      : `¡Hola! Cotización de ${name}: Realizada en ${material}, tiempo ${time}, total ${priceText}.`;
    
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    toast.success('Copiado');
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="space-y-6 w-full max-w-[1400px] mx-auto p-4 lg:p-0">
      
      {/* SECTION 1: CALCULATOR (MAIN) */}
      <div className="bg-slate-950/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col lg:flex-row min-h-[500px]">
        
        {/* Left: Inputs */}
        <div className="flex-[1.2] border-r border-white/5 p-8 space-y-6">
           <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <Calculator className="text-blue-400" size={24} />
                <h3 className="text-lg font-black text-white uppercase tracking-widest italic leading-none">Calculadora Studio</h3>
              </div>
              <button onClick={() => { setPieceName(''); setFilamentPrice(400); setWeightUsed(100); setPrintHours(5); setPrintMinutes(0); setLaborCostManual(0); setMarkup(30); }} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-all"><RefreshCw size={16} /></button>
           </div>

           {/* Row 1: Piece and Material */}
           <div className="flex gap-4">
              <div className="flex-[2] space-y-1.5">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Nombre de la Pieza</label>
                <input type="text" value={pieceName} onChange={e => setPieceName(e.target.value)} placeholder="Ej: Casco Iron Man..." className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-gray-700 font-bold" />
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Material</label>
                <select value={material} onChange={e => setMaterial(e.target.value as any)} className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-bold appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/30">
                   <option value="PLA">PLA (125W)</option>
                   <option value="PETG">PETG (155W)</option>
                   <option value="TPU">TPU (125W)</option>
                </select>
              </div>
           </div>

           {/* Row 2: Price, Weight, Time (Aligned Heights) */}
           <div className="flex gap-4 items-end">
              <div className="flex-1 space-y-1.5">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Filamento ($/kg)</label>
                <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl overflow-hidden h-[48px]">
                   <button onClick={() => setFilamentPrice(p => Math.max(0, p-50))} className="px-3 text-white font-black">-</button>
                   <input type="number" value={filamentPrice || ''} onChange={e => setFilamentPrice(Number(e.target.value))} className="w-full bg-transparent text-white text-center font-bold text-sm focus:outline-none" />
                   <button onClick={() => setFilamentPrice(p => p+50)} className="px-3 text-white font-black">+</button>
                </div>
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Gramos (g)</label>
                <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl overflow-hidden h-[48px]">
                   <button onClick={() => setWeightUsed(p => Math.max(0, p-10))} className="px-3 text-white font-black">-</button>
                   <input type="number" value={weightUsed || ''} onChange={e => setWeightUsed(Number(e.target.value))} className="w-full bg-transparent text-white text-center font-bold text-sm focus:outline-none" />
                   <button onClick={() => setWeightUsed(p => p+10)} className="px-3 text-white font-black">+</button>
                </div>
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Tiempo (hh:mm)</label>
                <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl px-3 h-[48px] focus-within:ring-2 focus-within:ring-orange-500/30">
                   <input type="number" value={printHours || ''} onChange={e => setPrintHours(Number(e.target.value))} className="w-full bg-transparent text-white font-bold text-right focus:outline-none pr-1" placeholder="0" />
                   <span className="text-gray-600">:</span>
                   <input type="number" value={printMinutes || ''} onChange={e => setPrintMinutes(Math.min(59, Number(e.target.value)))} className="w-full bg-transparent text-white font-bold text-left focus:outline-none pl-1" placeholder="00" />
                </div>
              </div>
           </div>

           {/* Row 3: Labor and Markup (Aligned) */}
           <div className="flex gap-4 items-end">
              <div className="flex-1 space-y-1.5">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Labor y Monitoreo</label>
                <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl overflow-hidden h-[48px]">
                   <button onClick={() => setLaborCostManual(p => Math.max(0, p-10))} className="px-3 text-white font-black">-</button>
                   <input type="number" value={laborCostManual || ''} onChange={e => setLaborCostManual(Number(e.target.value))} className="w-full bg-transparent text-white text-center font-bold text-sm focus:outline-none" />
                   <button onClick={() => setLaborCostManual(p => p+10)} className="px-3 text-white font-black">+</button>
                </div>
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Margen de Venta</label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl h-[48px]">
                   {[15, 20, 30].map(m => (
                     <button key={m} onClick={() => setMarkup(m)} className={`text-[10px] font-black rounded-xl transition-all ${markup === m ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}>{m}%</button>
                   ))}
                </div>
              </div>
           </div>

           {/* Row 4: My Costs Breakdown (One Row) */}
           <div className="flex gap-4 pt-4">
              <div className="flex-1 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl">
                 <p className="text-[8px] text-yellow-500 font-black uppercase tracking-widest">Energía</p>
                 <p className="text-xl font-black text-white italic">{formatCurrency(results.energyCost)}</p>
              </div>
              <div className="flex-1 p-4 bg-green-500/5 border border-green-500/10 rounded-2xl">
                 <p className="text-[8px] text-green-500 font-black uppercase tracking-widest">Filamento</p>
                 <p className="text-xl font-black text-white italic">{formatCurrency(results.filamentCost)}</p>
              </div>
              <div className="flex-1 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                 <p className="text-[8px] text-blue-500 font-black uppercase tracking-widest">Mi Costo Total</p>
                 <p className="text-xl font-black text-white italic">{formatCurrency(results.baseCost)}</p>
              </div>
           </div>
        </div>

        {/* Right: Price Results & Action */}
        <div className="flex-1 bg-white/[0.02] p-8 flex flex-col justify-between">
           <div className="space-y-8">
              <div className="space-y-3">
                 <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-green-400 uppercase tracking-[0.2em]">Precio Amigo</span>
                    <span className="text-3xl font-black text-white tracking-tighter">{formatCurrency(results.friendPrice)}</span>
                 </div>
                 <button onClick={() => handleCopy(results.friendPrice, 'amigo')} className="w-full flex items-center justify-center gap-2 py-3 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-green-500/20 transition-all"><Copy size={14} /> Copiar Texto</button>
              </div>

              <div className="space-y-4 pt-6 border-t border-white/5">
                 <div className="flex justify-between items-end">
                    <div>
                       <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] block mb-1">Precio Comercial</span>
                       <span className="text-6xl font-black text-white tracking-tighter">{formatCurrency(results.commercialPrice)}</span>
                    </div>
                    <div className="text-right text-green-400 font-black text-lg">+{formatCurrency(results.profit)}</div>
                 </div>
                 <button onClick={() => handleCopy(results.commercialPrice, 'comercial')} className="w-full flex items-center justify-center gap-2 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-blue-900/30 transition-all"><ShoppingBag size={18} /> Copiar Venta</button>
              </div>
           </div>

           <button onClick={addToQueueFromCalc} className="w-full flex items-center justify-center gap-3 py-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-xs shadow-2xl mt-8 hover:scale-[1.02] active:scale-95 transition-all">
              <Plus size={22} /> Agregar a mi Lote
           </button>
        </div>
      </div>

      {/* SECTION 2: QUEUE & INVENTORY (FULL WIDTH) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT: QUIERO IMPRIMIR (LISTA) */}
        <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <ListChecks className="text-indigo-400" size={18} />
              <h3 className="text-xs font-black text-white uppercase tracking-widest">Quiero Imprimir (Ideas/Lote)</h3>
            </div>
            <div className="flex gap-2">
               <button onClick={loadData} className="p-1.5 text-gray-500 hover:text-blue-400 transition-all"><Download size={14}/></button>
               <button onClick={() => syncData()} className="p-1.5 text-gray-500 hover:text-emerald-400 transition-all"><Save size={14}/></button>
            </div>
          </div>
          
          <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
             {/* Add Manual Form */}
             <div className="grid grid-cols-4 gap-2 pb-4 border-b border-white/5">
                <input type="text" value={newQueueItem.name} onChange={e => setNewQueueItem({...newQueueItem, name: e.target.value})} placeholder="Nombre..." className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white focus:outline-none" />
                <select value={newQueueItem.material} onChange={e => setNewQueueItem({...newQueueItem, material: e.target.value})} className="bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white focus:outline-none">
                   <option value="PLA">PLA</option><option value="PETG">PETG</option><option value="TPU">TPU</option>
                </select>
                <input type="text" value={newQueueItem.time} onChange={e => setNewQueueItem({...newQueueItem, time: e.target.value})} placeholder="0h 0m" className="bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white focus:outline-none" />
                <button onClick={addManualQueueItem} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center transition-all"><Plus size={16}/></button>
             </div>

             <div className="space-y-2">
                {printQueue.map(item => (
                  <div key={item.id} className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-between group hover:bg-white/5 transition-all">
                     <div className="flex gap-4 items-center">
                        <div>
                           <h4 className="text-xs font-black text-white uppercase italic">{item.name}</h4>
                           <div className="flex gap-2 mt-1">
                              <span className="text-[8px] px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full font-black">{item.material}</span>
                              <span className="text-[8px] px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded-full font-black">{item.time}</span>
                           </div>
                        </div>
                     </div>
                     <div className="flex items-center gap-4">
                        <span className="text-xs font-black text-white">{formatCurrency(item.cost)}</span>
                        <button onClick={() => { setPrintQueue(q => { const n = q.filter(i => i.id !== item.id); syncData(n, myFilaments); return n; }) }} className="text-gray-700 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                     </div>
                  </div>
                ))}
             </div>
          </div>
          <div className="p-4 bg-white/[0.02] border-t border-white/5 flex justify-between items-center px-8">
             <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Total Estimado</span>
             <span className="text-lg font-black text-white">{formatCurrency(printQueue.reduce((a,c) => a + c.cost, 0))}</span>
          </div>
        </div>

        {/* RIGHT: FILAMENTOS QUE TENGO */}
        <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <Palette className="text-pink-400" size={18} />
              <h3 className="text-xs font-black text-white uppercase tracking-widest">Mis Filamentos en Stock</h3>
            </div>
            <Database size={14} className="text-gray-600" />
          </div>

          <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
             {/* Add Filament Form */}
             <div className="grid grid-cols-3 gap-2 pb-4 border-b border-white/5">
                <select value={newFilament.material} onChange={e => setNewFilament({...newFilament, material: e.target.value})} className="bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white focus:outline-none">
                   <option value="PLA">PLA</option><option value="PETG">PETG</option><option value="TPU">TPU</option>
                </select>
                <input type="text" value={newFilament.color} onChange={e => setNewFilament({...newFilament, color: e.target.value})} placeholder="Color..." className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white focus:outline-none" />
                <button onClick={addFilament} className="bg-pink-600 hover:bg-pink-500 text-white rounded-lg flex items-center justify-center transition-all font-black text-[10px]">AGREGAR</button>
             </div>

             <div className="grid grid-cols-2 gap-3">
                {myFilaments.map(fil => (
                  <div key={fil.id} className="p-3 bg-white/[0.03] border border-white/5 rounded-xl flex items-center justify-between group hover:border-pink-500/30 transition-all">
                     <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)]" style={{ backgroundColor: fil.color.toLowerCase() }}></div>
                        <div>
                           <p className="text-[10px] font-black text-white uppercase leading-none">{fil.color}</p>
                           <p className="text-[8px] text-gray-500 font-bold uppercase mt-1">{fil.material}</p>
                        </div>
                     </div>
                     <button onClick={() => { setMyFilaments(f => { const n = f.filter(i => i.id !== fil.id); syncData(printQueue, n); return n; }) }} className="text-gray-700 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12}/></button>
                  </div>
                ))}
             </div>
          </div>
        </div>

      </div>

      <p className="text-[9px] text-center text-gray-700 font-black uppercase tracking-[0.5em] py-8">Rembrandt Studio Monterrey • Monterrey, NL 2026</p>
    </div>
  );
};

export default ThreeDCalculator;
