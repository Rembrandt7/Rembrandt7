
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, X, Lock, Unlock, Sparkles } from 'lucide-react';
import IconButton from './common/IconButton';
import Spinner from './common/Spinner';
import { SUPABASE_CONFIG } from '../utils/constants';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from "@google/genai";
import { useLinks } from '../contexts/LinkContext';

interface DatabaseViewerProps {}

// Reordered as requested: Contactos -> Fraccionamientos -> Arquitecturas -> Trabajos -> savesjson
const PREDEFINED_TABLES = ['Contactos', 'Fraccionamientos', 'Arquitecturas', 'Trabajos', 'savesjson'];

const DatabaseViewer: React.FC<DatabaseViewerProps> = () => {
    const { googleApiConfig } = useLinks();

    // Config State (Starts closed per request)
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [url, setUrl] = useState(SUPABASE_CONFIG.URL);
    const [key, setKey] = useState(SUPABASE_CONFIG.KEY);
    const [bucketName, setBucketName] = useState('savejson');
    
    // Selection & Data State
    const [tableName, setTableName] = useState(PREDEFINED_TABLES[0]);
    const [searchTerm, setSearchTerm] = useState(''); 
    
    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState<string>('');
    const [isSavingFile, setIsSavingFile] = useState(false);
    const [isCopying, setIsCopying] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [newRecordData, setNewRecordData] = useState<{[key:string]: any}>({});
    const [editingId, setEditingId] = useState<string | number | null>(null);
    const [editFormData, setEditFormData] = useState<{[key:string]: any}>({});
    
    const [lockedFiles, setLockedFiles] = useState<Set<string>>(new Set(['rembrandt_config', 'rembrandt_config_number']));
    const [assistantPrompt, setAssistantPrompt] = useState('');
    const [isAssistantLoading, setIsAssistantLoading] = useState(false);

    const toggleLock = (fileName: string) => {
        if (fileName.startsWith('rembrandt_config')) return; // Cannot unlock these
        setLockedFiles(prev => {
            const next = new Set(prev);
            if (next.has(fileName)) next.delete(fileName);
            else next.add(fileName);
            return next;
        });
    };

    const handleAssistantModify = async () => {
        if (!selectedFile || !assistantPrompt) return;
        setIsAssistantLoading(true);
        try {
            const apiKey = googleApiConfig?.apiKey || process.env.GEMINI_API_KEY || '';
            const ai = new GoogleGenAI({ 
                apiKey: googleApiConfig?.apiKey || process.env.GEMINI_API_KEY || '',
                baseUrl: `${window.location.origin}/api/proxy/google`
            });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `Modify the following JSON content based on this prompt: "${assistantPrompt}". Return ONLY the modified JSON string.
                Content:
                ${fileContent}`,
            });
            setFileContent(response.text.trim());
        } catch (err) {
            console.error(err);
            alert('Error al usar el asistente');
        } finally {
            setIsAssistantLoading(false);
        }
    };

    const handleFileClick = async (fileName: string) => {
        setSelectedFile(fileName);
        setIsLoading(true);
        try {
            const supabaseLocal = createClient(url, key);
            const { data, error } = await supabaseLocal
                .storage
                .from(bucketName)
                .download(fileName);
            
            if (error) throw error;
            
            const text = await data.text();
            setFileContent(text);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveFile = async () => {
        if (!selectedFile) return;
        setIsSavingFile(true);
        try {
            const supabaseLocal = createClient(url, key);
            const { error } = await supabaseLocal
                .storage
                .from(bucketName)
                .upload(selectedFile, fileContent, {
                    contentType: 'application/json',
                    upsert: true
                });
            
            if (error) throw error;
            alert('Archivo guardado exitosamente');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSavingFile(false);
        }
    };

    // Initial connection check
    useEffect(() => {
        if(url && key) fetchData();
    }, []); 

    const fetchData = async () => {
        if (!url || !key || !tableName) return;

        setIsLoading(true);
        setError(null);

        try {
            if (tableName === 'savesjson') {
                const supabaseLocal = createClient(url, key);
                // Handle Storage Bucket Listing
                const { data: files, error } = await supabaseLocal
                    .storage
                    .from(bucketName)
                    .list();

                if (error) {
                    throw error;
                }

                if (files) {
                    // Transform file list to match table data structure
                    const fileData = files
                        .filter(f => f.name !== '.emptyFolderPlaceholder')
                        .map(f => ({
                            name: f.name,
                            size: f.metadata?.size,
                            created_at: f.created_at,
                            last_modified: f.updated_at || f.created_at
                        }));
                    setData(fileData);
                    setIsConnected(true);
                }
            } else {
                // Handle Database Table Query
                const baseUrl = url && url.endsWith('/') ? url.slice(0, -1) : url;
                const endpoint = `${baseUrl}/rest/v1/${tableName}?select=*`;

                const response = await fetch(endpoint, {
                    method: 'GET',
                    headers: {
                        'apikey': key,
                        'Authorization': `Bearer ${key}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    if (response.status === 404) {
                         setError(`La tabla '${tableName}' no se encontró.`);
                         setData([]);
                    } else {
                         const errorData = await response.json().catch(() => ({}));
                         throw new Error(errorData.message || `Error ${response.status}`);
                    }
                } else {
                    const result = await response.json();
                    // Default sort by ID if exists, otherwise keep DB order
                    if (result.length > 0 && 'id' in result[0]) {
                        result.sort((a: any, b: any) => (b.id > a.id ? 1 : -1));
                    }
                    setData(result);
                    setIsConnected(true);
                }
            }
        } catch (err: any) {
            console.error("Fetch Error:", err);
            setError(err.message || "Error al cargar datos.");
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        setNewRecordData({});
        setEditingId(null);
        setSearchTerm(''); 
        setSortConfig(null); // Reset sort on table change
    }, [tableName]);

    // Helpers to find the Primary Key
    const getPrimaryKey = (row: any) => {
        if (!row) return 'id';
        if ('id' in row) return 'id';
        const idKey = Object.keys(row).find(k => k.toLowerCase() === 'id' || (k && k.toLowerCase().endsWith('_id')));
        return idKey || Object.keys(row)[0];
    };

    const getRowId = (row: any) => {
        const key = getPrimaryKey(row);
        return row[key];
    };

    // --- Sorting Logic ---
    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // --- Copy Data Logic ---
    const handleCopyData = async () => {
        if (processedData.length === 0) return;
        try {
            await navigator.clipboard.writeText(JSON.stringify(processedData, null, 2));
            setIsCopying(true);
            setTimeout(() => setIsCopying(false), 2000);
        } catch (err) {
            console.error("Failed to copy data:", err);
        }
    };

    // --- CRUD Operations ---

    const checkDuplicateWithAI = async (newRecord: any, existingData: any[], table: string) => {
        try {
            // Preparar contexto reducido para la IA (primeros 40 registros para evitar sobrecarga)
            const contextData = existingData.slice(0, 40).map(row => {
                const { id, created_at, ...importantFields } = row;
                return importantFields;
            });

            const prompt = `Analiza si el NUEVO REGISTRO es un duplicado o extremadamente similar a los REGISTROS EXISTENTES en la tabla "${table}".
            
NUEVO REGISTRO A INSERTAR:
${JSON.stringify(newRecord, null, 2)}

MUESTRA DE REGISTROS EXISTENTES:
${JSON.stringify(contextData, null, 2)}

REGLAS:
1. Responde ÚNICAMENTE en formato JSON.
2. Si el registro ya existe (mismo nombre, cliente o datos clave similares), pon "isDuplicate": true.
3. Ignora diferencias menores de mayúsculas, acentos o espacios.

Respuesta esperada:
{
    "isDuplicate": boolean,
    "reason": "Explicación breve de por qué es duplicado o por qué no",
    "similarityScore": 0.0 a 1.0
}`;

            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'gemma 4',
                    prompt: prompt,
                    stream: false,
                    format: 'json'
                })
            });

            if (!response.ok) throw new Error('Ollama no está respondiendo');
            
            const result = await response.json();
            const aiResponse = typeof result.response === 'string' ? JSON.parse(result.response) : result.response;
            return aiResponse;
        } catch (error) {
            console.error("Error en validación IA Local:", error);
            // Si la IA falla, notificamos pero permitimos continuar si el usuario lo desea?
            // El usuario pidió que SOLO funcione con gemma 4, así que seremos estrictos.
            return { isDuplicate: false, error: "Servicio de IA Local (Gemma 4) no disponible" };
        }
    };

    const handleAddRecord = async () => {
        if (tableName === 'savesjson') {
            const fileName = newRecordData['name'];
            const fileContent = newRecordData['content'];

            if (!fileName || !fileContent) {
                alert("Por favor, ingrese un nombre de archivo y contenido JSON.");
                return;
            }

            let parsedContent;
            try {
                parsedContent = JSON.parse(fileContent);
            } catch (e) {
                alert("El contenido no es un JSON válido.");
                return;
            }

            setIsSaving(true);
            setError(null);
            try {
                const supabaseLocal = createClient(url, key);
                const finalFileName = fileName && fileName.endsWith('.json') ? fileName : `${fileName}.json`;
                const { error } = await supabaseLocal
                    .storage
                    .from(bucketName)
                    .upload(finalFileName, JSON.stringify(parsedContent, null, 2), {
                        contentType: 'application/json',
                        upsert: true
                    });

                if (error) throw error;
                
                setNewRecordData({});
                fetchData();
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsSaving(false);
            }
            return;
        }

        setIsSaving(true);
        setError(null);

        // --- VALIDACIÓN CON IA LOCAL (GEMMA 4) ---
        toast.info("Validando duplicados con Gemma 4...");
        const aiResult = await checkDuplicateWithAI(newRecordData, data, tableName);
        
        if (aiResult.isDuplicate) {
            alert(`⚠️ POSIBLE DUPLICADO DETECTADO POR GEMMA 4:\n\n${aiResult.reason}\n\nPor favor, revisa el registro antes de continuar.`);
            setIsSaving(false);
            return;
        }

        if (aiResult.error) {
            toast.error(aiResult.error);
            // Si hay error de conexión, el usuario decide si continuar sin validación.
            if (!confirm("No se pudo conectar con Gemma 4 para verificar duplicados. ¿Deseas guardar el registro de todos modos?")) {
                setIsSaving(false);
                return;
            }
        }
        // -----------------------------------------

        try {
            const baseUrl = url && url.endsWith('/') ? url.slice(0, -1) : url;
            const endpoint = `${baseUrl}/rest/v1/${tableName}`;

            const payload: any = {};
            Object.keys(newRecordData).forEach(k => {
                if (newRecordData[k] !== '') payload[k] = newRecordData[k];
            });

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'apikey': key,
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Error al añadir registro');

            setNewRecordData({});
            fetchData(); 
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteRecord = async (row: any) => {
        const id = getRowId(row);
        const pkName = getPrimaryKey(row);

        if (!id) {
            alert("No se pudo identificar el ID de este registro.");
            return;
        }

        if (!confirm('CONFIRMACIÓN: ¿Estás seguro de eliminar este registro permanentemente?')) return;
        
        setIsSaving(true);
        try {
            if (tableName === 'savesjson') {
                const supabaseLocal = createClient(url, key);
                const { error } = await supabaseLocal
                    .storage
                    .from(bucketName)
                    .remove([row.name]); // Use file name for deletion

                if (error) throw error;
            } else {
                const baseUrl = url && url.endsWith('/') ? url.slice(0, -1) : url;
                const endpoint = `${baseUrl}/rest/v1/${tableName}?${pkName}=eq.${id}`;

                const response = await fetch(endpoint, {
                    method: 'DELETE',
                    headers: {
                        'apikey': key,
                        'Authorization': `Bearer ${key}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) throw new Error('Error al eliminar');
            }
            fetchData();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const startEditing = (row: any) => {
        const id = getRowId(row);
        if (!id) {
            alert("No se puede editar un registro sin ID identificable.");
            return;
        }
        setEditingId(id);
        setEditFormData({ ...row });
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditFormData({});
    };

    const handleUpdateRecord = async (originalRow: any) => {
        if (!editingId) return;
        
        const pkName = getPrimaryKey(originalRow);
        
        setIsSaving(true);
        try {
            const baseUrl = url && url.endsWith('/') ? url.slice(0, -1) : url;
            const endpoint = `${baseUrl}/rest/v1/${tableName}?${pkName}=eq.${editingId}`;

            const payload = { ...editFormData };
            delete payload[pkName];
            delete payload['created_at'];

            const response = await fetch(endpoint, {
                method: 'PATCH',
                headers: {
                    'apikey': key,
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Error al actualizar');
            
            setEditingId(null);
            fetchData();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Helpers
    const getColumns = () => {
        if (tableName === 'savesjson') {
            return ['name', 'content', 'size', 'created_at'];
        }
        if (data.length > 0) return Object.keys(data[0]);
        return ['nombre', 'descripcion', 'estado']; 
    };

    // Data Processing: Filter -> Sort
    const processedData = useMemo(() => {
        // 1. Filter
        let result = data.filter(row => {
            if (!searchTerm) return true;
            const lowerTerm = searchTerm.toLowerCase();
            return Object.values(row).some(val => 
                String(val || '').toLowerCase().includes(lowerTerm)
            );
        });

        // 2. Sort
        if (sortConfig !== null) {
            result.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        return result;
    }, [data, searchTerm, sortConfig]);

    return (
        <div className="max-w-7xl mx-auto p-4 flex flex-col gap-6 h-[85vh]">
            
            {/* 1. Configuración (Colapsable) */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-md overflow-hidden shrink-0">
                <div className="w-full flex items-center justify-between p-3 bg-gray-900 border-b border-gray-800">
                    <button 
                        onClick={() => setIsConfigOpen(!isConfigOpen)}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`} />
                        <h2 className="font-bold text-gray-200 text-sm uppercase tracking-wide">Conexión Supabase</h2>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-400 transition-transform ${isConfigOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    
                    <a 
                        href="https://supabase.com/dashboard/project/humndjymddoitxxkgtyt/editor/17881?schema=public" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 bg-green-900/30 hover:bg-green-900/50 text-green-400 border border-green-800 rounded-md text-xs font-semibold transition-all group"
                    >
                        <span>Dashboard</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </a>
                </div>

                {isConfigOpen && (
                    <div className="p-4 bg-gray-800/80 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Project URL</label>
                            <input type="url" value={url} onChange={e => setUrl(e.target.value)} className="w-full p-2 bg-gray-900 rounded border border-gray-600 text-sm text-gray-200"/>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">API Key (Anon)</label>
                            <input type="password" value={key} onChange={e => setKey(e.target.value)} className="w-full p-2 bg-gray-900 rounded border border-gray-600 text-sm text-gray-200"/>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-400 mb-1">Bucket Name (para savesjson)</label>
                            <input type="text" value={bucketName} onChange={e => setBucketName(e.target.value)} className="w-full md:w-1/2 p-2 bg-gray-900 rounded border border-gray-600 text-sm text-gray-200"/>
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                            <button onClick={fetchData} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-bold">Reconectar</button>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. Pestañas (Ordered as requested) */}
            <div className="flex bg-gray-800 rounded-lg p-1 overflow-x-auto shrink-0 border border-gray-700">
                {PREDEFINED_TABLES.map(t => (
                    <button
                        key={t}
                        onClick={() => setTableName(t)}
                        className={`flex-1 min-w-[120px] py-2 px-4 text-sm font-medium rounded-md transition-all ${
                            tableName === t ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                        }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* 3. Área Principal de Datos */}
            <div className="flex-grow bg-gray-800 rounded-lg border border-gray-700 shadow-xl flex flex-col overflow-hidden relative">
                
                {/* Header Section */}
                <div className="bg-gray-900 border-b border-gray-700 p-4 flex flex-col gap-4">
                    {/* Search Bar Full Width Top */}
                    <div className="relative w-full">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input 
                            type="text" 
                            placeholder={`Buscar en ${tableName}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 text-gray-200 text-sm rounded-lg py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 shadow-sm"
                        />
                    </div>

                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                            Gestión de {tableName}
                        </h3>
                        
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handleCopyData}
                                className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 border border-gray-600 transition-colors flex items-center gap-1"
                                title="Copiar datos filtrados a JSON"
                            >
                                {isCopying ? (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        <span className="text-green-400">Copiado</span>
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                        <span>Copiar Data</span>
                                    </>
                                )}
                            </button>
                            <span className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-400 border border-gray-700 whitespace-nowrap">
                                {processedData.length} registros
                            </span>
                        </div>
                    </div>
                </div>

                {/* Table Container */}
                <div className="flex-grow overflow-auto custom-scrollbar bg-gray-900 relative">
                    {isLoading && <div className="absolute inset-0 bg-gray-900/80 z-20 flex items-center justify-center"><Spinner /></div>}
                    
                    {error && <div className="p-4 text-red-400 text-center">{error}</div>}

                    {tableName === 'savesjson' ? (
                        <div className="flex h-full">
                            <div className="w-1/3 border-r border-gray-700 overflow-y-auto">
                                {data.filter((file: any) => file.name && file.name.endsWith('.json')).map((file: any) => (
                                    <button
                                        key={file.name}
                                        onClick={() => handleFileClick(file.name)}
                                        className={`w-full text-left p-3 border-b border-gray-700 text-sm ${selectedFile === file.name ? 'bg-blue-900/50 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
                                    >
                                        {file.name}
                                    </button>
                                ))}
                            </div>
                            <div className="w-2/3 p-4 flex flex-col gap-4">
                                {selectedFile ? (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-white font-bold flex items-center gap-2">
                                                {selectedFile}
                                                <button onClick={() => toggleLock(selectedFile)}>
                                                    {lockedFiles.has(selectedFile) ? <Lock size={16} className="text-red-500"/> : <Unlock size={16} className="text-green-500"/>}
                                                </button>
                                            </h4>
                                        </div>
                                        
                                        {/* Assistant */}
                                        <div className="bg-gray-800 p-3 rounded border border-gray-700 flex gap-2">
                                            <input 
                                                className="flex-grow bg-gray-900 text-white text-sm p-2 rounded"
                                                placeholder="¿Qué quieres agregar o modificar?"
                                                value={assistantPrompt}
                                                onChange={e => setAssistantPrompt(e.target.value)}
                                            />
                                            <button 
                                                onClick={handleAssistantModify}
                                                disabled={isAssistantLoading || lockedFiles.has(selectedFile)}
                                                className="px-3 py-2 bg-purple-600 text-white rounded text-sm font-bold hover:bg-purple-700 disabled:opacity-50"
                                            >
                                                {isAssistantLoading ? <Spinner size="4"/> : <Sparkles size={16}/>}
                                            </button>
                                        </div>

                                        <textarea
                                            className="flex-grow w-full bg-gray-950 text-green-400 font-mono text-xs p-4 rounded border border-gray-700"
                                            value={fileContent}
                                            onChange={(e) => setFileContent(e.target.value)}
                                            disabled={lockedFiles.has(selectedFile)}
                                        />
                                        <button
                                            onClick={handleSaveFile}
                                            disabled={isSavingFile || lockedFiles.has(selectedFile)}
                                            className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                                        >
                                            {isSavingFile ? 'Guardando...' : 'Guardar Cambios'}
                                        </button>
                                    </>
                                ) : (
                                    <div className="text-gray-500 text-center mt-10">Selecciona un archivo para editar</div>
                                )}
                            </div>
                        </div>
                    ) : data.length === 0 && !error ? (
                        <div className="p-8 text-center text-gray-500">
                            <p className="mb-4">La tabla está vacía. Añade el primer registro usando JSON:</p>
                            <textarea 
                                className="w-full max-w-lg h-32 bg-gray-800 border border-gray-700 rounded p-2 text-green-400 font-mono text-xs mx-auto block"
                                placeholder='{"nombre": "Ejemplo", "valor": 1}'
                                onChange={e => { try { setNewRecordData(JSON.parse(e.target.value)); } catch(err){} }}
                            />
                            <button onClick={handleAddRecord} className="mt-4 px-4 py-2 bg-green-600 text-white rounded text-sm font-bold">Crear Primer Registro</button>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse table-auto">
                            <thead className="bg-gray-900 text-gray-400 text-xs uppercase sticky top-0 z-20 shadow-lg ring-1 ring-black/5">
                                {/* Encabezados de Columna (Interactivos) */}
                                <tr>
                                    {/* Action Column First */}
                                    <th className="p-3 font-semibold border-b border-gray-700 bg-gray-900 w-20 text-center">Acciones</th>
                                    {getColumns().map((key) => (
                                        <th 
                                            key={key} 
                                            onClick={() => handleSort(key)}
                                            className="p-3 font-semibold border-b border-gray-700 bg-gray-900 text-left min-w-[120px] cursor-pointer hover:bg-gray-800 transition-colors select-none"
                                            title={`Ordenar por ${key}`}
                                        >
                                            <div className="flex items-center gap-1">
                                                {key}
                                                {sortConfig?.key === key && (
                                                    <span className="text-blue-400 text-[10px]">
                                                        {sortConfig.direction === 'asc' ? '▲' : '▼'}
                                                    </span>
                                                )}
                                                {sortConfig?.key !== key && (
                                                    <span className="text-gray-600 text-[10px] opacity-0 hover:opacity-100 group-hover:opacity-50">⇅</span>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                                
                                {/* Fila de Añadir (Sticky inside Thead) */}
                                <tr className="bg-blue-900/10 border-b-2 border-blue-500/30">
                                    <td className="p-2 text-center bg-gray-900/95 backdrop-blur-sm">
                                        <button 
                                            onClick={handleAddRecord}
                                            disabled={isSaving}
                                            className="bg-green-600 hover:bg-green-700 text-white w-8 h-8 rounded-full shadow transition-colors flex justify-center items-center mx-auto"
                                            title="Añadir registro"
                                        >
                                            {isSaving ? <Spinner size="3"/> : <span className="text-xl font-bold leading-none pb-1">+</span>}
                                        </button>
                                    </td>
                                    {getColumns().map(col => {
                                        if (tableName === 'savesjson') {
                                            if (col === 'name') {
                                                return (
                                                    <td key={col} className="p-2 bg-gray-900/95 backdrop-blur-sm">
                                                        <input 
                                                            type="text" 
                                                            placeholder="nombre_archivo.json"
                                                            value={newRecordData['name'] || ''}
                                                            onChange={e => setNewRecordData({...newRecordData, name: e.target.value})}
                                                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:ring-1 focus:ring-green-500 focus:border-green-500 placeholder-gray-600"
                                                        />
                                                    </td>
                                                );
                                            }
                                            if (col === 'content') {
                                                return (
                                                    <td key={col} className="p-2 bg-gray-900/95 backdrop-blur-sm">
                                                        <input 
                                                            type="text" 
                                                            placeholder='{"key": "value"}'
                                                            value={newRecordData['content'] || ''}
                                                            onChange={e => setNewRecordData({...newRecordData, content: e.target.value})}
                                                            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:ring-1 focus:ring-green-500 focus:border-green-500 placeholder-gray-600"
                                                            title="Contenido JSON"
                                                        />
                                                    </td>
                                                );
                                            }
                                            return <td key={col} className="p-3 text-xs text-gray-500 italic bg-gray-900/95 backdrop-blur-sm">-</td>;
                                        }

                                        if (col === 'id' || col === 'created_at' || (col && col.endsWith('_id'))) {
                                            return <td key={col} className="p-3 text-xs text-gray-500 italic bg-gray-900/95 backdrop-blur-sm">Auto</td>;
                                        }
                                        return (
                                            <td key={col} className="p-2 bg-gray-900/95 backdrop-blur-sm">
                                                <input 
                                                    type="text" 
                                                    placeholder={col}
                                                    value={newRecordData[col] || ''}
                                                    onChange={e => setNewRecordData({...newRecordData, [col]: e.target.value})}
                                                    className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:ring-1 focus:ring-green-500 focus:border-green-500 placeholder-gray-600"
                                                />
                                            </td>
                                        );
                                    })}
                                </tr>
                            </thead>
                            
                            <tbody className="text-sm text-gray-300 divide-y divide-gray-700/50">
                                {/* Filas de Datos (Procesadas: Filtradas y Ordenadas) */}
                                {processedData.map((row, rowIndex) => {
                                    const recordId = getRowId(row);
                                    const isEditing = recordId && editingId === recordId;
                                    
                                    return (
                                        <tr key={recordId || rowIndex} className="hover:bg-gray-800/50 transition-colors group">
                                            
                                            {/* Actions Column First */}
                                            <td className="p-2 text-center whitespace-nowrap bg-gray-900/20 w-20">
                                                {isEditing ? (
                                                    <div className="flex justify-center gap-2">
                                                        <button onClick={() => handleUpdateRecord(row)} className="text-green-400 hover:text-green-300" title="Guardar"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></button>
                                                        <button onClick={cancelEditing} className="text-red-400 hover:text-red-300" title="Cancelar"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                        {tableName === 'savesjson' ? (
                                                            <button 
                                                                onClick={async () => {
                                                                    const supabaseLocal = createClient(url, key);
                                                                    const { data } = supabaseLocal.storage.from(bucketName).getPublicUrl(row.name);
                                                                    window.open(data.publicUrl, '_blank');
                                                                }} 
                                                                className="text-blue-400 hover:text-blue-300" 
                                                                title="Descargar/Ver"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                                            </button>
                                                        ) : (
                                                            <button onClick={() => startEditing(row)} className="text-blue-400 hover:text-blue-300" title="Modificar"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg></button>
                                                        )}
                                                        <button onClick={() => handleDeleteRecord(row)} className="text-gray-500 hover:text-red-500 transition-colors" title="Eliminar"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Data Columns */}
                                            {getColumns().map((col) => {
                                                if (tableName === 'savesjson' && col === 'content') {
                                                    return <td key={col} className="p-3 text-gray-500 italic text-xs">-</td>;
                                                }
                                                const val = row[col];
                                                // Prevent editing ID or timestamp columns
                                                if (isEditing && col !== 'id' && col !== 'created_at' && !(col && col.endsWith('_id'))) {
                                                    return (
                                                        <td key={col} className="p-2">
                                                            <input 
                                                                type="text" 
                                                                value={editFormData[col] || ''}
                                                                onChange={e => setEditFormData({...editFormData, [col]: e.target.value})}
                                                                className="w-full bg-gray-700 border border-blue-500 rounded px-2 py-1 text-white text-xs"
                                                            />
                                                        </td>
                                                    );
                                                }
                                                return (
                                                    <td key={col} className="p-3 break-words min-w-[100px]" title={String(val)}>
                                                        {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DatabaseViewer;
