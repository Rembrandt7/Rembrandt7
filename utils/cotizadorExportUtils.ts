export const exportDataAsJsonFile = (data: unknown, filename: string) => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
  const anchorNode = document.createElement('a');
  anchorNode.setAttribute("href", dataStr);
  anchorNode.setAttribute("download", filename);
  document.body.appendChild(anchorNode);
  anchorNode.click();
  anchorNode.remove();
};

export const exportDataAsCsvFile = (csvContentWithHeader: string, filename: string) => {
  const encodedUri = encodeURI(csvContentWithHeader);
  const anchorNode = document.createElement('a');
  anchorNode.setAttribute("href", encodedUri);
  anchorNode.setAttribute("download", filename);
  document.body.appendChild(anchorNode);
  anchorNode.click();
  anchorNode.remove();
};

export const exportBase64AsFile = (dataUri: string, filename: string) => {
  const anchorNode = document.createElement('a');
  anchorNode.setAttribute("href", dataUri);
  anchorNode.setAttribute("download", filename);
  document.body.appendChild(anchorNode);
  anchorNode.click();
  anchorNode.remove();
};
