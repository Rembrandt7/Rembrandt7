import type { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  listBodegaObjects, 
  uploadBodegaObject, 
  deleteBodegaObject, 
  getBodegaPreSignedUrl,
  createBodegaFolder,
  deleteBodegaFolder
} from '../services/r2Client';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb'
    }
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action || req.body?.action;

  try {
    if (req.method === 'GET' && action === 'list') {
      const prefix = typeof req.query.prefix === 'string' ? req.query.prefix : undefined;
      const data = await listBodegaObjects(prefix);
      return res.status(200).json(data);
    }

    if (req.method === 'POST' && (action === 'create-folder' || req.query.createFolder)) {
      const folder = req.body?.folder || req.body?.name || req.body?.path;
      if (!folder || typeof folder !== 'string' || !folder.trim()) {
        return res.status(400).json({ error: "Falta el nombre de la carpeta" });
      }
      const ok = await createBodegaFolder(folder);
      return res.status(200).json({ success: ok, folder });
    }

    if ((req.method === 'DELETE' || req.method === 'POST') && (action === 'delete-folder' || req.query.deleteFolder)) {
      const folder = typeof req.query.folder === 'string' ? req.query.folder : req.body?.folder;
      if (!folder) {
        return res.status(400).json({ error: "Falta el parámetro folder" });
      }
      const ok = await deleteBodegaFolder(folder);
      return res.status(200).json({ success: ok });
    }

    if (req.method === 'POST' && action === 'upload') {
      const { key, base64Data, contentType } = req.body;
      if (!key || !base64Data) {
        return res.status(400).json({ error: "Missing key or base64Data" });
      }
      const buffer = Buffer.from(base64Data, 'base64');
      await uploadBodegaObject(key, buffer, contentType || 'application/octet-stream');
      const downloadUrl = getBodegaPreSignedUrl(key, 'GET', 86400);
      return res.status(200).json({ success: true, key, downloadUrl });
    }

    if ((req.method === 'DELETE' || req.method === 'POST') && action === 'delete') {
      const isFolder = req.query.isFolder === 'true' || req.body?.isFolder === true;
      if (isFolder) {
        const folder = typeof req.query.folder === 'string' ? req.query.folder : (req.body?.folder || req.query.key);
        if (!folder) return res.status(400).json({ error: "Falta el parámetro folder" });
        const ok = await deleteBodegaFolder(folder);
        return res.status(200).json({ success: ok });
      }
      const key = typeof req.query.key === 'string' ? req.query.key : req.body?.key;
      if (!key) {
        return res.status(400).json({ error: "Missing key parameter" });
      }
      const ok = await deleteBodegaObject(key);
      return res.status(200).json({ success: ok });
    }

    if (req.method === 'GET' && action === 'url') {
      const key = typeof req.query.key === 'string' ? req.query.key : '';
      if (!key) {
        return res.status(400).json({ error: "Missing key parameter" });
      }
      const url = getBodegaPreSignedUrl(key, 'GET', 86400);
      return res.status(200).json({ url });
    }

    // Default fallback: list
    const data = await listBodegaObjects();
    return res.status(200).json(data);
  } catch (err: any) {
    console.error("Bodega handler error:", err);
    return res.status(500).json({ error: err.message || "Internal error in Bodega API" });
  }
}
