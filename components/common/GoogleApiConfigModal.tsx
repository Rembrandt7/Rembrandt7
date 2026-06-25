import React, { useState, useEffect } from 'react';
import { ExternalLink, Database, X } from 'lucide-react';
import { useLinks } from '../../contexts/LinkContext';

export const GoogleApiConfigModal: React.FC = () => {
    const { googleApiConfig, updateGoogleApiConfig } = useLinks();

    const [tempConfig, setTempConfig] = useState({
        clientId: googleApiConfig?.clientId || '',
        clientSecret: googleApiConfig?.clientSecret || '',
        apiKey: googleApiConfig?.apiKey || ''
    });

    const [isOpen, setIsOpen] = useState(!googleApiConfig);

    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        window.addEventListener('open-google-config', handleOpen);
        return () => window.removeEventListener('open-google-config', handleOpen);
    }, []);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!tempConfig.clientId && !tempConfig.apiKey) {
            alert('Por favor ingresa al menos una API Key de Gemini o un Client ID de Google.');
            return;
        }
        updateGoogleApiConfig(tempConfig);
        setIsOpen(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-xl shadow-2xl border border-blue-500/30 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-blue-500/50">
                <div className="p-4 bg-blue-900/30 border-b border-blue-500/30 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                        <Database className="w-6 h-6 text-blue-400" />
                        <h3 className="text-xl font-bold text-white tracking-wide">
                            Integración Google APIs
                        </h3>
                    </div>
                    {googleApiConfig && (
                        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    )}
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    <div className="bg-slate-900/50 p-5 rounded-lg border border-slate-700/50 space-y-4">
                        <h4 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
                            Configuración de API
                        </h4>
                        
                        <div className="p-4 bg-slate-800 rounded-lg text-sm text-slate-300 border border-slate-700">
                            <p className="mb-2">Para habilitar la sincronización local, proporciona las credenciales de tu proyecto de Google Cloud Console:</p>
                            <ol className="list-decimal pl-5 space-y-1 mb-3 text-xs text-slate-400">
                                <li>Crea un proyecto en Google Cloud.</li>
                                <li>Habilita las <strong>Google Calendar API</strong>, <strong>Gmail API</strong> y <strong>Generative Language API (Gemini)</strong>.</li>
                                <li>En <em>Credenciales</em>, crea un <strong>OAuth 2.0 Client ID</strong> (Tipo Web application).</li>
                                <li>Crea una <strong>API Key</strong> para el acceso a Gemini AI.</li>
                            </ol>
                            <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors text-xs font-semibold">
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Abrir Google Cloud Console
                            </a>
                        </div>

                        <div className="grid grid-cols-1 gap-4 mb-4 mt-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Client ID (OAuth 2.0)</label>
                                <input 
                                    type="text" 
                                    value={tempConfig.clientId} 
                                    onChange={(e) => setTempConfig({...tempConfig, clientId: e.target.value})}
                                    className="w-full bg-slate-800 border-b-2 border-blue-500/50 text-white p-2.5 rounded-t-md text-sm focus:outline-none focus:border-blue-400 font-mono"
                                    placeholder="xxx.apps.googleusercontent.com"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Client Secret (Servidor)</label>
                                <input 
                                    type="password" 
                                    value={tempConfig.clientSecret} 
                                    onChange={(e) => setTempConfig({...tempConfig, clientSecret: e.target.value})}
                                    className="w-full bg-slate-800 border-b-2 border-blue-500/50 text-white p-2.5 rounded-t-md text-sm focus:outline-none focus:border-blue-400 font-mono"
                                    placeholder="GOCSPX-..."
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">API Key (Gemini)</label>
                                <input 
                                    type="password" 
                                    value={tempConfig.apiKey} 
                                    onChange={(e) => setTempConfig({...tempConfig, apiKey: e.target.value})}
                                    className="w-full bg-slate-800 border-b-2 border-blue-500/50 text-white p-2.5 rounded-t-md text-sm focus:outline-none focus:border-blue-400 font-mono"
                                    placeholder="AIzaSy..."
                                />
                            </div>
                        </div>
                        
                        <div className="flex justify-end pt-2">
                            <button 
                                onClick={handleSave}
                                className="px-4 py-2 bg-blue-600/90 hover:bg-blue-500 text-white rounded shadow-lg shadow-blue-900/20 text-sm font-semibold transition"
                            >
                                Guardar Configuración
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
