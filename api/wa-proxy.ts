import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const apiHost = (payload.apiHost || req.query.apiHost || 'https://api.green-api.com')
      .toString()
      .replace(/\/$/, '');
    const instanceId = (payload.instanceId || req.query.instanceId || '').toString().trim();
    const accessKey = (payload.accessKey || req.query.accessKey || '').toString().trim();
    const action = (payload.action || req.query.action || '').toString().trim();
    const queryParams = (payload.queryParams || req.query.queryParams || '').toString().trim();
    const method = (payload.method || 'GET').toString().toUpperCase();
    const body = payload.body || undefined;

    if (!instanceId || !accessKey || !action) {
      return res.status(400).json({ error: 'Faltan parámetros de conexión (instanceId, accessKey, action)' });
    }

    // Validate host is a valid Green-API endpoint
    if (!/^https:\/\/[a-z0-9.-]+\.green-api\.com$/i.test(apiHost)) {
      return res.status(400).json({ error: 'Host API no válido' });
    }

    const qs = queryParams ? `?${queryParams.replace(/^\?/, '')}` : '';
    const targetUrl = `${apiHost}/waInstance${encodeURIComponent(instanceId)}/${encodeURIComponent(action)}/${encodeURIComponent(accessKey)}${qs}`;

    const upstreamRes = await fetch(targetUrl, {
      method,
      headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      body: method === 'POST' && body ? JSON.stringify(body) : undefined
    });

    const text = await upstreamRes.text();
    res.status(upstreamRes.status);
    try {
      const json = JSON.parse(text);
      return res.json(json);
    } catch (_) {
      return res.send(text);
    }
  } catch (err: any) {
    return res.status(500).json({
      error: err?.message || 'Error en el puente de conexión de Vercel'
    });
  }
}
