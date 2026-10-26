import { AttachmentCategory } from "../types";

export const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const getExtensionFromMime = (mimeType: string, originalName: string): string => {
  switch (mimeType) {
    case 'image/jpeg': return 'jpg';
    case 'image/png': return 'png';
    case 'image/webp': return 'webp';
    case 'application/pdf': return 'pdf';
    case 'original': 
      return originalName.split('.').pop() || '';
    default: return 'bin';
  }
};

export const getFileCategory = (file: File): AttachmentCategory => {
  const name = file.name.toLowerCase();
  const type = file.type;

  if (name.endsWith('.pdf')) return 'PDF';
  if (/\.(dwg|dxf|skp|rvt)$/i.test(name)) return 'CAD';
  if (type.startsWith('image/')) return 'RENDER';
  if (type.startsWith('video/')) return 'VIDEO';
  
  return 'DOC';
};

// New helper for JSON export
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Helper to render a PDF page to a blob/file
const renderPageToImage = async (page: any, scale: number = 2): Promise<Blob | null> => {
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return null;

    await page.render({ canvasContext: ctx, viewport }).promise;
    
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
};

interface ProcessedPdfResult {
    file: File;
    previewUrl: string;
    type: 'pdf' | 'image';
    isSplit?: boolean;
}

export const processPdfUpload = async (file: File): Promise<ProcessedPdfResult[]> => {
    return new Promise(async (resolve, reject) => {
        try {
             // @ts-ignore
             const pdfjsLib = window.pdfjsLib;
             if (!pdfjsLib) {
                 // Fallback if lib not loaded
                 resolve([{ file, previewUrl: URL.createObjectURL(file), type: 'pdf' }]);
                 return;
             }

             pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
             
             const arrayBuffer = await file.arrayBuffer();
             const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
             const results: ProcessedPdfResult[] = [];

             // IF SINGLE PAGE: Keep as PDF but generate thumbnail
             if (pdf.numPages === 1) {
                 const page = await pdf.getPage(1);
                 const blob = await renderPageToImage(page, 1.5); // Thumbnail scale
                 let previewUrl = URL.createObjectURL(file); // Default
                 
                 if (blob) {
                     previewUrl = URL.createObjectURL(blob);
                 }
                 results.push({ file, previewUrl, type: 'pdf' });
             } 
             // IF MULTI PAGE: Split into images
             else {
                 for (let i = 1; i <= pdf.numPages; i++) {
                     const page = await pdf.getPage(i);
                     const blob = await renderPageToImage(page, 2); // High quality for conversion
                     
                     if (blob) {
                         const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                         const newFileName = `${fileNameWithoutExt}_pag${i}.png`;
                         const newFile = new File([blob], newFileName, { type: 'image/png' });
                         
                         results.push({
                             file: newFile,
                             previewUrl: URL.createObjectURL(newFile),
                             type: 'image', // Treat split pages as images
                             isSplit: true
                         });
                     }
                 }
             }
             
             resolve(results);

        } catch (error) {
            console.error("Error processing PDF:", error);
            // Fallback return original without processing
            resolve([{ file, previewUrl: URL.createObjectURL(file), type: 'pdf' }]);
        }
    });
};

// Function to Merge multiple images into a single PDF
export const mergeImagesToPdf = async (files: File[], filename: string): Promise<void> => {
    // @ts-ignore
    const { jsPDF } = window.jspdf;
    if (!jsPDF) throw new Error("jsPDF library not found");

    // Initialize with first image to set orientation/size, but we will reset per page
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: 'a4' // Initial placeholder
    });
    
    // Remove the initial page added by default because we want custom sizes per image
    doc.deletePage(1);

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const imageUrl = URL.createObjectURL(file);

        // Load image to get dimensions
        const img = new Image();
        img.src = imageUrl;
        
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });

        // Add a new page matching the image dimensions
        const width = img.width;
        const height = img.height;
        
        doc.addPage([width, height], width > height ? 'l' : 'p');
        doc.addImage(img, 'JPEG', 0, 0, width, height);
        
        URL.revokeObjectURL(imageUrl);
    }

    doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
};

export const processImage = async (
  file: File, 
  format: string, 
  quality: number
): Promise<Blob> => {
  return new Promise(async (resolve, reject) => {
    // 1. If format is original, return file
    if (format === 'original') {
      resolve(file);
      return;
    }

    try {
      // 2. CONVERSION: IMAGE -> PDF
      if (file.type.startsWith('image/') && format === 'application/pdf') {
         // @ts-ignore
         const { jsPDF } = window.jspdf;
         if (!jsPDF) return reject(new Error("jsPDF library not found"));

         const img = new Image();
         const url = URL.createObjectURL(file);
         
         img.onload = () => {
            const doc = new jsPDF({
               orientation: img.width > img.height ? 'l' : 'p',
               unit: 'px',
               format: [img.width, img.height] // Match image dimensions directly for best quality
            });
            doc.addImage(img, 'JPEG', 0, 0, img.width, img.height);
            const blob = doc.output('blob');
            URL.revokeObjectURL(url);
            resolve(blob);
         };
         img.onerror = () => {
             URL.revokeObjectURL(url);
             reject(new Error("Failed to load image for PDF conversion"));
         }
         img.src = url;
         return;
      }

      // 3. CONVERSION: PDF -> IMAGE (First Page)
      if (file.type === 'application/pdf' && format.startsWith('image/')) {
         // @ts-ignore
         const pdfjsLib = window.pdfjsLib;
         if (!pdfjsLib) return reject(new Error("PDF.js library not loaded"));
         
         pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

         const arrayBuffer = await file.arrayBuffer();
         const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
         const page = await pdf.getPage(1);
         
         const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better quality
         const canvas = document.createElement('canvas');
         canvas.width = viewport.width;
         canvas.height = viewport.height;
         const ctx = canvas.getContext('2d');
         
         if(!ctx) return reject(new Error("Canvas context failed"));

         await page.render({ canvasContext: ctx, viewport }).promise;
         
         canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas to Blob failed"));
         }, format, quality);
         return;
      }

      // 4. CONVERSION: PDF -> PDF (No-op or compression could go here)
      if (file.type === 'application/pdf' && format === 'application/pdf') {
         // Just return the original PDF for now
         resolve(file); 
         return;
      }

      // 5. CONVERSION: IMAGE -> IMAGE (Existing logic)
      if (file.type.startsWith('image/')) {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
          URL.revokeObjectURL(url);
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error("No se pudo crear el contexto del canvas"));
            return;
          }

          // Fill white background for transparent PNGs converting to JPG
          if (format === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          ctx.drawImage(img, 0, 0);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error("Error al convertir la imagen"));
              }
            },
            format,
            quality
          );
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("Error al cargar la imagen"));
        };

        img.src = url;
        return;
      }

      // Fallback
      resolve(file);

    } catch (e) {
      reject(e);
    }
  });
};