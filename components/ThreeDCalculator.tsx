import React, { useState, useEffect } from 'react';
import { Calculator, DollarSign, Zap, Clock, Wrench, TrendingUp, RefreshCw, UserCheck, ShoppingBag, Copy, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

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

  useEffect(() => {
    const totalHours = printHours + (printMinutes / 60);
    const fCost = (filamentPrice / 1000) * weightUsed;
    const power = MATERIAL_POWER[material];
    const eCost = (power / 1000) * totalHours * 2.5; // Fixed rate 2.5 MXN/kWh
    const mCost = totalHours * 5; // Fixed maintenance 5 MXN/hr
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
    toast.success('¡Copiado!');
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="bg-slate-950/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl max-w-4xl mx-auto">
      {/* Header Compact */}
      <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calculator className="text-blue-400" size={20} />
          <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Calculadora Express 3D</h3>
        </div>
        <button onClick={() => { setPieceName(''); setFilamentPrice(400); setWeightUsed(100); setPrintHours(5); setPrintMinutes(0); setLaborCostManual(0); setMarkup(30); }} className="text-gray-500 hover:text-white transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        {/* Left: Inputs */}
        <div className="p-6 space-y-5 border-r border-white/5">
          
          {/* Row 1: Name and Material */}
          <div className="flex gap-4">
            <div className="flex-[2] space-y-1.5">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Nombre Pieza</label>
              <input type="text" value={pieceName} onChange={e => setPieceName(e.target.value)} placeholder="Ej: Casco..." className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50" />
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Material</label>
              <select value={material} onChange={e => setMaterial(e.target.value as any)} className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-white text-sm focus:outline-none">
                <option value="PLA">PLA</option>
                <option value="PETG">PETG</option>
                <option value="TPU">TPU</option>
              </select>
            </div>
          </div>

          {/* Row 2: Price, Weight, Time */}
          <div className="flex gap-3">
            <div className="w-20 space-y-1.5">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Filamento</label>
              <input type="number" value={filamentPrice || ''} onChange={e => setFilamentPrice(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-white text-sm text-center focus:outline-none" />
            </div>
            <div className="w-24 space-y-1.5">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Gramos</label>
              <input type="number" value={weightUsed || ''} onChange={e => setWeightUsed(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-white text-sm text-center focus:outline-none" />
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Tiempo (hh:mm)</label>
              <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-2 py-2">
                <input type="number" value={printHours || ''} onChange={e => setPrintHours(Number(e.target.value))} className="w-full bg-transparent text-white text-sm text-right focus:outline-none pr-1" placeholder="0" />
                <span className="text-gray-600">:</span>
                <input type="number" value={printMinutes || ''} onChange={e => setPrintMinutes(Math.min(59, Number(e.target.value)))} className="w-full bg-transparent text-white text-sm text-left focus:outline-none pl-1" placeholder="00" />
              </div>
            </div>
          </div>

          {/* Row 3: Labor and Markup */}
          <div className="flex gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Labor (+/- 10)</label>
              <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <button onClick={() => setLaborCostManual(p => Math.max(0, p-10))} className="px-2 py-2 hover:bg-white/5 text-gray-400">-</button>
                <input type="number" value={laborCostManual || ''} onChange={e => setLaborCostManual(Number(e.target.value))} className="w-full bg-transparent text-white text-sm text-center focus:outline-none" />
                <button onClick={() => setLaborCostManual(p => p+10)} className="px-2 py-2 hover:bg-white/5 text-gray-400">+</button>
              </div>
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Margen Ganancia</label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-white/5 rounded-xl">
                {[15, 20, 30].map(m => (
                  <button key={m} onClick={() => setMarkup(m)} className={`py-1 text-[10px] font-black rounded-lg transition-all ${markup === m ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}>{m}%</button>
                ))}
              </div>
            </div>
          </div>

          {/* Breakdown Internal (My Costs) */}
          <div className="pt-4 mt-4 border-t border-white/5 space-y-3">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-gray-500 font-bold uppercase">Costo Luz (Mty)</span>
              <span className="text-yellow-400 font-mono font-bold">{formatCurrency(results.energyCost)}</span>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-gray-500 font-bold uppercase">Costo Filamento</span>
              <span className="text-green-400 font-mono font-bold">{formatCurrency(results.filamentCost)}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-blue-500/5 rounded-lg border border-blue-500/10">
              <span className="text-blue-400 text-xs font-black uppercase tracking-tighter italic">Mi Costo Base</span>
              <span className="text-white font-black text-sm">{formatCurrency(results.baseCost)}</span>
            </div>
          </div>
        </div>

        {/* Right: Selling Prices */}
        <div className="p-8 bg-white/[0.02] flex flex-col justify-center space-y-8">
          
          <div className="space-y-6">
            {/* Friend Price */}
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Precio Amigo</span>
                <span className="text-2xl font-black text-white leading-none">{formatCurrency(results.friendPrice)}</span>
              </div>
              <button onClick={() => handleCopy(results.friendPrice, 'amigo')} className="w-full flex items-center justify-center gap-2 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-green-500/20">
                {copiedType === 'amigo' ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                {copiedType === 'amigo' ? '¡Copiado!' : 'Copiar Texto'}
              </button>
            </div>

            {/* Commercial Price */}
            <div className="space-y-3 pt-4 border-t border-white/5">
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">Precio Comercial</span>
                  <span className="text-5xl font-black text-white tracking-tighter leading-none">{formatCurrency(results.commercialPrice)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-green-400 font-black">+{formatCurrency(results.profit)}</span>
                </div>
              </div>
              <button onClick={() => handleCopy(results.commercialPrice, 'comercial')} className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-blue-900/40">
                {copiedType === 'comercial' ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                {copiedType === 'comercial' ? '¡Copiado!' : 'Copiar Texto Comercial'}
              </button>
            </div>
          </div>

          <p className="text-[8px] text-center text-gray-700 font-bold uppercase tracking-[0.3em]">Rembrandt Studio Monterrey</p>
        </div>
      </div>
    </div>
  );
};

export default ThreeDCalculator;
