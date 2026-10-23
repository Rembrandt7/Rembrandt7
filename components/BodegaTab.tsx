import React, { useState, useEffect, useRef } from 'react';
import { 
  Archive, 
  Upload, 
  Trash2, 
  Download, 
  Copy, 
  Check, 
  Search, 
  RefreshCw, 
  FileText, 
  Image as ImageIcon, 
  Box, 
  HardDrive, 
  Cloud, 
  ExternalLink,
  ShieldCheck,
  FolderOpen,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';

interface BodegaFile {
  key: string;
  name: string;
  size: number;
  lastModified: string;
  etag: string;
  category: '3d' | 'image' | 'doc' | 'archive' | 'other';
  downloadUrl: string;
}

const TOTAL_FREE_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB en bytes

export const BodegaTab: React.FC = () => {
  const [files, setFiles] = useState<BodegaFile[]>([]);
  const [totalBytes, setTotalBytes] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<BodegaFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bodega/list');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFiles(data.items || []);
      setTotalBytes(data.totalBytes || 0);
    } catch (err: any) {
      console.error('Error fetching Bodega files:', err);
      toast.error('No se pudo conectar con la Bodega Cloudflare R2.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setUploadProgress(10);

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        setUploadProgress(Math.round(((i + 0.3) / fileList.length) * 100));

        // Leer archivo a Base64
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let j = 0; j < bytes.byteLength; j++) {
          binary += String.fromCharCode(bytes[j]);
        }
        const base64Data = btoa(binary);

        const key = file.name;
        const res = await fetch('/api/bodega/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key,
            base64Data,
            contentType: file.type || 'application/octet-stream'
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Error subiendo ${file.name}`);
        }
      }

      setUploadProgress(100);
      toast.success(fileList.length === 1 ? '¡Archivo subido a la Bodega!' : `¡${fileList.length} archivos subidos a la Bodega!`);
      await fetchFiles();
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error('Error al subir archivo: ' + err.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (key: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}" de la Bodega Cloudflare permanentemente?`)) return;
    try {
      const res = await fetch(`/api/bodega/delete?key=${encodeURIComponent(key)}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFiles(prev => prev.filter(f => f.key !== key));
      setTotalBytes(prev => Math.max(0, prev - (files.find(f => f.key === key)?.size || 0)));
      toast.success(`"${name}" eliminado de la Bodega.`);
    } catch (err: any) {
      toast.error('Error al eliminar: ' + err.message);
    }
  };

  const handleCopyLink = async (file: BodegaFile) => {
    try {
      await navigator.clipboard.writeText(file.downloadUrl);
      setCopiedKey(file.key);
      toast.success('¡Enlace de descarga directa copiado al portapapeles!');
      setTimeout(() => setCopiedKey(null), 3000);
    } catch (err) {
      toast.error('No se pudo copiar el enlace.');
    }
  };

  const handleBackupRembrandt = async () => {
    try {
      toast.loading('Generando respaldo consolidado de Rembrandt...', { id: 'backup-toast' });
      // Recolectar datos locales clave
      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        invoices: localStorage.getItem('rembrandt_saved_invoices') ? JSON.parse(localStorage.getItem('rembrandt_saved_invoices')!) : [],
        folioCounter: localStorage.getItem('rembrandt_quote_folio_counter') || '01000',
        defaultConfigs: localStorage.getItem('rembrandt_default_configs_cache') ? JSON.parse(localStorage.getItem('rembrandt_default_configs_cache')!) : null,
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const base64Data = btoa(unescape(encodeURIComponent(jsonStr)));
      const fileName = `respaldos/rembrandt_respaldo_${new Date().toISOString().split('T')[0]}.json`;

      const res = await fetch('/api/bodega/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: fileName,
          base64Data,
          contentType: 'application/json'
        })
      });

      if (!res.ok) throw new Error('Error al enviar respaldo a R2');
      toast.success('¡Respaldo completo de Rembrandt guardado en la Bodega R2!', { id: 'backup-toast' });
      await fetchFiles();
    } catch (err: any) {
      toast.error('Error al generar respaldo: ' + err.message, { id: 'backup-toast' });
    }
  };

  const filteredFiles = files.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || f.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const percentUsed = Math.min(100, (totalBytes / TOTAL_FREE_BYTES) * 100);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case '3d': return <Box className="text-cyan-400" size={20} />;
      case 'image': return <ImageIcon className="text-emerald-400" size={20} />;
      case 'doc': return <FileText className="text-blue-400" size={20} />;
      case 'archive': return <Archive className="text-amber-400" size={20} />;
      default: return <HardDrive className="text-purple-400" size={20} />;
    }
  };

  return (
    <div className="w-full min-h-[85vh] bg-[#0b0f19] text-slate-100 font-sans p-3 sm:p-6 space-y-6">
      
      {/* HEADER CARD CON DETALLES DE CLOUDFLARE R2 */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/40">
                <Archive size={24} />
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Bodega Digital en la Nube
              </h1>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Cloudflare R2 Conectado
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Almacenamiento ultra veloz para modelos 3D (.stl, .obj), renders 4K, facturas PDF y respaldos. Con <strong className="text-slate-200">10 GB gratuitos</strong> y descargas directas ilimitadas sin costo de transferencia.
            </p>
          </div>

          {/* BOTONES DE ACCIÓN RÁPIDA */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleBackupRembrandt}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/30 font-bold text-xs transition-all shadow-sm cursor-pointer"
              title="Crea una copia de seguridad de cotizaciones y configuraciones en Cloudflare R2"
            >
              <span>💾</span>
              <span>Respaldar Rembrandt</span>
            </button>

            <button
              onClick={fetchFiles}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              title="Refrescar lista de archivos"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </div>

        {/* MEDIDOR DE CAPACIDAD (10 GB FREE TIER) */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-400 flex items-center gap-1.5">
                <HardDrive size={14} className="text-blue-400" />
                Espacio Usado en Bodega: <strong className="text-white">{formatBytes(totalBytes)}</strong> de <strong className="text-slate-300">10 GB</strong>
              </span>
              <span className="text-blue-400 font-mono font-bold">{percentUsed.toFixed(2)}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(99,102,241,0.5)]" 
                style={{ width: `${Math.max(1, percentUsed)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-start md:justify-end gap-3 text-xs text-slate-400">
            <div className="px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800">
              📁 <strong className="text-slate-200">{files.length}</strong> {files.length === 1 ? 'archivo' : 'archivos'}
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800">
              🪣 Bucket: <strong className="text-slate-200">rembrandt-bodega</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ZONA DE CARGA (DRAG & DROP) */}
      <div 
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFileUpload(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center transition-all cursor-pointer group ${
          uploading 
            ? 'border-indigo-500 bg-indigo-950/20' 
            : 'border-slate-700/80 hover:border-blue-500 bg-slate-900/40 hover:bg-slate-900/70'
        }`}
      >
        <input 
          ref={fileInputRef} 
          type="file" 
          multiple 
          className="hidden" 
          onChange={(e) => handleFileUpload(e.target.files)} 
        />
        
        {uploading ? (
          <div className="max-w-md mx-auto space-y-3">
            <RefreshCw size={36} className="animate-spin text-blue-400 mx-auto" />
            <p className="text-sm font-bold text-white">Subiendo archivo(s) a Cloudflare R2...</p>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/15 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
              <Upload size={28} />
            </div>
            <div>
              <p className="text-base font-bold text-white">
                Arrastra y suelta tus archivos aquí, o <span className="text-blue-400 underline underline-offset-4">explora tu equipo</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Soporta modelos 3D (.stl, .obj, .3mf), renders en 4K, planos DWG/PDF, zips y documentos de cualquier peso.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* CONTROLES: BUSCADOR Y FILTROS POR CATEGORÍA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* FILTROS */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'all', label: 'Todos', icon: '📁' },
            { id: '3d', label: 'Impresión 3D', icon: '🧊' },
            { id: 'image', label: 'Renders & Fotos', icon: '🖼️' },
            { id: 'doc', label: 'Facturas & Docs', icon: '📄' },
            { id: 'archive', label: 'Respaldos & ZIP', icon: '📦' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* BUSCADOR */}
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text"
            placeholder="Buscar en la bodega..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
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
      </div>

      {/* LISTA / GRID DE ARCHIVOS */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw size={32} className="animate-spin text-blue-500 mx-auto" />
          <p className="text-xs text-slate-400 font-medium">Consultando archivos en Cloudflare R2...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="py-20 text-center bg-slate-900/30 border border-slate-800/60 rounded-3xl p-6">
          <div className="text-5xl mb-3">📦</div>
          <h3 className="text-base font-bold text-slate-200">
            {searchTerm || selectedCategory !== 'all' ? 'No se encontraron archivos con ese filtro' : 'Tu Bodega está vacía'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {searchTerm || selectedCategory !== 'all' 
              ? 'Prueba borrando el término de búsqueda o cambiando la categoría.' 
              : 'Arrastra tus modelos 3D, renders, facturas o respaldos al recuadro de arriba para guardarlos en la nube.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredFiles.map((file) => (
            <div 
              key={file.key}
              className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all hover:shadow-xl flex flex-col justify-between gap-3 group"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                    {getCategoryIcon(file.category)}
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                    {formatBytes(file.size)}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-white truncate group-hover:text-blue-300 transition-colors" title={file.name}>
                    {file.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {new Date(file.lastModified).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* BOTONES DE ACCIÓN */}
              <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80 text-xs">
                <a
                  href={file.downloadUrl}
                  download={file.name}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-slate-300 hover:text-white hover:bg-slate-800 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Descargar archivo a tu equipo"
                >
                  <Download size={14} />
                  <span>Descargar</span>
                </a>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCopyLink(file)}
                    className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                    title="Copiar enlace directo de descarga"
                  >
                    {copiedKey === file.key ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>

                  <button
                    onClick={() => handleDelete(file.key, file.name)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                    title="Eliminar de la Bodega"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default BodegaTab;
