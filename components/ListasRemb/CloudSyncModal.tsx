import React, { useState, useEffect } from 'react';
import { X, Cloud, Upload, Download, CheckCircle, AlertTriangle, KeyRound, Globe, Copy, ClipboardCheck } from 'lucide-react';
import { fetchListasFromSupabase, saveListasToSupabase } from './services/listasSyncService';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  getExportData: () => string;
  onImportData: (json: string) => boolean;
}

const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ isOpen, onClose, getExportData, onImportData }) => {
  const [activeTab, setActiveTab] = useState<'simulated' | 'manual' | 'api'>('simulated');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(localStorage.getItem('remb_mock_sync_time'));

  const [manualCode, setManualCode] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [copied, setCopied] = useState(false);

  const [apiKey, setApiKey] = useState(localStorage.getItem('remb_api_key') || '');
  const [binId, setBinId] = useState(localStorage.getItem('remb_bin_id') || '');

  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setMessage('');
      setManualCode('');
      setManualInput('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // --- 1. SUPABASE CLOUD SYNC ---
  const handleSimulatedUpload = async () => {
    setStatus('loading');
    setMessage('Sincronizando con Listas Remb en la nube...');
    
    const data = getExportData();
    localStorage.setItem('remb_cloud_mock_db', data);
    const ok = await saveListasToSupabase(data);
    
    const now = new Date().toLocaleString();
    localStorage.setItem('remb_mock_sync_time', now);
    setLastSyncTime(now);

    if (ok) {
      setStatus('success');
      setMessage('¡Datos sincronizados correctamente con Listas Remb!');
    } else {
      setStatus('success');
      setMessage('¡Datos guardados localmente!');
    }
  };

  const handleSimulatedDownload = async () => {
    setStatus('loading');
    setMessage('Descargando desde Listas Remb...');
    
    const cloudData = await fetchListasFromSupabase();
    if (cloudData) {
      const jsonStr = JSON.stringify(cloudData);
      localStorage.setItem('remb_cloud_mock_db', jsonStr);
      if (onImportData(jsonStr)) {
        const now = new Date().toLocaleString();
        localStorage.setItem('remb_mock_sync_time', now);
        setLastSyncTime(now);
        setStatus('success');
        setMessage('¡Datos sincronizados desde Listas Remb exitosamente!');
        return;
      }
    }

    const fallback = localStorage.getItem('remb_cloud_mock_db');
    if (fallback && onImportData(fallback)) {
      setStatus('success');
      setMessage('Datos restaurados exitosamente.');
    } else {
      setStatus('error');
      setMessage('No se encontró ninguna copia en la nube.');
    }
  };

  // --- 2. MANUAL SYNC (TEXT) ---
  const generateManualCode = () => {
      const json = getExportData();
      try {
          const code = btoa(unescape(encodeURIComponent(json)));
          setManualCode(code);
      } catch {
          alert('Error generando código. Tus datos pueden ser demasiado grandes para este método.');
      }
  };

  const copyManualCode = () => {
      navigator.clipboard.writeText(manualCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const loadManualCode = () => {
      if(!manualInput) return;
      try {
          const json = decodeURIComponent(escape(atob(manualInput)));
          if(onImportData(json)) {
              alert("¡Datos cargados correctamente!");
              onClose();
          } else {
              alert("Código inválido.");
          }
      } catch {
          alert("Código inválido o corrupto.");
      }
  };

  // --- 3. API SYNC (JSONBin.io Implementation) ---
  const handleApiUpload = async () => {
      if (!apiKey) { alert("Necesitas una API Key"); return; }
      
      setStatus('loading');
      setMessage('Subiendo a JSONBin...');

      localStorage.setItem('remb_api_key', apiKey);
      if(binId) localStorage.setItem('remb_bin_id', binId);

      const data = JSON.parse(getExportData());

      try {
          const method = binId ? 'PUT' : 'POST';
          const url = binId 
            ? `https://api.jsonbin.io/v3/b/${binId}`
            : 'https://api.jsonbin.io/v3/b';
          
          const headers: HeadersInit = {
              'Content-Type': 'application/json',
              'X-Master-Key': apiKey
          };
          if (!binId) {
             headers['X-Bin-Private'] = 'true';
          }

          const response = await fetch(url, {
              method: method,
              headers: headers,
              body: JSON.stringify(data)
          });

          const result = await response.json();

          if (response.ok) {
              setStatus('success');
              setMessage('Guardado en la red exitosamente.');
              if (!binId && result.metadata?.id) {
                  setBinId(result.metadata.id);
                  localStorage.setItem('remb_bin_id', result.metadata.id);
                  setMessage(`Guardado. TU BIN ID ES: ${result.metadata.id} (Guárdalo para conectar otro dispositivo)`);
              }
          } else {
              setStatus('error');
              setMessage(`Error API: ${result.message || 'Desconocido'}`);
          }

      } catch {
          setStatus('error');
          setMessage('Error de conexión.');
      }
  };

  const handleApiDownload = async () => {
      if (!apiKey || !binId) { alert("Necesitas API Key y Bin ID"); return; }
      
      setStatus('loading');
      setMessage('Descargando...');
      localStorage.setItem('remb_api_key', apiKey);
      localStorage.setItem('remb_bin_id', binId);

      try {
          const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
              method: 'GET',
              headers: {
                  'X-Master-Key': apiKey
              }
          });

          const result = await response.json();
          
          if (response.ok) {
              const record = result.record; 
              if (onImportData(JSON.stringify(record))) {
                  setStatus('success');
                  setMessage('Sincronizado correctamente.');
              } else {
                  setStatus('error');
                  setMessage('Formato de datos incorrecto.');
              }
          } else {
              setStatus('error');
              setMessage('No se pudo descargar. Verifica tu ID y Key.');
          }

      } catch {
          setStatus('error');
          setMessage('Error de red.');
      }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
             <Cloud className="w-6 h-6" />
             <h2 className="font-bold text-lg">Sincronización</h2>
          </div>
          <button onClick={onClose} className="hover:bg-indigo-500 p-1 rounded-full"><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
            <button 
                onClick={() => setActiveTab('simulated')} 
                className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'simulated' ? 'border-indigo-600 text-indigo-700 bg-indigo-50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                Nube Remb
            </button>
            <button 
                onClick={() => setActiveTab('manual')} 
                className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'manual' ? 'border-indigo-600 text-indigo-700 bg-indigo-50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                Manual (Código)
            </button>
            <button 
                onClick={() => setActiveTab('api')} 
                className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'api' ? 'border-indigo-600 text-indigo-700 bg-indigo-50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                Red Real (API)
            </button>
        </div>

        {/* Content */}
        <div className="p-6">
            
            {/* --- TAB 1: SUPABASE CLOUD --- */}
            {activeTab === 'simulated' && (
                <div className="space-y-6 text-center">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800 text-sm">
                        <p className="font-bold mb-1">Sincronización Automática con Listas Remb</p>
                        <p>Conectado en tiempo real con <strong>listas-remb.vercel.app</strong> mediante la nube de Rembrandt.</p>
                    </div>

                    <div className="flex justify-center gap-8">
                        <button 
                            onClick={handleSimulatedUpload}
                            disabled={status === 'loading'}
                            className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group"
                        >
                            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Upload className="w-8 h-8" />
                            </div>
                            <span className="font-medium text-slate-700">Subir a la Nube</span>
                        </button>
                        <button 
                            onClick={handleSimulatedDownload}
                            disabled={status === 'loading'}
                            className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group"
                        >
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Download className="w-8 h-8" />
                            </div>
                            <span className="font-medium text-slate-700">Descargar</span>
                        </button>
                    </div>
                    {lastSyncTime && <p className="text-xs text-slate-400">Última sincronización: {lastSyncTime}</p>}
                </div>
            )}

            {/* --- TAB 2: MANUAL --- */}
            {activeTab === 'manual' && (
                <div className="space-y-4">
                     <p className="text-sm text-slate-600">
                         Genera un código de texto que representa todos tus datos. Cópialo y envíalo por WhatsApp/Email a tu otro dispositivo para cargarlo allí.
                     </p>
                     
                     <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                         <h4 className="font-bold text-slate-700 text-sm mb-2">Exportar (Dispositivo A)</h4>
                         {!manualCode ? (
                             <button onClick={generateManualCode} className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">Generar Código</button>
                         ) : (
                             <div className="space-y-2">
                                 <textarea readOnly value={manualCode} className="w-full h-24 text-xs p-2 rounded border border-slate-300 bg-white" />
                                 <button onClick={copyManualCode} className="w-full py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-indigo-200">
                                     {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                     {copied ? 'Copiado' : 'Copiar Código'}
                                 </button>
                             </div>
                         )}
                     </div>

                     <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                         <h4 className="font-bold text-slate-700 text-sm mb-2">Importar (Dispositivo B)</h4>
                         <input 
                            value={manualInput}
                            onChange={(e) => setManualInput(e.target.value)}
                            placeholder="Pega el código aquí..."
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm mb-2"
                         />
                         <button onClick={loadManualCode} className="w-full py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-emerald-700">
                             <ClipboardCheck className="w-4 h-4" /> Cargar Datos
                         </button>
                     </div>
                </div>
            )}

            {/* --- TAB 3: API (REAL) --- */}
            {activeTab === 'api' && (
                <div className="space-y-4">
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 text-xs text-orange-800 flex gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <p>Requiere configuración técnica. Usa <strong>JSONBin.io</strong> (gratuito) para obtener una API Key.</p>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">API Master Key</label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="password" 
                                    value={apiKey} 
                                    onChange={(e) => setApiKey(e.target.value)}
                                    className="w-full pl-9 p-2 border border-slate-300 rounded-lg text-sm"
                                    placeholder="$2b$10$..."
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Bin ID (Dejar vacío para crear nuevo)</label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    value={binId} 
                                    onChange={(e) => setBinId(e.target.value)}
                                    className="w-full pl-9 p-2 border border-slate-300 rounded-lg text-sm"
                                    placeholder="65d4..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                         <button 
                            onClick={handleApiUpload}
                            disabled={status === 'loading'}
                            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                         >
                             <Upload className="w-4 h-4" /> Subir
                         </button>
                         <button 
                            onClick={handleApiDownload}
                            disabled={status === 'loading'}
                            className="flex-1 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                         >
                             <Download className="w-4 h-4" /> Bajar
                         </button>
                    </div>
                </div>
            )}

            {/* Status Messages */}
            {status !== 'idle' && (
                <div className={`mt-6 p-3 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 ${
                    status === 'loading' ? 'bg-blue-50 text-blue-700' :
                    status === 'success' ? 'bg-green-50 text-green-700' :
                    'bg-red-50 text-red-700'
                }`}>
                    {status === 'loading' && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                    {status === 'success' && <CheckCircle className="w-5 h-5" />}
                    {status === 'error' && <AlertTriangle className="w-5 h-5" />}
                    <span className="text-sm font-medium">{message}</span>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default CloudSyncModal;
