import React, { useState, useEffect, useRef } from 'react';
import { Calculator, X, Delete, Box, Copy, MessageSquare, RefreshCw, Zap, ShoppingBag, Sparkles, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../services/supabaseClient';

interface HistoryItem {
  expression: string;
  result: string;
}

const MATERIAL_POWER: Record<string, number> = {
  'Común': 155, // PLA / PETG: 155W por defecto (considerando el más alto)
  'Especial': 200, // TPU / ABS / Otros: 200W
};

const CalculatorWidget: React.FC = () => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [isOpen, setIsOpen] = useState(window.innerWidth >= 1024);
  const [mode, setMode] = useState<'standard' | '3d'>(() => {
    return (localStorage.getItem('rembrandt_calc_mode') as 'standard' | '3d') || '3d';
  });

  // Standard Calculator State
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isNewNumber, setIsNewNumber] = useState(true);
  const [isSubtractMode, setIsSubtractMode] = useState(false);
  const [targetTotal, setTargetTotal] = useState<number | null>(null);
  
  const historyEndRef = useRef<HTMLDivElement>(null);

  // 3D Calculator State (Minimal and Fast)
  const [material, setMaterial] = useState<'Común' | 'Especial'>('Común');
  const [filamentPrice, setFilamentPrice] = useState(400); // Precio estándar por defecto ($400)
  const [weightUsed, setWeightUsed] = useState(100); // Gramos
  const [printHours, setPrintHours] = useState(5);
  const [printMinutes, setPrintMinutes] = useState(0);
  const [laborCostManual, setLaborCostManual] = useState(0);
  const [markup, setMarkup] = useState(30);
  const [selectedPriceTier, setSelectedPriceTier] = useState<'amigo' | 'comercial' | 'sugerida'>('comercial');
  const [pieceName, setPieceName] = useState('');
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (desktop) {
        setIsOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-scroll history
  useEffect(() => {
    if (historyEndRef.current) {
      historyEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history]);

  const handleSwitchMode = (newMode: 'standard' | '3d') => {
    setMode(newMode);
    localStorage.setItem('rembrandt_calc_mode', newMode);
  };

  // --- Standard Calculator Logic ---
  const handleNumber = (num: string) => {
    if (isNewNumber) {
      setDisplay(num);
      setIsNewNumber(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  const handleOperator = (op: string) => {
    if (op === 'Repetir') {
      setExpression(display + ' ' + op + ' ');
      setIsNewNumber(true);
      return;
    }

    if (expression && !isNewNumber && !expression.includes('Repetir')) {
      try {
        const fullExpression = expression + display;
        const evalExpression = fullExpression.replace(/×/g, '*').replace(/÷/g, '/');
        // eslint-disable-next-line no-eval
        const result = eval(evalExpression);
        const formattedResult = Number.isInteger(result) ? result.toString() : parseFloat(result.toFixed(8)).toString();
        
        setHistory(prev => [...prev, { expression: fullExpression, result: formattedResult }]);
        setDisplay(formattedResult);
        setExpression(formattedResult + ' ' + op + ' ');
        setIsNewNumber(true);
      } catch (error) {
        setDisplay('Error');
        setExpression('');
        setIsNewNumber(true);
      }
    } else if (expression && isNewNumber && !expression.includes('Repetir')) {
      const trimmed = expression.trim();
      const lastSpaceIndex = trimmed.lastIndexOf(' ');
      if (lastSpaceIndex !== -1) {
         setExpression(trimmed.substring(0, lastSpaceIndex) + ' ' + op + ' ');
      } else {
         setExpression(display + ' ' + op + ' ');
      }
    } else {
      setExpression(display + ' ' + op + ' ');
      setIsNewNumber(true);
    }
  };

  const calculate = () => {
    try {
      if (expression.includes('Repetir')) {
        const baseStr = expression.split('Repetir')[0].trim();
        const base = parseFloat(baseStr);
        const times = parseInt(display);
        
        if (isNaN(base) || isNaN(times) || times <= 0) {
           setDisplay('Error');
           setExpression('');
           setIsNewNumber(true);
           return;
        }

        const resultArr: string[] = [];
        let currentSum = 0;
        for (let i = 1; i <= times; i++) {
            currentSum += base;
            resultArr.push(parseFloat(currentSum.toFixed(8)).toString());
        }
        
        const formattedResult = resultArr.join(', ');
        const fullExpression = `${baseStr} Repetir ${times}`;
        
        setDisplay(formattedResult);
        setExpression('');
        setIsNewNumber(true);
        setHistory(prev => [...prev, { expression: fullExpression, result: formattedResult }]);
        return;
      }

      if (isSubtractMode && targetTotal !== null) {
        const val = parseFloat(display);
        if (isNaN(val)) return;
        
        const newTotal = targetTotal - val;
        const formattedResult = Number.isInteger(newTotal) ? newTotal.toString() : parseFloat(newTotal.toFixed(8)).toString();
        
        setHistory(prev => [...prev, { expression: `${targetTotal} - ${val}`, result: formattedResult }]);
        setTargetTotal(newTotal);
        setDisplay(formattedResult);
        setExpression(`Restante: ${formattedResult}`);
        setIsNewNumber(true);
        return;
      }

      const fullExpression = expression + display;
      if (!fullExpression || fullExpression.trim() === '') return;

      const evalExpression = fullExpression.replace(/×/g, '*').replace(/÷/g, '/');
      // eslint-disable-next-line no-eval
      const result = eval(evalExpression);
      
      const formattedResult = Number.isInteger(result) ? result.toString() : parseFloat(result.toFixed(8)).toString();
      
      setDisplay(formattedResult);
      setExpression('');
      setIsNewNumber(true);
      
      setHistory(prev => [...prev, { expression: fullExpression, result: formattedResult }]);
    } catch (error) {
      setDisplay('Error');
      setExpression('');
      setIsNewNumber(true);
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setExpression('');
    setIsNewNumber(true);
    setIsSubtractMode(false);
    setTargetTotal(null);
  };

  const handleDelete = () => {
    if (isNewNumber) return;
    setDisplay(display.length > 1 ? display.slice(0, -1) : '0');
    if (display.length === 1) setIsNewNumber(true);
  };

  const handleDecimal = () => {
    if (isNewNumber) {
      setDisplay('0.');
      setIsNewNumber(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const toggleSubtractMode = () => {
    if (isSubtractMode) {
      setIsSubtractMode(false);
      setTargetTotal(null);
      setExpression('');
    } else {
      const val = parseFloat(display);
      if (isNaN(val) || val === 0) return;
      setIsSubtractMode(true);
      setTargetTotal(val);
      setExpression(`Total inicial: ${val}`);
      setIsNewNumber(true);
    }
  };

  const handlePercentage = () => {
    try {
      const val = parseFloat(display);
      if (!isNaN(val)) {
        setDisplay((val / 100).toString());
        setIsNewNumber(true);
      }
    } catch (e) {}
  };

  const handleHistoryClick = (item: HistoryItem) => {
    setDisplay(item.result);
    setIsNewNumber(true);
  };

  const clearHistory = () => {
    setHistory([]);
  };

  // Keyboard support for standard calculator
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (mode !== 'standard') return;
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'SELECT') {
        return;
      }

      if (!isOpen && !isDesktop) return;

      const key = e.key;
      if (/[0-9]/.test(key)) {
        handleNumber(key);
      } else if (key === '.') {
        handleDecimal();
      } else if (key === '+' || key === '-') {
        handleOperator(key);
      } else if (key === '*' || key.toLowerCase() === 'x') {
        handleOperator('×');
      } else if (key === '/') {
        e.preventDefault();
        handleOperator('÷');
      } else if (key === '%') {
        handlePercentage();
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        calculate();
      } else if (key === 'Backspace') {
        handleDelete();
      } else if (key === 'Delete' || key === 'Escape') {
        handleClear();
      } else if (key.toLowerCase() === 'r') {
        handleOperator('Repetir');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [display, expression, isNewNumber, isOpen, isDesktop, mode]);

  // --- 3D Calculator Calculations ---
  const totalHours = printHours + (printMinutes / 60);
  const filamentCost = (filamentPrice / 1000) * weightUsed;
  const power = MATERIAL_POWER[material] || 155;
  const energyCost = (power / 1000) * totalHours * 2.5; // 2.5 MXN/kWh
  const maintenanceCost = totalHours * 5; // 5 MXN/hr
  const baseCost = filamentCost + energyCost + maintenanceCost + laborCostManual;

  // 1. Precio Amigo (+15%)
  const friendPrice = baseCost * 1.15;

  // 2. Precio Comercial (según margen seleccionado, ej: 30%)
  const commercialPrice = baseCost * (1 + markup / 100);
  const profit = commercialPrice - baseCost;

  // 3. Tarifa Sugerida (Reglas de Mercado):
  // - Merma de filamento y purga (8% extra de material)
  const filamentoSugerido = (filamentPrice / 1000) * (weightUsed * 1.08);
  let costoSugeridoBase = filamentoSugerido + energyCost + maintenanceCost + laborCostManual;
  // - Tasa de riesgo en impresiones largas (>= 8 horas: +10% sobre costo)
  if (totalHours >= 8) {
    costoSugeridoBase *= 1.10;
  }
  // - Tarifa fija de setup / preparación de cama y archivo ($20 MXN)
  const setupFee = 20;
  // - Margen profesional del 45% + Setup fee
  const sugeridoCalculado = (costoSugeridoBase * 1.45) + setupFee;
  // - Piso mínimo de arranque ($45 MXN para evitar trabajos no rentables)
  const tarifaSugerida = Math.max(sugeridoCalculado, 45);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  const handleCopy = (value: number, type: string) => {
    navigator.clipboard.writeText(value.toFixed(2));
    toast.success(`Precio (${type}) copiado: ${formatCurrency(value)}`);
  };

  const copyQuoteForWhatsApp = (type: 'comercial' | 'amigo' | 'sugerida' = 'comercial') => {
    let price = commercialPrice;
    let label = 'Total';
    let header = '🖨️ *Cotización de Impresión 3D*';
    
    if (type === 'amigo') {
      price = friendPrice;
      label = 'Precio Amigo';
      header = '👋 *Cotización Especial Amigo (Impresión 3D)*';
    } else if (type === 'sugerida') {
      price = tarifaSugerida;
      label = 'Tarifa Sugerida';
      header = '⭐ *Cotización Profesional (Impresión 3D)*';
    }

    const timeFormatted = `${printHours > 0 ? `${printHours}h ` : ''}${printMinutes > 0 ? `${printMinutes}m` : (printHours === 0 ? '0m' : '')}`;
    const matLabel = material === 'Común' ? 'PLA / PETG Estándar' : 'Material Especial';
    
    const quoteText = `${header}\n\n` +
      `🧩 *Pieza:* ${pieceName.trim() || 'Modelo 3D'}\n` +
      `🧵 *Material:* ${matLabel}\n` +
      `⚖️ *Peso:* ${weightUsed}g\n` +
      `⏱️ *Tiempo:* ${timeFormatted || 'N/A'}\n` +
      `💵 *${label}:* ${formatCurrency(price)}\n\n` +
      `_¿Deseas proceder con la impresión?_ 👍`;
      
    navigator.clipboard.writeText(quoteText);
    toast.success(`¡Cotización (${type === 'amigo' ? 'Amigo' : type === 'sugerida' ? 'Sugerida' : 'Comercial'}) para WhatsApp copiada!`);
  };

  const getFinalOrderPrice = () => {
    if (selectedPriceTier === 'amigo') return friendPrice;
    if (selectedPriceTier === 'sugerida') return tarifaSugerida;
    return commercialPrice;
  };

  const handleAddOrder = async () => {
    const finalName = pieceName.trim();
    if (!finalName) {
      toast.error('Por favor escribe el nombre de la pieza antes de agregar el pedido');
      return;
    }

    const orderFinalPrice = getFinalOrderPrice();

    setIsSavingOrder(true);
    try {
      // 1. Guardar en impresiones3d.json (Registro de Ventas / Pedidos)
      let salesList: any[] = [];
      try {
        const { data: salesData } = await supabase.storage.from('savejson').download('impresiones3d.json');
        if (salesData) {
          const text = await salesData.text();
          const json = JSON.parse(text);
          if (Array.isArray(json)) salesList = json;
        }
      } catch (e) {
        salesList = [];
      }

      const newSaleEntry = {
        id: Date.now().toString(),
        name: finalName,
        cost: Number(baseCost.toFixed(2)),
        price: Number(orderFinalPrice.toFixed(2)),
        advance: 0,
        paid: false, // Pedido pendiente de pago / autorizado
        date: new Date().toISOString().split('T')[0]
      };

      const updatedSales = [newSaleEntry, ...salesList];
      await supabase.storage.from('savejson').upload('impresiones3d.json', JSON.stringify(updatedSales), {
        upsert: true,
        contentType: 'application/json'
      });

      // 2. Guardar también en impresion3d.json (Cola "Quiero Imprimir")
      try {
        const { data: queueData } = await supabase.storage.from('savejson').download('impresion3d.json');
        let currentQueue: any[] = [];
        let currentFilaments: any[] = [];
        if (queueData) {
          const qText = await queueData.text();
          const qJson = JSON.parse(qText);
          if (Array.isArray(qJson.printQueue)) currentQueue = qJson.printQueue;
          if (Array.isArray(qJson.myFilaments)) currentFilaments = qJson.myFilaments;
        }

        const newQueueItem = {
          id: Date.now().toString(),
          name: finalName,
          material: material === 'Común' ? 'PETG/PLA' : 'Especial',
          time: `${printHours}h ${printMinutes.toString().padStart(2, '0')}m`,
          cost: Number(baseCost.toFixed(2))
        };

        const updatedQueue = [...currentQueue, newQueueItem];
        await supabase.storage.from('savejson').upload('impresion3d.json', JSON.stringify({
          printQueue: updatedQueue,
          myFilaments: currentFilaments
        }), {
          upsert: true,
          contentType: 'application/json'
        });
      } catch (err) {
        console.warn('Queue sync error', err);
      }

      toast.success(`¡Pedido "${finalName}" registrado con éxito por ${formatCurrency(orderFinalPrice)}!`);
      setPieceName('');
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar el pedido en la nube');
    } finally {
      setIsSavingOrder(false);
    }
  };

  const reset3DCalculator = () => {
    setMaterial('Común');
    setFilamentPrice(400);
    setWeightUsed(100);
    setPrintHours(5);
    setPrintMinutes(0);
    setLaborCostManual(0);
    setMarkup(30);
    setSelectedPriceTier('comercial');
    setPieceName('');
    toast.info('Calculadora 3D restablecida');
  };

  const calculatorContent = (
    <>
      {/* Header */}
      <div className="flex justify-between items-center p-3.5 border-b border-gray-800 bg-gray-800/40 shrink-0">
        <div className="flex items-center gap-2 text-gray-200">
          {mode === 'standard' ? (
            <Calculator size={18} className="text-teal-400" />
          ) : (
            <Box size={18} className="text-blue-400" />
          )}
          <span className="font-bold text-sm tracking-wide">
            {mode === 'standard' ? 'Calculadora' : 'Cotizador 3D Rápido'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {mode === 'standard' && history.length > 0 && (
            <button 
              onClick={clearHistory} 
              className="text-[11px] text-red-400 hover:text-red-300 px-2 py-0.5 rounded transition-colors"
            >
              Borrar
            </button>
          )}
          {mode === '3d' && (
            <button
              onClick={reset3DCalculator}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              title="Restablecer valores"
            >
              <RefreshCw size={14} />
            </button>
          )}
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="px-3 pt-2.5 pb-1 bg-gray-900 shrink-0">
        <div className="grid grid-cols-2 p-1 bg-gray-950/80 rounded-xl border border-gray-800/80 text-xs font-bold gap-1">
          <button
            onClick={() => handleSwitchMode('standard')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg transition-all ${
              mode === 'standard'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <Calculator size={14} />
            <span>Normal</span>
          </button>
          <button
            onClick={() => handleSwitchMode('3d')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg transition-all ${
              mode === '3d'
                ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <Box size={14} />
            <span>Impresión 3D</span>
          </button>
        </div>
      </div>

      {/* Body: Mode Dependent */}
      {mode === 'standard' ? (
        <div className="relative flex-1 flex flex-col overflow-hidden bg-gray-900">
          {/* Inline History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar flex flex-col justify-start">
             {history.length === 0 ? (
               <div className="text-center text-gray-600 text-xs mt-auto mb-4">El historial aparecerá aquí</div>
             ) : (
               <div className="mt-auto flex flex-col justify-end space-y-2">
                 {history.map((item, idx) => (
                   <div 
                     key={idx}
                     className="w-full text-right group cursor-pointer hover:bg-gray-800/50 p-2 rounded-lg transition-colors"
                     onClick={() => handleHistoryClick(item)}
                   >
                     <div className="text-xs text-gray-500 group-hover:text-gray-400 mb-0.5">{item.expression} =</div>
                     <div className="text-base font-medium text-gray-300 group-hover:text-white break-words">{item.result}</div>
                   </div>
                 ))}
                 <div ref={historyEndRef} />
               </div>
             )}
          </div>

          <div className="p-3.5 pt-2 flex flex-col shrink-0 border-t border-gray-800/50">
            {/* Display */}
            <div 
              className="bg-gray-950 rounded-2xl p-3 mb-3 border border-gray-800 flex flex-col justify-end items-end overflow-hidden shrink-0 shadow-inner cursor-text hover:border-gray-600 transition-colors"
              title="Puedes usar el teclado para escribir"
            >
              <div className="text-gray-500 text-xs h-4 truncate w-full text-right mb-1">{expression}</div>
              <div className="text-2xl font-light text-white w-full text-right tracking-wider break-words max-h-20 overflow-y-auto custom-scrollbar">{display}</div>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-4 gap-2 shrink-0">
              <button onClick={handleClear} className="p-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl font-semibold transition-colors text-xs">AC</button>
              <button onClick={() => handleOperator('Repetir')} className="p-2.5 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded-xl font-semibold transition-colors text-[11px]" title="Suma acumulada (Ej: 0.18 Repetir 4)">Repetir</button>
              <button onClick={handleDelete} className="p-2.5 bg-gray-800 text-gray-300 hover:bg-gray-700 rounded-xl flex justify-center items-center transition-colors"><Delete size={17} /></button>
              <button onClick={() => handleOperator('÷')} className="p-2.5 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 rounded-xl font-semibold text-lg transition-colors">÷</button>

              <button onClick={() => handleNumber('7')} className="p-2.5 bg-gray-800 text-white hover:bg-gray-700 rounded-xl font-semibold text-lg transition-colors">7</button>
              <button onClick={() => handleNumber('8')} className="p-2.5 bg-gray-800 text-white hover:bg-gray-700 rounded-xl font-semibold text-lg transition-colors">8</button>
              <button onClick={() => handleNumber('9')} className="p-2.5 bg-gray-800 text-white hover:bg-gray-700 rounded-xl font-semibold text-lg transition-colors">9</button>
              <button onClick={() => handleOperator('×')} className="p-2.5 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 rounded-xl font-semibold text-lg transition-colors">×</button>

              <button onClick={() => handleNumber('4')} className="p-2.5 bg-gray-800 text-white hover:bg-gray-700 rounded-xl font-semibold text-lg transition-colors">4</button>
              <button onClick={() => handleNumber('5')} className="p-2.5 bg-gray-800 text-white hover:bg-gray-700 rounded-xl font-semibold text-lg transition-colors">5</button>
              <button onClick={() => handleNumber('6')} className="p-2.5 bg-gray-800 text-white hover:bg-gray-700 rounded-xl font-semibold text-lg transition-colors">6</button>
              <button onClick={() => handleOperator('-')} className="p-2.5 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 rounded-xl font-semibold text-lg transition-colors">-</button>

              <button onClick={() => handleNumber('1')} className="p-2.5 bg-gray-800 text-white hover:bg-gray-700 rounded-xl font-semibold text-lg transition-colors">1</button>
              <button onClick={() => handleNumber('2')} className="p-2.5 bg-gray-800 text-white hover:bg-gray-700 rounded-xl font-semibold text-lg transition-colors">2</button>
              <button onClick={() => handleNumber('3')} className="p-2.5 bg-gray-800 text-white hover:bg-gray-700 rounded-xl font-semibold text-lg transition-colors">3</button>
              <button onClick={() => handleOperator('+')} className="p-2.5 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 rounded-xl font-semibold text-lg transition-colors">+</button>

              <button 
                onClick={toggleSubtractMode} 
                className={`p-2.5 rounded-xl font-semibold text-[11px] transition-colors ${isSubtractMode ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                title="Modo Restar (Compara contra un total)"
              >
                Restar
              </button>
              <button onClick={() => handleNumber('0')} className="p-2.5 bg-gray-800 text-white hover:bg-gray-700 rounded-xl font-semibold text-lg transition-colors">0</button>
              <button onClick={handleDecimal} className="p-2.5 bg-gray-800 text-white hover:bg-gray-700 rounded-xl font-semibold text-lg transition-colors">.</button>
              <button onClick={calculate} className="p-2.5 bg-teal-600 text-white hover:bg-teal-500 rounded-xl font-semibold text-lg transition-colors shadow-lg shadow-teal-900/20">=</button>
            </div>
          </div>
        </div>
      ) : (
        /* --- 3D Calculator View: Sencilla y Rápida con 3 Tarifas --- */
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar bg-gray-900 text-gray-200">
          
          {/* 1. Presets Rápidos */}
          <div className="space-y-1">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider">Presets rápidos:</span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: '🔑 Llavero', weight: 15, h: 0, m: 45 },
                { label: '🗿 Fig. Chica', weight: 55, h: 2, m: 30 },
                { label: '🎭 Estándar', weight: 120, h: 5, m: 0 },
                { label: '🪖 Grande', weight: 450, h: 18, m: 0 },
              ].map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setWeightUsed(p.weight);
                    setPrintHours(p.h);
                    setPrintMinutes(p.m);
                    toast.info(`${p.label}: ${p.weight}g, ${p.h}h ${p.m}m`);
                  }}
                  className="px-2.5 py-1.5 bg-white/5 hover:bg-blue-600/20 text-gray-300 hover:text-blue-300 border border-white/5 hover:border-blue-500/30 rounded-lg text-[10px] font-bold text-left transition-all active:scale-95"
                >
                  {p.label} <span className="text-gray-500 text-[9px]">({p.weight}g, {p.h}h{p.m > 0 ? `${p.m}m` : ''})</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Material (Común PLA/PETG a 155W por defecto, o Especial a 200W) */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Material</label>
              <span className="text-[9px] text-gray-500">Color indiferente</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-slate-950/70 border border-gray-800 rounded-xl h-[34px] items-center text-xs font-bold">
              <button
                type="button"
                onClick={() => setMaterial('Común')}
                className={`h-[26px] rounded-lg transition-all text-[11px] font-black flex items-center justify-center gap-1.5 ${
                  material === 'Común'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>Común (PLA / PETG)</span>
                <span className="text-[9px] opacity-80 font-normal">155W</span>
              </button>
              <button
                type="button"
                onClick={() => setMaterial('Especial')}
                className={`h-[26px] rounded-lg transition-all text-[11px] font-black flex items-center justify-center gap-1.5 ${
                  material === 'Especial'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>Especial (TPU / ABS)</span>
                <span className="text-[9px] opacity-80 font-normal">200W</span>
              </button>
            </div>
          </div>

          {/* 3. Precio/kg y Peso en gramos */}
          <div className="grid grid-cols-2 gap-2">
            {/* Precio / kg ($400 default) */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Precio / kg</label>
                {filamentPrice !== 400 && (
                  <button 
                    type="button" 
                    onClick={() => setFilamentPrice(400)} 
                    className="text-[8px] text-blue-400 hover:underline"
                    title="Restablecer a $400 estándar"
                  >
                    $400
                  </button>
                )}
              </div>
              <div className="flex items-center bg-slate-950/70 border border-gray-800 rounded-xl overflow-hidden h-[34px]">
                <button type="button" onClick={() => setFilamentPrice(p => Math.max(0, p - 50))} className="px-2 text-gray-400 hover:text-white font-black hover:bg-white/5 text-xs">-</button>
                <div className="flex items-center justify-center flex-1">
                  <span className="text-gray-500 text-xs font-bold mr-0.5">$</span>
                  <input 
                    type="number" 
                    value={filamentPrice || ''} 
                    onChange={e => setFilamentPrice(Number(e.target.value))} 
                    className="w-14 bg-transparent text-white text-center font-bold text-xs focus:outline-none" 
                  />
                </div>
                <button type="button" onClick={() => setFilamentPrice(p => p + 50)} className="px-2 text-gray-400 hover:text-white font-black hover:bg-white/5 text-xs">+</button>
              </div>
            </div>

            {/* Gramos utilizados */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Gramos (g)</label>
                <div className="flex gap-0.5">
                  {[50, 100, 200].map(g => (
                    <button 
                      key={g} 
                      type="button"
                      onClick={() => setWeightUsed(g)} 
                      className="text-[9px] px-1 py-0.2 bg-white/5 hover:bg-blue-600/30 text-gray-400 hover:text-blue-300 rounded font-semibold"
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center bg-slate-950/70 border border-gray-800 rounded-xl overflow-hidden h-[34px]">
                <button type="button" onClick={() => setWeightUsed(p => Math.max(0, p - 10))} className="px-2 text-gray-400 hover:text-white font-black hover:bg-white/5 text-xs">-</button>
                <input 
                  type="number" 
                  value={weightUsed || ''} 
                  onChange={e => setWeightUsed(Number(e.target.value))} 
                  className="w-full bg-transparent text-white text-center font-bold text-xs focus:outline-none" 
                />
                <button type="button" onClick={() => setWeightUsed(p => p + 10)} className="px-2 text-gray-400 hover:text-white font-black hover:bg-white/5 text-xs">+</button>
              </div>
            </div>
          </div>

          {/* 4. Tiempo: Horas y Minutos */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Tiempo de Impresión</label>
            <div className="flex items-center bg-slate-950/70 border border-gray-800 rounded-xl px-3 h-[34px]">
              <input 
                type="number" 
                value={printHours || ''} 
                onChange={e => setPrintHours(Number(e.target.value))} 
                placeholder="0"
                className="w-full bg-transparent text-white font-bold text-right focus:outline-none pr-1 text-xs" 
              />
              <span className="text-gray-400 text-xs font-bold mr-2">h</span>
              <span className="text-gray-600 font-black px-1">:</span>
              <input 
                type="number" 
                value={printMinutes.toString().padStart(2, '0')} 
                onChange={e => setPrintMinutes(Math.min(59, Number(e.target.value)))} 
                placeholder="00"
                className="w-full bg-transparent text-white font-bold text-left focus:outline-none pl-1 text-xs" 
              />
              <span className="text-gray-400 text-xs font-bold ml-1">m</span>
            </div>
          </div>

          {/* 5. Labor extra y Margen Comercial */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Labor / Extra ($)</label>
              <div className="flex items-center bg-slate-950/70 border border-gray-800 rounded-xl overflow-hidden h-[34px]">
                <button type="button" onClick={() => setLaborCostManual(p => Math.max(0, p - 10))} className="px-2 text-gray-400 hover:text-white font-black hover:bg-white/5 text-xs">-</button>
                <input 
                  type="number" 
                  value={laborCostManual || ''} 
                  onChange={e => setLaborCostManual(Number(e.target.value))} 
                  className="w-full bg-transparent text-white text-center font-bold text-xs focus:outline-none" 
                />
                <button type="button" onClick={() => setLaborCostManual(p => p + 10)} className="px-2 text-gray-400 hover:text-white font-black hover:bg-white/5 text-xs">+</button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Margen Com. (%)</label>
              <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-950/70 border border-gray-800 rounded-xl h-[34px] items-center">
                {[15, 20, 30, 50].map(m => (
                  <button 
                    key={m} 
                    type="button"
                    onClick={() => setMarkup(m)} 
                    className={`h-[26px] text-[10px] font-black rounded-lg transition-all ${markup === m ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                  >
                    {m}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 6. Desglose Rápido de Costos Base */}
          <div className="p-2.5 bg-slate-950/80 border border-gray-800 rounded-xl space-y-1.5">
            <div className="flex justify-between items-center text-[11px] pb-1 border-b border-gray-800/80">
              <span className="text-gray-400 font-semibold flex items-center gap-1"><Zap size={11} className="text-yellow-400" /> Energía ({power}W):</span>
              <span className="text-gray-200 font-bold">{formatCurrency(energyCost)}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] pb-1 border-b border-gray-800/80">
              <span className="text-gray-400 font-semibold">🧵 Filamento ({weightUsed}g):</span>
              <span className="text-gray-200 font-bold">{formatCurrency(filamentCost)}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] pb-1 border-b border-gray-800/80">
              <span className="text-gray-400 font-semibold">🛠️ Desgaste / Mtto ($5/h):</span>
              <span className="text-gray-200 font-bold">{formatCurrency(maintenanceCost)}</span>
            </div>
            {laborCostManual > 0 && (
              <div className="flex justify-between items-center text-[11px] pb-1 border-b border-gray-800/80">
                <span className="text-gray-400 font-semibold">👤 Mano de Obra:</span>
                <span className="text-gray-200 font-bold">{formatCurrency(laborCostManual)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-xs pt-0.5">
              <span className="text-blue-400 font-black uppercase tracking-wider text-[10px]">Costo Producción Base:</span>
              <span className="text-blue-300 font-black text-sm">{formatCurrency(baseCost)}</span>
            </div>
          </div>

          {/* 7. Las 3 Tarifas: Precio Amigo, Precio Comercial y Tarifa Sugerida */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Tarifas (Toca para seleccionar pedido)</span>
            </div>

            {/* 1. Precio Amigo */}
            <div 
              onClick={() => setSelectedPriceTier('amigo')}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                selectedPriceTier === 'amigo'
                  ? 'bg-emerald-500/20 border-emerald-500 ring-1 ring-emerald-500/50 shadow-md'
                  : 'bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${selectedPriceTier === 'amigo' ? 'border-emerald-400 bg-emerald-400 text-slate-950' : 'border-gray-600'}`}>
                  {selectedPriceTier === 'amigo' && <Check size={10} strokeWidth={3} />}
                </div>
                <div>
                  <p className="text-[9px] font-black text-emerald-400 uppercase tracking-wider">Precio Amigo (+15%)</p>
                  <p className="text-base font-black text-white">{formatCurrency(friendPrice)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <button 
                  type="button"
                  onClick={() => copyQuoteForWhatsApp('amigo')} 
                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black flex items-center gap-1 shadow-sm transition-all"
                  title="Compartir cotización amigo por WhatsApp"
                >
                  <MessageSquare size={12} />
                  <span>WhatsApp</span>
                </button>
                <button 
                  type="button"
                  onClick={() => handleCopy(friendPrice, 'amigo')} 
                  className="p-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg transition-all"
                  title="Copiar precio amigo"
                >
                  <Copy size={13} />
                </button>
              </div>
            </div>

            {/* 2. Precio Comercial */}
            <div 
              onClick={() => setSelectedPriceTier('comercial')}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                selectedPriceTier === 'comercial'
                  ? 'bg-blue-600/25 border-blue-500 ring-1 ring-blue-500/50 shadow-md'
                  : 'bg-blue-600/10 border-blue-500/20 hover:border-blue-500/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${selectedPriceTier === 'comercial' ? 'border-blue-400 bg-blue-400 text-slate-950' : 'border-gray-600'}`}>
                  {selectedPriceTier === 'comercial' && <Check size={10} strokeWidth={3} />}
                </div>
                <div>
                  <p className="text-[9px] font-black text-blue-300 uppercase tracking-wider">Precio Comercial (+{markup}%)</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-base font-black text-white">{formatCurrency(commercialPrice)}</p>
                    <span className="text-[9px] text-green-400 font-bold">+{formatCurrency(profit)}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1 items-center" onClick={e => e.stopPropagation()}>
                <button 
                  type="button"
                  onClick={() => copyQuoteForWhatsApp('comercial')} 
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-black flex items-center gap-1 shadow-sm transition-all"
                  title="Compartir cotización comercial por WhatsApp"
                >
                  <MessageSquare size={12} />
                  <span>WhatsApp</span>
                </button>
                <button 
                  type="button"
                  onClick={() => handleCopy(commercialPrice, 'comercial')} 
                  className="p-1 bg-blue-600/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-all"
                  title="Copiar precio comercial"
                >
                  <Copy size={13} />
                </button>
              </div>
            </div>

            {/* 3. Tarifa Sugerida (Con Merma, Setup Fee, Riesgo y Piso Mínimo) */}
            <div 
              onClick={() => setSelectedPriceTier('sugerida')}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                selectedPriceTier === 'sugerida'
                  ? 'bg-gradient-to-r from-amber-500/25 via-purple-600/25 to-blue-600/25 border-amber-400 ring-1 ring-amber-400/50 shadow-md'
                  : 'bg-gradient-to-r from-amber-500/10 via-purple-600/15 to-blue-600/10 border-amber-500/30 hover:border-amber-400/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${selectedPriceTier === 'sugerida' ? 'border-amber-400 bg-amber-400 text-slate-950' : 'border-gray-600'}`}>
                  {selectedPriceTier === 'sugerida' && <Check size={10} strokeWidth={3} />}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <Sparkles size={11} className="text-amber-400" />
                    <p className="text-[9px] font-black text-amber-300 uppercase tracking-wider">Tarifa Sugerida</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-base font-black text-white">{formatCurrency(tarifaSugerida)}</p>
                    <span className="text-[8px] text-amber-400/90 font-semibold">(Merma + Setup + Riesgo)</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1 items-center" onClick={e => e.stopPropagation()}>
                <button 
                  type="button"
                  onClick={() => copyQuoteForWhatsApp('sugerida')} 
                  className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-black flex items-center gap-1 shadow-sm transition-all"
                  title="Compartir tarifa sugerida por WhatsApp"
                >
                  <MessageSquare size={12} />
                  <span>WhatsApp</span>
                </button>
                <button 
                  type="button"
                  onClick={() => handleCopy(tarifaSugerida, 'sugerida')} 
                  className="p-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg transition-all"
                  title="Copiar tarifa sugerida"
                >
                  <Copy size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* 8. Nombre de la Pieza y Botón Agregar Pedido (HASTA ABAJO) */}
          <div className="pt-2 border-t border-gray-800 space-y-2">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Nombre de la Pieza / Modelo</label>
              <input 
                type="text" 
                value={pieceName} 
                onChange={e => setPieceName(e.target.value)} 
                placeholder="Ej: Casco Mandalorian, Llavero Javer..."
                className="w-full bg-slate-950/70 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>

            <button
              type="button"
              onClick={handleAddOrder}
              disabled={isSavingOrder}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/30 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isSavingOrder ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Guardando en la lista...</span>
                </>
              ) : (
                <>
                  <ShoppingBag size={14} />
                  <span>
                    Agregar Pedido ({formatCurrency(getFinalOrderPrice())})
                  </span>
                </>
              )}
            </button>
          </div>

        </div>
      )}
    </>
  );

  if (isDesktop && isOpen) {
    return (
      <div className="w-80 h-full bg-gray-900 border-l border-gray-800 flex-shrink-0 flex flex-col z-[60] transition-all duration-300">
        {calculatorContent}
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 bottom-24 z-[60] p-4 bg-gray-800 hover:bg-gray-700 text-white rounded-full shadow-xl border border-gray-700 transition-all duration-300 group"
        title="Calculadora & Cotizador 3D"
      >
        {mode === 'standard' ? (
          <Calculator size={28} className="group-hover:text-teal-400 transition-colors" />
        ) : (
          <Box size={28} className="group-hover:text-blue-400 transition-colors" />
        )}
      </button>
    );
  }

  return (
    <div 
      className="fixed right-3 sm:right-4 bottom-24 z-[60] w-[calc(100vw-24px)] max-w-sm sm:w-80 bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in" 
      style={{ height: '620px', maxHeight: '88vh' }}
    >
      {calculatorContent}
    </div>
  );
};

export default CalculatorWidget;
