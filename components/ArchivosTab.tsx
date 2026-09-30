import React, { useState } from 'react';
import { 
  Folder, 
  ExternalLink, 
  Copy, 
  Check, 
  Search, 
  Cloud, 
  HardDrive, 
  FileText, 
  Building2, 
  Presentation, 
  Layers, 
  Info, 
  FolderOpen,
  ArrowUpRight,
  ShieldCheck,
  Laptop,
  Globe
} from 'lucide-react';
import { toast } from 'sonner';

interface FolderCategory {
  id: string;
  name: string;
  subpath: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  webUrl: string;
  tag: string;
}

const ONEDRIVE_BASE_WEB_URL = 'https://javer-my.sharepoint.com/personal/rblanco_javer_com_mx/Documents/Javer%202026';
const ONEDRIVE_LOCAL_BASE_PATH = 'C:\\Users\\rblanco\\OneDrive - Servicios Administrativos Javer, S.A. DE C.V\\Javer 2026';

const FOLDER_CATEGORIES: FolderCategory[] = [
  {
    id: 'prototipos',
    name: '1-. Prototipos',
    subpath: '1-.Prototipos',
    description: 'Modelos arquitectónicos, prototipos de vivienda y planos maestros.',
    icon: <Layers className="w-6 h-6 text-purple-400" />,
    color: 'from-purple-500/20 to-indigo-500/10 border-purple-500/30 hover:border-purple-500/60',
    webUrl: `${ONEDRIVE_BASE_WEB_URL}/1-.Prototipos`,
    tag: 'Prototipos'
  },
  {
    id: 'proyectos-generales',
    name: '2-. Proyectos Tipo Generales',
    subpath: '2-.Proyectos Tipo Generales',
    description: 'Catálogo de tipologías generales, normativas y proyectos base.',
    icon: <Building2 className="w-6 h-6 text-blue-400" />,
    color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30 hover:border-blue-500/60',
    webUrl: `${ONEDRIVE_BASE_WEB_URL}/2-.Proyectos%20Tipo%20Generales`,
    tag: 'Proyectos'
  },
  {
    id: 'fraccionamientos',
    name: '3-. Fraccionamientos',
    subpath: '3-.Fraccionamientos',
    description: 'Desarrollos habitacionales, etapas de construcción y lotificación.',
    icon: <Building2 className="w-6 h-6 text-emerald-400" />,
    color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 hover:border-emerald-500/60',
    webUrl: `${ONEDRIVE_BASE_WEB_URL}/3-.Fraccionamientos`,
    tag: 'Desarrollos'
  },
  {
    id: 'planos-constructivos',
    name: 'Planos Constructivos',
    subpath: 'Plancos Constructivos',
    description: 'Planos ejecutivos, detalles constructivos, instalaciones y estructurales.',
    icon: <FolderOpen className="w-6 h-6 text-amber-400" />,
    color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 hover:border-amber-500/60',
    webUrl: `https://javer-my.sharepoint.com/personal/repositorio_javer01_javer_com_mx/Documents/`,
    tag: 'Ingeniería'
  },
  {
    id: 'presentaciones',
    name: '5-. Presentaciones',
    subpath: '5-.Presentaciones',
    description: 'Láminas, diapositivas ejecutivas, renders para comités y ventas.',
    icon: <Presentation className="w-6 h-6 text-pink-400" />,
    color: 'from-pink-500/20 to-rose-500/10 border-pink-500/30 hover:border-pink-500/60',
    webUrl: `${ONEDRIVE_BASE_WEB_URL}/5-.Presentaciones`,
    tag: 'Presentaciones'
  },
  {
    id: 'hojas-varios',
    name: '4-. Hojas y Varios',
    subpath: '4-. hojas y varios',
    description: 'Hojas de cálculo, presupuestos, notas de avance y documentación varia.',
    icon: <FileText className="w-6 h-6 text-cyan-400" />,
    color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30 hover:border-cyan-500/60',
    webUrl: `${ONEDRIVE_BASE_WEB_URL}/4-.%20hojas%20y%20varios`,
    tag: 'Documentos'
  },
  {
    id: 'general-asa',
    name: 'General - Asa@javer.com.mx',
    subpath: 'General - Asa@javer.com.mx',
    description: 'Repositorio compartido de SharePoint Javer para el equipo central.',
    icon: <Globe className="w-6 h-6 text-violet-400" />,
    color: 'from-violet-500/20 to-purple-500/10 border-violet-500/30 hover:border-violet-500/60',
    webUrl: 'https://javer.sharepoint.com/sites/Asajaver.com.mx/Documentos%20compartidos/',
    tag: 'Compartido'
  },
  {
    id: 'historico-javer',
    name: 'Histórico (2023 - 2024 - Casa)',
    subpath: 'javer 2024',
    description: 'Archivos de referencia de ejercicios anteriores y proyectos particulares.',
    icon: <Folder className="w-6 h-6 text-slate-400" />,
    color: 'from-slate-500/20 to-gray-500/10 border-slate-500/30 hover:border-slate-500/60',
    webUrl: `${ONEDRIVE_BASE_WEB_URL}`,
    tag: 'Archivo Histórico'
  }
];

