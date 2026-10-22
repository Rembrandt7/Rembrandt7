import React, { useState, useEffect } from 'react';
import type { QuoteDetails } from './types';
import { 
  saveInicioFacturaToCloud, 
  fetchInicioFacturaFromCloud 
} from './services/supabaseService';
import LoadingSpinner from './LoadingSpinner';

interface InicioFacturaModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDetails: QuoteDetails;
  onLoadInicioFactura: (data: QuoteDetails) => void;
}

export const InicioFacturaModal: React.FC<InicioFacturaModalProps> = ({
  isOpen,
  onClose,
  currentDetails,
  onLoadInicioFactura
}) => {
  const [cloudTemplate, setCloudTemplate] = useState<QuoteDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadCloudInicio = async () => {
    setLoading(true);
    try {
      const data = await fetchInicioFacturaFromCloud();
      setCloudTemplate(data);
    } catch (err) {
      console.error("Error al cargar inicio factura:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCloudInicio();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveAsInicio = async () => {
    if (!confirm("¿Deseas guardar la configuración y datos actuales como la plantilla base oficial 'Inicio Factura' en Supabase? Se actualizará para cualquier dispositivo.")) {
      return;
    }

    setSaving(true);
    try {
      // Guardar con metadata limpia
      const toSave = {
        ...currentDetails,
        _isInicioFactura: true,
        _savedAt: new Date().toISOString()
      };
      const ok = await saveInicioFacturaToCloud(toSave);
      if (ok) {
        showToast("¡Plantilla base 'Inicio Factura' guardada y sincronizada en Supabase!");
        setCloudTemplate(toSave);
      } else {
        alert("Error al guardar en Supabase. Verifica tu conexión.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleApplyToForm = () => {
    if (!cloudTemplate) return;
    onLoadInicioFactura(cloudTemplate);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[90] flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 text-lg">
              🏛️
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Plantilla Base: Inicio Factura
                <span className="text-xs font-normal bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Supabase
                </span>
              </h2>
              <p className="text-xs text-slate-400">Guarda o carga tu plantilla inicial con logos, firmas y condiciones maestras.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-lg font-bold transition-colors cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* TOAST */}
        {toastMessage && (
          <div className="bg-emerald-900/90 border-b border-emerald-500/40 px-4 py-2 text-xs font-bold text-emerald-200 text-center animate-pulse">
            {toastMessage}
          </div>
        )}

        {/* BODY */}
        <div className="p-4 sm:p-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <LoadingSpinner />
              <p className="text-xs text-slate-400 animate-pulse">Verificando 'Inicio Factura' en Supabase...</p>
            </div>
          ) : (
            <>
              {/* ESTADO DE LA PLANTILLA EN LA NUBE */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${cloudTemplate ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    Estado en la Nube
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Rembrandtcosas/inicio_factura/
                  </span>
                </div>

                {cloudTemplate ? (
                  <div className="space-y-1 text-xs text-slate-300 pt-1 border-t border-slate-800/80">
                    <p>✅ <strong>Plantilla encontrada en Supabase</strong></p>
                    <p className="text-slate-400">
                      <strong>Proyecto default:</strong> {cloudTemplate.projectName || 'Sin título'} | <strong>Cliente:</strong> {cloudTemplate.recipientName || 'Sin especificar'}
                    </p>
                    <p className="text-slate-400">
                      <strong>Actividades base:</strong> {(cloudTemplate.activities || []).length} elementos configurados
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-amber-300/90 pt-1">
                    ⚠️ Aún no has guardado una plantilla base 'Inicio Factura' en Supabase. Puedes guardar la configuración actual con el botón de abajo.
                  </p>
                )}
              </div>

              {/* BOTONES DE ACCIÓN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {cloudTemplate && (
                  <button
                    onClick={handleApplyToForm}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-950/50 transition-all cursor-pointer"
                  >
                    <span>📥</span>
                    <span>Cargar Inicio Factura</span>
                  </button>
                )}

                <button
                  onClick={handleSaveAsInicio}
                  disabled={saving}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-lg shadow-amber-950/50 transition-all cursor-pointer disabled:opacity-50 ${!cloudTemplate ? 'sm:col-span-2' : ''}`}
                >
                  {saving ? <LoadingSpinner /> : <span>⭐</span>}
                  <span>Guardar Actual como Inicio Factura</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-500 text-center">
                Al guardar como 'Inicio Factura', se respaldan tus logos, firmas, cuentas bancarias y notas base en Supabase para reutilizarlos en cada nueva cotización.
              </p>
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end px-4">
          <button 
            onClick={onClose} 
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
