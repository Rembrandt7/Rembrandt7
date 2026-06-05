import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calculator, DollarSign, Zap, Clock, TrendingUp, RefreshCw, UserCheck, ShoppingBag, Copy, CheckCircle2, Plus, Trash2, Save, Download, ListChecks, Database, Palette, PlusCircle, Edit3, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { supabase } from '../services/supabaseClient';

interface PrintItem {
  id: string;
  name: string;
  material?: string;
  filamentId?: string; // Links to a specific stock filament
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

interface SalesEntry {
  id: string;
  name: string;
  cost: number;
  price: number;
  advance?: number;
  paid?: boolean;
  date: string; // YYYY-MM-DD
}

const SPECIAL_COLORS = [
  { name: 'Dorado Metálico', value: 'linear-gradient(135deg, #ffd700 0%, #b8860b 50%, #ffd700 100%)' },
  { name: 'Plata Metálica', value: 'linear-gradient(135deg, #e0e0e0 0%, #888888 50%, #e0e0e0 100%)' },
  { name: 'Cobre Metálico', value: 'linear-gradient(135deg, #d2691e 0%, #8b4513 50%, #d2691e 100%)' },
  { name: 'Bronce Metálico', value: 'linear-gradient(135deg, #cd7f32 0%, #804a00 50%, #cd7f32 100%)' },
  { name: 'Duplex Rojo-Azul', value: 'linear-gradient(90deg, #ef4444 50%, #3b82f6 50%)' },
  { name: 'Duplex Verde-Negro', value: 'linear-gradient(90deg, #22c55e 50%, #0f172a 50%)' },
  { name: 'Duplex Oro-Cobre', value: 'linear-gradient(90deg, #ffd700 50%, #d2691e 50%)' },
  { name: 'Duplex Púrpura-Amarillo', value: 'linear-gradient(90deg, #a855f7 50%, #eab308 50%)' },
  { name: 'Duplex Magenta-Cian', value: 'linear-gradient(90deg, #ec4899 50%, #06b6d4 50%)' },
];

const getNearestColorName = (hex: string): string => {
  if (!hex) return 'Color';
  if (hex.startsWith('linear-gradient')) {
    const matched = SPECIAL_COLORS.find(sc => sc.value === hex);
    if (matched) return matched.name;
    return 'Color Especial';
  }

  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return 'Color';
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  // Convert RGB to HSL
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
      case gNorm: h = (bNorm - rNorm) / d + 2; break;
      case bNorm: h = (rNorm - gNorm) / d + 4; break;
    }
    h /= 6;
  }

  const hue = h * 360;
  const sat = s * 100;
  const light = l * 100;

  if (light < 15) return 'Negro';
  if (light > 85) return 'Blanco';
  if (sat < 15) return 'Gris';

  if (hue >= 330 || hue < 15) {
    if (light > 60) return 'Rosa';
    return 'Rojo';
  }
  if (hue >= 15 && hue < 45) return 'Naranja';
  if (hue >= 45 && hue < 70) return 'Amarillo';
  if (hue >= 70 && hue < 165) return 'Verde';
  if (hue >= 165 && hue < 255) return 'Azul';
  if (hue >= 255 && hue < 330) return 'Morado';

  return 'Color';
};

const MATERIAL_POWER = {
  PLA: 125,
  TPU: 125,
  PETG: 155,
};

