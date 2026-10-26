import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  FolderOpen,
  FolderPlus,
  Folder,
  ChevronRight,
  Home,
  AlertTriangle,
  ShieldAlert,
  ArrowLeft,
  FolderInput,
  Eye,
  X,
  ExternalLink,
  ZoomIn,
  ZoomOut
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
  folder?: string;
}

const TOTAL_FREE_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB exactos (10,737,418,240 bytes)
const WARNING_THRESHOLD_BYTES = 8 * 1024 * 1024 * 1024; // 8.0 GB (80% alerta preventiva)
const CRITICAL_THRESHOLD_BYTES = 9.5 * 1024 * 1024 * 1024; // 9.5 GB (95% alerta crítica)

export const BodegaTab: React.FC = () => {
  const [files, setFiles] = useState<BodegaFile[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string>('');
  const [totalBytes, setTotalBytes] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [movingFileKey, setMovingFileKey] = useState<string | null>(null);
  const [targetMoveFolder, setTargetMoveFolder] = useState<string>('');
  const [quotaBlockReason, setQuotaBlockReason] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<BodegaFile | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const warnedNearLimitRef = useRef<boolean>(false);

  const formatBytes = (bytes: number) => {
    if (bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bodega/list');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const loadedFiles: BodegaFile[] = (data.items || []).map((item: any) => {
        if (item.folder !== undefined) return item;
        const parts = String(item.key || '').split('/');
        parts.pop();
        return { ...item, folder: parts.join('/') };
      });
      setFiles(loadedFiles);

      // Combinar carpetas del servidor + carpetas inferidas de las rutas de archivos
      const folderSet = new Set<string>(data.folders || []);
      loadedFiles.forEach((f) => {
        if (f.folder) {
          const parts = f.folder.split('/');
          let acc = '';
          for (const p of parts) {
            acc = acc ? `${acc}/${p}` : p;
            folderSet.add(acc);
          }
        }
      });
      setFolders(Array.from(folderSet).sort());

      const used = Number(data.totalBytes || 0);
      setTotalBytes(used);

      if (used >= TOTAL_FREE_BYTES) {
        toast.error('⛔ Has alcanzado el límite máximo de 10 GB en la Bodega Digital. Elimina archivos antes de subir nuevos.');
      } else if (used >= WARNING_THRESHOLD_BYTES && !warnedNearLimitRef.current) {
        warnedNearLimitRef.current = true;
        const remaining = Math.max(0, TOTAL_FREE_BYTES - used);
        toast.warning(`⚠️ Alerta de Capacidad: Estás cerca de los 10 GB (${((used / TOTAL_FREE_BYTES) * 100).toFixed(1)}% usado). Te quedan ${formatBytes(remaining)} disponibles.`);
      }
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

  const handleCreateFolder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = newFolderName.replace(/[\\:*?"<>|]/g, '').replace(/^\/+|\/+$/g, '').trim();
    if (!cleanName) {
      toast.warning('Escribe un nombre válido para la carpeta');
      return;
    }

    const fullFolderPath = currentFolder ? `${currentFolder}/${cleanName}` : cleanName;

    try {
      const res = await fetch('/api/bodega/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-folder', folder: fullFolderPath })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'No se pudo crear la carpeta');
      }
      setFolders((prev) => Array.from(new Set([...prev, fullFolderPath])).sort());
      setNewFolderName('');
      setIsCreatingFolder(false);
      toast.success(`Carpeta "${cleanName}" creada correctamente`);
      await fetchFiles();
    } catch (err: any) {
      toast.error('Error al crear carpeta: ' + err.message);
    }
  };

  const handleDeleteFolder = async (folderPath: string) => {
    const filesInside = files.filter((f) => f.folder === folderPath || (f.folder || '').startsWith(`${folderPath}/`));
    const msg = filesInside.length > 0
      ? `¿Eliminar la carpeta "${folderPath}" y sus ${filesInside.length} archivo(s) permanentemente?`
      : `¿Eliminar la carpeta "${folderPath}"?`;
    if (!confirm(msg)) return;

    try {
      const res = await fetch(`/api/bodega/delete-folder?folder=${encodeURIComponent(folderPath)}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(`Carpeta "${folderPath}" eliminada`);
      if (currentFolder === folderPath || currentFolder.startsWith(`${folderPath}/`)) {
        const parentParts = folderPath.split('/');
        parentParts.pop();
        setCurrentFolder(parentParts.join('/'));
      }
      await fetchFiles();
    } catch (err: any) {
      toast.error('Error al eliminar carpeta: ' + err.message);
    }
  };

  const handleFileUpload = async (fileList: FileList | null, targetFolderOverride?: string) => {
    if (!fileList || fileList.length === 0) return;
    setQuotaBlockReason(null);

    const filesArray = Array.from(fileList);
    const incomingBatchBytes = filesArray.reduce((acc, f) => acc + f.size, 0);
    const projectedBytes = totalBytes + incomingBatchBytes;
    const remainingBytes = Math.max(0, TOTAL_FREE_BYTES - totalBytes);

    // CANDADO ESTRICTO DE 10 GB: Impedir subir si el archivo o lote supera los 10 GB
    if (totalBytes >= TOTAL_FREE_BYTES || projectedBytes > TOTAL_FREE_BYTES) {
      const reason = `⛔ SUBIDA BLOQUEADA POR LÍMITE DE 10 GB: Intentas subir ${formatBytes(incomingBatchBytes)}, pero solo tienes ${formatBytes(remainingBytes)} disponibles de tus 10 GB gratuitos. Elimina archivos antiguos o sube un archivo más ligero para no pasarte de los 10 GB.`;
      setQuotaBlockReason(reason);
      toast.error(reason, { duration: 7000 });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Alerta preventiva si con esta subida superarás el 80% (8.0 GB)
    if (projectedBytes >= WARNING_THRESHOLD_BYTES) {
      const leftAfter = Math.max(0, TOTAL_FREE_BYTES - projectedBytes);
      toast.warning(`⚠️ Atención: Con esta subida llegarás al ${((projectedBytes / TOTAL_FREE_BYTES) * 100).toFixed(1)}% de los 10 GB. Te quedarán ${formatBytes(leftAfter)} libres.`);
    }

    setUploading(true);
    setUploadProgress(10);

    const destinationFolder = targetFolderOverride !== undefined ? targetFolderOverride : currentFolder;

    try {
      let runningTotal = totalBytes;

      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];

        // Segunda verificación por archivo individual
        if (runningTotal + file.size > TOTAL_FREE_BYTES) {
          throw new Error(`Límite de 10 GB alcanzado antes de subir "${file.name}". Subida detenida para no exceder 10 GB.`);
        }

        setUploadProgress(Math.round(((i + 0.3) / filesArray.length) * 100));

        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        const chunkSize = 0x8000;
        for (let j = 0; j < bytes.byteLength; j += chunkSize) {
          binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(j, j + chunkSize)));
        }
        const base64Data = btoa(binary);

        const key = destinationFolder ? `${destinationFolder}/${file.name}` : file.name;
        const res = await fetch('/api/bodega/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'upload',
            key,
            base64Data,
            contentType: file.type || 'application/octet-stream'
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Error subiendo ${file.name}`);
        }
        runningTotal += file.size;
      }

      setUploadProgress(100);
      toast.success(
        filesArray.length === 1
          ? `¡Archivo guardado en ${destinationFolder ? `"${destinationFolder}"` : 'Bodega Principal'}!`
          : `¡${filesArray.length} archivos guardados en ${destinationFolder ? `"${destinationFolder}"` : 'Bodega Principal'}!`
      );
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

  const handleMoveFileToFolder = async (file: BodegaFile, destFolder: string) => {
    const cleanDest = destFolder.replace(/^\/+|\/+$/g, '').trim();
    const newKey = cleanDest ? `${cleanDest}/${file.name}` : file.name;
    if (newKey === file.key) {
      setMovingFileKey(null);
      return;
    }

    try {
      toast.loading(`Moviendo "${file.name}"...`, { id: 'move-file' });
      const fileRes = await fetch(file.downloadUrl);
      if (!fileRes.ok) throw new Error('No se pudo leer el archivo origen');
      const arrayBuffer = await fileRes.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      const chunkSize = 0x8000;
      for (let j = 0; j < bytes.byteLength; j += chunkSize) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(j, j + chunkSize)));
      }
      const base64Data = btoa(binary);

      const upRes = await fetch('/api/bodega/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload',
          key: newKey,
          base64Data,
          contentType: 'application/octet-stream'
        })
      });
      if (!upRes.ok) throw new Error('No se pudo copiar a la carpeta destino');

      await fetch(`/api/bodega/delete?key=${encodeURIComponent(file.key)}`, { method: 'DELETE' });
      setMovingFileKey(null);
      toast.success(`"${file.name}" movido a ${cleanDest || 'Bodega Principal'}`, { id: 'move-file' });
      await fetchFiles();
    } catch (err: any) {
      toast.error('Error al mover archivo: ' + err.message, { id: 'move-file' });
    }
  };

  const handleDelete = async (key: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}" de la Bodega Cloudflare permanentemente?`)) return;
    try {
      const res = await fetch(`/api/bodega/delete?key=${encodeURIComponent(key)}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const deletedSize = files.find(f => f.key === key)?.size || 0;
      setFiles(prev => prev.filter(f => f.key !== key));
      setTotalBytes(prev => Math.max(0, prev - deletedSize));
      setQuotaBlockReason(null);
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

  // Subcarpetas directas dentro de currentFolder
  const directSubfolders = useMemo(() => {
    const prefix = currentFolder ? `${currentFolder}/` : '';
    const subSet = new Set<string>();

    folders.forEach((f) => {
      if (!currentFolder) {
        const firstPart = f.split('/')[0];
        if (firstPart) subSet.add(firstPart);
      } else if (f.startsWith(prefix) && f !== currentFolder) {
        const rest = f.slice(prefix.length);
        const nextSeg = rest.split('/')[0];
        if (nextSeg) subSet.add(`${prefix}${nextSeg}`);
      }
    });

    return Array.from(subSet).sort();
  }, [folders, currentFolder]);

  // Archivos filtrados (si hay búsqueda busca en toda la bodega; si no, muestra los de la carpeta actual)
  const filteredFiles = useMemo(() => {
    return files.filter((f) => {
      const fileFolder = f.folder || '';
      const inCurrentFolder = searchTerm.trim() !== '' ? true : fileFolder === currentFolder;
      const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase()) || fileFolder.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || f.category === selectedCategory;
      return inCurrentFolder && matchesSearch && matchesCategory;
    });
  }, [files, currentFolder, searchTerm, selectedCategory]);

  const percentUsed = Math.min(100, (totalBytes / TOTAL_FREE_BYTES) * 100);
  const remainingBytes = Math.max(0, TOTAL_FREE_BYTES - totalBytes);
  const isNearLimit = totalBytes >= WARNING_THRESHOLD_BYTES;
  const isCriticalLimit = totalBytes >= CRITICAL_THRESHOLD_BYTES;
  const isOverLimit = totalBytes >= TOTAL_FREE_BYTES;

  const breadcrumbs = useMemo(() => {
    if (!currentFolder) return [];
    const parts = currentFolder.split('/');
    return parts.map((part, idx) => ({
      label: part,
      path: parts.slice(0, idx + 1).join('/')
    }));
  }, [currentFolder]);

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
    <div className="w-full min-h-[85vh] bg-[#0b0f19] text-slate-100 font-sans p-3 sm:p-6 space-y-5">
      
      {/* BANNER DE ALERTA CUANDO ESTÁS PRÓXIMO O EN EL LÍMITE DE 10 GB */}
      {(isNearLimit || isOverLimit || quotaBlockReason) && (
        <div
          className={`rounded-2xl p-4 border flex items-start gap-3 shadow-lg ${
            isOverLimit || quotaBlockReason
              ? 'bg-red-950/60 border-red-500/60 text-red-200'
              : isCriticalLimit
              ? 'bg-orange-950/60 border-orange-500/60 text-orange-200'
              : 'bg-amber-950/50 border-amber-500/50 text-amber-200'
          }`}
        >
          {isOverLimit || quotaBlockReason ? (
            <ShieldAlert size={22} className="text-red-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle size={22} className="text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs sm:text-sm space-y-1">
            <p className="font-extrabold">
              {quotaBlockReason
                ? 'Subida bloqueada automáticamente para no superar los 10 GB'
                : isOverLimit
                ? '⛔ Límite de 10 GB alcanzado — Subida de nuevos archivos bloqueada'
                : `⚠️ Alerta de Almacenamiento: Has usado el ${percentUsed.toFixed(1)}% de tus 10 GB (${formatBytes(totalBytes)})`}
            </p>
            <p className="text-xs opacity-90">
              {quotaBlockReason ||
                `Te quedan disponibles ${formatBytes(remainingBytes)} antes del candado estricto de 10 GB. El sistema impedirá automáticamente cualquier carga que rebase los 10 GB.`}
            </p>
          </div>
          {quotaBlockReason && (
            <button
              onClick={() => setQuotaBlockReason(null)}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold"
            >
              Entendido
            </button>
          )}
        </div>
      )}

      {/* HEADER CARD CON DETALLES DE CLOUDFLARE R2 Y CAPACIDAD DE 10 GB */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
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
                Candado 10 GB Activo
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Organiza tus modelos 3D, renders, facturas y respaldos por <strong className="text-slate-200">carpetas</strong>. Con protección automática que te avisa y bloquea subidas si superan los <strong className="text-emerald-300">10 GB gratuitos</strong>.
            </p>
          </div>

          {/* BOTONES DE ACCIÓN RÁPIDA */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsCreatingFolder((v) => !v)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-bold text-xs transition-all shadow-sm cursor-pointer"
            >
              <FolderPlus size={16} />
              <span>Nueva Carpeta</span>
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

        {/* FORMULARIO PARA CREAR NUEVA CARPETA */}
        {isCreatingFolder && (
          <form
            onSubmit={handleCreateFolder}
            className="mt-4 p-3.5 rounded-2xl bg-slate-950/90 border border-amber-500/40 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 relative z-10"
          >
            <div className="flex items-center gap-2 text-xs text-amber-300 font-bold shrink-0">
              <FolderPlus size={16} />
              <span>Crear en {currentFolder ? `"${currentFolder}/"` : 'Raíz'}:</span>
            </div>
            <input
              type="text"
              autoFocus
              placeholder="Nombre de la carpeta (ej. Renders Casa Club, Modelos STL, Facturas 2026)..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs cursor-pointer"
              >
                Crear Carpeta
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingFolder(false);
                  setNewFolderName('');
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* MEDIDOR DE CAPACIDAD (10 GB FREE TIER CON ALERTA VISUAL) */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-400 flex items-center gap-1.5">
                <HardDrive size={14} className={isOverLimit ? 'text-red-400' : isNearLimit ? 'text-amber-400' : 'text-blue-400'} />
                Espacio Usado: <strong className="text-white">{formatBytes(totalBytes)}</strong> / <strong className="text-slate-200">10 GB Máximo</strong>
                <span className="text-slate-400">({formatBytes(remainingBytes)} libres)</span>
              </span>
              <span className={`font-mono font-bold ${isOverLimit ? 'text-red-400' : isNearLimit ? 'text-amber-300' : 'text-blue-400'}`}>
                {percentUsed.toFixed(2)}%
              </span>
            </div>
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  isOverLimit
                    ? 'bg-gradient-to-r from-red-600 to-rose-500'
                    : isNearLimit
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                    : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500'
                }`}
                style={{ width: `${Math.max(1, percentUsed)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-start md:justify-end gap-2.5 text-xs text-slate-400">
            <div className="px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800">
              📂 <strong className="text-amber-300">{folders.length}</strong> {folders.length === 1 ? 'carpeta' : 'carpetas'}
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800">
              📄 <strong className="text-slate-200">{files.length}</strong> {files.length === 1 ? 'archivo' : 'archivos'}
            </div>
          </div>
        </div>
      </div>

      {/* BARRA DE NAVEGACIÓN DE CARPETAS (BREADCRUMBS) */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/80 border border-slate-800 rounded-2xl px-4 py-2.5">
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <button
            onClick={() => setCurrentFolder('')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              currentFolder === ''
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Home size={14} />
            <span>Bodega Principal</span>
          </button>

          {breadcrumbs.map((bc) => (
            <React.Fragment key={bc.path}>
              <ChevronRight size={14} className="text-slate-600" />
              <button
                onClick={() => setCurrentFolder(bc.path)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  currentFolder === bc.path
                    ? 'bg-amber-500/25 border border-amber-400/50 text-amber-200'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <FolderOpen size={14} className="text-amber-400" />
                <span>{bc.label}</span>
              </button>
            </React.Fragment>
          ))}
        </div>

        {currentFolder && (
          <button
            onClick={() => {
              const parts = currentFolder.split('/');
              parts.pop();
              setCurrentFolder(parts.join('/'));
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft size={13} />
            <span>Subir un nivel</span>
          </button>
        )}
      </div>

      {/* ZONA DE CARGA (DRAG & DROP EN LA CARPETA ACTUAL CON CANDADO 10 GB) */}
      <div 
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFileUpload(e.dataTransfer.files);
        }}
        onClick={() => {
          if (isOverLimit) {
            toast.error('⛔ Límite de 10 GB alcanzado. Elimina archivos antes de subir nuevos.');
            return;
          }
          fileInputRef.current?.click();
        }}
        className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center transition-all cursor-pointer group ${
          isOverLimit
            ? 'border-red-500/50 bg-red-950/15 cursor-not-allowed'
            : uploading 
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
            <RefreshCw size={32} className="animate-spin text-blue-400 mx-auto" />
            <p className="text-sm font-bold text-white">
              Subiendo a {currentFolder ? `"${currentFolder}"` : 'Bodega Principal'}...
            </p>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/15 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
              <Upload size={24} />
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold text-white">
                {isOverLimit ? (
                  <span className="text-red-400">⛔ Almacenamiento lleno (10 GB) — Subida deshabilitada</span>
                ) : (
                  <>
                    Arrastra archivos para guardarlos en{' '}
                    <span className="text-amber-300 font-extrabold">
                      {currentFolder ? `📁 ${currentFolder}` : '🏠 Bodega Principal'}
                    </span>{' '}
                    o <span className="text-blue-400 underline underline-offset-4">explora tu equipo</span>
                  </>
                )}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Espacio libre disponible: <strong className="text-emerald-300">{formatBytes(remainingBytes)}</strong> (Bloqueo automático al llegar a 10 GB)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* CONTROLES: BUSCADOR Y FILTROS POR CATEGORÍA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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

        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text"
            placeholder="Buscar archivos en todas las carpetas..."
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

      {/* SECCIÓN DE CARPETAS DEL NIVEL ACTUAL */}
      {!loading && searchTerm.trim() === '' && directSubfolders.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1.5 px-1">
            <Folder size={14} />
            Carpetas en {currentFolder || 'Bodega Principal'} ({directSubfolders.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {directSubfolders.map((folderPath) => {
              const folderLabel = folderPath.split('/').pop() || folderPath;
              const folderFiles = files.filter(
                (f) => f.folder === folderPath || (f.folder || '').startsWith(`${folderPath}/`)
              );
              const folderBytes = folderFiles.reduce((acc, f) => acc + f.size, 0);

              return (
                <div
                  key={folderPath}
                  onClick={() => setCurrentFolder(folderPath)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleFileUpload(e.dataTransfer.files, folderPath);
                  }}
                  className="group bg-gradient-to-br from-slate-900/90 to-amber-950/20 border border-amber-500/30 hover:border-amber-400/70 rounded-2xl p-4 cursor-pointer transition-all hover:shadow-lg flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 group-hover:scale-110 transition-transform shrink-0">
                      <FolderOpen size={22} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-extrabold text-white truncate group-hover:text-amber-200">
                        {folderLabel}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {folderFiles.length} {folderFiles.length === 1 ? 'archivo' : 'archivos'} • {formatBytes(folderBytes)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFolder(folderPath);
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 opacity-70 group-hover:opacity-100 transition-all"
                    title="Eliminar carpeta"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LISTA / GRID DE ARCHIVOS */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw size={32} className="animate-spin text-blue-500 mx-auto" />
          <p className="text-xs text-slate-400 font-medium">Consultando archivos y carpetas en Cloudflare R2...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="py-14 text-center bg-slate-900/30 border border-slate-800/60 rounded-3xl p-6">
          <div className="text-4xl mb-2">📂</div>
          <h3 className="text-sm font-bold text-slate-200">
            {searchTerm || selectedCategory !== 'all'
              ? 'No se encontraron archivos con ese filtro'
              : currentFolder
              ? `La carpeta "${currentFolder}" aún no tiene archivos directos`
              : 'No hay archivos sueltos en esta ubicación'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Arrastra archivos al recuadro de arriba para guardarlos directamente dentro de{' '}
            <strong>{currentFolder || 'Bodega Principal'}</strong> o crea una subcarpeta con el botón <strong>Nueva Carpeta</strong>.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 px-1">
            Archivos en {searchTerm ? 'Resultados de búsqueda' : currentFolder || 'Bodega Principal'} ({filteredFiles.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredFiles.map((file) => (
              <div 
                key={file.key}
                className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all hover:shadow-xl flex flex-col justify-between gap-3 group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div 
                      onClick={() => {
                        setPreviewFile(file);
                        setZoomLevel(1);
                      }}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-blue-500/50 hover:scale-105 transition-all"
                      title="Clic para vista previa"
                    >
                      {getCategoryIcon(file.category)}
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                      {formatBytes(file.size)}
                    </span>
                  </div>

                  <div>
                    <h4 
                      onClick={() => {
                        setPreviewFile(file);
                        setZoomLevel(1);
                      }}
                      className="font-bold text-xs text-white truncate group-hover:text-blue-300 transition-colors cursor-pointer" 
                      title={`Ver vista previa de ${file.name}`}
                    >
                      {file.name}
                    </h4>
                    {file.folder && (
                      <button
                        type="button"
                        onClick={() => setCurrentFolder(file.folder || '')}
                        className="text-[10px] text-amber-300 hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <Folder size={10} />
                        <span>{file.folder}</span>
                      </button>
                    )}
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {new Date(file.lastModified).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* SELECTOR RÁPIDO PARA MOVER ARCHIVO A CARPETA */}
                {movingFileKey === file.key && (
                  <div className="p-2 rounded-xl bg-slate-950 border border-amber-500/40 space-y-1.5">
                    <label className="block text-[10px] font-bold text-amber-300">
                      Mover a carpeta:
                    </label>
                    <select
                      value={targetMoveFolder}
                      onChange={(e) => setTargetMoveFolder(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                    >
                      <option value="">🏠 Bodega Principal (Raíz)</option>
                      {folders.map((f) => (
                        <option key={f} value={f}>
                          📁 {f}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleMoveFileToFolder(file, targetMoveFolder)}
                        className="flex-1 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-[11px]"
                      >
                        Mover aquí
                      </button>
                      <button
                        type="button"
                        onClick={() => setMovingFileKey(null)}
                        className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px]"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* BOTONES DE ACCIÓN */}
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80 text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewFile(file);
                        setZoomLevel(1);
                      }}
                      className="flex items-center gap-1 text-blue-400 hover:text-white hover:bg-blue-600/30 px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
                      title="Vista previa interactiva"
                    >
                      <Eye size={14} />
                      <span className="hidden sm:inline">Ver</span>
                    </button>

                    <a
                      href={file.downloadUrl}
                      download={file.name}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-slate-300 hover:text-white hover:bg-slate-800 px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
                      title="Descargar archivo a tu equipo"
                    >
                      <Download size={14} />
                      <span className="hidden sm:inline">Descargar</span>
                    </a>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setMovingFileKey(movingFileKey === file.key ? null : file.key);
                        setTargetMoveFolder(file.folder || '');
                      }}
                      className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Mover a otra carpeta"
                    >
                      <FolderInput size={14} />
                    </button>

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
        </div>
      )}

      {/* MODAL DE VISTA PREVIA INTERACTIVA */}
      {previewFile && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPreviewFile(null)}
        >
          <div 
            className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/80">
              <div className="flex items-center gap-2.5 min-w-0 pr-3">
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-blue-400">
                  {getCategoryIcon(previewFile.category)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate" title={previewFile.name}>
                    {previewFile.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 flex items-center gap-2">
                    <span>{formatBytes(previewFile.size)}</span>
                    {previewFile.folder && <span>• 📁 {previewFile.folder}</span>}
                    <span>• {new Date(previewFile.lastModified).toLocaleDateString('es-MX')}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Controles de Zoom para imágenes */}
                {(previewFile.category === 'image' || previewFile.name.match(/\.(png|jpe?g|webp|gif|svg)$/i)) && (
                  <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
                    <button
                      onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
                      className="p-1 hover:text-white text-slate-400"
                      title="Alejar"
                    >
                      <ZoomOut size={14} />
                    </button>
                    <span className="font-mono text-[10px] w-9 text-center text-slate-300">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
                      className="p-1 hover:text-white text-slate-400"
                      title="Acercar"
                    >
                      <ZoomIn size={14} />
                    </button>
                    <button
                      onClick={() => setZoomLevel(1)}
                      className="text-[10px] px-1 text-slate-400 hover:text-white"
                      title="Restablecer 100%"
                    >
                      1:1
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Cerrar vista previa (ESC)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body / Viewer */}
            <div className="flex-1 overflow-auto bg-slate-950/60 p-4 sm:p-6 flex items-center justify-center min-h-[300px] max-h-[calc(90vh-140px)]">
              {(previewFile.category === 'image' || previewFile.name.match(/\.(png|jpe?g|webp|gif|svg)$/i)) ? (
                <div className="overflow-auto max-w-full max-h-full flex items-center justify-center">
                  <img
                    src={previewFile.downloadUrl}
                    alt={previewFile.name}
                    className="max-h-[68vh] object-contain rounded-xl shadow-lg transition-transform duration-150"
                    style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                  />
                </div>
              ) : previewFile.name.toLowerCase().endsWith('.pdf') ? (
                <div className="w-full h-[65vh] flex flex-col items-center justify-center bg-slate-900 rounded-2xl border border-slate-800 p-6 text-center space-y-4">
                  <FileText size={56} className="text-red-400" />
                  <div>
                    <h4 className="text-base font-bold text-white mb-1">Documento PDF</h4>
                    <p className="text-xs text-slate-400 max-w-md">
                      Puedes visualizarlo directamente en una nueva pestaña del navegador o descargarlo a tu equipo.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={previewFile.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                    >
                      <ExternalLink size={14} />
                      <span>Abrir visor PDF</span>
                    </a>
                    <a
                      href={previewFile.downloadUrl}
                      download={previewFile.name}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                    >
                      <Download size={14} />
                      <span>Descargar</span>
                    </a>
                  </div>
                </div>
              ) : previewFile.category === '3d' ? (
                <div className="w-full h-[60vh] flex flex-col items-center justify-center bg-slate-900 rounded-2xl border border-slate-800 p-6 text-center space-y-4">
                  <Box size={56} className="text-cyan-400 animate-pulse" />
                  <div>
                    <h4 className="text-base font-bold text-white mb-1">Archivo de Modelo 3D</h4>
                    <p className="text-xs text-slate-400 max-w-md">
                      Formato compatible con slicers de impresión 3D (Bambu Studio, Cura, PrusaSlicer).
                    </p>
                  </div>
                  <a
                    href={previewFile.downloadUrl}
                    download={previewFile.name}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
                  >
                    <Download size={15} />
                    <span>Descargar archivo 3D</span>
                  </a>
                </div>
              ) : (
                <div className="w-full h-[50vh] flex flex-col items-center justify-center bg-slate-900 rounded-2xl border border-slate-800 p-6 text-center space-y-3">
                  <div className="p-4 rounded-2xl bg-slate-800 text-slate-300">
                    {getCategoryIcon(previewFile.category)}
                  </div>
                  <h4 className="text-sm font-bold text-white">{previewFile.name}</h4>
                  <p className="text-xs text-slate-400">
                    Archivo listo para descarga ({formatBytes(previewFile.size)})
                  </p>
                  <a
                    href={previewFile.downloadUrl}
                    download={previewFile.name}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                  >
                    <Download size={14} />
                    <span>Descargar</span>
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-950/90 text-xs">
              <button
                onClick={() => handleCopyLink(previewFile)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                {copiedKey === previewFile.key ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>Copiar Enlace</span>
              </button>

              <div className="flex items-center gap-2">
                <a
                  href={previewFile.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  <ExternalLink size={14} />
                  <span>Enlace directo</span>
                </a>
                <a
                  href={previewFile.downloadUrl}
                  download={previewFile.name}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  <Download size={14} />
                  <span>Descargar</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default BodegaTab;
