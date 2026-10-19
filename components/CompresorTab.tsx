import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Play, RefreshCw, Archive, Trash2, Wand2, Sparkles, FileJson, Upload, Settings2, Mail, MessageCircle, Sliders, UploadCloud } from 'lucide-react';
import { MediaFile, FileStatus, TargetFormat, AttachmentFile, AttachmentCategory, PreviewFile, Toast, ToastType, PdfPageFile } from './Compresor/types';
import { generateSmartFileName, refineGlobalTitle } from './Compresor/services/compresorAiService';
import { processImage, getExtensionFromMime, getFileCategory, blobToBase64, processPdfUpload, mergeImagesToPdf, ensureCompresorLibsLoaded, saveBlobFile } from './Compresor/utils/fileHelpers';
import { exportDataAsJsonFile } from '../utils/cotizadorExportUtils';
import UploadArea from './Compresor/UploadArea';
import FileCard from './Compresor/FileCard';
import AttachmentsPanel from './Compresor/AttachmentsPanel';
import ImageModal from './Compresor/ImageModal';
import ToastContainer from './Compresor/ToastContainer';
import PdfMergePanel from './Compresor/PdfMergePanel';

export const CompresorTab: React.FC = () => {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [pdfPages, setPdfPages] = useState<PdfPageFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPdfMerging, setIsPdfMerging] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);
  
  // Settings
  const [globalFormat, setGlobalFormat] = useState<TargetFormat>(TargetFormat.JPG);
  const [quality, setQuality] = useState<number>(0.8);
  const [projectTitle, setProjectTitle] = useState("Render");
  
  const [selectedPreview, setSelectedPreview] = useState<PreviewFile | null>(null);
  const [isLoadingJson, setIsLoadingJson] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Ref for JSON Input
  const jsonInputRef = useRef<HTMLInputElement>(null);
  // Ref for Global File Input (hidden)
  const globalFileInputRef = useRef<HTMLInputElement>(null);
  // Ref to track drag depth to prevent flickering
  const dragCounter = useRef(0);

  // Preload JSZip, FileSaver, PDF.js, jsPDF on mount
  useEffect(() => {
    ensureCompresorLibsLoaded().catch(console.error);
  }, []);

  // Toast Helper
  const addToast = (message: string, type: ToastType = 'info') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleFilesSelected = useCallback(async (newFiles: File[]) => {
    setIsUploading(true);
    addToast('Procesando archivos...', 'info');

    const newMediaFiles: MediaFile[] = [];

    for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        
        // Handle PDF processing (splitting or thumbnail generation)
        if (file.type === 'application/pdf') {
            const pdfResults = await processPdfUpload(file);
            
            pdfResults.forEach((res) => {
                newMediaFiles.push({
                    id: crypto.randomUUID(),
                    originalFile: res.file,
                    previewUrl: res.previewUrl,
                    newName: `${files.length + newMediaFiles.length + 1}`,
                    targetFormat: res.type === 'image' ? globalFormat : TargetFormat.ORIGINAL,
                    status: FileStatus.IDLE,
                    originalSize: res.file.size,
                    type: res.type
                });
            });
        } 
        // Handle Normal Images/Videos/CAD
        else {
            const isVideo = file.type.startsWith('video/');
            const isCad = /\.(dwg|dxf|skp|rvt)$/i.test(file.name);
            
            let nameToUse = `${files.length + newMediaFiles.length + 1}`;
            if (isCad) {
                const lastDot = file.name.lastIndexOf('.');
                nameToUse = lastDot !== -1 ? file.name.substring(0, lastDot) : file.name;
            }

            newMediaFiles.push({
                id: crypto.randomUUID(),
                originalFile: file,
                previewUrl: URL.createObjectURL(file),
                newName: nameToUse, 
                targetFormat: (isVideo || isCad) ? TargetFormat.ORIGINAL : globalFormat,
                status: FileStatus.IDLE,
                originalSize: file.size,
                type: isVideo ? 'video' : isCad ? 'cad' : 'image'
            });
        }
    }

    setFiles(prev => [...prev, ...newMediaFiles]);
    setIsUploading(false);
    addToast(`${newMediaFiles.length} archivos añadidos`, 'success');
  }, [files.length, globalFormat]);

  const loadJsonFromFile = useCallback((file: File) => {
    setIsLoadingJson(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonText = event.target?.result as string;
        if (!jsonText) throw new Error("File content is empty");
        
        const json = JSON.parse(jsonText);
        
        if (json.project) setProjectTitle(json.project);
        if (json.globalFormat) setGlobalFormat(json.globalFormat);
        
        let restoredCount = 0;

        if (Array.isArray(json.files)) {
            const restoredFiles: MediaFile[] = [];
            for (const f of json.files) {
                try {
                    if (!f.data) continue;
                    const res = await fetch(f.data);
                    const blob = await res.blob();
                    const mimeType = f.mimeType || blob.type || 'application/octet-stream';
                    const restoredFile = new File([blob], f.originalName || 'restored_file', { type: mimeType });
                    const isVideo = mimeType.startsWith('video/');
                    const isPdf = mimeType === 'application/pdf';
                    restoredFiles.push({
                        id: f.id || crypto.randomUUID(),
                        originalFile: restoredFile,
                        previewUrl: URL.createObjectURL(restoredFile),
                        newName: f.newName || "restored",
                        targetFormat: f.targetFormat || TargetFormat.JPG,
                        status: f.status || FileStatus.IDLE,
                        originalSize: f.originalSize || blob.size,
                        newSize: f.newSize,
                        convertedBlob: f.status === FileStatus.COMPLETED ? blob : undefined, 
                        type: f.type || (isVideo ? 'video' : isPdf ? 'pdf' : 'image')
                    });
                    restoredCount++;
                } catch (innerErr) { console.warn("Could not restore file:", f, innerErr); }
            }
            setFiles(prev => [...prev, ...restoredFiles]);
        }

        if (Array.isArray(json.attachments)) {
            const restoredAttachments: AttachmentFile[] = [];
            for (const a of json.attachments) {
                try {
                    if (!a.data) continue;
                    const res = await fetch(a.data);
                    const blob = await res.blob();
                    const mimeType = a.mimeType || blob.type || 'application/octet-stream';
                    const restoredFile = new File([blob], a.name || 'attachment', { type: mimeType });
                    const isImage = mimeType.startsWith('image/');
                    const isPdf = mimeType === 'application/pdf';
                    
                    const lastDot = restoredFile.name.lastIndexOf('.');
                    const fallbackName = lastDot !== -1 ? restoredFile.name.substring(0, lastDot) : restoredFile.name;

                    restoredAttachments.push({
                        id: a.id || crypto.randomUUID(),
                        file: restoredFile,
                        customName: a.customName || fallbackName,
                        size: a.size || blob.size,
                        category: a.category || getFileCategory(restoredFile),
                        previewUrl: (isImage || isPdf) ? URL.createObjectURL(restoredFile) : undefined
                    });
                } catch (innerErr) { console.warn("Could not restore attachment:", a, innerErr); }
            }
            setAttachments(prev => [...prev, ...restoredAttachments]);
        }
        addToast(`Proyecto restaurado (${restoredCount} items)`, 'success');
      } catch (err) {
        console.error("Error parsing JSON", err);
        addToast("El archivo JSON no es válido", 'error');
      } finally {
        setIsLoadingJson(false);
        if (jsonInputRef.current) jsonInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  }, []);

  const handleLoadJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadJsonFromFile(file);
  };

  // --- GLOBAL DRAG AND DROP HANDLERS ---
  const resetDragState = useCallback(() => {
    setIsDraggingGlobal(false);
    dragCounter.current = 0;
  }, []);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingGlobal(true);
    }
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      setIsDraggingGlobal(false);
      dragCounter.current = 0;
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resetDragState();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
       const allFiles = Array.from(e.dataTransfer.files) as File[];
       
       const jsonFile = allFiles.find(f => f.name.toLowerCase().endsWith('.json') || f.type === 'application/json');
       if (jsonFile) {
           loadJsonFromFile(jsonFile);
       }

       const mediaFiles = allFiles.filter(f => 
          (f.type.startsWith('image/') || 
          f.type.startsWith('video/') || 
          f.type === 'application/pdf' ||
          /\.(dwg|dxf|skp|rvt)$/i.test(f.name)) &&
          !(f.name.toLowerCase().endsWith('.json') || f.type === 'application/json')
       );

       if (mediaFiles.length > 0) {
           handleFilesSelected(mediaFiles);
       }
    }
  }, [resetDragState, handleFilesSelected, loadJsonFromFile]); 

  // Attachments Logic
  const handleAttachmentsSelected = (newFiles: File[]) => {
    const newAttachments: AttachmentFile[] = newFiles.map(file => {
      let previewUrl = undefined;
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      
      if (isImage || isPdf) {
        previewUrl = URL.createObjectURL(file);
      }

      const lastDotIndex = file.name.lastIndexOf('.');
      const nameWithoutExt = lastDotIndex !== -1 ? file.name.substring(0, lastDotIndex) : file.name;

      return {
        id: crypto.randomUUID(),
        file,
        customName: nameWithoutExt,
        size: file.size,
        previewUrl,
        category: getFileCategory(file)
      };
    });
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  // PDF Merge Logic
  const handlePdfPagesAdded = (newFiles: File[]) => {
      const newPages: PdfPageFile[] = newFiles.map(file => ({
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
          name: file.name
      }));
      setPdfPages(prev => [...prev, ...newPages]);
  };

  const removePdfPage = (id: string) => {
      setPdfPages(prev => {
          const page = prev.find(p => p.id === id);
          if (page) URL.revokeObjectURL(page.previewUrl);
          return prev.filter(p => p.id !== id);
      });
  };

  const movePdfPage = (id: string, direction: 'up' | 'down') => {
      setPdfPages(prev => {
          const index = prev.findIndex(p => p.id === id);
          if (index === -1) return prev;
          
          const newArr = [...prev];
          if (direction === 'up' && index > 0) {
              [newArr[index], newArr[index - 1]] = [newArr[index - 1], newArr[index]];
          } else if (direction === 'down' && index < prev.length - 1) {
              [newArr[index], newArr[index + 1]] = [newArr[index + 1], newArr[index]];
          }
          return newArr;
      });
  };

  const downloadMergedPdf = async () => {
      if (pdfPages.length === 0) return;
      setIsPdfMerging(true);
      try {
          const filesToMerge = pdfPages.map(p => p.file);
          const cleanProject = projectTitle.trim().replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-');
          await mergeImagesToPdf(filesToMerge, `${cleanProject}_unido`);
          addToast('PDF generado correctamente', 'success');
      } catch (error) {
          console.error(error);
          addToast('Error al generar PDF', 'error');
      } finally {
          setIsPdfMerging(false);
      }
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file) URL.revokeObjectURL(file.previewUrl);
      return prev.filter(f => f.id !== id);
    });
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => {
      const att = prev.find(a => a.id === id);
      if (att && att.previewUrl) URL.revokeObjectURL(att.previewUrl);
      return prev.filter(a => a.id !== id);
    });
  };

  const updateAttachmentName = (id: string, newName: string) => {
      setAttachments(prev => prev.map(a => a.id === id ? { ...a, customName: newName } : a));
  };

  const removeAttachmentCategory = (category: AttachmentCategory) => {
      setAttachments(prev => {
          const toRemove = prev.filter(a => a.category === category);
          toRemove.forEach(a => { if(a.previewUrl) URL.revokeObjectURL(a.previewUrl); });
          const remaining = prev.filter(a => a.category !== category);
          addToast(`Categoría ${category} limpiada (${toRemove.length} archivos)`, 'info');
          return remaining;
      });
  };

  const clearAll = () => {
    if (!confirm('¿Estás seguro de querer borrar todo?')) return;
    files.forEach(f => URL.revokeObjectURL(f.previewUrl));
    attachments.forEach(a => { if(a.previewUrl) URL.revokeObjectURL(a.previewUrl); });
    pdfPages.forEach(p => URL.revokeObjectURL(p.previewUrl));
    setFiles([]);
    setAttachments([]);
    setPdfPages([]);
    setProjectTitle("Render");
    addToast('Espacio de trabajo limpiado', 'info');
  };

  const updateFileName = (id: string, newName: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, newName } : f));
  };

  const updateTargetFormat = (id: string, format: TargetFormat) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, targetFormat: format } : f));
  };

  const handleSmartTitle = async () => {
    if (!projectTitle.trim()) return;
    setIsAiProcessing(true);
    const improved = await refineGlobalTitle(projectTitle);
    setProjectTitle(improved);
    setIsAiProcessing(false);
    addToast('Título mejorado con IA', 'success');
  };

  const smartRenameFile = async (id: string) => {
    const file = files.find(f => f.id === id);
    if (!file || file.type === 'video') return;

    setFiles(prev => prev.map(f => f.id === id ? { ...f, status: FileStatus.PROCESSING } : f));

    try {
      const context = isNaN(Number(file.newName)) ? file.newName : "";
      const smartName = await generateSmartFileName(file.originalFile, context);
      
      setFiles(prev => prev.map(f => f.id === id ? { 
        ...f, 
        newName: smartName,
        status: FileStatus.IDLE 
      } : f));
    } catch (error) {
      setFiles(prev => prev.map(f => f.id === id ? { 
        ...f, 
        status: FileStatus.ERROR,
        statusMessage: "Error IA"
      } : f));
      addToast('Error al generar nombre con IA', 'error');
      setTimeout(() => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, status: FileStatus.IDLE } : f));
      }, 3000);
    }
  };

  const batchSmartRename = async () => {
    const eligibleFiles = files.filter(f => f.type === 'image');
    if (eligibleFiles.length === 0) return;

    setIsAiProcessing(true);
    addToast('Iniciando renombrado inteligente...', 'info');
    const batchSize = 3;
    for (let i = 0; i < eligibleFiles.length; i += batchSize) {
      const batch = eligibleFiles.slice(i, i + batchSize);
      await Promise.all(batch.map(file => smartRenameFile(file.id)));
    }
    setIsAiProcessing(false);
    addToast('Renombrado inteligente completado', 'success');
  };

  const processAllFiles = async () => {
    setIsProcessing(true);
    addToast(`Iniciando conversión a ${Math.round(quality * 100)}% de calidad...`, 'info');
    
    const processedFiles = await Promise.all(files.map(async (file) => {
      if (file.status === FileStatus.COMPLETED) return file;

      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: FileStatus.PROCESSING } : f));

      try {
        const convertedBlob = await processImage(file.originalFile, file.targetFormat, quality);
        return {
          ...file,
          convertedBlob,
          newSize: convertedBlob.size,
          status: FileStatus.COMPLETED
        };
      } catch (error) {
        console.error("Error processing file:", error);
        return {
          ...file,
          status: FileStatus.ERROR,
          statusMessage: "Fallo conversión"
        };
      }
    }));

    setFiles(processedFiles);
    setIsProcessing(false);
    addToast('Conversión finalizada', 'success');
  };

  const getFinalFileName = (file: MediaFile) => {
    const ext = getExtensionFromMime(file.targetFormat, file.originalFile.name);
    const cleanProject = projectTitle.trim().replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-');
    const cleanIndividual = file.newName.trim().replace(/[^a-zA-Z0-9-_]/g, '-');
    
    if (cleanIndividual) {
      return `${cleanProject}_${cleanIndividual}.${ext}`;
    }
    return `${cleanProject}.${ext}`;
  };

  const copyToAttachments = (file: MediaFile) => {
    const exists = attachments.some(a => a.file.name === getFinalFileName(file));
    if (exists) {
        addToast('Este archivo ya está adjunto', 'info');
        return;
    }
    const newFile = new File([file.originalFile], getFinalFileName(file), { type: file.originalFile.type });
    handleAttachmentsSelected([newFile]);
    addToast('Copiado a adjuntos', 'success');
  };

  const handleAddConvertedToAttachments = () => {
      const filesToAdd: File[] = [];
      files.forEach(file => {
          const blob = file.convertedBlob || file.originalFile;
          const finalName = getFinalFileName(file);
          if (!attachments.some(a => a.file.name === finalName)) {
              const newFile = new File([blob], finalName, { 
                  type: file.convertedBlob ? file.targetFormat : file.originalFile.type 
              });
              filesToAdd.push(newFile);
          }
      });
      if (filesToAdd.length > 0) {
          handleAttachmentsSelected(filesToAdd);
          addToast(`${filesToAdd.length} archivos importados a adjuntos`, 'success');
      } else {
          addToast('No hay archivos nuevos para importar', 'info');
      }
  };

  const isFileAttached = (file: MediaFile) => {
    const finalName = getFinalFileName(file);
    return attachments.some(a => a.file.name === finalName);
  };

  const saveJsonData = async () => {
     setIsProcessing(true);
     try {
       const filesData = await Promise.all(files.map(async f => {
          const blob = f.convertedBlob || f.originalFile;
          const base64 = await blobToBase64(blob);
          return {
              id: f.id,
              originalName: f.originalFile.name,
              newName: f.newName,
              finalName: getFinalFileName(f),
              status: f.status,
              targetFormat: f.targetFormat,
              type: f.type,
              originalSize: f.originalSize,
              newSize: f.newSize,
              data: base64,
              mimeType: blob.type
          };
       }));

       const attachmentsData = await Promise.all(attachments.map(async a => {
           const base64 = await blobToBase64(a.file);
           return {
               id: a.id,
               name: a.file.name,
               customName: a.customName,
               category: a.category,
               size: a.size,
               data: base64,
               mimeType: a.file.type
           };
       }));

       const data = {
           project: projectTitle,
           createdAt: new Date().toISOString(),
           globalFormat: globalFormat,
           files: filesData,
           attachments: attachmentsData
       };

       const cleanProject = projectTitle.trim().replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-');
       exportDataAsJsonFile(data, `${cleanProject || 'proyecto'}_backup_completo.json`);
       addToast('Copia de seguridad guardada', 'success');
     } catch (err) {
       console.error(err);
       addToast("Error al generar respaldo", 'error');
     } finally {
       setIsProcessing(false);
     }
  };

  const downloadAll = async () => {
    if (attachments.length === 0) {
        addToast("No hay archivos adjuntos para descargar", 'error');
        return;
    }

    try {
      await ensureCompresorLibsLoaded();
      const JSZipClass = (window as any).JSZip;
      if (!JSZipClass) {
        addToast("Cargando librería ZIP, intenta de nuevo en un segundo", 'info');
        return;
      }

      const zip = new JSZipClass();
      const rootFolder = zip; 
      const categoryFolders: Record<string, string> = {
          'RENDER': "Imagenes_Renders",
          'CAD': "Planos_CAD",
          'PDF': "Documentos_PDF",
          'VIDEO': "Videos",
          'DOC': "Otros"
      };
      const categories = ['RENDER', 'CAD', 'PDF', 'VIDEO', 'DOC'];
      categories.forEach(cat => {
          const catFiles = attachments.filter(a => a.category === cat);
          if (catFiles.length > 0) {
              const folderName = categoryFolders[cat];
              const targetFolder = rootFolder.folder(folderName);
              catFiles.forEach(att => {
                  const originalExt = att.file.name.split('.').pop() || '';
                  const finalName = att.customName ? `${att.customName}.${originalExt}` : att.file.name;
                  targetFolder.file(finalName, att.file);
              });
          }
      });

      const manifest = {
          project: projectTitle,
          generatedAt: new Date().toISOString(),
          structure: {
              attachments: attachments.map(a => ({ 
                  originalName: a.file.name,
                  savedName: a.customName, 
                  category: a.category 
              }))
          }
      };
      rootFolder.file("info_proyecto.json", JSON.stringify(manifest, null, 2));

      const content = await zip.generateAsync({ type: "blob" });
      const cleanProject = projectTitle.trim().replace(/[^a-zA-Z0-9-_ ]/g, '');
      const zipName = cleanProject ? `${cleanProject}_completo.zip` : "proyecto_completo.zip";
      await saveBlobFile(content, zipName);
      addToast('ZIP generado correctamente', 'success');
    } catch (err) {
      console.error(err);
      addToast('Error al generar archivo ZIP', 'error');
    }
  };

  const downloadSingle = async (id: string) => {
    const file = files.find(f => f.id === id);
    if (!file) return;
    const blob = file.convertedBlob || file.originalFile;
    const fileName = getFinalFileName(file);
    await saveBlobFile(blob, fileName);
  };

  const handlePreviewMain = (file: MediaFile) => {
      setSelectedPreview({
          id: file.id,
          name: file.newName,
          originalName: file.originalFile.name,
          previewUrl: file.previewUrl,
          type: file.type,
          size: file.originalSize,
          newSize: file.newSize,
          format: file.targetFormat.split('/')[1]
      });
  };

  const handlePreviewAttachment = (file: AttachmentFile) => {
      let type: 'image' | 'pdf' = 'image';
      if (file.file.type === 'application/pdf') type = 'pdf';

      setSelectedPreview({
          id: file.id,
          name: file.customName || file.file.name,
          previewUrl: file.previewUrl,
          type: type, 
          size: file.size,
          format: file.file.type.split('/')[1]
      });
  };

  // Renaming function passed to ImageModal
  const handleRenameFromModal = (id: string, newName: string) => {
      const mainFileExists = files.some(f => f.id === id);
      if (mainFileExists) {
          updateFileName(id, newName);
          setSelectedPreview(prev => prev ? {...prev, name: newName} : null);
          return;
      }

      const attachmentExists = attachments.some(a => a.id === id);
      if (attachmentExists) {
          updateAttachmentName(id, newName);
          setSelectedPreview(prev => prev ? {...prev, name: newName} : null);
      }
  };

  const shareText = `Hola, te comparto los archivos del proyecto: ${projectTitle}.`;
  const shareEmail = `mailto:?subject=Archivos Proyecto ${projectTitle}&body=${encodeURIComponent(shareText)}`;
  const shareWhatsApp = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const completedCount = files.filter(f => f.status === FileStatus.COMPLETED).length;

  return (
    <div 
        className="w-full min-h-[82vh] bg-zinc-950 text-zinc-100 pb-20 font-sans relative rounded-2xl shadow-2xl overflow-hidden border border-zinc-800/80 mt-2 sm:mt-4"
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
    >
      {/* GLOBAL DROP OVERLAY */}
      {isDraggingGlobal && (
          <div className="fixed inset-0 z-[200] bg-indigo-500/20 backdrop-blur-sm border-4 border-indigo-500 border-dashed m-4 rounded-3xl flex flex-col items-center justify-center pointer-events-none animate-in fade-in zoom-in duration-200">
              <UploadCloud size={64} className="text-indigo-300 mb-4" />
              <h2 className="text-3xl font-bold text-white mb-2">Suelta tus archivos aquí</h2>
              <p className="text-indigo-200">Se añadirán automáticamente al proyecto</p>
          </div>
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <ImageModal 
        file={selectedPreview} 
        onClose={() => setSelectedPreview(null)} 
        onRename={handleRenameFromModal}
      />

      {/* Hidden File Inputs */}
      <input type="file" ref={jsonInputRef} onChange={handleLoadJson} accept=".json" className="hidden" />
      <input 
        type="file" 
        ref={globalFileInputRef}
        onChange={(e) => { if(e.target.files) handleFilesSelected(Array.from(e.target.files)); }} 
        multiple 
        accept="image/*,video/*,application/pdf,.dwg,.dxf,.skp,.rvt"
        className="hidden" 
      />

      {/* HEADER */}
      <header className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 h-auto md:h-16 py-3 md:py-0 flex flex-col md:flex-row items-center gap-4 justify-between">
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex items-center gap-2 shrink-0">
              <RefreshCw className={`text-indigo-500 ${isUploading ? 'animate-spin' : ''}`} />
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                MediaFlux
              </h1>
            </div>
            
            <div className="flex items-center gap-2 flex-1 md:flex-initial">
               <div className="relative flex-1 md:w-64">
                 <input 
                    type="text" 
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="Título del Proyecto"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-3 pr-8 py-1.5 text-sm text-zinc-100 focus:border-indigo-500 outline-none transition-all"
                 />
                 <button
                    onClick={handleSmartTitle}
                    disabled={isAiProcessing}
                    className="absolute right-1 top-1 p-1 text-indigo-400 hover:text-white rounded hover:bg-indigo-500/20"
                    title="Mejorar título"
                 >
                    <Wand2 size={12} className={isAiProcessing ? "animate-spin" : ""} />
                 </button>
               </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
             
             {/* CONVERT BUTTON */}
             {files.length > 0 && !files.every(f => f.status === FileStatus.COMPLETED) && (
                 <button
                    onClick={processAllFiles}
                    disabled={isProcessing || isUploading}
                    className="flex items-center gap-2 px-8 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-sm font-bold shadow-lg shadow-indigo-900/20 transition-all disabled:opacity-50 animate-in fade-in slide-in-from-top-2 whitespace-nowrap mr-2"
                 >
                     {isProcessing || isUploading ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} fill="currentColor" />}
                     {isUploading ? "PROCESANDO..." : `CONVERTIR (${files.filter(f => f.status !== FileStatus.COMPLETED).length})`}
                 </button>
             )}

             {/* Improve Names */}
             <button
                onClick={batchSmartRename}
                disabled={isAiProcessing || isProcessing}
                className="flex items-center gap-2 px-4 py-1.5 rounded-[12px] bg-indigo-600 hover:bg-indigo-500 text-white text-sm sm:text-base font-bold transition-all whitespace-nowrap shadow-lg shadow-indigo-900/20"
             >
                <Sparkles size={16} />
                MEJORAR NOMBRES
             </button>

             {/* Output Format */}
             <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg border border-zinc-600 bg-zinc-800 text-xs text-zinc-100 font-medium">
                
                {/* Format Dropdown */}
                <div className="flex items-center gap-1">
                  <Settings2 size={14} className="text-zinc-500" />
                  <span className="hidden sm:inline mr-1">Salida:</span>
                  <select 
                    value={globalFormat}
                    onChange={(e) => {
                      const fmt = e.target.value as TargetFormat;
                      setGlobalFormat(fmt);
                      setFiles(prev => prev.map(f => 
                        (f.status === FileStatus.IDLE && f.type !== 'video') 
                          ? { ...f, targetFormat: fmt } 
                          : f
                      ));
                    }}
                    className="bg-transparent focus:outline-none cursor-pointer text-white font-bold"
                  >
                    <option value={TargetFormat.JPG} className="bg-zinc-900 text-zinc-100">JPG</option>
                    <option value={TargetFormat.PNG} className="bg-zinc-900 text-zinc-100">PNG</option>
                    <option value={TargetFormat.WEBP} className="bg-zinc-900 text-zinc-100">WebP</option>
                    <option value={TargetFormat.PDF} className="bg-zinc-900 text-zinc-100">PDF</option>
                  </select>
                </div>

                <div className="w-px h-4 bg-zinc-600"></div>

                {/* QUALITY SLIDER */}
                <div className="flex items-center gap-2 min-w-[120px]" title={`Calidad de compresión: ${Math.round(quality * 100)}%`}>
                   <Sliders size={14} className="text-zinc-500" />
                   <div className="flex flex-col w-full">
                      <div className="flex justify-between text-[9px] text-zinc-400 mb-0.5">
                         <span>Calidad</span>
                         <span className={quality < 0.7 ? "text-green-400" : "text-zinc-200"}>{Math.round(quality * 100)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.1" 
                        max="1.0" 
                        step="0.1"
                        value={quality}
                        onChange={(e) => setQuality(parseFloat(e.target.value))}
                        className="w-24 h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                   </div>
                </div>

             </div>

             <div className="w-px h-6 bg-zinc-800 mx-1"></div>
            
             {/* Share Buttons */}
             <a 
                href={shareWhatsApp} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center justify-center w-9 h-9 rounded-full bg-[#25D366] text-white hover:bg-[#20ba5a] hover:scale-110 transition-all shadow-lg shadow-green-900/20 shrink-0" 
                title="Compartir por WhatsApp"
             >
                <MessageCircle size={20} className="fill-white/20" />
             </a>
             <a 
                href={shareEmail} 
                className="flex items-center justify-center w-9 h-9 rounded-full bg-indigo-500 text-white hover:bg-indigo-400 hover:scale-110 transition-all shadow-lg shadow-indigo-900/20 shrink-0" 
                title="Compartir por Correo"
             >
                <Mail size={20} className="fill-white/20" />
             </a>

             <div className="w-px h-6 bg-zinc-800 mx-1"></div>

             {/* JSON Actions */}
             <button 
                onClick={() => jsonInputRef.current?.click()}
                disabled={isLoadingJson}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-zinc-700 hover:bg-zinc-800 text-xs text-zinc-400 hover:text-white transition-colors whitespace-nowrap disabled:opacity-50"
             >
                {isLoadingJson ? <RefreshCw className="animate-spin" size={14} /> : <Upload size={14} />}
                Cargar
             </button>

             <button 
                onClick={saveJsonData} 
                disabled={files.length === 0 && attachments.length === 0}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-solid border-[#61ec2f] bg-[#61ec2f] hover:bg-[#61ec2f]/90 text-black text-xs font-bold transition-colors disabled:opacity-50 whitespace-nowrap"
             >
                <FileJson size={14} /> Guardar
             </button>

             {(files.length > 0 || attachments.length > 0) && (
                <button 
                  onClick={clearAll}
                  className="ml-2 p-1.5 text-red-400 hover:bg-red-900/20 rounded-full transition-colors shrink-0"
                  title="Limpiar todo"
                >
                  <Trash2 size={16} />
                </button>
             )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-[1920px]">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Left Column (Main Area) */}
            <div className="lg:col-span-3 space-y-6">
                
                {files.length === 0 ? (
                   // INITIAL UPLOAD STATE
                   <section className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <UploadArea 
                          onFilesSelected={handleFilesSelected} 
                          onDropAction={resetDragState} 
                          onLoadJson={loadJsonFromFile}
                        />
                        <div className="text-center text-zinc-500 text-sm mt-4">
                            Soporta imágenes, videos, planos CAD y PDFs.
                        </div>
                    </section>
                ) : (
                    // GRID WITH FILES
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                            {files.map(file => (
                                <FileCard
                                    key={file.id}
                                    file={file}
                                    projectTitle={projectTitle}
                                    isProcessing={isProcessing}
                                    onRemove={removeFile}
                                    onRenameChange={updateFileName}
                                    onFormatChange={updateTargetFormat}
                                    onSmartRename={smartRenameFile}
                                    onDownload={downloadSingle}
                                    onPreview={handlePreviewMain}
                                    onCopyToAttachments={copyToAttachments}
                                    isAttached={isFileAttached(file)}
                                />
                            ))}
                            
                            {/* Small Add Button at end of grid */}
                            <button
                                onClick={() => globalFileInputRef.current?.click()}
                                className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-zinc-800 rounded-xl min-h-[150px] hover:bg-zinc-900 hover:border-zinc-600 transition-all text-zinc-500 hover:text-zinc-300"
                            >
                                <UploadCloud size={32} />
                                <span className="text-sm font-medium">Añadir más</span>
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Right Column: Attachments & PDF Merge */}
            <div className="lg:col-span-1 flex flex-col gap-6">
                <AttachmentsPanel 
                    attachments={attachments}
                    onAddFiles={handleAttachmentsSelected}
                    onRemove={removeAttachment}
                    onRename={updateAttachmentName}
                    onClear={() => setAttachments([])}
                    onClearCategory={removeAttachmentCategory}
                    onImportConverted={handleAddConvertedToAttachments}
                    onPreview={handlePreviewAttachment}
                    hasConvertedFiles={files.length > 0}
                    onDropAction={resetDragState}
                    onLoadJson={loadJsonFromFile}
                />
                
                <PdfMergePanel
                    pages={pdfPages}
                    onAddPages={handlePdfPagesAdded}
                    onRemovePage={removePdfPage}
                    onMovePage={movePdfPage}
                    onDownloadPdf={downloadMergedPdf}
                    isProcessing={isPdfMerging}
                    onLoadJson={loadJsonFromFile}
                />
            </div>
          </div>
      </main>

      {/* Floating Download Bar */}
      {(completedCount > 0 || attachments.length > 0) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700 rounded-full px-6 py-3 shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-10 fade-in duration-300 z-50 w-max max-w-[90vw]">
          <div className="text-sm whitespace-nowrap flex gap-3">
            <span className="text-green-400 font-bold">{completedCount} imgs</span>
            <span className="text-zinc-500">|</span>
            <span className="text-indigo-400 font-bold">{attachments.length} adjuntos</span>
          </div>
          <div className="h-4 w-px bg-zinc-700"></div>
          <button 
            onClick={downloadAll}
            className="flex items-center gap-2 bg-white text-zinc-900 px-4 py-1.5 rounded-full text-sm font-bold hover:bg-zinc-200 transition-colors whitespace-nowrap"
          >
            <Archive size={16} />
            Descargar ZIP
          </button>
        </div>
      )}
    </div>
  );
};

export default CompresorTab;
