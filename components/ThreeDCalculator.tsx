import React, { useState, useEffect, useCallback } from 'react';
import { Calculator, DollarSign, Zap, Clock, TrendingUp, RefreshCw, UserCheck, ShoppingBag, Copy, CheckCircle2, Plus, Trash2, Save, Download, ListChecks, Database, Palette, PlusCircle, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { supabase } from '../services/supabaseClient';

interface PrintItem {
  id: string;
  name: string;
  material?: string;
  time?: string;
  cost?: number;
}

interface FilamentInventory {
  id: string;
  material: string;
  color: string;
  customName?: string;
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
  const [editingQueueId, setEditingQueueId] = useState<string | null>(null);

  const [newQueueItemName, setNewQueueItemName] = useState('');
  const [newFilament, setNewFilament] = useState<Partial<FilamentInventory>>({ material: 'PLA', color: '#ffffff', customName: '' });

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

  const addToQueueFromCalc = () => {
    if (editingQueueId) {
      const updated = printQueue.map(item => 
        item.id === editingQueueId 
          ? { ...item, name: pieceName.trim(), material, time: `${printHours}h ${printMinutes}m`, cost: results.baseCost }
          : item
      );
      setPrintQueue(updated);
      syncData(updated, myFilaments);
      setEditingQueueId(null);
      toast.success('Item actualizado');
    } else {
      const item: PrintItem = {
        id: Date.now().toString(),
        name: pieceName.trim() || `Pieza ${material}`,
        material,
        time: `${printHours}h ${printMinutes}m`,
        cost: results.baseCost
      };
      const updated = [...printQueue, item];
      setPrintQueue(updated);
      syncData(updated, myFilaments);
      toast.success('Agregado al lote');
    }
  };

  const addManualQueueItem = () => {
    if (!newQueueItemName) return;
    const item: PrintItem = {
      id: Date.now().toString(),
      name: newQueueItemName,
    };
    const updated = [...printQueue, item];
    setPrintQueue(updated);
    setNewQueueItemName('');
    syncData(updated, myFilaments);
  };

  const loadToCalculator = (item: PrintItem) => {
    setPieceName(item.name);
    if (item.material) setMaterial(item.material as any);
    if (item.time) {
      const parts = item.time.split('h ');
      setPrintHours(parseInt(parts[0]) || 0);
      setPrintMinutes(parseInt(parts[1]) || 0);
    }
    setEditingQueueId(item.id);
    toast.info(`Editando: ${item.name}`);
  };

  const addFilament = () => {
    if (!newFilament.color) return;
    const item: FilamentInventory = { 
      id: Date.now().toString(), 
      material: newFilament.material || 'PLA', 
      color: newFilament.color || '#ffffff',
      customName: newFilament.customName
    };
    const updated = [...myFilaments, item];
    setMyFilaments(updated);
    setNewFilament({ material: 'PLA', color: '#ffffff', customName: '' });
    syncData(printQueue, updated);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  const handleCopy = (price: number, type: 'amigo' | 'comercial') => {
    const name = pieceName.trim() || `Pieza de ${material}`;
    const time = `${printHours}h ${printMinutes}m`;
    const priceText = formatCurrency(price);
    const text = type === 'amigo' 
      ? `Cotización ${name}: Costo neto ${priceText} (${time}).`
      : `Cotización ${name}: Material ${material}, Tiempo ${time}, Total ${priceText}.`;
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    toast.success('Copiado');
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="w-full h-full p-2 flex flex-col">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-[650px] max-w-[1600px] mx-auto w-full">
        
        {/* COL 1: CALCULADORA (50% / 6 cols) */}
        <div className="lg:col-span-6 bg-slate-950/80 backdrop-blur-3xl border border-white/10 rounded-3xl flex flex-col overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <Calculator className={`text-blue-400 ${editingQueueId ? 'animate-pulse text-yellow-400' : ''}`} size={20} />
              <h3 className="text-sm font-black text-white uppercase tracking-widest italic leading-none">
                {editingQueueId ? 'Editando Item' : 'Calculadora Studio'}
              </h3>
            </div>
            <div className="flex items-center gap-3">
               <button onClick={addToQueueFromCalc} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${editingQueueId ? 'bg-yellow-600 hover:bg-yellow-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}>
                  {editingQueueId ? <Save size={14} /> : <Plus size={14} />} {editingQueueId ? 'Guardar' : 'Lote'}
               </button>
               {editingQueueId && <button onClick={() => setEditingQueueId(null)} className="text-rose-400 hover:text-rose-300 text-[9px] font-black uppercase tracking-widest">Cancelar</button>}
               <button onClick={() => { setPieceName(''); setFilamentPrice(400); setWeightUsed(100); setPrintHours(5); setPrintMinutes(0); setLaborCostManual(0); setMarkup(30); setEditingQueueId(null); }} className="text-gray-500 hover:text-white p-1"><RefreshCw size={14} /></button>
            </div>
          </div>

          <div className="p-6 flex-1 flex flex-col space-y-6 overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
               <div className="flex gap-4">
                  <div className="flex-[2] space-y-1.5">
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nombre Pieza</label>
                     <input type="text" value={pieceName} onChange={e => setPieceName(e.target.value)} placeholder="Ej: Casco Iron Man..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 h-[44px] font-bold" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Material</label>
                     <select value={material} onChange={e => setMaterial(e.target.value as any)} className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-bold appearance-none cursor-pointer h-[44px]">
                        <option value="PLA">PLA</option><option value="PETG">PETG</option><option value="TPU">TPU</option>
                     </select>
                  </div>
               </div>

               <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Precio/kg</label>
                     <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden h-[44px]">
                        <button onClick={() => setFilamentPrice(p => Math.max(0, p-50))} className="px-3 text-white font-black text-lg">-</button>
                        <input type="number" value={filamentPrice || ''} onChange={e => setFilamentPrice(Number(e.target.value))} className="w-full bg-transparent text-white text-center font-bold text-sm focus:outline-none" />
                        <button onClick={() => setFilamentPrice(p => p+50)} className="px-3 text-white font-black text-lg">+</button>
                     </div>
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Gramos</label>
                     <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden h-[44px]">
                        <button onClick={() => setWeightUsed(p => Math.max(0, p-10))} className="px-3 text-white font-black text-lg">-</button>
                        <input type="number" value={weightUsed || ''} onChange={e => setWeightUsed(Number(e.target.value))} className="w-full bg-transparent text-white text-center font-bold text-sm focus:outline-none" />
                        <button onClick={() => setWeightUsed(p => p+10)} className="px-3 text-white font-black text-lg">+</button>
                     </div>
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Tiempo</label>
                     <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-2 h-[44px]">
                        <input type="number" value={printHours || ''} onChange={e => setPrintHours(Number(e.target.value))} className="w-full bg-transparent text-white font-bold text-right focus:outline-none pr-1 text-sm" placeholder="0h" />
                        <span className="text-gray-600 font-bold">:</span>
                        <input type="number" value={printMinutes || ''} onChange={e => setPrintMinutes(Math.min(59, Number(e.target.value)))} className="w-full bg-transparent text-white font-bold text-left focus:outline-none pl-1 text-sm" placeholder="0m" />
                     </div>
                  </div>
               </div>

               <div className="flex gap-4">
                  <div className="flex-1 space-y-1.5">
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Labor (+/- 10)</label>
                     <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden h-[44px]">
                        <button onClick={() => setLaborCostManual(p => Math.max(0, p-10))} className="px-4 text-white font-black text-lg">-</button>
                        <input type="number" value={laborCostManual || ''} onChange={e => setLaborCostManual(Number(e.target.value))} className="w-full bg-transparent text-white text-center font-bold text-sm focus:outline-none" />
                        <button onClick={() => setLaborCostManual(p => p+10)} className="px-4 text-white font-black text-lg">+</button>
                     </div>
                  </div>
                  <div className="flex-1 space-y-1.5">
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Margen %</label>
                     <div className="grid grid-cols-3 gap-2 p-1 bg-white/5 border border-white/10 rounded-xl h-[44px]">
                        {[15, 20, 30].map(m => (
                          <button key={m} onClick={() => setMarkup(m)} className={`text-[11px] font-black rounded-lg transition-all ${markup === m ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}>{m}%</button>
                        ))}
                     </div>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-white/5 pt-6">
               <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl flex flex-col items-center justify-center">
                  <p className="text-[10px] text-yellow-500 font-black uppercase tracking-widest mb-1">Energía</p>
                  <p className="text-2xl font-black text-white italic">{formatCurrency(results.energyCost)}</p>
               </div>
               <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-2xl flex flex-col items-center justify-center">
                  <p className="text-[10px] text-green-500 font-black uppercase tracking-widest mb-1">Filamento</p>
                  <p className="text-2xl font-black text-white italic">{formatCurrency(results.filamentCost)}</p>
               </div>
               <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex flex-col items-center justify-center">
                  <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mb-1">Costo Base (Mío)</p>
                  <p className="text-2xl font-black text-white italic">{formatCurrency(results.baseCost)}</p>
               </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-white/5">
               <div className="flex-1 p-4 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-1">Precio Amigo</p>
                     <span className="text-2xl font-black text-white">{formatCurrency(results.friendPrice)}</span>
                  </div>
                  <button onClick={() => handleCopy(results.friendPrice, 'amigo')} className="p-3 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-xl transition-all"><Copy size={18}/></button>
               </div>
               <div className="flex-[1.2] p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Precio Comercial</p>
                     <div className="flex items-center gap-2">
                        <span className="text-3xl font-black text-white">{formatCurrency(results.commercialPrice)}</span>
                        <span className="text-xs text-green-400 font-black leading-none">+{formatCurrency(results.profit)}</span>
                     </div>
                  </div>
                  <button onClick={() => handleCopy(results.commercialPrice, 'comercial')} className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-xl"><Copy size={18}/></button>
               </div>
            </div>
          </div>
        </div>

        {/* COL 2: QUIERO IMPRIMIR (33% / 4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <ListChecks className="text-indigo-400" size={18} />
              <h3 className="text-xs font-black text-white uppercase tracking-widest italic">Quiero Imprimir</h3>
            </div>
            <div className="flex gap-2">
               <button onClick={loadData} className="p-1.5 text-gray-500 hover:text-white bg-white/5 rounded-lg"><Download size={14}/></button>
               <button onClick={() => syncData()} className="p-1.5 text-gray-500 hover:text-emerald-400 bg-white/5 rounded-lg"><Save size={14}/></button>
            </div>
          </div>
          
          <div className="p-5 flex flex-col gap-4 flex-1 overflow-y-auto custom-scrollbar">
             <div className="flex gap-2 pb-3 border-b border-white/5">
                <input type="text" value={newQueueItemName} onChange={e => setNewQueueItemName(e.target.value)} placeholder="Nueva idea (nombre)..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none font-bold" />
                <button onClick={addManualQueueItem} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-4 flex items-center justify-center font-black text-[10px]">AGREGAR</button>
             </div>

             <div className="space-y-3">
                {printQueue.map(item => (
                  <div key={item.id} className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl flex flex-col gap-2 group hover:bg-white/5 transition-all relative">
                     <div className="flex justify-between items-start">
                        <h4 className="text-sm font-black text-white uppercase italic break-words pr-12">{item.name}</h4>
                        <div className="flex gap-1 absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => loadToCalculator(item)} className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg" title="Editar en Calculadora"><Edit3 size={16}/></button>
                           <button onClick={() => { const n = printQueue.filter(i => i.id !== item.id); setPrintQueue(n); syncData(n, myFilaments); }} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg"><Trash2 size={16}/></button>
                        </div>
                     </div>
                     {item.material && (
                       <div className="flex items-center justify-between pt-1 border-t border-white/5">
                          <div className="flex gap-2">
                             <span className="text-[9px] px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full font-black uppercase">{item.material}</span>
                             <span className="text-[9px] px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded-full font-black uppercase">{item.time}</span>
                          </div>
                          <span className="text-sm font-black text-white">{formatCurrency(item.cost || 0)}</span>
                       </div>
                     )}
                  </div>
                ))}
             </div>
          </div>
          <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] flex justify-between items-center">
             <span className="text-xs text-gray-500 font-black uppercase tracking-widest">Total Ideas (Mío)</span>
             <span className="text-xl font-black text-white italic">{formatCurrency(printQueue.reduce((a,c) => a + (c.cost || 0), 0))}</span>
          </div>
        </div>

        {/* COL 3: STOCK FILAMENTOS (17% / 2 cols) */}
        <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl flex flex-col overflow-hidden">
          <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <Palette className="text-pink-400" size={16} />
              <h3 className="text-xs font-black text-white uppercase italic">Mi Stock</h3>
            </div>
          </div>
          <div className="p-4 flex flex-col gap-4 flex-1 overflow-y-auto custom-scrollbar">
             <div className="space-y-2 pb-3 border-b border-white/5">
                <div className="flex gap-2">
                   <select value={newFilament.material} onChange={e => setNewFilament({...newFilament, material: e.target.value})} className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-2 py-2 text-xs text-white focus:outline-none font-bold">
                      <option value="PLA">PLA</option><option value="PETG">PETG</option><option value="TPU">TPU</option>
                   </select>
                   <input type="color" value={newFilament.color} onChange={e => setNewFilament({...newFilament, color: e.target.value})} className="w-10 h-10 bg-transparent border-none cursor-pointer rounded-lg overflow-hidden shrink-0" />
                </div>
                <input type="text" value={newFilament.customName} onChange={e => setNewFilament({...newFilament, customName: e.target.value})} placeholder="Nombre (opcional)..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white focus:outline-none font-bold" />
                <button onClick={addFilament} className="w-full bg-pink-600 hover:bg-pink-500 text-white rounded-lg py-2 flex items-center justify-center font-black text-[10px]">AGREGAR</button>
             </div>
             
             <div className="space-y-2">
                {myFilaments.map(fil => (
                  <div key={fil.id} className="p-2 bg-white/[0.03] border border-white/5 rounded-xl flex items-center justify-between group hover:border-pink-500/30 transition-all">
                     <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-3 h-3 rounded-full shrink-0 border border-white/20" style={{ backgroundColor: fil.color }}></div>
                        <div className="flex items-center gap-1.5 truncate">
                           <span className="text-[10px] font-black text-white uppercase">{fil.material}</span>
                           {fil.customName && <span className="text-[8px] text-gray-500 font-bold italic truncate">({fil.customName})</span>}
                        </div>
                     </div>
                     <button onClick={() => { const n = myFilaments.filter(i => i.id !== fil.id); setMyFilaments(n); syncData(printQueue, n); }} className="text-gray-700 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1"><Trash2 size={14}/></button>
                  </div>
                ))}
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ThreeDCalculator;
