import React, { useState, useEffect } from 'react';
import { Calculator, DollarSign, Zap, Clock, Wrench, TrendingUp, Download, RefreshCw, UserCheck, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';

interface CalculationResults {
  filamentCost: number;
  energyCost: number;
  laborCost: number;
  maintenanceCost: number;
  baseCost: number; // My cost
  friendPrice: number; // Low margin
  commercialPrice: number; // Standard margin
  profit: number;
}

const MATERIAL_POWER = {
  PLA: 120, // Watts (Average: Nozzle 200, Bed 60)
  PETG: 180, // Watts (Average: Nozzle 240, Bed 80)
  TPU: 140, // Watts (Average: Nozzle 230, Bed 50)
};

const ThreeDCalculator: React.FC = () => {
  // Inputs
  const [filamentPrice, setFilamentPrice] = useState(400); // MXN per kg
  const [weightUsed, setWeightUsed] = useState(100); // grams
  const [printHours, setPrintHours] = useState(5);
  const [printMinutes, setPrintMinutes] = useState(0);
  const [material, setMaterial] = useState<keyof typeof MATERIAL_POWER>('PLA');
  const [electricityRate, setElectricityRate] = useState(2.5); // MXN per kWh
  const [laborCostManual, setLaborCostManual] = useState(0); // Manual labor addition
  const [maintenanceRate, setMaintenanceRate] = useState(5); // MXN per hour (Wear and tear)
  const [markup, setMarkup] = useState(30); // percentage (10, 20, 30)

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
    const eCost = (power / 1000) * totalHours * electricityRate;
    const mCost = totalHours * maintenanceRate;
    
    const baseCost = fCost + eCost + mCost + laborCostManual;
    
    // Pricing strategies
    const friendPrice = baseCost * 1.15; // 15% margin to cover risks without loss
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
            <p className="text-xs text-blue-300/60 uppercase tracking-[0.2em] font-bold">Monterrey • Estrategia de Precios</p>
          </div>
        </div>
        <button 
          onClick={() => {
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Filament Price Stepper */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                <DollarSign size={14} className="text-green-400" /> Precio Filamento (kg)
              </label>
              <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
                <button 
                  onClick={() => setFilamentPrice(prev => Math.max(0, prev - 50))}
                  className="px-4 py-4 hover:bg-white/10 text-white font-bold transition-colors"
                > - </button>
                <input 
                  type="number" 
                  value={filamentPrice} 
                  onChange={(e) => setFilamentPrice(Number(e.target.value))}
                  className="w-full bg-transparent text-center text-white font-bold text-xl focus:outline-none"
                />
                <button 
                  onClick={() => setFilamentPrice(prev => prev + 50)}
                  className="px-4 py-4 hover:bg-white/10 text-white font-bold transition-colors"
                > + </button>
              </div>
            </div>

            {/* Model Weight */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                <TrendingUp size={14} className="text-blue-400" /> Peso del Modelo (Gramos)
              </label>
              <div className="relative">
                <input 
                  type="number" 
                  value={weightUsed} 
                  onChange={(e) => setWeightUsed(Number(e.target.value))}
                  placeholder="Manual..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold text-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 font-bold">g</span>
              </div>
            </div>

            {/* Material Selector */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                <Zap size={14} className="text-yellow-400" /> Material / Energía
              </label>
              <div className="grid grid-cols-3 gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10">
                {(['PLA', 'PETG', 'TPU'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMaterial(m)}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition-all ${
                      material === m 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' 
                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {m}
                  </button>
                ))}
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
                    value={printHours} 
                    onChange={(e) => setPrintHours(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white font-bold text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-bold uppercase">hrs</span>
                </div>
                <div className="relative flex-1">
                  <input 
                    type="number" 
                    value={printMinutes} 
                    onChange={(e) => setPrintMinutes(Math.min(59, Number(e.target.value)))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white font-bold text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-bold uppercase">min</span>
                </div>
              </div>
            </div>

            {/* Labor Manual */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                <UserCheck size={14} className="text-purple-400" /> Labor y Monitoreo
              </label>
              <div className="relative">
                <input 
                  type="number" 
                  value={laborCostManual} 
                  onChange={(e) => setLaborCostManual(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold text-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
              </div>
            </div>

            {/* Markup Selector */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                <TrendingUp size={14} className="text-cyan-400" /> Margen Comercial
              </label>
              <div className="grid grid-cols-3 gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10">
                {([10, 20, 30] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMarkup(m)}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition-all ${
                      markup === m 
                        ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40' 
                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {m}%
                  </button>
                ))}
              </div>
            </div>

          </div>

          <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-3xl space-y-4">
             <div className="flex justify-between items-center">
                <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Tu Costo Directo (Base)</span>
                <span className="text-white font-black text-2xl">{formatCurrency(results.baseCost)}</span>
             </div>
             <div className="grid grid-cols-4 gap-4 pt-2 border-t border-white/5">
                <div className="text-center">
                   <p className="text-[10px] text-gray-500 uppercase font-bold">Filamento</p>
                   <p className="text-xs text-white font-bold">{formatCurrency(results.filamentCost)}</p>
                </div>
                <div className="text-center">
                   <p className="text-[10px] text-gray-500 uppercase font-bold">Energía ({material})</p>
                   <p className="text-xs text-white font-bold">{formatCurrency(results.energyCost)}</p>
                </div>
                <div className="text-center">
                   <p className="text-[10px] text-gray-500 uppercase font-bold">Manto.</p>
                   <p className="text-xs text-white font-bold">{formatCurrency(results.maintenanceCost)}</p>
                </div>
                <div className="text-center">
                   <p className="text-[10px] text-gray-500 uppercase font-bold">Labor</p>
                   <p className="text-xs text-white font-bold">{formatCurrency(results.laborCost)}</p>
                </div>
             </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="xl:col-span-5 p-10 bg-gradient-to-br from-white/[0.03] to-white/[0.01] flex flex-col justify-between space-y-8">
          
          <div className="space-y-8">
            <h4 className="text-gray-400 text-xs font-black uppercase tracking-[0.3em] text-center">Estrategia de Venta</h4>
            
            {/* Friend Price */}
            <div className="relative p-6 bg-white/[0.03] border border-white/5 rounded-3xl space-y-2 group hover:bg-white/5 transition-all">
               <div className="absolute top-4 right-6 p-2 bg-green-500/10 rounded-full">
                  <UserCheck className="text-green-400" size={16} />
               </div>
               <p className="text-xs font-black text-green-400 uppercase tracking-widest">Precio Amigo</p>
               <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white tracking-tighter">{formatCurrency(results.friendPrice)}</span>
               </div>
               <p className="text-[10px] text-gray-500 leading-tight">Ganancia mínima para cubrir riesgos y desgaste sin pérdida operativa.</p>
            </div>

            {/* Commercial Price */}
            <div className="relative p-8 bg-blue-600/10 border border-blue-500/30 rounded-[2rem] space-y-3 group hover:bg-blue-600/20 transition-all ring-1 ring-blue-500/20 shadow-xl shadow-blue-900/20">
               <div className="absolute top-6 right-8 p-3 bg-blue-500/20 rounded-2xl">
                  <ShoppingBag className="text-blue-400" size={24} />
               </div>
               <p className="text-sm font-black text-blue-400 uppercase tracking-[0.2em]">Precio Comercial</p>
               <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-black text-white tracking-tighter">{formatCurrency(results.commercialPrice)}</span>
                  <span className="text-blue-500 font-bold">MXN</span>
               </div>
               <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-gray-400 font-bold">GANANCIA ({markup}%)</span>
                  <span className="text-green-400 font-black">+{formatCurrency(results.profit)}</span>
               </div>
            </div>
          </div>

          <div className="space-y-4">
            <button className="w-full bg-white text-slate-900 font-black py-5 rounded-2xl shadow-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm">
              <Download size={18} />
              Exportar Ticket
            </button>
            <p className="text-[10px] text-center text-gray-600 font-medium">Cálculos optimizados para eficiencia en Monterrey, NL.</p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ThreeDCalculator;