export const ArchivosTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [customWebUrl, setCustomWebUrl] = useState(() => {
    return localStorage.getItem('rembrandt_onedrive_custom_url') || ONEDRIVE_BASE_WEB_URL;
  });
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [localFilesCount, setLocalFilesCount] = useState<number | null>(null);
  const [scannedFiles, setScannedFiles] = useState<{ name: string; path: string; size?: number }[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const filteredCategories = FOLDER_CATEGORIES.filter(cat => 
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.tag.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopyPath = async (subpath?: string, id?: string) => {
    const fullPath = subpath 
      ? `${ONEDRIVE_LOCAL_BASE_PATH}\\${subpath}`
      : ONEDRIVE_LOCAL_BASE_PATH;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullPath);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = fullPath;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedId(id || 'root');
      toast.success('Ruta local copiada al portapapeles');
      setTimeout(() => setCopiedId(null), 2500);
    } catch (e) {
      toast.error('No se pudo copiar la ruta');
    }
  };

  const handleSaveCustomUrl = (newUrl: string) => {
    setCustomWebUrl(newUrl);
    localStorage.setItem('rembrandt_onedrive_custom_url', newUrl);
    setIsEditingUrl(false);
    toast.success('Enlace de OneDrive actualizado');
  };

  // HTML5 File System Access API para vincular la carpeta local cuando esté en su PC
  const handleConnectLocalFolder = async () => {
    if (!('showDirectoryPicker' in window)) {
      toast.info('Tu navegador actual no soporta el explorador directo de disco. Usa los enlaces web de OneDrive.');
      return;
    }

    try {
      setIsScanning(true);
      // @ts-ignore
      const dirHandle = await window.showDirectoryPicker({
        mode: 'read',
        startIn: 'desktop'
      });

      const files: { name: string; path: string; size?: number }[] = [];

      async function scanDirectory(handle: any, currentPath: string = '') {
        for await (const entry of handle.values()) {
          const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
          if (entry.kind === 'file') {
            const file = await entry.getFile();
            files.push({ name: entry.name, path: entryPath, size: file.size });
          } else if (entry.kind === 'directory') {
            // Escanear hasta 2 niveles de profundidad para no saturar memoria
            if (entryPath.split('/').length <= 3) {
              await scanDirectory(entry, entryPath);
            }
          }
        }
      }

      await scanDirectory(dirHandle);
      setScannedFiles(files);
      setLocalFilesCount(files.length);
      toast.success(`Carpeta vinculada: ${files.length} archivos detectados localmente`);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error('No se pudo acceder a la carpeta seleccionada');
      }
    } finally {
      setIsScanning(false);
    }
  };

  const filteredLocalFiles = scannedFiles.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.path.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 mt-2 sm:mt-6 px-2 sm:px-4">
      {/* Hero Header */}
      <div className="relative overflow-hidden glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl bg-gradient-to-br from-blue-900/20 via-slate-900/60 to-purple-900/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
              <Cloud size={14} className="animate-pulse" />
              Sincronización en la Nube Javer OneDrive
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-indigo-200">
              Archivos Javer 2026
            </h1>
            <p className="text-sm sm:text-base text-gray-300 max-w-2xl">
              Accede a tus planos, prototipos y proyectos habitacionales tanto desde este equipo como desde cualquier otra computadora mediante la nube corporativa de Microsoft 365.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={customWebUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-[0_10px_25px_rgba(37,99,235,0.4)] transition-all active:scale-95 shrink-0"
            >
              <Globe size={18} />
              Abrir OneDrive Web
              <ArrowUpRight size={16} />
            </a>

            <button
              onClick={() => handleCopyPath(undefined, 'root')}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 text-sm font-semibold transition-all active:scale-95 shrink-0"
              title="Copiar ruta de Windows C:\Users\..."
            >
              {copiedId === 'root' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              Ruta Local
            </button>
          </div>
        </div>

        {/* Decorative backdrop glow */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Guía: Cómo ver los archivos desde cualquier computadora */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/10 bg-slate-900/40 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-blue-400 uppercase tracking-wider">
          <Info size={16} />
          ¿Cómo consultar y buscar estos archivos desde cualquier máquina por internet?
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
            <div className="flex items-center gap-2 text-white font-bold">
              <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs">1</span>
              En la Nube (SharePoint Javer)
            </div>
            <p className="text-gray-400 leading-relaxed">
              Tu carpeta local se sincroniza en automático con tu cuenta <strong>rblanco@javer.com.mx</strong> en <em>javer-my.sharepoint.com</em>. Desde cualquier PC del mundo con internet, al iniciar sesión puedes visualizar, editar y descargar todo.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
            <div className="flex items-center gap-2 text-white font-bold">
              <span className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs">2</span>
              Enlaces Directos por Sección
            </div>
            <p className="text-gray-400 leading-relaxed">
              Las tarjetas de abajo tienen enlaces directos a cada subcarpeta (Prototipos, Proyectos Tipo, Fraccionamientos). Un clic te lleva directo a esa carpeta en Office 365 Web.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
            <div className="flex items-center gap-2 text-white font-bold">
              <span className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs">3</span>
              Explorador en PC Local
            </div>
            <p className="text-gray-400 leading-relaxed">
              Cuando estés en esta máquina, puedes pulsar <strong>"Conectar Carpeta Local"</strong> para indexar la estructura en tiempo real y filtrar archivos sin abrir el explorador de Windows.
            </p>
          </div>
        </div>
      </div>

      {/* Buscador & Herramientas */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar carpetas o proyectos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleConnectLocalFolder}
            disabled={isScanning}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-all active:scale-95"
            title="Leer archivos directamente desde esta computadora"
          >
            <HardDrive size={15} />
            {isScanning ? 'Escaneando...' : localFilesCount ? `Local: ${localFilesCount} archivos` : 'Conectar Carpeta Local'}
          </button>
        </div>
      </div>

      {/* Carpetas Principales de Javer 2026 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredCategories.map((cat) => (
          <div
            key={cat.id}
            className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between group bg-gradient-to-br ${cat.color} backdrop-blur-md`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="p-3 rounded-xl bg-black/40 border border-white/10 shrink-0">
                  {cat.icon}
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-gray-300 border border-white/5">
                  {cat.tag}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-white text-base group-hover:text-blue-300 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                  {cat.description}
                </p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between gap-2">
              <button
                onClick={() => handleCopyPath(cat.subpath, cat.id)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors text-xs flex items-center gap-1.5"
                title="Copiar ruta de Windows"
              >
                {copiedId === cat.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                <span className="hidden sm:inline">Ruta</span>
              </button>

              <a
                href={cat.webUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/30 text-xs font-semibold transition-all group-hover:shadow-[0_0_12px_rgba(59,130,246,0.3)]"
              >
                Abrir en Nube
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Explorador de archivos escaneados localmente (si conectó la carpeta) */}
      {scannedFiles.length > 0 && (
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="text-purple-400" size={20} />
              <h3 className="text-lg font-bold text-white">Archivos Locales Indexados</h3>
              <span className="text-xs text-gray-400">({filteredLocalFiles.length} de {scannedFiles.length})</span>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-white/5 text-xs sm:text-sm">
            {filteredLocalFiles.map((file, idx) => (
              <div key={idx} className="py-2.5 px-3 flex items-center justify-between hover:bg-white/5 rounded-lg transition-colors">
                <div className="flex items-center gap-3 truncate">
                  <FileText className="text-blue-400 shrink-0" size={16} />
                  <span className="text-gray-200 font-medium truncate">{file.name}</span>
                  <span className="text-[11px] text-gray-500 truncate hidden md:inline">({file.path})</span>
                </div>
                {file.size && (
                  <span className="text-gray-500 text-xs shrink-0 ml-2">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Configuración de Enlace Personalizado de OneDrive */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-slate-900/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-2 truncate">
          <Cloud size={16} className="text-blue-400 shrink-0" />
          <span className="truncate">
            Enlace raíz configurado: <strong className="text-gray-300 font-mono text-[11px]">{customWebUrl}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isEditingUrl ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                defaultValue={customWebUrl}
                id="custom-onedrive-input"
                className="bg-black/40 border border-white/20 rounded-lg px-2.5 py-1 text-white text-xs font-mono w-60 focus:outline-none"
              />
              <button
                onClick={() => {
                  const input = document.getElementById('custom-onedrive-input') as HTMLInputElement;
                  if (input) handleSaveCustomUrl(input.value);
                }}
                className="px-2.5 py-1 rounded-lg bg-green-600 text-white font-bold"
              >
                Guardar
              </button>
              <button
                onClick={() => setIsEditingUrl(false)}
                className="px-2 py-1 rounded-lg bg-white/10 text-gray-300"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingUrl(true)}
              className="text-blue-400 hover:text-blue-300 underline font-medium"
            >
              Cambiar enlace web
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArchivosTab;
