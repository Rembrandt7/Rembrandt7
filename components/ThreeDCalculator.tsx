import React, { useState, useEffect } from 'react';
import { Calculator, DollarSign, Zap, Clock, Wrench, TrendingUp, Download, RefreshCw, UserCheck, ShoppingBag, Info, Copy, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  // Inputs
  const [pieceName, setPieceName] = useState('');
  const [filamentPrice, setFilamentPrice] = useState(400);
  const [weightUsed, setWeightUsed] = useState(100);
  const [printHours, setPrintHours] = useState(5);
  const [printMinutes, setPrintMinutes] = useState(0);
  const [material, setMaterial] = useState<keyof typeof MATERIAL_POWER>('PLA');
  const [electricityRate, setElectricityRate] = useState(2.5);
  const [laborCostManual, setLaborCostManual] = useState(0);
  const [maintenanceRate, setMaintenanceRate] = useState(5);
  const [markup, setMarkup] = useState(30);

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

  const [copiedType, setCopiedType] = useState<string | null>(null);

  useEffect(() => {
    const totalHours = printHours + (printMinutes / 60);
    const fCost = (filamentPrice / 1000) * weightUsed;
    const power = MATERIAL_POWER[material];
    const eCost = (power / 1000) * totalHours * electricityRate;
    const mCost = totalHours * maintenanceRate;
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
  }, [filamentPrice, weightUsed, printHours, printMinutes, material, electricityRate, laborCostManual, maintenanceRate, markup]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  const generateSalesText = (price: number, type: 'amigo' | 'comercial') => {
    const name = pieceName.trim() || `Pieza de ${material}`;
    const timeText = `${printHours}h ${printMinutes}m`;
    const priceText = formatCurrency(price);
    
    if (type === 'amigo') {
      return `¡Qué onda! Te paso la cotización de tu ${name}: El costo neto por los materiales, energía y el tiempo de impresión (${timeText}) queda en ${priceText}. ¡Es precio especial! Quedo a tus órdenes.`;
    }
    return `¡Hola! Con gusto te comparto la cotización de tu ${name}. Realizada en material ${material} con un tiempo de impresión de ${timeText}, el total sería de ${priceText}. ¡Quedo a tus órdenes para iniciar tu proyecto!`;
  };

  const handleCopy = (price: number, type: 'amigo' | 'comercial') => {
    const text = generateSalesText(price, type);
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    toast.success('¡Texto de venta copiado!');
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-8 border-b border-white/10 bg-gradient-to-r from-blue-600/20 via-indigo-600/10 to-purple-600/20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-500/30">
            <Calculator className="text-blue-400" size={28} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight italic uppercase">Costeador 3D Pro</h3>
            <p className="text-xs text-blue-300/60 uppercase tracking-[0.2em] font-bold">Monterrey • Cotizador Inteligente</p>
          </div>
        </div>
        <button 
          onClick={() => {
            setPieceName('');
            setFilamentPrice(400);
            setWeightUsed(100);
            setPrintHours(5);
            setPrintMinutes(0);
            setMaterial('PLA');
            setLaborCostManual(0);
            setMarkup(30);
          }}
          className="p-3 hover:bg-white/5 rounded-2xl transition-all text-gray-400 hover:text-white border border-transparent hover:border-white/10"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-0">
        {/* Inputs Section */}
        <div className="xl:col-span-7 p-8 space-y-8 border-r border-white/5 bg-white/[0.01]">
          
          {/* Piece Name */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Nombre de la Pieza (Opcional)</label>
            <input 
              type="text" 
              placeholder="Ej: Casco Iron Man, Engrane, Maceta..."
              value={pieceName}
              onChange={(e) => setPieceName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Filament Price */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                <DollarSign size={14} className="text-green-400" /> Filamento (kg)
              </label>
              <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
                <button onClick={() => setFilamentPrice(prev => Math.max(0, prev - 50))} className="px-4 py-4 hover:bg-white/10 text-white font-bold transition-colors">-</button>
                <input 
                  type="number" 
                  value={filamentPrice === 0 ? '' : filamentPrice} 
                  onChange={(e) => setFilamentPrice(Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-transparent text-center text-white font-bold text-xl focus:outline-none"
                />
                <button onClick={() => setFilamentPrice(prev => prev + 50)} className="px-4 py-4 hover:bg-white/10 text-white font-bold transition-colors">+</button>
              </div>
            </div>

            {/* Model Weight */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                <TrendingUp size={14} className="text-blue-400" /> Peso (Gramos)
              </label>
              <div className="relative">
                <input 
                  type="number" 
                  value={weightUsed === 0 ? '' : weightUsed} 
                  onChange={(e) => setWeightUsed(Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold text-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 font-bold">g</span>
              </div>
            </div>

            {/* Labor Cost Stepper */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                <UserCheck size={14} className="text-purple-400" /> Labor / Post-proceso
              </label>
              <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
                <button onClick={() => setLaborCostManual(prev => Math.max(0, prev - 10))} className="px-4 py-4 hover:bg-white/10 text-white font-bold transition-colors">-</button>
                <input 
                  type="number" 
                  value={laborCostManual === 0 ? '' : laborCostManual} 
                  onChange={(e) => setLaborCostManual(Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-transparent text-center text-white font-bold text-xl focus:outline-none"
                />
                <button onClick={() => setLaborCostManual(prev => prev + 10)} className="px-4 py-4 hover:bg-white/10 text-white font-bold transition-colors">+</button>
              </div>
            </div>

            {/* Time Split */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                <Clock size={14} className="text-orange-400" /> Tiempo de Impresión
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input 
                    type="number" 
                    value={printHours === 0 ? '' : printHours} 
                    onChange={(e) => setPrintHours(Number(e.target.value))}
                    placeholder="0"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white font-bold text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-bold uppercase">hrs</span>
                </div>
                <div className="relative flex-1">
                  <input 
                    type="number" 
                    value={printMinutes === 0 ? '' : printMinutes} 
                    onChange={(e) => setPrintMinutes(Math.min(59, Number(e.target.value)))}
                    placeholder="0"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white font-bold text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-bold uppercase">min</span>
                </div>
              </div>
            </div>

            {/* Material & Markup remain same but refined styles */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                <Zap size={14} className="text-yellow-400" /> Material
              </label>
              <div className="grid grid-cols-3 gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10">
                {(['PLA', 'PETG', 'TPU'] as const).map((m) => (
                  <button key={m} onClick={() => setMaterial(m)} className={`py-2 px-3 rounded-xl text-xs font-black transition-all ${material === m ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>{m}</button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                <TrendingUp size={14} className="text-cyan-400" /> Margen
              </label>
              <div className="grid grid-cols-3 gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10">
                {([10, 20, 30] as const).map((m) => (
                  <button key={m} onClick={() => setMarkup(m)} className={`py-2 px-3 rounded-xl text-xs font-black transition-all ${markup === m ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>{m}%</button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Results Section */}
        <div className="xl:col-span-5 p-10 bg-gradient-to-br from-white/[0.03] to-white/[0.01] flex flex-col justify-between space-y-8">
          
          <div className="space-y-6">
            <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
               <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest italic italic leading-none">Mi Costo Base</span>
               <span className="text-white font-black text-xl leading-none">{formatCurrency(results.baseCost)}</span>
            </div>

            {/* Friend Price */}
            <div className="relative p-6 bg-white/[0.03] border border-white/5 rounded-3xl space-y-4 group transition-all">
               <div>
                  <p className="text-xs font-black text-green-400 uppercase tracking-widest">Precio Amigo</p>
                  <span className="text-4xl font-black text-white tracking-tighter">{formatCurrency(results.friendPrice)}</span>
               </div>
               <button 
                  onClick={() => handleCopy(results.friendPrice, 'amigo')}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-green-500/20"
                >
                  {copiedType === 'amigo' ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  {copiedType === 'amigo' ? '¡Copiado!' : 'Copiar Texto Amigo'}
               </button>
            </div>

            {/* Commercial Price */}
            <div className="relative p-8 bg-blue-600/10 border border-blue-500/30 rounded-[2rem] space-y-5 transition-all ring-1 ring-blue-500/20 shadow-xl shadow-blue-900/20">
               <div>
                  <p className="text-sm font-black text-blue-400 uppercase tracking-[0.2em]">Precio Comercial</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl font-black text-white tracking-tighter">{formatCurrency(results.commercialPrice)}</span>
                    <span className="text-blue-500 font-bold uppercase text-xs tracking-widest">MXN</span>
                  </div>
               </div>
               <button 
                  onClick={() => handleCopy(results.commercialPrice, 'comercial')}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-blue-500 hover:bg-blue-400 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-blue-900/40"
                >
                  {copiedType === 'comercial' ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                  {copiedType === 'comercial' ? '¡Copiado!' : 'Copiar Texto Comercial'}
               </button>
            </div>
          </div>

          <p className="text-[9px] text-center text-gray-600 font-bold uppercase tracking-widest leading-relaxed">
            Consumos calculados: {MATERIAL_POWER[material]}W ({material})<br/>
            Rembrandt Studio Monterrey
          </p>
        </div>
      </div>
    </div>
  );
};

export default ThreeDCalculator;
