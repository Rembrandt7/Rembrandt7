import React, { useState, useEffect } from 'react';
import { Calculator, DollarSign, Zap, Clock, Wrench, TrendingUp, Download, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface CalculationResults {
  filamentCost: number;
  energyCost: number;
  laborCost: number;
  maintenanceCost: number;
  totalCost: number;
  finalPrice: number;
  profit: number;
}

const ThreeDCalculator: React.FC = () => {
  // Inputs
  const [filamentPrice, setFilamentPrice] = useState(450); // MXN per kg
  const [weightUsed, setWeightUsed] = useState(100); // grams
  const [printTime, setPrintTime] = useState(5); // hours
  const [powerConsumption, setPowerConsumption] = useState(200); // Watts
  const [electricityRate, setElectricityRate] = useState(2.5); // MXN per kWh
  const [laborRate, setLaborRate] = useState(150); // MXN per hour
  const [prepTime, setPrepTime] = useState(0.5); // hours
  const [maintenanceRate, setMaintenanceRate] = useState(5); // MXN per hour
  const [markup, setMarkup] = useState(30); // percentage

  const [results, setResults] = useState<CalculationResults>({
    filamentCost: 0,
    energyCost: 0,
    laborCost: 0,
    maintenanceCost: 0,
    totalCost: 0,
    finalPrice: 0,
    profit: 0,
  });

  useEffect(() => {
    const fCost = (filamentPrice / 1000) * weightUsed;
    const eCost = (powerConsumption / 1000) * printTime * electricityRate;
    const lCost = (prepTime + (printTime * 0.1)) * laborRate; // Labor includes prep + 10% of print time for monitoring
    const mCost = printTime * maintenanceRate;
    
    const totalCost = fCost + eCost + lCost + mCost;
    const profit = totalCost * (markup / 100);
    const finalPrice = totalCost + profit;

    setResults({
      filamentCost: fCost,
      energyCost: eCost,
      laborCost: lCost,
      maintenanceCost: mCost,
      totalCost,
      finalPrice,
      profit,
    });
  }, [filamentPrice, weightUsed, printTime, powerConsumption, electricityRate, laborRate, prepTime, maintenanceRate, markup]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
      <div className="p-6 border-b border-white/10 bg-gradient-to-r from-blue-600/20 to-purple-600/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Calculator className="text-blue-400" size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Calculadora de Costos 3D</h3>
            <p className="text-xs text-blue-300/60 uppercase tracking-widest font-semibold">Monterrey Edition • MXN</p>
          </div>
        </div>
        <button 
          onClick={() => {
            setFilamentPrice(450);
            setWeightUsed(100);
            setPrintTime(5);
            setMarkup(30);
          }}
          className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white"
          title="Resetear"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
        {/* Inputs Section */}
        <div className="p-8 space-y-6 border-r border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Filament */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <DollarSign size={14} className="text-green-400" /> Precio Filamento (kg)
              </label>
              <div className="relative">
                <input 
                  type="number" 
                  value={filamentPrice} 
                  onChange={(e) => setFilamentPrice(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs">$</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <TrendingUp size={14} className="text-blue-400" /> Peso del Modelo (g)
              </label>
              <div className="relative">
                <input 
                  type="number" 
                  value={weightUsed} 
                  onChange={(e) => setWeightUsed(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs">g</span>
              </div>
            </div>

            {/* Time and Energy */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <Clock size={14} className="text-orange-400" /> Tiempo de Impresión
              </label>
              <div className="relative">
                <input 
                  type="number" 
                  value={printTime} 
                  onChange={(e) => setPrintTime(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs">hrs</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <Zap size={14} className="text-yellow-400" /> Consumo Eléctrico
              </label>
              <div className="relative">
                <input 
                  type="number" 
                  value={powerConsumption} 
                  onChange={(e) => setPowerConsumption(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs">W</span>
              </div>
            </div>

            {/* Rates */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <Wrench size={14} className="text-red-400" /> Costo de Mantenimiento
              </label>
              <div className="relative">
                <input 
                  type="number" 
                  value={maintenanceRate} 
                  onChange={(e) => setMaintenanceRate(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs">$/hr</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <TrendingUp size={14} className="text-purple-400" /> Margen de Utilidad
              </label>
              <div className="relative">
                <input 
                  type="number" 
                  value={markup} 
                  onChange={(e) => setMarkup(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="p-8 bg-white/[0.02] flex flex-col justify-between">
          <div className="space-y-6">
            <h4 className="text-gray-400 text-sm font-bold uppercase tracking-widest">Desglose de Costos</h4>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="text-gray-400 text-sm">Material (Filamento)</span>
                <span className="text-white font-mono">{formatCurrency(results.filamentCost)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="text-gray-400 text-sm">Energía Eléctrica</span>
                <span className="text-white font-mono">{formatCurrency(results.energyCost)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="text-gray-400 text-sm">Labor y Monitoreo</span>
                <span className="text-white font-mono">{formatCurrency(results.laborCost)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="text-gray-400 text-sm">Mantenimiento Maquinaria</span>
                <span className="text-white font-mono">{formatCurrency(results.maintenanceCost)}</span>
              </div>
            </div>

            <div className="pt-6 border-t border-white/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400 text-sm">Ganancia estimada ({markup}%)</span>
                <span className="text-green-400 font-bold font-mono">+{formatCurrency(results.profit)}</span>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-tighter mb-1">Precio sugerido al cliente</p>
                  <p className="text-4xl font-black text-white tracking-tighter">
                    {formatCurrency(results.finalPrice)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 text-[10px] uppercase">Costo Total</p>
                  <p className="text-gray-300 font-bold">{formatCurrency(results.totalCost)}</p>
                </div>
              </div>
            </div>
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full mt-8 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all"
          >
            <Download size={18} />
            Exportar Cotización (PDF)
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default ThreeDCalculator;
