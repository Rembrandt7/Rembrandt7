export function exportJsonBackup(content: string, fileName: string) {
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(content);
  const anchor = document.createElement('a');
  anchor.setAttribute('href', dataUri);
  anchor.setAttribute('download', fileName);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}
