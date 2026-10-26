import React, { useState, useEffect } from 'react';
import { Cloud, UploadCloud, DownloadCloud, Copy, Check, X, Key, RefreshCw, AlertCircle, Database } from 'lucide-react';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  getExportData: () => string;
  onImportData: (jsonString: string) => boolean;
  onSupabasePush?: () => Promise<boolean>;
  onSupabasePull?: () => Promise<boolean>;
  supabaseSyncStatus?: 'idle' | 'syncing' | 'synced' | 'error';
}

const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ 
  isOpen, 
  onClose, 
  getExportData, 
  onImportData,
  onSupabasePush,
  onSupabasePull,
  supabaseSyncStatus = 'synced'
}) => {
  const [activeTab, setActiveTab] = useState<'supabase' | 'manual' | 'api'>('supabase');
  
  const [exportCode, setExportCode] = useState('');
  const [importCode, setImportCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [supabaseMsg, setSupabaseMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [apiKey, setApiKey] = useState('');
  const [binId, setBinId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const json = getExportData();
      const encoded = btoa(unescape(encodeURIComponent(json)));
      setExportCode(encoded);
      
      const savedKey = localStorage.getItem('remb-cloud-key');
      const savedBin = localStorage.getItem('remb-cloud-bin');
      if (savedKey) setApiKey(savedKey);
      if (savedBin) setBinId(savedBin);
      setSupabaseMsg(null);
    }
  }, [isOpen, getExportData]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(exportCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualImport = () => {
    try {
      if (!importCode.trim()) return;
      const json = decodeURIComponent(escape(atob(importCode.trim())));
      const success = onImportData(json);
      if (success) {
        setImportStatus('success');
        setTimeout(() => {
            setImportStatus('idle');
            setImportCode('');
            onClose();
        }, 1500);
      } else {
        setImportStatus('error');
      }
    } catch (e) {
      console.error(e);
      setImportStatus('error');
    }
  };

  const saveApiConfig = () => {
    localStorage.setItem('remb-cloud-key', apiKey);
    localStorage.setItem('remb-cloud-bin', binId);
  };

  const handleCloudUpload = async () => {
    if (!apiKey) {
        setApiStatus('Error: Falta la API Key');
        return;
    }
    setIsLoading(true);
    setApiStatus('Subiendo datos a la nube...');
    saveApiConfig();

    const rawData = getExportData();
    
    try {
        let url = 'https://api.jsonbin.io/v3/b';
        let method = 'POST';
        
        if (binId) {
            url = `https://api.jsonbin.io/v3/b/${binId}`;
            method = 'PUT';
        }

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': apiKey,
                'X-Bin-Name': 'ListasRemb_Backup'
            },
            body: rawData
        });

        if (!response.ok) throw new Error('Error en la conexión con JSONBin');

        const result = await response.json();
        
        if (!binId && result.metadata?.id) {
            setBinId(result.metadata.id);
            localStorage.setItem('remb-cloud-bin', result.metadata.id);
        }

        setApiStatus('¡Guardado en la nube exitosamente!');
    } catch (error) {
        console.error(error);
        setApiStatus('Error: Verifica tu API Key o Bin ID.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleCloudDownload = async () => {
      if (!apiKey || !binId) {
          setApiStatus('Error: Necesitas API Key y Bin ID para descargar.');
          return;
      }
      setIsLoading(true);
      setApiStatus('Descargando datos...');
      saveApiConfig();

      try {
          const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
              method: 'GET',
              headers: {
                  'X-Master-Key': apiKey
              }
          });

          if (!response.ok) throw new Error('No se pudo encontrar el archivo en la nube.');

          const result = await response.json();
          const jsonString = JSON.stringify(result.record);
          
          const success = onImportData(jsonString);
          if (success) {
              setApiStatus('¡Datos sincronizados correctamente!');
              setTimeout(() => onClose(), 1500);
          } else {
              setApiStatus('Error: El formato de datos en la nube no es válido.');
          }

      } catch (error) {
          console.error(error);
          setApiStatus('Error al descargar. Verifica las credenciales.');
      } finally {
          setIsLoading(false);
      }
  };

  const handlePushSupabase = async () => {
    if (!onSupabasePush) return;
    setIsLoading(true);
    setSupabaseMsg(null);
    const ok = await onSupabasePush();
    setIsLoading(false);
    if (ok) {
      setSupabaseMsg({ type: 'success', text: '¡Listas guardadas en la nube de Rembrandt7 (Supabase)!' });
    } else {
      setSupabaseMsg({ type: 'error', text: 'No se pudo subir a Supabase. Verifica tu conexión.' });
    }
  };

  const handlePullSupabase = async () => {
    if (!onSupabasePull) return;
    setIsLoading(true);
    setSupabaseMsg(null);
    const ok = await onSupabasePull();
    setIsLoading(false);
    if (ok) {
      setSupabaseMsg({ type: 'success', text: '¡Listas descargadas y actualizadas desde la nube!' });
    } else {
      setSupabaseMsg({ type: 'error', text: 'No se encontraron datos remotos o hubo un error.' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-600 rounded-lg">
                    <Cloud className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h3 className="font-bold text-lg">Sincronización Nube</h3>
                    <p className="text-xs text-slate-400">Mantén tus listas conectadas en todos tus dispositivos</p>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
            </button>
        </div>

        <div className="flex border-b border-slate-200 bg-slate-50">
            <button 
                onClick={() => setActiveTab('supabase')}
                className={`flex-1 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${activeTab === 'supabase' ? 'border-brand-600 text-brand-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                Nube Automática
            </button>
            <button 
                onClick={() => setActiveTab('manual')}
                className={`flex-1 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${activeTab === 'manual' ? 'border-brand-600 text-brand-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                Código Rápido
            </button>
            <button 
                onClick={() => setActiveTab('api')}
                className={`flex-1 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${activeTab === 'api' ? 'border-brand-600 text-brand-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                JSONBin API
            </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
            
            {activeTab === 'supabase' && (
              <div className="space-y-5">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-xs text-blue-800 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-sm">
                    <Database className="w-4 h-4 text-brand-600" /> Conectado a Rembrandt Cloud (listas_remb.json)
                  </p>
                  <p>
                    Tus listas se guardan y sincronizan automáticamente en la nube compartida entre <strong>Rembrandt7</strong> y <strong>listas-remb.vercel.app</strong>.
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-600">Estado actual:</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                    supabaseSyncStatus === 'syncing' ? 'bg-amber-100 text-amber-700' :
                    supabaseSyncStatus === 'error' ? 'bg-red-100 text-red-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    <RefreshCw className={`w-3.5 h-3.5 ${supabaseSyncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                    {supabaseSyncStatus === 'syncing' ? 'Sincronizando...' : supabaseSyncStatus === 'error' ? 'Error de red' : 'Sincronizado'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={handlePushSupabase}
                    disabled={isLoading}
                    className="flex flex-col items-center justify-center p-4 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all shadow-lg shadow-brand-200 disabled:opacity-50"
                  >
                    {isLoading ? <RefreshCw className="w-6 h-6 animate-spin mb-1" /> : <UploadCloud className="w-6 h-6 mb-1" />}
                    <span className="font-bold text-sm">Subir Ahora</span>
                    <span className="text-[10px] text-brand-100">Guardar en Nube</span>
                  </button>

                  <button
                    onClick={handlePullSupabase}
                    disabled={isLoading}
                    className="flex flex-col items-center justify-center p-4 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-all shadow-lg shadow-slate-200 disabled:opacity-50"
                  >
                    {isLoading ? <RefreshCw className="w-6 h-6 animate-spin mb-1" /> : <DownloadCloud className="w-6 h-6 mb-1" />}
                    <span className="font-bold text-sm">Descargar Ahora</span>
                    <span className="text-[10px] text-slate-400">Traer de Nube</span>
                  </button>
                </div>

                {supabaseMsg && (
                  <div className={`p-3 rounded-lg text-xs font-medium text-center ${
                    supabaseMsg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {supabaseMsg.text}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'manual' && (
                <>
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-xs text-blue-800 space-y-1">
                        <p className="font-bold flex items-center gap-1"><AlertCircle className="w-4 h-4"/> ¿Cómo funciona?</p>
                        <p>1. Copia el <strong>Código de Respaldo</strong> de este dispositivo.</p>
                        <p>2. Envíatelo por WhatsApp o Correo.</p>
                        <p>3. Pégalo en tu otro dispositivo para cargar tus listas exactas.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">1. Copiar de este dispositivo</label>
                        <div className="relative">
                            <textarea 
                                readOnly 
                                value={exportCode} 
                                className="w-full h-24 bg-slate-100 border border-slate-200 rounded-xl p-3 text-[10px] font-mono text-slate-600 resize-none focus:outline-none"
                            />
                            <button 
                                onClick={handleCopyCode}
                                className="absolute top-2 right-2 bg-white border border-slate-200 shadow-sm px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-brand-600 hover:border-brand-200 flex items-center gap-1 transition-all"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                {copied ? 'Copiado' : 'Copiar Código'}
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 my-4"></div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">2. Pegar en otro dispositivo</label>
                        <textarea 
                            value={importCode}
                            onChange={(e) => setImportCode(e.target.value)}
                            placeholder="Pega aquí el código largo que copiaste..."
                            className="w-full h-24 bg-white border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-800 resize-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:outline-none"
                        />
                        <button 
                            onClick={handleManualImport}
                            disabled={!importCode.trim()}
                            className={`w-full py-3 rounded-xl font-bold text-sm text-white shadow-lg flex items-center justify-center gap-2 transition-all ${
                                importStatus === 'success' ? 'bg-emerald-500' :
                                importStatus === 'error' ? 'bg-red-500' :
                                'bg-slate-900 hover:bg-slate-800 disabled:opacity-50'
                            }`}
                        >
                            {importStatus === 'success' ? (
                                <> <Check className="w-4 h-4" /> ¡Datos Cargados! </>
                            ) : importStatus === 'error' ? (
                                <> <X className="w-4 h-4" /> Código Inválido </>
                            ) : (
                                <> <DownloadCloud className="w-4 h-4" /> Cargar Datos del Código </>
                            )}
                        </button>
                    </div>
                </>
            )}

            {activeTab === 'api' && (
                <div className="space-y-5">
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl text-xs text-amber-800 space-y-1">
                        <p className="font-bold">Configuración Única (Gratis)</p>
                        <p>Conecta con <strong>JSONBin.io</strong> para tener una nube privada.</p>
                        <ol className="list-decimal pl-4 space-y-0.5 mt-1">
                            <li>Crea una cuenta gratis en <a href="https://jsonbin.io" target="_blank" rel="noreferrer" className="underline font-bold">jsonbin.io</a></li>
                            <li>Ve a "API Keys" y copia tu "Master Key".</li>
                            <li>Pégala abajo y dale a "Subir a la Nube". Se generará un ID automático.</li>
                        </ol>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">X-Master-Key (API Key)</label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="password" 
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="$2b$10$..."
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 font-mono"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">Bin ID (Identificador del Archivo)</label>
                            <div className="relative">
                                <Cloud className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    value={binId}
                                    onChange={(e) => setBinId(e.target.value)}
                                    placeholder="Se genera al subir por primera vez..."
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button 
                            onClick={handleCloudUpload}
                            disabled={isLoading}
                            className="flex flex-col items-center justify-center p-4 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all shadow-lg shadow-brand-200 disabled:opacity-50"
                        >
                            {isLoading ? <RefreshCw className="w-6 h-6 animate-spin mb-1"/> : <UploadCloud className="w-6 h-6 mb-1" />}
                            <span className="font-bold text-sm">Subir a Nube</span>
                            <span className="text-[10px] text-brand-200">Guardar cambios</span>
                        </button>

                        <button 
                            onClick={handleCloudDownload}
                            disabled={isLoading || !binId}
                            className="flex flex-col items-center justify-center p-4 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-all shadow-lg shadow-slate-200 disabled:opacity-50"
                        >
                            {isLoading ? <RefreshCw className="w-6 h-6 animate-spin mb-1"/> : <DownloadCloud className="w-6 h-6 mb-1" />}
                            <span className="font-bold text-sm">Descargar</span>
                            <span className="text-[10px] text-slate-400">Actualizar este disp.</span>
                        </button>
                    </div>

                    {apiStatus && (
                        <div className={`p-3 rounded-lg text-xs font-medium text-center ${
                            apiStatus.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                            {apiStatus}
                        </div>
                    )}
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default CloudSyncModal;