const ThreeDCalculator: React.FC = () => {
  const [pieceName, setPieceName] = useState('');
  const [material, setMaterial] = useState<keyof typeof MATERIAL_POWER>('PLA');
  const [selectedFilamentId, setSelectedFilamentId] = useState<string>(''); // For stock selection
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
  const [editingFilamentId, setEditingFilamentId] = useState<string | null>(null);

  const [newQueueItemName, setNewQueueItemName] = useState('');
  const [newFilament, setNewFilament] = useState<Partial<FilamentInventory>>({ material: 'PLA', color: '#ffffff', customName: '' });
  const [filamentFilter, setFilamentFilter] = useState<'all' | 'PLA' | 'PETG' | 'TPU'>('all');
  const [lastProposedColorName, setLastProposedColorName] = useState('');

  // Sales Log State
  const [salesList, setSalesList] = useState<SalesEntry[]>([]);
  const [saleName, setSaleName] = useState('');
  const [saleCost, setSaleCost] = useState(0);
  const [salePrice, setSalePrice] = useState(0);
  const [saleAdvance, setSaleAdvance] = useState(0);
  const [salePaid, setSalePaid] = useState(true);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [salesFilter, setSalesFilter] = useState<'all' | 'year' | 'month' | 'week' | 'day'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [specificFilterDate, setSpecificFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSavingSales, setIsSavingSales] = useState(false);
  const [isLoadingSales, setIsLoadingSales] = useState(false);

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
    const totalProductionCost = fCost + eCost + mCost + laborCostManual;
    
    const friendPrice = totalProductionCost * 1.15; 
    const commercialPrice = totalProductionCost * (1 + markup / 100);
    const profit = commercialPrice - totalProductionCost;

    setResults({
      filamentCost: fCost,
      energyCost: eCost,
      laborCost: laborCostManual,
      maintenanceCost: mCost,
      baseCost: fCost + eCost,
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

  const proposedName = useMemo(() => {
    const hours = printHours;
    const mins = printMinutes;
    let timeStr = "";
    if (hours > 0) {
      timeStr = `${hours}h`;
    } else {
      timeStr = `${mins}m`;
    }
    
    const matShort = material;
    const cleanName = pieceName.trim() || 'Pieza';
    return `${timeStr} ${matShort} ${cleanName}`;
  }, [printHours, printMinutes, material, pieceName]);

  const copyProposedName = () => {
    navigator.clipboard.writeText(proposedName);
    toast.success('Nombre copiado: ' + proposedName);
  };

  const handleCopy = (value: number, type: string) => {
    navigator.clipboard.writeText(value.toFixed(2));
    setCopiedType(type);
    toast.success(`Precio (${type}) copiado: ` + formatCurrency(value));
    setTimeout(() => setCopiedType(null), 2000);
  };

  const applyProposedName = () => {
    setPieceName(proposedName);
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

  // Sales log load/save methods
  const saveSalesData = async (list: SalesEntry[]) => {
    setIsSavingSales(true);
    try {
      const fileName = 'impresiones3d.json';
      const { error } = await supabase.storage
        .from('savejson')
        .upload(fileName, JSON.stringify(list), { upsert: true, contentType: 'application/json' });
      if (error) throw error;
      toast.success('Ventas guardadas en Supabase');
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar ventas');
    } finally {
      setIsSavingSales(false);
    }
  };

  const loadSalesData = async () => {
    setIsLoadingSales(true);
    try {
      const fileName = 'impresiones3d.json';
      const { data, error } = await supabase.storage.from('savejson').download(fileName);
      if (error) {
        if (!error.message?.includes('Object not found')) throw error;
      } else if (data) {
        const text = await data.text();
        const json = JSON.parse(text);
        if (Array.isArray(json)) {
          const compatibleList = json.map(item => ({
            ...item,
            advance: item.advance !== undefined ? item.advance : item.price,
            paid: item.paid !== undefined ? item.paid : true
          }));
          setSalesList(compatibleList);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar ventas');
    } finally {
      setIsLoadingSales(false);
    }
  };

  const parseLocalDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return new Date();
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  };

  const addSaleEntry = () => {
    if (!saleName.trim()) {
      toast.error('Ingresa el nombre de la impresión');
      return;
    }
    
    const finalAdvance = salePaid ? salePrice : saleAdvance;

    if (editingSaleId) {
      const updated = salesList.map(item => {
        if (item.id === editingSaleId) {
          return {
            ...item,
            name: saleName.trim(),
            cost: saleCost,
            price: salePrice,
            advance: finalAdvance,
            paid: salePaid,
            date: saleDate
          };
        }
        return item;
      });
      setSalesList(updated);
      saveSalesData(updated);
      setEditingSaleId(null);
      toast.success('Registro de venta actualizado');
    } else {
      const newEntry: SalesEntry = {
        id: Date.now().toString(),
        name: saleName.trim(),
        cost: saleCost,
        price: salePrice,
        advance: finalAdvance,
        paid: salePaid,
        date: saleDate
      };
      const updated = [newEntry, ...salesList];
      setSalesList(updated);
      saveSalesData(updated);
      toast.success('Venta registrada');
    }

    setSaleName('');
    setSaleCost(0);
    setSalePrice(0);
    setSaleAdvance(0);
    setSalePaid(true);
  };

  const editSaleEntry = (item: SalesEntry) => {
    setEditingSaleId(item.id);
    setSaleName(item.name);
    setSaleCost(item.cost);
    setSalePrice(item.price);
    setSaleAdvance(item.advance !== undefined ? item.advance : item.price);
    setSalePaid(item.paid !== undefined ? item.paid : true);
    setSaleDate(item.date);
    const formElement = document.getElementById('sales-form-heading');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const markSaleAsPaid = (id: string) => {
    const updated = salesList.map(item => {
      if (item.id === id) {
        return {
          ...item,
          paid: true,
          advance: item.price
        };
      }
      return item;
    });
    setSalesList(updated);
    saveSalesData(updated);
    toast.success('Venta cobrada por completo');
  };

  const deleteSaleEntry = (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este registro de venta?')) return;
    const updated = salesList.filter(item => item.id !== id);
    setSalesList(updated);
    saveSalesData(updated);
  };

  const filteredSales = useMemo(() => {
    const today = new Date();
    return salesList.filter(item => {
      if (!item.date) return false;
      const itemDate = parseLocalDate(item.date);
      
      let matchesPeriod = false;
      switch (salesFilter) {
        case 'year':
          matchesPeriod = itemDate.getFullYear() === today.getFullYear();
          break;
        case 'month':
          matchesPeriod = (
            itemDate.getFullYear() === today.getFullYear() &&
            itemDate.getMonth() === today.getMonth()
          );
          break;
        case 'week': {
          const startOfWeek = new Date(today);
          const day = today.getDay();
          const diff = today.getDate() - day + (day === 0 ? -6 : 1);
          startOfWeek.setDate(diff);
          startOfWeek.setHours(0, 0, 0, 0);

          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);

          matchesPeriod = itemDate >= startOfWeek && itemDate <= endOfWeek;
          break;
        }
        case 'day':
          matchesPeriod = item.date === specificFilterDate;
          break;
        case 'all':
        default:
          matchesPeriod = true;
          break;
      }

      if (!matchesPeriod) return false;

      const itemPaid = item.paid !== undefined ? item.paid : true;
      if (paymentFilter === 'pending') {
        return !itemPaid;
      } else if (paymentFilter === 'paid') {
        return itemPaid;
      }
      return true;
    });
  }, [salesList, salesFilter, specificFilterDate, paymentFilter]);

  useEffect(() => { 
    loadData(); 
    loadSalesData();
  }, []);

  const addToQueueFromCalc = () => {
    const itemData = {
      name: pieceName.trim() || `Pieza ${material}`,
      material: material,
      filamentId: selectedFilamentId || undefined,
      time: `${printHours}h ${printMinutes.toString().padStart(2, '0')}m`,
      cost: results.baseCost
    };

    if (editingQueueId) {
      const updated = printQueue.map(item => item.id === editingQueueId ? { ...item, ...itemData } : item);
      setPrintQueue(updated);
      syncData(updated, myFilaments);
      setEditingQueueId(null);
      toast.success('Item actualizado');
    } else {
      const updated = [...printQueue, { id: Date.now().toString(), ...itemData }];
      setPrintQueue(updated);
      syncData(updated, myFilaments);
      toast.success('Agregado al lote');
    }
    setPieceName('');
    setSelectedFilamentId('');
  };

  const addManualQueueItem = () => {
    if (!newQueueItemName) return;
    const updated = [...printQueue, { id: Date.now().toString(), name: newQueueItemName }];
    setPrintQueue(updated);
    setNewQueueItemName('');
    syncData(updated, myFilaments);
  };

  const loadToCalculator = (item: PrintItem) => {
    setPieceName(item.name);
    if (item.material) setMaterial(item.material as any);
    if (item.filamentId) setSelectedFilamentId(item.filamentId);
    if (item.time) {
      const parts = item.time.split('h ');
      setPrintHours(parseInt(parts[0]) || 0);
      setPrintMinutes(parseInt(parts[1]) || 0);
    }
    setEditingQueueId(item.id);
  };

  const handleColorChange = (newColor: string) => {
    const proposed = getNearestColorName(newColor);
    setNewFilament(prev => {
      const shouldOverwrite = !prev.customName || prev.customName === lastProposedColorName;
      return {
        ...prev,
        color: newColor,
        customName: shouldOverwrite ? proposed : prev.customName
      };
    });
    setLastProposedColorName(proposed);
  };

  const copyAvailableFilaments = () => {
    const activeFils = myFilaments.filter(f => filamentFilter === 'all' || f.material.toUpperCase() === filamentFilter.toUpperCase());
    const colorNames = activeFils.map(f => {
      return (f.customName || getNearestColorName(f.color)).trim();
    }).filter(Boolean);

    const uniqueColors: string[] = [];
    const seen = new Set<string>();
    for (const c of colorNames) {
      const lower = c.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        uniqueColors.push(c);
      }
    }

    if (uniqueColors.length === 0) {
      toast.error('No hay filamentos disponibles en esta selección');
      return;
    }

    const listText = uniqueColors.map(c => `• ${c}`).join('\n');
    const header = '¡Hola! Te comparto los colores que tengo disponibles:\n\n';
    const textToCopy = `${header}${listText}\n\n¡Cualquier duda quedo a tus órdenes!`;
    
    navigator.clipboard.writeText(textToCopy);
    toast.success('Lista de colores copiada');
  };

  const saveFilament = () => {
    if (!newFilament.color) return;
    let updated;
    if (editingFilamentId) {
      updated = myFilaments.map(f => f.id === editingFilamentId ? { ...f, ...newFilament } : f);
      setEditingFilamentId(null);
      toast.success('Filamento actualizado');
    } else {
      updated = [...myFilaments, { id: Date.now().toString(), ...newFilament as FilamentInventory }];
      toast.success('Filamento agregado');
    }
    setMyFilaments(updated);
    setNewFilament({ material: 'PLA', color: '#ffffff', customName: '' });
    setLastProposedColorName('');
    syncData(printQueue, updated);
  };

  const editFilament = (fil: FilamentInventory) => {
    setNewFilament(fil);
    setEditingFilamentId(fil.id);
    setLastProposedColorName(fil.customName || '');
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  return (
    <div className="w-full h-full p-2 flex flex-col">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-[650px] max-w-[1600px] mx-auto w-full">
        
        {/* COL 1: CALCULADORA */}
        <div className="lg:col-span-6 bg-slate-950/80 backdrop-blur-3xl border border-white/10 rounded-3xl flex flex-col overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <Calculator className={`text-blue-400 ${editingQueueId ? 'animate-pulse text-yellow-400' : ''}`} size={20} />
              <h3 className="text-sm font-black text-white uppercase tracking-widest italic leading-none">
                {editingQueueId ? 'Modificando Idea' : 'Calculadora Studio'}
              </h3>
            </div>
            <div className="flex items-center gap-3">
               <button onClick={addToQueueFromCalc} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${editingQueueId ? 'bg-yellow-600 hover:bg-yellow-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}>
                  {editingQueueId ? <Save size={14} /> : <Plus size={14} />} {editingQueueId ? 'Guardar' : 'Lote'}
               </button>
               <button onClick={() => { setPieceName(''); setFilamentPrice(400); setWeightUsed(100); setPrintHours(5); setPrintMinutes(0); setEditingQueueId(null); setSelectedFilamentId(''); }} className="text-gray-500 hover:text-white p-1"><RefreshCw size={14} /></button>
            </div>
          </div>

          <div className="p-6 flex-1 flex flex-col space-y-6 overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
               <div className="flex gap-4">
                  <div className="flex-[2] space-y-1.5">
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nombre Pieza</label>
                     <div className="relative group">
                        <input type="text" value={pieceName} onChange={e => setPieceName(e.target.value)} placeholder="Ej: Casco Iron Man..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 h-[44px] font-bold" />
                        
                        {(pieceName || printHours > 0 || printMinutes > 0) && (
                          <div className="absolute -bottom-10 left-0 right-0 flex items-center justify-between px-3 py-2 bg-slate-900 border border-blue-500/30 rounded-lg shadow-xl z-10 animate-in fade-in slide-in-from-top-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                             <p className="text-[10px] font-black text-blue-400 uppercase tracking-tighter truncate max-w-[70%]">
                               Sugerencia: <span className="text-white italic">{proposedName}</span>
                             </p>
                             <div className="flex gap-1">
                               <button onClick={applyProposedName} className="p-1 hover:bg-blue-500/20 text-blue-400 rounded transition-all" title="Aplicar">
                                  <PlusCircle size={14} />
                               </button>
                               <button onClick={copyProposedName} className="p-1 hover:bg-emerald-500/20 text-emerald-400 rounded transition-all" title="Copiar">
                                  <Copy size={14} />
                               </button>
                             </div>
                          </div>
                        )}
                     </div>
                  </div>
                  <div className="flex-1 space-y-1.5">
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Material / Stock</label>
                     <select 
                        value={selectedFilamentId ? `stock:${selectedFilamentId}` : material} 
                        onChange={e => {
                           const val = e.target.value;
                           if (val.startsWith('stock:')) {
                              const id = val.split(':')[1];
                              const fil = myFilaments.find(f => f.id === id);
                              setSelectedFilamentId(id);
                              if (fil) setMaterial(fil.material as any);
                           } else {
                              setSelectedFilamentId('');
                              setMaterial(val as any);
                           }
                        }} 
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-bold appearance-none h-[44px]"
                     >
                        <optgroup label="Genéricos">
                           <option value="PLA">PLA Estándar</option>
                           <option value="PETG">PETG Estándar</option>
                           <option value="TPU">TPU Estándar</option>
                        </optgroup>
                        {myFilaments.length > 0 && (
                          <optgroup label="En mi Stock">
                             {myFilaments.map(f => (
                               <option key={f.id} value={`stock:${f.id}`}>
                                 📦 {f.material} {f.customName ? `- ${f.customName}` : `(${f.color.startsWith('linear-gradient') ? 'Especial' : f.color})`}
                               </option>
                             ))}
                          </optgroup>
                        )}
                     </select>
                  </div>
               </div>

               <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Precio/kg</label>
                     <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden h-[44px]">
                        <button onClick={() => setFilamentPrice(p => Math.max(0, p-50))} className="px-3 text-white font-black">-</button>
                        <input type="number" value={filamentPrice || ''} onChange={e => setFilamentPrice(Number(e.target.value))} className="w-full bg-transparent text-white text-center font-bold text-sm focus:outline-none" />
                        <button onClick={() => setFilamentPrice(p => p+50)} className="px-3 text-white font-black">+</button>
                     </div>
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Gramos</label>
                     <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden h-[44px]">
                        <button onClick={() => setWeightUsed(p => Math.max(0, p-10))} className="px-3 text-white font-black">-</button>
                        <input type="number" value={weightUsed || ''} onChange={e => setWeightUsed(Number(e.target.value))} className="w-full bg-transparent text-white text-center font-bold text-sm focus:outline-none" />
                        <button onClick={() => setWeightUsed(p => p+10)} className="px-3 text-white font-black">+</button>
                     </div>
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Tiempo</label>
                     <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-2 h-[44px]">
                        <input type="number" value={printHours || ''} onChange={e => setPrintHours(Number(e.target.value))} className="w-full bg-transparent text-white font-bold text-right focus:outline-none pr-1 text-sm" placeholder="0" />
                        <span className="text-gray-600 font-bold">:</span>
                        <input type="number" value={printMinutes.toString().padStart(2, '0')} onChange={e => setPrintMinutes(Math.min(59, Number(e.target.value)))} className="w-full bg-transparent text-white font-bold text-left focus:outline-none pl-1 text-sm" placeholder="00" />
                     </div>
                  </div>
               </div>

               <div className="flex gap-4">
                  <div className="flex-1 space-y-1.5">
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Labor (+/- 10)</label>
                     <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden h-[44px]">
                        <button onClick={() => setLaborCostManual(p => Math.max(0, p-10))} className="px-4 text-white font-black">-</button>
                        <input type="number" value={laborCostManual || ''} onChange={e => setLaborCostManual(Number(e.target.value))} className="w-full bg-transparent text-white text-center font-bold text-sm focus:outline-none" />
                        <button onClick={() => setLaborCostManual(p => p+10)} className="px-4 text-white font-black">+</button>
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
                  <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mb-1">Costo Base</p>
                  <p className="text-2xl font-black text-white italic">{formatCurrency(results.baseCost)}</p>
               </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-white/5">
               <div className="flex-1 p-4 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-1">Amigo</p>
                     <span className="text-2xl font-black text-white">{formatCurrency(results.friendPrice)}</span>
                  </div>
                  <button onClick={() => handleCopy(results.friendPrice, 'amigo')} className="p-3 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-xl transition-all"><Copy size={18}/></button>
               </div>
               <div className="flex-[1.2] p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-between relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-1 px-2 bg-blue-500/20 text-[8px] font-black text-blue-300 rounded-bl-lg uppercase tracking-tighter">
                      Incluye Mantenimiento y Labor
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Comercial</p>
                      <div className="flex items-center gap-2">
                         <span className="text-3xl font-black text-white">{formatCurrency(results.commercialPrice)}</span>
                         <span className="text-xs text-green-400 font-black">+{formatCurrency(results.profit)}</span>
                      </div>
                   </div>
                   <button onClick={() => handleCopy(results.commercialPrice, 'comercial')} className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"><Copy size={18}/></button>
                </div>
            </div>
          </div>
        </div>

        {/* COL 2: QUIERO IMPRIMIR */}
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
                <input type="text" value={newQueueItemName} onChange={e => setNewQueueItemName(e.target.value)} placeholder="Nombre..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none font-bold" />
                <button onClick={addManualQueueItem} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-4 flex items-center justify-center font-black text-[10px]">AGREGAR</button>
             </div>

             <div className="space-y-3">
                {printQueue.map(item => {
                  const isInStock = item.filamentId ? myFilaments.some(f => f.id === item.filamentId) : false;
                  const stockRef = item.filamentId ? myFilaments.find(f => f.id === item.filamentId) : null;
                  
                  return (
                    <div key={item.id} className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl flex flex-col gap-2 group hover:bg-white/5 transition-all relative">
                       <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2 pr-12">
                             <div className={`w-2 h-2 rounded-full shrink-0 ${item.filamentId ? (isInStock ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]') : 'bg-gray-700'}`}></div>
                             <h4 className="text-sm font-black text-white uppercase italic break-words">{item.name}</h4>
                          </div>
                          <div className="flex gap-1 absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => loadToCalculator(item)} className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg"><Edit3 size={16}/></button>
                             <button onClick={() => { const n = printQueue.filter(i => i.id !== item.id); setPrintQueue(n); syncData(n, myFilaments); }} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg"><Trash2 size={16}/></button>
                          </div>
                       </div>
                        {item.material && (
                          <div className="flex items-center justify-between pt-1 border-t border-white/5">
                             <div className="flex gap-2">
                                <span className="text-[9px] px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full font-black uppercase flex items-center gap-1">
                                   {stockRef?.color && <div className="w-1.5 h-1.5 rounded-full border border-white/10" style={{ background: stockRef.color }}></div>}
                                   {item.material} {stockRef?.customName ? `- ${stockRef.customName}` : ''}
                                </span>
                                <span className="text-[9px] px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded-full font-black uppercase">{item.time}</span>
                             </div>
                             <span className="text-sm font-black text-white">{formatCurrency(item.cost || 0)}</span>
                          </div>
                        )}
                    </div>
                  );
                })}
             </div>
          </div>
          <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] flex justify-between items-center">
             <span className="text-xs text-gray-500 font-black uppercase tracking-widest">Inversión Lote</span>
             <span className="text-xl font-black text-white italic">{formatCurrency(printQueue.reduce((a,c) => a + (c.cost || 0), 0))}</span>
          </div>
        </div>

        {/* COL 3: STOCK */}
        <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl flex flex-col overflow-hidden">
          <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <Palette className="text-pink-400" size={16} />
              <h3 className="text-xs font-black text-white uppercase italic">Mi Stock</h3>
            </div>
            <span className="text-[10px] bg-pink-500/20 text-pink-400 border border-pink-500/30 px-2 py-0.5 rounded-full font-black">
              {myFilaments.length} {myFilaments.length === 1 ? 'Filamento' : 'Filamentos'}
            </span>
          </div>
          <div className="p-4 flex flex-col gap-4 flex-1 overflow-y-auto custom-scrollbar">
             <div className="space-y-3 pb-4 border-b border-white/5">
                <div className="flex gap-2">
                   <select value={newFilament.material} onChange={e => setNewFilament({...newFilament, material: e.target.value})} className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-2 py-2 text-xs text-white focus:outline-none font-bold">
                      <option value="PLA">PLA</option><option value="PETG">PETG</option><option value="TPU">TPU</option>
                   </select>
                   <div 
                      className="relative shrink-0 w-10 h-10 rounded-lg border border-white/20 overflow-hidden flex items-center justify-center" 
                      style={{ background: newFilament.color || '#ffffff' }}
                   >
                      <input 
                         type="color" 
                         value={newFilament.color?.startsWith('linear-gradient') ? '#ffffff' : (newFilament.color || '#ffffff')} 
                         onChange={e => handleColorChange(e.target.value)} 
                         className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                      />
                      {newFilament.color?.startsWith('linear-gradient') && (
                         <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/10">
                            <span className="text-[8px] font-black text-white bg-slate-900/80 px-1 py-0.5 rounded uppercase tracking-tighter">EFX</span>
                         </div>
                      )}
                   </div>
                </div>

                <div className="space-y-1">
                   <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Efectos / Duplex</label>
                   <div className="grid grid-cols-5 gap-1">
                      {SPECIAL_COLORS.map(sc => (
                         <button
                            key={sc.name}
                            type="button"
                            onClick={() => handleColorChange(sc.value)}
                            className={`w-6 h-6 rounded-full border transition-all hover:scale-110 shrink-0 ${newFilament.color === sc.value ? 'border-white scale-105 shadow-[0_0_6px_rgba(255,255,255,0.4)]' : 'border-white/10'}`}
                            style={{ background: sc.value }}
                            title={sc.name}
                         />
                      ))}
                   </div>
                </div>

                <input type="text" value={newFilament.customName} onChange={e => setNewFilament({...newFilament, customName: e.target.value})} placeholder="Nombre/Marca..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white focus:outline-none font-bold" />
                <button onClick={saveFilament} className={`w-full ${editingFilamentId ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-pink-600 hover:bg-pink-500'} text-white rounded-lg py-2 flex items-center justify-center font-black text-[10px] transition-all`}>
                   {editingFilamentId ? 'GUARDAR' : 'AGREGAR'}
                </button>
             </div>

             {/* Filters and Copy */}
             <div className="flex flex-col gap-2 pb-2 border-b border-white/5">
                <div className="flex items-center justify-between gap-1.5">
                   <div className="flex gap-0.5 bg-white/5 p-0.5 rounded-lg border border-white/5 flex-1">
                      {(['all', 'PLA', 'PETG', 'TPU'] as const).map(f => (
                         <button
                           key={f}
                           onClick={() => setFilamentFilter(f)}
                           className={`flex-1 text-[8px] font-black uppercase tracking-tighter py-1 rounded-md transition-all ${filamentFilter === f ? 'bg-pink-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                         >
                           {f === 'all' ? 'Todo' : f}
                         </button>
                      ))}
                   </div>
                   <button
                      onClick={copyAvailableFilaments}
                      className="p-1 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 rounded-lg transition-all flex items-center justify-center gap-1 text-[8px] font-black uppercase tracking-wider px-2 h-[24px]"
                      title="Copiar lista de colores para cliente"
                   >
                      <Copy size={10} />
                      <span>Copiar</span>
                   </button>
                </div>
             </div>
             
             <div className="space-y-2">
                {myFilaments
                   .filter(fil => filamentFilter === 'all' || fil.material.toUpperCase() === filamentFilter.toUpperCase())
                   .map(fil => {
                      const isGradient = fil.color?.startsWith('linear-gradient');
                      const borderColor = isGradient ? 'rgba(236, 72, 153, 0.2)' : `${fil.color}44`;
                      const backgroundColor = isGradient ? 'rgba(236, 72, 153, 0.03)' : `${fil.color}08`;
                      return (
                        <div key={fil.id} style={{ borderColor, backgroundColor }} className="p-2 border rounded-2xl flex items-center justify-between group transition-all">
                           <div className="flex items-center gap-2 overflow-hidden">
                              <div className="w-3 h-3 rounded-full shrink-0 border border-white/20" style={{ background: fil.color }}></div>
                              <div className="flex flex-col">
                                 <span className="text-[10px] font-black text-white uppercase leading-none">{fil.material}</span>
                                 {fil.customName && <span className="text-[8px] text-gray-400 font-bold italic truncate max-w-[80px]">({fil.customName})</span>}
                              </div>
                           </div>
                           <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => editFilament(fil)} className="text-blue-400 hover:text-blue-300 p-1"><Edit3 size={14}/></button>
                              <button onClick={() => { const n = myFilaments.filter(i => i.id !== fil.id); setMyFilaments(n); syncData(printQueue, n); }} className="text-rose-500 hover:text-rose-400 p-1"><Trash2 size={14}/></button>
                           </div>
                        </div>
                      );
                   })
                }
             </div>
          </div>
        </div>

      </div>

      {/* REGISTRO FINANCIERO DE VENTAS Y COSTOS 3D */}
      <div className="mt-8 bg-slate-950/80 backdrop-blur-3xl border border-white/10 rounded-3xl p-6 shadow-2xl max-w-[1600px] mx-auto w-full animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-6">
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-widest italic flex items-center gap-2">
              <TrendingUp className="text-emerald-400" size={22} />
              Registro Financiero de Ventas y Costos 3D
            </h3>
            <p className="text-xs text-gray-500 font-bold uppercase mt-1">
              Monitorea tus ingresos, costos de filamento/energía y ganancias reales
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={loadSalesData} 
              disabled={isLoadingSales} 
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-white/10"
              title="Recargar desde Supabase"
            >
              <RefreshCw size={12} className={isLoadingSales ? 'animate-spin' : ''} />
              Cargar
            </button>
            <button 
              onClick={() => saveSalesData(salesList)} 
              disabled={isSavingSales} 
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-md"
              title="Guardar en Supabase"
            >
              {isSavingSales ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
              Guardar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* COLUMNA 1: FORMULARIO */}
          <div className="lg:col-span-4 bg-white/[0.02] border border-white/5 p-5 rounded-2xl flex flex-col justify-between space-y-4">
            <div>
              <h4 id="sales-form-heading" className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4 border-b border-white/5 pb-2 flex items-center justify-between">
                <span>{editingSaleId ? 'Editar Registro de Venta' : 'Añadir Registro de Venta'}</span>
                {editingSaleId && (
                  <span className="text-[9px] px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded-full font-black animate-pulse">
                    Modo Edición
                  </span>
                )}
              </h4>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Nombre de la Impresión</label>
                  <input 
                    type="text" 
                    value={saleName} 
                    onChange={e => setSaleName(e.target.value)} 
                    placeholder="Ej: Casco Iron Man..." 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500/50 h-[38px]" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Costo de Impresión ($)</label>
                    <input 
                      type="number" 
                      value={saleCost || ''} 
                      onChange={e => setSaleCost(Number(e.target.value))} 
                      placeholder="0.00" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500/50 h-[38px] text-center" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Precio Acordado ($)</label>
                    <input 
                      type="number" 
                      value={salePrice || ''} 
                      onChange={e => {
                        const val = Number(e.target.value);
                        setSalePrice(val);
                        if (salePaid) setSaleAdvance(val);
                      }} 
                      placeholder="0.00" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500/50 h-[38px] text-center" 
                    />
                  </div>
                </div>

                {/* Anticipo & Paid status toggle */}
                <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">¿Totalmente Pagado?</label>
                    <input 
                      type="checkbox" 
                      checked={salePaid} 
                      onChange={e => {
                        const checked = e.target.checked;
                        setSalePaid(checked);
                        if (checked) {
                          setSaleAdvance(salePrice);
                        }
                      }} 
                      className="w-4 h-4 rounded text-emerald-600 bg-white/5 border-white/10 focus:ring-emerald-500/50 cursor-pointer"
                    />
                  </div>
                  
                  {!salePaid && (
                    <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Anticipo Pagado ($)</label>
                      <input 
                        type="number" 
                        value={saleAdvance || ''} 
                        onChange={e => setSaleAdvance(Number(e.target.value))} 
                        placeholder="0.00" 
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500/50 h-[38px] text-center" 
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Fecha de Venta</label>
                  <input 
                    type="date" 
                    value={saleDate} 
                    onChange={e => setSaleDate(e.target.value)} 
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500/50 h-[38px]" 
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {editingSaleId && (
                <button 
                  onClick={() => {
                    setEditingSaleId(null);
                    setSaleName('');
                    setSaleCost(0);
                    setSalePrice(0);
                    setSaleAdvance(0);
                    setSalePaid(true);
                  }}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-white/10"
                >
                  Cancelar
                </button>
              )}
              <button 
                onClick={addSaleEntry} 
                className={`py-3 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md transition-all duration-300 ${
                  editingSaleId 
                    ? 'flex-[2] bg-gradient-to-r from-yellow-600 to-amber-700 hover:from-yellow-500 hover:to-amber-600' 
                    : 'w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600'
                }`}
              >
                {editingSaleId ? 'Guardar Cambios' : 'Registrar Venta'}
              </button>
            </div>
          </div>

          {/* COLUMNA 2: DASHBOARD Y TABLA */}
          <div className="lg:col-span-8 flex flex-col space-y-4">
            {/* FILTROS Y ESTADOS DE COBRO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white/[0.01] border border-white/5 p-3 rounded-2xl">
              <div className="flex flex-wrap items-center gap-1">
                {(['all', 'year', 'month', 'week', 'day'] as const).map(f => (
                  <button 
                    key={f} 
                    onClick={() => setSalesFilter(f)} 
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${salesFilter === f ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                  >
                    {f === 'all' ? 'Todos' : f === 'year' ? 'Este Año' : f === 'month' ? 'Este Mes' : f === 'week' ? 'Esta Semana' : 'Día Específico'}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center justify-between md:justify-end gap-2 text-xs">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest select-none">Cobro:</span>
                <div className="flex gap-1">
                  {(['all', 'pending', 'paid'] as const).map(f => (
                    <button 
                      key={f} 
                      onClick={() => setPaymentFilter(f)} 
                      className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${paymentFilter === f ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                    >
                      {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendientes' : 'Pagados'}
                    </button>
                  ))}
                </div>
              </div>

              {salesFilter === 'day' && (
                <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-300 col-span-1 md:col-span-2 border-t border-white/5 pt-2 mt-1">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Selecciona Día:</span>
                  <input 
                    type="date" 
                    value={specificFilterDate} 
                    onChange={e => setSpecificFilterDate(e.target.value)} 
                    className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-white text-xs font-bold outline-none focus:border-emerald-500/50" 
                  />
                </div>
              )}
            </div>

            {/* METRICS GRID */}
            {(() => {
              const totals = filteredSales.reduce((acc, curr) => {
                const itemPaid = curr.paid !== undefined ? curr.paid : true;
                const itemAdvance = curr.advance !== undefined ? curr.advance : curr.price;
                const pending = itemPaid ? 0 : Math.max(0, curr.price - itemAdvance);
                
                acc.cost += curr.cost || 0;
                acc.price += curr.price || 0;
                acc.collected += itemAdvance;
                acc.pending += pending;
                acc.profit += (curr.price || 0) - (curr.cost || 0);
                return acc;
              }, { cost: 0, price: 0, collected: 0, pending: 0, profit: 0 });

              return (
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group hover:bg-red-500/[0.08] transition-colors duration-300">
                    <p className="text-[9px] text-red-400 font-black uppercase tracking-widest mb-1 select-none">Total Costos</p>
                    <p className="text-xl font-black text-white italic">{formatCurrency(totals.cost)}</p>
                    <div className="absolute -bottom-2 -right-2 opacity-5"><DollarSign size={40} className="text-red-500" /></div>
                  </div>
                  <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group hover:bg-blue-500/[0.08] transition-colors duration-300">
                    <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest mb-1 select-none">Total Acordado</p>
                    <p className="text-xl font-black text-white italic">{formatCurrency(totals.price)}</p>
                    <div className="text-[8px] text-gray-400 font-bold mt-1 text-center select-none">
                      Cobrado: <span className="text-emerald-400">{formatCurrency(totals.collected)}</span> | Resta: <span className="text-amber-400">{formatCurrency(totals.pending)}</span>
                    </div>
                    <div className="absolute -bottom-2 -right-2 opacity-5"><DollarSign size={40} className="text-blue-500" /></div>
                  </div>
                  <div className={`p-4 border rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group transition-colors duration-300 ${totals.profit >= 0 ? 'bg-emerald-500/5 border-emerald-500/10 hover:bg-emerald-500/[0.08]' : 'bg-rose-500/5 border-rose-500/10 hover:bg-rose-500/[0.08]'}`}>
                    <p className={`text-[9px] font-black uppercase tracking-widest mb-1 select-none ${totals.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>Ganancia Neto</p>
                    <p className="text-xl font-black text-white italic">{formatCurrency(totals.profit)}</p>
                    <div className="text-[8px] text-gray-400 font-bold mt-1 text-center select-none">
                      Cobrada: <span className="text-emerald-400">{formatCurrency(totals.collected - totals.cost)}</span>
                    </div>
                    <div className="absolute -bottom-2 -right-2 opacity-5"><TrendingUp size={40} className={totals.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'} /></div>
                  </div>
                </div>
              );
            })()}

            {/* TABLA DE VENTAS */}
            <div className="bg-white/[0.01] border border-white/5 rounded-2xl flex-grow overflow-hidden flex flex-col h-[280px]">
              <div className="overflow-y-auto flex-grow custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs table-auto">
                  <thead className="bg-slate-950 border-b border-white/10 uppercase font-black text-[9px] tracking-wider text-gray-500 sticky top-0 z-10">
                    <tr>
                      <th className="p-3 w-[12%] text-center">Fecha</th>
                      <th className="p-3 w-[30%]">Impresión</th>
                      <th className="p-3 w-[12%] text-center">Costo</th>
                      <th className="p-3 w-[18%] text-center">Precio / Cobrado</th>
                      <th className="p-3 w-[12%] text-center">Estado</th>
                      <th className="p-3 w-[10%] text-center">Ganancia</th>
                      <th className="p-3 w-[6%] text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-bold">
                    {filteredSales.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-600 font-bold uppercase text-[10px] tracking-widest select-none">
                          No hay registros de venta para este periodo o estado
                        </td>
                      </tr>
                    ) : (
                      filteredSales.map(item => {
                        const itemPaid = item.paid !== undefined ? item.paid : true;
                        const itemAdvance = item.advance !== undefined ? item.advance : item.price;
                        const gain = (item.price || 0) - (item.cost || 0);
                        
                        return (
                          <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="p-3 text-center text-gray-500 font-mono select-none">{item.date}</td>
                            <td className="p-3 text-white uppercase italic truncate max-w-[180px]">{item.name}</td>
                            <td className="p-3 text-center text-red-400 font-mono">{formatCurrency(item.cost || 0)}</td>
                            <td className="p-3 text-center font-mono text-white text-[11px]">
                              <span>{formatCurrency(item.price || 0)}</span>
                              {!itemPaid && (
                                <div className="text-[9px] text-gray-400 font-bold">
                                  Cobrado: <span className="text-emerald-400 font-semibold">{formatCurrency(itemAdvance)}</span>
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {itemPaid ? (
                                <span className="text-[8px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-black uppercase">
                                  PAGADO
                                </span>
                              ) : (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="text-[8px] px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full font-black uppercase">
                                    PENDIENTE
                                  </span>
                                  <span className="text-[8px] text-rose-400 font-black">
                                    Falta: {formatCurrency(item.price - itemAdvance)}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className={`p-3 text-center font-mono ${gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {gain >= 0 ? '+' : ''}{formatCurrency(gain)}
                            </td>
                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {!itemPaid && (
                                  <button 
                                    onClick={() => markSaleAsPaid(item.id)} 
                                    className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-all"
                                    title="Marcar como Completamente Pagado"
                                  >
                                    <CheckCircle2 size={12} />
                                  </button>
                                )}
                                <button 
                                  onClick={() => editSaleEntry(item)} 
                                  className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                                  title="Editar Registro"
                                >
                                  <Edit3 size={12} />
                                </button>
                                <button 
                                  onClick={() => deleteSaleEntry(item.id)} 
                                  className="p-1.5 text-gray-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                  title="Eliminar Registro"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreeDCalculator;
