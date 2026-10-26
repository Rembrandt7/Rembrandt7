import React, { useState, useRef } from 'react';
import type { QuoteDetails, DefaultConfigProfile } from '../types';
import { DEFAULT_LOGO_B64 } from '../constants/defaultLogo';

interface DefaultConfigsModalProps {
  isOpen: boolean;
  onClose: () => void;
  configs: DefaultConfigProfile[];
  activeConfigId: string;
  onSaveConfigs: (configs: DefaultConfigProfile[], newActiveId?: string) => Promise<void>;
  onApplyConfig: (config: DefaultConfigProfile) => void;
  currentFormDetails: QuoteDetails;
  isCloudConnected: boolean;
  onOpenCloudGallery?: (target: 'logoB64' | 'signatureB64') => void;
}

const DefaultConfigsModal: React.FC<DefaultConfigsModalProps> = ({
  isOpen,
  onClose,
  configs,
  activeConfigId,
  onSaveConfigs,
  onApplyConfig,
  currentFormDetails,
  isCloudConnected,
  onOpenCloudGallery,
}) => {
  const [editingConfig, setEditingConfig] = useState<DefaultConfigProfile | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  // --- SAVE CURRENT QUOTE AS A NEW STYLE ---
  const handleSaveCurrentAsConfig = () => {
    const defaultName = `Estilo ${new Date().toLocaleDateString('es-MX')} (${configs.length + 1})`;
    const isFirst = configs.length === 0;
    const newConfig: DefaultConfigProfile = {
      id: `style_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: defaultName,
      isDefault: isFirst,
      companyTagline: currentFormDetails?.companyTagline || 'Arquitectura y Visualización 3D',
      recipientPrefix: currentFormDetails?.recipientPrefix || '',
      deliveryTime: currentFormDetails?.deliveryTime || '5 días hábiles',
      requireAdvance: currentFormDetails?.requireAdvance ?? true,
      addIVA: currentFormDetails?.addIVA ?? false,
      discountType: currentFormDetails?.discountType || 'none',
      discountValue: currentFormDetails?.discountValue || 0,
      addWithholdings: currentFormDetails?.addWithholdings ?? false,
      ivaWithholdingPercentage: currentFormDetails?.ivaWithholdingPercentage ?? 10.667,
      isrWithholdingPercentage: currentFormDetails?.isrWithholdingPercentage ?? 1.25,
      generalConditions: currentFormDetails?.generalConditions || '',
      taxId: currentFormDetails?.taxId || '',
      legalName: currentFormDetails?.legalName || '',
      logoB64: currentFormDetails?.logoB64 || null,
      signatureB64: currentFormDetails?.signatureB64 || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingConfig(newConfig);
    setIsCreatingNew(true);
  };

  // --- START NEW STYLE FROM TEMPLATE ---
  const handleStartNewConfig = () => {
    const newConfig: DefaultConfigProfile = {
      id: `style_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `Nuevo Estilo ${configs.length + 1}`,
      isDefault: configs.length === 0,
      companyTagline: 'Arquitectura y Visualización 3D',
      recipientPrefix: '',
      deliveryTime: '5 días hábiles',
      requireAdvance: true,
      addIVA: false,
      discountType: 'none',
      discountValue: 0,
      addWithholdings: false,
      ivaWithholdingPercentage: 10.667,
      isrWithholdingPercentage: 1.25,
      generalConditions: '• Los precios no incluyen IVA a menos que se especifique.\n• El tiempo de entrega corre a partir del anticipo y entrega de información completa.\n• Incluye hasta 2 rondas de correcciones o ajustes menores.',
      taxId: '',
      legalName: '',
      logoB64: currentFormDetails?.logoB64 || DEFAULT_LOGO_B64,
      signatureB64: currentFormDetails?.signatureB64 || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingConfig(newConfig);
    setIsCreatingNew(true);
  };

  // --- SET ACTIVE AS DEFAULT ---
  const handleSetAsDefault = async (configId: string) => {
    setIsSaving(true);
    try {
      const updated = configs.map(c => ({
        ...c,
        isDefault: c.id === configId,
        updatedAt: new Date().toISOString()
      }));
      await onSaveConfigs(updated, configId);
      const target = configs.find(c => c.id === configId);
      showFeedback(`"${target?.name || 'Estilo'}" establecido como predeterminado.`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  // --- DUPLICATE STYLE ---
  const handleDuplicateConfig = async (config: DefaultConfigProfile) => {
    const newConfig: DefaultConfigProfile = {
      ...config,
      id: `style_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${config.name} (Copia)`,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updated = [...configs, newConfig];
    await onSaveConfigs(updated);
    showFeedback(`Copia creada: "${newConfig.name}"`);
  };

  // --- DELETE STYLE ---
  const handleDeleteConfig = async (configId: string) => {
    const configToDelete = configs.find(c => c.id === configId);
    if (!confirm(`¿Eliminar el estilo "${configToDelete?.name || 'seleccionado'}"?`)) return;

    setIsSaving(true);
    try {
      const filtered = configs.filter(c => c.id !== configId);
      let newActiveId = activeConfigId;

      // If we deleted the default one, make the first remaining one default
      if (configId === activeConfigId && filtered.length > 0) {
        filtered[0].isDefault = true;
        newActiveId = filtered[0].id;
      }

      await onSaveConfigs(filtered, newActiveId);
      showFeedback("Estilo eliminado.");
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  // --- SAVE EDITING FORM ---
  const handleSaveEditingForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConfig) return;
    if (!editingConfig.name.trim()) {
      alert("Por favor ingresa un nombre para el estilo.");
      return;
    }

    setIsSaving(true);
    try {
      let updated: DefaultConfigProfile[];
      let newActiveId = activeConfigId;

      if (isCreatingNew) {
        if (editingConfig.isDefault) {
          updated = configs.map(c => ({ ...c, isDefault: false }));
          updated.push({ ...editingConfig, updatedAt: new Date().toISOString() });
          newActiveId = editingConfig.id;
        } else {
          updated = [...configs, { ...editingConfig, updatedAt: new Date().toISOString() }];
        }
      } else {
        if (editingConfig.isDefault) {
          updated = configs.map(c => 
            c.id === editingConfig.id 
              ? { ...editingConfig, isDefault: true, updatedAt: new Date().toISOString() }
              : { ...c, isDefault: false }
          );
          newActiveId = editingConfig.id;
        } else {
          updated = configs.map(c => 
            c.id === editingConfig.id 
              ? { ...editingConfig, updatedAt: new Date().toISOString() }
              : c
          );
        }
      }

      await onSaveConfigs(updated, newActiveId);
      showFeedback(`Estilo "${editingConfig.name}" guardado y respaldado.`);
      setEditingConfig(null);
      setIsCreatingNew(false);
    } catch (err) {
      console.error(err);
      alert("Error al guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- EXPORT JSON BACKUP ---
  const handleExportBackup = () => {
    const backupData = {
      type: 'COTIZADOR_STYLES_BACKUP',
      version: 1,
      exportedAt: new Date().toISOString(),
      activeConfigId,
      configs,
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Respaldo_Estilos_Cotizacion_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showFeedback("Respaldo descargado exitosamente.");
  };

  // --- IMPORT JSON BACKUP ---
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        if (Array.isArray(json)) {
          // Direct array format
          await onSaveConfigs(json, json[0]?.id);
          showFeedback(`Se restauraron ${json.length} estilos.`);
        } else if (json.configs && Array.isArray(json.configs)) {
          // Object backup format
          await onSaveConfigs(json.configs, json.activeConfigId || json.configs[0]?.id);
          showFeedback(`Se restauraron ${json.configs.length} estilos.`);
        } else {
          alert("El archivo JSON no tiene un formato válido de respaldo de estilos.");
        }
      } catch (err) {
        console.error(err);
        alert("Error al procesar el archivo JSON de respaldo.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Helper for image upload inside editor
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoB64' | 'signatureB64') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      alert("La imagen no debe superar 1.5MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (editingConfig) {
        setEditingConfig({
          ...editingConfig,
          [field]: reader.result as string
        });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* HEADER */}
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-500/30 text-xl">
              🎨
            </div>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                Estilos de Cotización
                {isCloudConnected ? (
                  <span className="text-[11px] font-normal bg-green-900/80 text-green-300 border border-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
                    Nube Supabase Sincronizada
                  </span>
                ) : (
                  <span className="text-[11px] font-normal bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full">
                    💾 Respaldo Local
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Guarda tus estilos con tus datos predeterminados. El estilo predeterminado se carga automáticamente al abrir la aplicación.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors text-2xl leading-none"
            aria-label="Cerrar modal"
          >
            &times;
          </button>
        </div>

        {/* FEEDBACK TOAST */}
        {feedbackMessage && (
          <div className="bg-emerald-50 text-emerald-800 border-b border-emerald-200 px-4 py-2 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {feedbackMessage}
          </div>
        )}

        {/* MODAL BODY */}
        <div className="p-6 bg-slate-50 flex-grow overflow-y-auto">

          {/* EDIT / CREATE VIEW */}
          {editingConfig ? (
            <form onSubmit={handleSaveEditingForm} className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                  <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    <span>{isCreatingNew ? '➕ Crear Nuevo Estilo' : '✏️ Modificar Estilo'}</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={editingConfig.isDefault}
                        onChange={(e) => setEditingConfig({ ...editingConfig, isDefault: e.target.checked })}
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                      />
                      ⭐ Establecer como Estilo Predeterminado
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nombre */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Nombre del Estilo *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingConfig.name}
                      onChange={(e) => setEditingConfig({ ...editingConfig, name: e.target.value })}
                      placeholder="Ej. Rembrandt Estándar, Corporativo, Clientes VIP..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none font-semibold text-slate-800"
                    />
                  </div>

                  {/* Eslogan */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      Eslogan / Subtítulo de Empresa
                    </label>
                    <input
                      type="text"
                      value={editingConfig.companyTagline || ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, companyTagline: e.target.value })}
                      placeholder="Ej. Arquitectura y Visualización 3D"
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                    />
                  </div>

                  {/* Tiempo de entrega */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      Tiempo de Entrega Predeterminado
                    </label>
                    <input
                      type="text"
                      value={editingConfig.deliveryTime || ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, deliveryTime: e.target.value })}
                      placeholder="Ej. 5 días hábiles"
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                    />
                  </div>

                  {/* Prefijo / Titulo */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      Prefijo / Título por Defecto para Clientes
                    </label>
                    <select
                      value={editingConfig.recipientPrefix || ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, recipientPrefix: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                    >
                      <option value="">Sin título automático</option>
                      <option value="Arq.">Arq.</option>
                      <option value="Ing.">Ing.</option>
                      <option value="Lic.">Lic.</option>
                      <option value="Dr.">Dr.</option>
                      <option value="Sr.">Sr.</option>
                      <option value="Sra.">Sra.</option>
                      <option value="Srita.">Srita.</option>
                    </select>
                  </div>

                  {/* Anticipo 50% */}
                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer bg-blue-50/60 p-2.5 rounded-lg border border-blue-200/70 w-full">
                      <input
                        type="checkbox"
                        checked={editingConfig.requireAdvance}
                        onChange={(e) => setEditingConfig({ ...editingConfig, requireAdvance: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span>Solicitar 50% de anticipo por defecto</span>
                    </label>
                  </div>

                  {/* Toggle IVA */}
                  <div className="flex items-center">
                    <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer bg-slate-50 p-2.5 rounded-lg border border-slate-200 w-full">
                      <input
                        type="checkbox"
                        checked={editingConfig.addIVA}
                        onChange={(e) => setEditingConfig({ ...editingConfig, addIVA: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span>Incluir IVA (16%) por defecto</span>
                    </label>
                  </div>

                  {/* Toggle Retenciones */}
                  <div className="flex items-center">
                    <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer bg-slate-50 p-2.5 rounded-lg border border-slate-200 w-full">
                      <input
                        type="checkbox"
                        checked={editingConfig.addWithholdings}
                        onChange={(e) => setEditingConfig({ ...editingConfig, addWithholdings: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span>Aplicar Retenciones Fiscales (RESICO/Persona Moral)</span>
                    </label>
                  </div>

                  {/* Retenciones % */}
                  {editingConfig.addWithholdings && (
                    <div className="md:col-span-2 grid grid-cols-2 gap-4 bg-amber-50 p-3 rounded-lg border border-amber-200">
                      <div>
                        <label className="block text-xs font-bold text-amber-900 mb-1">
                          % Retención IVA por defecto
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          value={editingConfig.ivaWithholdingPercentage}
                          onChange={(e) => setEditingConfig({ ...editingConfig, ivaWithholdingPercentage: parseFloat(e.target.value) || 0 })}
                          className="w-full p-2 bg-white border border-amber-300 rounded text-sm outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-amber-900 mb-1">
                          % Retención ISR por defecto
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={editingConfig.isrWithholdingPercentage}
                          onChange={(e) => setEditingConfig({ ...editingConfig, isrWithholdingPercentage: parseFloat(e.target.value) || 0 })}
                          className="w-full p-2 bg-white border border-amber-300 rounded text-sm outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Fiscales */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      RFC Emisor por Defecto (Opcional)
                    </label>
                    <input
                      type="text"
                      value={editingConfig.taxId || ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, taxId: e.target.value.toUpperCase() })}
                      placeholder="Ej. BARA880101XXX"
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      Razón Social por Defecto (Opcional)
                    </label>
                    <input
                      type="text"
                      value={editingConfig.legalName || ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, legalName: e.target.value })}
                      placeholder="Ej. Rembrandt Blanco Arrambide"
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                    />
                  </div>

                  {/* Términos y Condiciones */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      Términos y Condiciones Generales por Defecto
                    </label>
                    <textarea
                      rows={4}
                      value={editingConfig.generalConditions || ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, generalConditions: e.target.value })}
                      placeholder="Condiciones que aparecerán en el pie de página de la cotización..."
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none leading-relaxed"
                    />
                  </div>

                  {/* Logo y Firma */}
                  <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                    {/* Logo Section */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <label className="block text-xs font-bold text-slate-700 mb-2">
                        🖼️ Logo del Estilo
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-14 bg-white border border-slate-200 rounded flex items-center justify-center p-1 overflow-hidden">
                          {editingConfig.logoB64 ? (
                            <img src={editingConfig.logoB64} alt="Logo" className="max-h-full max-w-full object-contain" />
                          ) : (
                            <span className="text-[10px] text-slate-400">Sin logo</span>
                          )}
                        </div>
                        <div className="space-y-1.5 flex-1">
                          <label className="block cursor-pointer bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-center py-1 px-2 rounded text-xs font-medium transition-colors">
                            <span>Subir Archivo</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageFileChange(e, 'logoB64')}
                            />
                          </label>
                          {editingConfig.logoB64 && (
                            <button
                              type="button"
                              onClick={() => setEditingConfig({ ...editingConfig, logoB64: null })}
                              className="block w-full text-red-500 hover:text-red-700 text-[11px] text-center"
                            >
                              Quitar Logo
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Firma Section */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <label className="block text-xs font-bold text-slate-700 mb-2">
                        ✍️ Firma del Estilo
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-14 bg-white border border-slate-200 rounded flex items-center justify-center p-1 overflow-hidden">
                          {editingConfig.signatureB64 ? (
                            <img src={editingConfig.signatureB64} alt="Firma" className="max-h-full max-w-full object-contain" />
                          ) : (
                            <span className="text-[10px] text-slate-400">Sin firma</span>
                          )}
                        </div>
                        <div className="space-y-1.5 flex-1">
                          <label className="block cursor-pointer bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-center py-1 px-2 rounded text-xs font-medium transition-colors">
                            <span>Subir Archivo</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageFileChange(e, 'signatureB64')}
                            />
                          </label>
                          {editingConfig.signatureB64 && (
                            <button
                              type="button"
                              onClick={() => setEditingConfig({ ...editingConfig, signatureB64: null })}
                              className="block w-full text-red-500 hover:text-red-700 text-[11px] text-center"
                            >
                              Quitar Firma
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Footer */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingConfig(null);
                      setIsCreatingNew(false);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2"
                  >
                    {isSaving ? 'Guardando y Respaldando...' : '💾 Guardar Estilo'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* LIST VIEW */
            <div className="space-y-6">
              
              {/* TOP ACTION BAR */}
              <div className="flex flex-wrap gap-2 justify-between items-center bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleSaveCurrentAsConfig}
                    className="flex items-center gap-1.5 text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 px-3 py-2 rounded-lg transition-colors shadow-sm"
                    title="Crea un nuevo estilo con los datos que tienes escritos actualmente en el formulario"
                  >
                    <span>💾</span> Guardar como Nuevo Estilo
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleStartNewConfig}
                    className="flex items-center gap-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 px-3 py-2 rounded-lg transition-colors shadow-sm"
                  >
                    <span>➕</span> Crear Estilo desde Cero
                  </button>
                </div>

                {/* BACKUP / RESTORE BUTTONS */}
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={backupInputRef}
                    onChange={handleImportBackup}
                    accept=".json"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => backupInputRef.current?.click()}
                    className="flex items-center gap-1 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-md transition-colors"
                    title="Restaurar estilos desde un archivo JSON"
                  >
                    <span>📥</span> Restaurar
                  </button>
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="flex items-center gap-1 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-md transition-colors"
                    title="Descargar archivo de respaldo JSON de todos tus estilos"
                  >
                    <span>💾</span> Respaldar JSON
                  </button>
                </div>
              </div>

              {/* PROFILES LIST */}
              <div className="space-y-4">
                {configs.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 p-8">
                    <div className="text-4xl mb-3">🎨</div>
                    <h4 className="text-base font-bold text-slate-800 mb-1">Aún no tienes estilos guardados</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                      Guarda el estilo actual del formulario o crea uno nuevo para cargarlo rápidamente con un solo clic.
                    </p>
                    <div className="flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={handleSaveCurrentAsConfig}
                        className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors shadow-sm"
                      >
                        💾 Guardar Actual como Estilo
                      </button>
                      <button
                        type="button"
                        onClick={handleStartNewConfig}
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors"
                      >
                        ➕ Crear desde Cero
                      </button>
                    </div>
                  </div>
                ) : (
                  configs.map((config) => {
                    const isDefault = config.id === activeConfigId || config.isDefault;

                    return (
                      <div
                        key={config.id}
                        className={`bg-white rounded-xl border transition-all p-5 shadow-sm hover:shadow-md ${
                          isDefault 
                            ? 'border-amber-400 ring-2 ring-amber-100 bg-gradient-to-r from-amber-50/30 to-white' 
                            : 'border-slate-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-3 border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                              {config.name}
                            </h4>
                            {isDefault && (
                              <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                                <span>⭐</span> ESTILO PREDETERMINADO (Activo)
                              </span>
                            )}
                          </div>

                          {/* Top Action Buttons on Card */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                onApplyConfig(config);
                                showFeedback(`Estilo "${config.name}" cargado en el formulario.`);
                                onClose();
                              }}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-black text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                              title="Cargar estos valores inmediatamente en el cotizador"
                            >
                              <span>⚡</span> Aplicar Estilo
                            </button>

                            {!isDefault && (
                              <button
                                type="button"
                                onClick={() => handleSetAsDefault(config.id)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                                title="Hacer que este sea el estilo predeterminado al abrir la app"
                              >
                                <span>⭐</span> Predeterminado
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setEditingConfig({ ...config });
                                setIsCreatingNew(false);
                              }}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Editar estilo"
                            >
                              ✏️
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDuplicateConfig(config)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Duplicar estilo"
                            >
                              📋
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteConfig(config.id)}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar estilo"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        {/* SUMMARY CHIPS & DETAILS */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 mb-3">
                          <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Entrega</span>
                            <span className="font-semibold text-slate-700">{config.deliveryTime || 'A convenir'}</span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Anticipo</span>
                            <span className="font-semibold text-slate-700">{config.requireAdvance ? '50% Anticipo' : 'Pago único'}</span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Impuestos</span>
                            <span className="font-semibold text-slate-700">
                              {config.addIVA ? '+ IVA 16%' : 'Sin IVA'}
                              {config.addWithholdings ? ' (+ Ret.)' : ''}
                            </span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Identidad</span>
                            <span className="font-semibold text-slate-700">
                              {config.logoB64 ? '✓ Logo' : '✗ Logo'} | {config.signatureB64 ? '✓ Firma' : '✗ Firma'}
                            </span>
                          </div>
                        </div>

                        {/* CONDITIONS SNIPPET */}
                        {config.generalConditions && (
                          <div className="bg-slate-50/70 p-2 rounded border border-slate-100 text-[11px] text-slate-500 font-mono line-clamp-2">
                            {config.generalConditions}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <div>
            Total de estilos guardados: <strong className="text-slate-800">{configs.length}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors shadow-sm"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};

export default DefaultConfigsModal;
