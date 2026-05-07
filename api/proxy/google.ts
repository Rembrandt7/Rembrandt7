import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Directly extract the path from the URL to forward to Google AI
  const targetPath = req.url?.replace(/^\/api\/proxy\/google\//, '') || '';
  const targetUrl = `https://generativelanguage.googleapis.com/${targetPath}`;

  try {
    const headers = new Headers();
    const forbiddenHeaders = ['host', 'connection', 'content-length', 'origin', 'referer', 'accept-encoding'];
    
    Object.entries(req.headers).forEach(([key, value]) => {
      if (!forbiddenHeaders.includes(key.toLowerCase()) && typeof value === 'string') {
        headers.set(key, value);
      }
    });

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!headers.has('x-goog-api-key') && apiKey) {
      headers.set('x-goog-api-key', apiKey);
    }

    let bodyData: any = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      let parsedBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      
      // FIX: Tool use with responseMimeType: 'application/json' is unsupported in some models
      // If tools are present, we MUST ensure responseMimeType is NOT application/json
      if (parsedBody.generationConfig && parsedBody.tools && parsedBody.tools.length > 0) {
          console.log("[PROXY] Tools detected, forcing responseMimeType to text/plain");
          parsedBody.generationConfig.responseMimeType = 'text/plain';
          // Also remove responseSchema as it's only for application/json
          delete parsedBody.generationConfig.responseSchema;
      }
      
      bodyData = JSON.stringify(parsedBody);
    }

    console.log(`[PROXY] Sending ${req.method} to: ${targetUrl}`);
    
    const fetchRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: bodyData,
    });

    if (!fetchRes.ok) {
        const errorText = await fetchRes.clone().text();
        console.error(`[PROXY] Google API Error (${fetchRes.status}):`, errorText);
    }

    res.status(fetchRes.status);
    
    // FIX: Only copy safe headers. Avoid content-encoding/length which cause issues with decoded buffers.
    const restrictedResponseHeaders = [
        'content-encoding', 
        'content-length', 
        'transfer-encoding', 
        'connection', 
        'keep-alive',
        'access-control-allow-origin',
        'access-control-allow-credentials'
    ];
    
    fetchRes.headers.forEach((value, key) => {
      if (!restrictedResponseHeaders.includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    const buffer = await fetchRes.arrayBuffer();
    res.send(Buffer.from(buffer));

  } catch (error: any) {
    console.error("Proxy error:", error);
    res.status(500).json({ error: "Proxy connection failed", message: error.message });
  }
}
