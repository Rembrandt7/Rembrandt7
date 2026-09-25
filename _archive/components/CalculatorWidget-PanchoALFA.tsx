import React, { useState, useEffect, useRef } from 'react';
import { Calculator, X, Delete } from 'lucide-react';

interface HistoryItem {
  expression: string;
  result: string;
}

const CalculatorWidget: React.FC = () => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [isOpen, setIsOpen] = useState(window.innerWidth >= 1024);
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isNewNumber, setIsNewNumber] = useState(true);
  const [isSubtractMode, setIsSubtractMode] = useState(false);
  const [targetTotal, setTargetTotal] = useState<number | null>(null);
  
  const historyEndRef = useRef<HTMLDivElement>(null);

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
      // User typed an operator right after another operator, just replace the last operator
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

        let resultArr = [];
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

      // Replace symbols for evaluation
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
    // If it's a REP result, we might not want to put the whole string back, 
    // but let's just put it in display. It will likely cause an error if used in next calc, 
    // but user can clear it.
    setDisplay(item.result);
    setIsNewNumber(true);
  };

  const clearHistory = () => {
    setHistory([]);
  };

  // Keyboard support
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      // Only process if calculator is open
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
        e.preventDefault(); // Prevent quick find in Firefox
        handleOperator('÷');
      } else if (key === '%') {
        handlePercentage();
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        calculate();
      } else if (key === 'Backspace') {
        handleDelete();
      } else if (key === 'Delete') {
        handleClear();
      } else if (key === 'Escape') {
        handleClear();
      } else if (key.toLowerCase() === 'r') {
        handleOperator('Repetir');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [display, expression, isNewNumber, isOpen, isDesktop]);

  const calculatorContent = (
    <>
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-gray-800/30 shrink-0">
        <div className="flex items-center gap-2 text-gray-300">
          <Calculator size={18} />
          <span className="font-semibold">Calculadora</span>
        </div>
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <button onClick={clearHistory} className="text-xs text-red-400 hover:text-red-300 px-2 transition-colors">Borrar Historial</button>
          )}
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 text-gray-400 hover:text-white hover:bg-red-500/20 hover:text-red-400 rounded-md transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="relative flex-1 flex flex-col overflow-hidden bg-gray-900">
        
        {/* Inline History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar flex flex-col justify-start">
           {history.length === 0 ? (
             <div className="text-center text-gray-600 text-sm mt-auto mb-4">El historial aparecerá aquí</div>
           ) : (
             <div className="mt-auto flex flex-col justify-end space-y-2">
               {history.map((item, idx) => (
                 <div 
                   key={idx}
                   className="w-full text-right group cursor-pointer hover:bg-gray-800/50 p-2 rounded-lg transition-colors"
                   onClick={() => handleHistoryClick(item)}
                 >
                   <div className="text-sm text-gray-500 group-hover:text-gray-400 mb-1">{item.expression} =</div>
                   <div className="text-lg font-medium text-gray-300 group-hover:text-white break-words">{item.result}</div>
                 </div>
               ))}
               <div ref={historyEndRef} />
             </div>
           )}
        </div>

        <div className="p-4 pt-2 flex flex-col shrink-0 border-t border-gray-800/50">
          {/* Display */}
          <div 
            className="bg-gray-950 rounded-2xl p-4 mb-4 border border-gray-800 flex flex-col justify-end items-end overflow-hidden shrink-0 shadow-inner cursor-text hover:border-gray-600 transition-colors"
            title="Puedes usar el teclado para escribir"
          >
            <div className="text-gray-500 text-sm h-5 truncate w-full text-right mb-1">{expression}</div>
            <div className="text-3xl font-light text-white w-full text-right tracking-wider break-words max-h-24 overflow-y-auto custom-scrollbar">{display}</div>
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-4 gap-2 shrink-0">
            <button onClick={handleClear} className="p-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl font-medium transition-colors text-sm">AC</button>
            <button onClick={() => handleOperator('Repetir')} className="p-3 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded-xl font-medium transition-colors text-xs" title="Suma acumulada (Ej: 0.18 Repetir 4)">Repetir</button>
            <button onClick={handleDelete} className="p-3 bg-gray-800 text-gray-300 hover:bg-gray-700 rounded-xl flex justify-center items-center transition-colors"><Delete size={18} /></button>
            <button onClick={() => handleOperator('÷')} className="p-3 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 rounded-xl font-medium text-xl transition-colors">÷</button>

            <button onClick={() => handleNumber('7')} className="p-3 bg-gray-800 text-white hover:bg-gray-700 rounded-xl font-medium text-xl transition-colors">7</button>
            <button onClick={() => handleNumber('8')} className="p-3 bg-gray-800 text-white hover:bg-gray-700 rounded-xl font-medium text-xl transition-colors">8</button>
            <button onClick={() => handleNumber('9')} className="p-3 bg-gray-800 text-white hover:bg-gray-700 rounded-xl font-medium text-xl transition-colors">9</button>
            <button onClick={() => handleOperator('×')} className="p-3 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 rounded-xl font-medium text-xl transition-colors">×</button>

            <button onClick={() => handleNumber('4')} className="p-3 bg-gray-800 text-white hover:bg-gray-700 rounded-xl font-medium text-xl transition-colors">4</button>
            <button onClick={() => handleNumber('5')} className="p-3 bg-gray-800 text-white hover:bg-gray-700 rounded-xl font-medium text-xl transition-colors">5</button>
            <button onClick={() => handleNumber('6')} className="p-3 bg-gray-800 text-white hover:bg-gray-700 rounded-xl font-medium text-xl transition-colors">6</button>
            <button onClick={() => handleOperator('-')} className="p-3 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 rounded-xl font-medium text-xl transition-colors">-</button>

            <button onClick={() => handleNumber('1')} className="p-3 bg-gray-800 text-white hover:bg-gray-700 rounded-xl font-medium text-xl transition-colors">1</button>
            <button onClick={() => handleNumber('2')} className="p-3 bg-gray-800 text-white hover:bg-gray-700 rounded-xl font-medium text-xl transition-colors">2</button>
            <button onClick={() => handleNumber('3')} className="p-3 bg-gray-800 text-white hover:bg-gray-700 rounded-xl font-medium text-xl transition-colors">3</button>
            <button onClick={() => handleOperator('+')} className="p-3 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 rounded-xl font-medium text-xl transition-colors">+</button>

            <button 
              onClick={toggleSubtractMode} 
              className={`p-3 rounded-xl font-medium text-xs transition-colors ${isSubtractMode ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              title="Modo Restar (Compara contra un total)"
            >
              Restar
            </button>
            <button onClick={() => handleNumber('0')} className="p-3 bg-gray-800 text-white hover:bg-gray-700 rounded-xl font-medium text-xl transition-colors">0</button>
            <button onClick={handleDecimal} className="p-3 bg-gray-800 text-white hover:bg-gray-700 rounded-xl font-medium text-xl transition-colors">.</button>
            <button onClick={calculate} className="p-3 bg-teal-600 text-white hover:bg-teal-500 rounded-xl font-medium text-xl transition-colors shadow-lg shadow-teal-900/20">=</button>
          </div>
        </div>
      </div>
    </>
  );

  if (isDesktop && isOpen) {
    return (
      <div className="w-80 h-full bg-gray-900 border-l border-gray-800 flex-shrink-0 flex flex-col z-40 transition-all duration-300">
        {calculatorContent}
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 bottom-24 z-50 p-4 bg-gray-800 hover:bg-gray-700 text-white rounded-full shadow-xl border border-gray-700 transition-all duration-300 group"
        title="Calculadora"
      >
        <Calculator size={28} className="group-hover:text-teal-400 transition-colors" />
      </button>
    );
  }

  return (
    <div className="fixed right-4 bottom-24 z-50 w-80 bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in" style={{ height: '500px' }}>
      {calculatorContent}
    </div>
  );
};

export default CalculatorWidget;
