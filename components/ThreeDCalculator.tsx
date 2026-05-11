import React, { useState, useEffect, useCallback } from 'react';
import { Calculator, DollarSign, Zap, Clock, TrendingUp, RefreshCw, UserCheck, ShoppingBag, Copy, CheckCircle2, Plus, Trash2, Save, Download, ListChecks, Database, Palette, PlusCircle } from 'lucide-react';
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

  const [printQueue, setPrintQueue] = useState<PrintItem[]>([]);
  const [myFilaments, setMyFilaments] = useState<FilamentInventory[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  useEffect(() => { calculateResults(); }, [calculateResults]);

  const syncData = async (q = printQueue, f = myFilaments) => {
    setIsSaving(true);
    try {
      const fileName = 'impresion3d.json';
      const dataToSave = { printQueue: q, myFilaments: f };
      const { error } = await supabase.storage.from('savejson').upload(fileName, JSON.stringify(dataToSave), { upsert: true, contentType: 'application/json' });
      if (error) throw error;
      toast.success('Sincronizado');
    } catch (err) {
      console.error(err);
      toast.error('Error sync');
    } finally { setIsSaving(false); }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const fileName = 'impresion3d.json';
      const { data, error } = await supabase.storage.from('savejson').download(fileName);
      if (error) { if (!error.message?.includes('Object not found')) throw error; }
      else if (data) {
        const text = await data.text();
        const json = JSON.parse(text);
        setPrintQueue(json.printQueue || []);
        setMyFilaments(json.myFilaments || []);
        toast.success('Cargado');
      }
    } catch (err) { console.error(err); toast.error('Error load'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const addToQueue = () => {
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
    toast.success('Agregado al lote');
  };

  const addFilament = () => {
    if (!newFilament.color) return;
    const item: FilamentInventory = { id: Date.now().toString(), material: newFilament.material || 'PLA', color: newFilament.color || '?' };
    const updated = [...myFilaments, item];
    setMyFilaments(updated);
    setNewFilament({ material: 'PLA', color: '' });
    syncData(printQueue, updated);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  const handleCopy = (price: number, type: 'amigo' | 'comercial') => {
    const name = pieceName.trim() || `Pieza de ${material}`;
    const time = `${printHours}h ${printMinutes}m`;
    const priceText = formatCurrency(price);
    const text = type === 'amigo' 
      ? `Cotización ${name}: Costo ${priceText} (${time}).`
      : `Cotización ${name}: Material ${material}, Tiempo ${time}, Total ${priceText}.`;
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    toast.success('Copiado');
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="space-y-4 w-full max-w-[1400px] mx-auto p-4">
      
      {/* SECTION: MAIN CALCULATOR BOX */}
      <div className="bg-slate-900/60 backdrop-blur-3xl border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col p-6 space-y-6">
        
        {/* Header Compact */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-3">
            <Calculator className="text-blue-400" size={20} />
            <h3 className="text-sm font-black text-white uppercase tracking-widest italic leading-none">Calculadora Studio</h3>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={addToQueue} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-900/40">
                <Plus size={14} /> Lote
             </button>
             <button onClick={() => { setPieceName(''); setFilamentPrice(400); setWeightUsed(100); setPrintHours(5); setPrintMinutes(0); setLaborCostManual(0); setMarkup(30); }} className="text-gray-500 hover:text-white transition-all"><RefreshCw size={14} /></button>
          </div>
        </div>

        {/* Inputs (Aligned Heights) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
           {/* Row 1: Name, Material */}
           <div className="lg:col-span-4 space-y-1">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Nombre</label>
              <input type="text" value={pieceName} onChange={e => setPieceName(e.target.value)} placeholder="Ej: Casco..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 h-[40px] font-bold" />
           </div>
           <div className="lg:col-span-2 space-y-1">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Material</label>
              <select value={material} onChange={e => setMaterial(e.target.value as any)} className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-bold appearance-none cursor-pointer h-[40px]">
                 <option value="PLA">PLA</option><option value="PETG">PETG</option><option value="TPU">TPU</option>
              </select>
           </div>
           {/* Price, Weight, Time */}
           <div className="lg:col-span-2 space-y-1">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Precio/kg</label>
              <input type="number" value={filamentPrice || ''} onChange={e => setFilamentPrice(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-white text-center font-bold text-sm h-[40px]" />
           </div>
           <div className="lg:col-span-2 space-y-1">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Gramos</label>
              <input type="number" value={weightUsed || ''} onChange={e => setWeightUsed(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-white text-center font-bold text-sm h-[40px]" />
           </div>
           <div className="lg:col-span-2 space-y-1">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Tiempo</label>
              <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-2 h-[40px]">
                 <input type="number" value={printHours || ''} onChange={e => setPrintHours(Number(e.target.value))} className="w-full bg-transparent text-white font-bold text-right focus:outline-none pr-1 text-sm" placeholder="0" />
                 <span className="text-gray-600">:</span>
                 <input type="number" value={printMinutes || ''} onChange={e => setPrintMinutes(Math.min(59, Number(e.target.value)))} className="w-full bg-transparent text-white font-bold text-left focus:outline-none pl-1 text-sm" placeholder="00" />
              </div>
           </div>
        </div>

        {/* Row: Labor & Markup (Compact) */}
        <div className="flex gap-4">
           <div className="flex-1 space-y-1">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Labor (+/- 10)</label>
              <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden h-[40px]">
                 <button onClick={() => setLaborCostManual(p => Math.max(0, p-10))} className="px-3 text-white font-black">-</button>
                 <input type="number" value={laborCostManual || ''} onChange={e => setLaborCostManual(Number(e.target.value))} className="w-full bg-transparent text-white text-center font-bold text-sm" />
                 <button onClick={() => setLaborCostManual(p => p+10)} className="px-3 text-white font-black">+</button>
              </div>
           </div>
           <div className="flex-1 space-y-1">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Margen %</label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-white/5 border border-white/10 rounded-xl h-[40px]">
                 {[15, 20, 30].map(m => (
                   <button key={m} onClick={() => setMarkup(m)} className={`text-[10px] font-black rounded-lg transition-all ${markup === m ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}>{m}%</button>
                 ))}
              </div>
           </div>
        </div>

        {/* SECTION: COSTS ROW */}
        <div className="grid grid-cols-3 gap-4 border-t border-white/5 pt-4">
           <div className="p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-xl">
              <p className="text-[8px] text-yellow-500 font-black uppercase tracking-widest">Energía</p>
              <p className="text-lg font-black text-white italic">{formatCurrency(results.energyCost)}</p>
           </div>
           <div className="p-3 bg-green-500/5 border border-green-500/10 rounded-xl">
              <p className="text-[8px] text-green-500 font-black uppercase tracking-widest">Filamento</p>
              <p className="text-lg font-black text-white italic">{formatCurrency(results.filamentCost)}</p>
           </div>
           <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
              <p className="text-[8px] text-blue-500 font-black uppercase tracking-widest">Mi Costo Base</p>
              <p className="text-lg font-black text-white italic">{formatCurrency(results.baseCost)}</p>
           </div>
        </div>

        {/* SECTION: PRICES ROW (BELOW COSTS) */}
        <div className="grid grid-cols-2 gap-4">
           <div className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-between">
              <div>
                 <p className="text-[9px] font-black text-green-400 uppercase tracking-widest">Precio Amigo</p>
                 <span className="text-xl font-black text-white">{formatCurrency(results.friendPrice)}</span>
              </div>
              <button onClick={() => handleCopy(results.friendPrice, 'amigo')} className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-all"><Copy size={14}/></button>
           </div>
           <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-between">
              <div>
                 <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Precio Comercial</p>
                 <div className="flex items-center gap-2">
                    <span className="text-3xl font-black text-white">{formatCurrency(results.commercialPrice)}</span>
                    <span className="text-[10px] text-green-400 font-black leading-none">+{formatCurrency(results.profit)}</span>
                 </div>
              </div>
              <button onClick={() => handleCopy(results.commercialPrice, 'comercial')} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"><Copy size={14}/></button>
           </div>
        </div>
      </div>

      {/* SECTION: DASHBOARD (QUEUE & STOCK ON SAME ROW) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* LEFT: QUIERO IMPRIMIR (LISTA) - 8 Cols */}
        <div className="lg:col-span-8 bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl flex flex-col overflow-hidden max-h-[350px]">
          <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <ListChecks className="text-indigo-400" size={16} />
              <h3 className="text-[10px] font-black text-white uppercase tracking-widest italic">Quiero Imprimir (Ideas/Lote)</h3>
            </div>
            <div className="flex gap-2">
               <button onClick={loadData} className="text-gray-600 hover:text-white transition-all"><Download size={12}/></button>
               <button onClick={() => syncData()} className="text-gray-600 hover:text-white transition-all"><Save size={12}/></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
             {printQueue.length === 0 ? (
               <div className="text-center py-10 opacity-20 text-[10px] uppercase font-black tracking-widest">Lote vacío</div>
             ) : (
               printQueue.map(item => (
                 <div key={item.id} className="p-3 bg-white/[0.03] border border-white/5 rounded-xl flex items-center justify-between group hover:bg-white/5 transition-all">
                    <div className="flex gap-3 items-center">
                       <span className="text-[9px] font-black text-white uppercase italic truncate max-w-[200px]">{item.name}</span>
                       <span className="text-[8px] px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full font-black uppercase">{item.material}</span>
                       <span className="text-[8px] px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded-full font-black uppercase">{item.time}</span>
                    </div>
                    <div className="flex items-center gap-4">
                       <span className="text-[10px] font-black text-white">{formatCurrency(item.cost)}</span>
                       <button onClick={() => { const n = printQueue.filter(i => i.id !== item.id); setPrintQueue(n); syncData(n, myFilaments); }} className="text-gray-700 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12}/></button>
                    </div>
                 </div>
               ))
             )}
          </div>
          <div className="px-6 py-2 border-t border-white/5 bg-white/[0.02] flex justify-between items-center">
             <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Total Lote</span>
             <span className="text-sm font-black text-white italic">{formatCurrency(printQueue.reduce((a,c) => a + c.cost, 0))}</span>
          </div>
        </div>

        {/* RIGHT: FILAMENTOS STOCK - 4 Cols */}
        <div className="lg:col-span-4 bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl flex flex-col overflow-hidden max-h-[350px]">
          <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <Palette className="text-pink-400" size={16} />
              <h3 className="text-[10px] font-black text-white uppercase tracking-widest italic">Mi Stock</h3>
            </div>
          </div>
          <div className="p-4 space-y-4">
             <div className="flex gap-1 border-b border-white/5 pb-3">
                <input type="text" value={newFilament.color} onChange={e => setNewFilament({...newFilament, color: e.target.value})} placeholder="Color..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none" />
                <button onClick={addFilament} className="bg-pink-600 hover:bg-pink-500 text-white rounded-lg px-2 flex items-center justify-center transition-all"><Plus size={14}/></button>
             </div>
             <div className="space-y-2 overflow-y-auto h-[200px] custom-scrollbar pr-1">
                {myFilaments.map(fil => (
                  <div key={fil.id} className="p-2 bg-white/[0.03] border border-white/5 rounded-lg flex items-center justify-between group">
                     <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: fil.color.toLowerCase() }}></div>
                        <span className="text-[9px] font-black text-white uppercase truncate max-w-[80px]">{fil.color}</span>
                     </div>
                     <button onClick={() => { const n = myFilaments.filter(i => i.id !== fil.id); setMyFilaments(n); syncData(printQueue, n); }} className="text-gray-700 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12}/></button>
                  </div>
                ))}
             </div>
          </div>
        </div>

      </div>

      <p className="text-[8px] text-center text-gray-700 font-black uppercase tracking-[0.5em] py-4">Rembrandt Studio Mty 2026</p>
    </div>
  );
};

export default ThreeDCalculator;
