import React, { useState, useEffect } from 'react';
import type { QuoteDetails } from './types';
import { 
  fetchSavedInvoicesFromCloud, 
  deleteInvoiceFromCloud, 
  saveInvoiceToCloud, 
  saveFolioCounterToCloud,
  SavedInvoiceItem 
} from './services/supabaseService';
import LoadingSpinner from './LoadingSpinner';

interface SavedInvoicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadInvoice: (data: QuoteDetails) => void;
  onPreviewInvoice: (data: QuoteDetails) => void;
  currentDetails: QuoteDetails;
}

export const SavedInvoicesModal: React.FC<SavedInvoicesModalProps> = ({
  isOpen,
  onClose,
  onLoadInvoice,
  onPreviewInvoice,
  currentDetails
}) => {
  const [invoices, setInvoices] = useState<SavedInvoiceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [savingCurrent, setSavingCurrent] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const data = await fetchSavedInvoicesFromCloud();
      setInvoices(data);
    } catch (err) {
      console.error("Error al cargar facturas de Supabase:", err);
      showToast("Error al conectar con Supabase");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadInvoices();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveCurrent = async () => {
    if (!currentDetails.projectName && !currentDetails.recipientName) {
      alert("Ingresa al menos el Nombre del Proyecto o Cliente para guardar.");
      return;
    }

    setSavingCurrent(true);
    try {
      const subtotal = (currentDetails.activities || []).reduce((s, a) => s + (a.quantity || 1) * (a.unitPrice || 0), 0);
      let disc = 0;
      if (currentDetails.discountType === 'percentage') disc = subtotal * (currentDetails.discountValue / 100);
      else if (currentDetails.discountType === 'fixed') disc = currentDetails.discountValue;
      const subAfterDisc = subtotal - disc;
      const iva = currentDetails.addIVA ? subAfterDisc * 0.16 : 0;
      const total = subAfterDisc + iva;

      const folDigits = (currentDetails.folio || localStorage.getItem('rembrandt_quote_folio_counter') || '01000')
        .replace(/[^0-9]/g, '')
        .padStart(5, '0');
      const newId = `fac_${Date.now()}`;
      const newInvoice: SavedInvoiceItem = {
        id: newId,
        projectName: currentDetails.projectName || 'Proyecto sin título',
        clientName: currentDetails.recipientName || 'Cliente general',
        date: currentDetails.invoiceDate || new Date().toISOString(),
        total: Math.round(total * 100) / 100,
        data: { ...currentDetails, folio: folDigits },
        updatedAt: new Date().toISOString()
      };

      const ok = await saveInvoiceToCloud(newInvoice);
      if (ok) {
        // Incrementar folio para no repetir
        const nextNum = parseInt(folDigits, 10) + 1;
        localStorage.setItem('rembrandt_quote_folio_counter', nextNum.toString());
        await saveFolioCounterToCloud(nextNum);

        showToast(`¡Factura guardada con éxito! (${currentDetails.recipientName || 'Cliente'} - ${currentDetails.projectName || 'Proyecto'} - ${folDigits})`);
        await loadInvoices();
      } else {
        alert("Error al guardar en Supabase. Verifica tu conexión a internet.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setSavingCurrent(false);
    }
  };

  const handleDelete = async (id: string, projectName: string) => {
    if (!confirm(`¿Estás seguro de eliminar la factura "${projectName}" de Supabase?`)) return;
    try {
      const ok = await deleteInvoiceFromCloud(id);
      if (ok) {
        setInvoices(prev => prev.filter(i => i.id !== id));
        showToast("Factura eliminada de Supabase.");
      }
    } catch (e: any) {
      alert("Error al eliminar: " + e.message);
    }
  };

  const filtered = invoices.filter(inv => {
    const q = searchTerm.toLowerCase();
    const folioStr = (inv.data?.folio || '').toLowerCase();
    return (
      folioStr.includes(q) ||
      (inv.projectName || '').toLowerCase().includes(q) ||
      (inv.clientName || '').toLowerCase().includes(q) ||
      (inv.date || '').toLowerCase().includes(q)
    );
  }).sort((a, b) => {
    const folioA = parseInt(a.data?.folio || '0', 10);
    const folioB = parseInt(b.data?.folio || '0', 10);
    if (!isNaN(folioA) && !isNaN(folioB) && folioA !== folioB) {
      return folioB - folioA;
    }
    return new Date(b.updatedAt || b.date).getTime() - new Date(a.updatedAt || a.date).getTime();
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[90] flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              📁
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Facturas Guardadas en la Nube
                <span className="text-xs font-normal bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
                  Supabase
                </span>
              </h2>
              <p className="text-xs text-slate-400">Abre, modifica o genera vistas previas de tus facturas y cotizaciones.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-lg font-bold transition-colors cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* TOAST NOTIFICATION */}
        {toastMessage && (
          <div className="bg-emerald-900/90 border-b border-emerald-500/40 px-4 py-2 text-xs font-bold text-emerald-200 text-center animate-pulse">
            {toastMessage}
          </div>
        )}

        {/* CONTROLES / BUSCADOR Y GUARDAR ACTUAL */}
        <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Buscar por folio (ej. 01000), proyecto o cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                &times;
              </button>
            )}
          </div>

          <button
            onClick={handleSaveCurrent}
            disabled={savingCurrent}
            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-50"
          >
            {savingCurrent ? <LoadingSpinner /> : <span>💾</span>}
            <span>Guardar Factura Actual</span>
          </button>
        </div>

        {/* LISTA DE FACTURAS */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <LoadingSpinner />
              <p className="text-xs text-slate-400 font-medium animate-pulse">Conectando con Supabase...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="text-4xl mb-2">📄</div>
              <p className="text-sm font-semibold text-slate-300">
                {searchTerm ? 'No se encontraron facturas con ese criterio.' : 'No tienes facturas guardadas en la nube aún.'}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Llena el cotizador y pulsa "Guardar Factura Actual" para tenerla disponible en cualquier dispositivo.
              </p>
            </div>
          ) : (
            filtered.map((inv) => {
              const folDigits = (inv.data?.folio || '01000').replace(/[^0-9]/g, '').padStart(5, '0');
              const client = inv.clientName || inv.data?.recipientName || 'Cliente';
              const project = inv.projectName || inv.data?.projectName || 'Proyecto';
              return (
              <div 
                key={inv.id}
                className="p-3 sm:p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono font-black px-2.5 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/40 text-purple-300 tracking-wider shadow-sm" title="Número de Folio">
                      {folDigits}
                    </span>
                    <h3 className="font-bold text-sm text-white truncate" title={`${client} - ${project} - ${folDigits}`}>
                      <span className="text-slate-300">{client}</span>
                      <span className="text-slate-500 mx-1.5">-</span>
                      <span className="text-white">{project}</span>
                      <span className="text-slate-500 mx-1.5">-</span>
                      <span className="text-purple-300 font-mono font-bold">{folDigits}</span>
                    </h3>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
                      {formatCurrency(inv.total || 0)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                    <span>👤 <strong className="text-slate-300">{client}</strong></span>
                    <span>📅 {new Date(inv.date || inv.updatedAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    <span className="text-[10px] text-slate-500 font-mono">ID: {inv.id}</span>
                  </div>
                </div>

                {/* BOTONES DE ACCIÓN */}
                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => {
                      onLoadInvoice(inv.data);
                      onClose();
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                    title="Cargar y modificar esta factura en el formulario"
                  >
                    <span>✏️</span>
                    <span>Abrir / Modificar</span>
                  </button>

                  <button
                    onClick={() => {
                      onPreviewInvoice(inv.data);
                      onClose();
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs font-semibold transition-all cursor-pointer"
                    title="Ver vista previa y descargar PDF"
                  >
                    <span>👁️</span>
                    <span>Vista Previa</span>
                  </button>

                  <button
                    onClick={() => handleDelete(inv.id, inv.projectName)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Eliminar de Supabase"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

        {/* FOOTER */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400 px-4">
          <span>{invoices.length} {invoices.length === 1 ? 'factura guardada' : 'facturas guardadas'}</span>
          <button 
            onClick={onClose} 
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
