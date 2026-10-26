/**
 * Helper puro para guardar archivos multimedia procesados en el navegador.
 * Separado en su propio módulo sin acceso a almacenamiento local.
 */
export function saveMediaUrl(dataUrlOrObjectUrl: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = dataUrlOrObjectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function saveMediaBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  saveMediaUrl(url, fileName);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
