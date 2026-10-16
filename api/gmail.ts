import type { VercelRequest, VercelResponse } from '@vercel/node';

async function getOAuth2Client(req: VercelRequest) {
  const { google } = await import("googleapis");
  const protocol = (req.headers["x-forwarded-proto"] as string) || 'https';
  const host = (req.headers["x-forwarded-host"] as string) || req.headers.host || '';
  const protocolFinal = host.includes('localhost') ? 'http' : protocol;

  const redirectUri = process.env.APP_URL 
    ? `${process.env.APP_URL}/auth/callback`
    : `${protocolFinal}://${host}/auth/callback`;

  const clientId = (req.headers["x-client-id"] as string) || process.env.CLIENT_ID;
  const clientSecret = (req.headers["x-client-secret"] as string) || process.env.CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Google API credentials.");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { tokens, messageId } = req.body;
  if (!tokens) return res.status(401).json({ error: "Missing tokens" });

  try {
    const { google } = await import("googleapis");
    const oauth2Client = await getOAuth2Client(req);
    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const url = req.url || '';

    // SEND logic (with optional attachments & CC)
    if (url.includes('/send') || req.body?.action === 'send') {
      const { to, cc, subject, body: emailBody, attachments } = req.body;
      if (!to) return res.status(400).json({ error: "Falta el destinatario (Para:)" });

      const boundary = `rembrandt_mime_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const encodedSubject = `=?UTF-8?B?${Buffer.from(subject || 'Sin asunto', 'utf-8').toString('base64')}?=`;

      const headers = [
        `To: ${to}`,
        ...(cc ? [`Cc: ${cc}`] : []),
        `Subject: ${encodedSubject}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        ``,
        `--${boundary}`,
        `Content-Type: text/plain; charset="UTF-8"`,
        `Content-Transfer-Encoding: base64`,
        ``,
        Buffer.from(emailBody || '', 'utf-8').toString('base64')
      ];

      if (Array.isArray(attachments) && attachments.length > 0) {
        for (const att of attachments) {
          if (!att || !att.base64 || !att.name) continue;
          const cleanBase64 = String(att.base64).includes(',')
            ? String(att.base64).split(',')[1]
            : String(att.base64);
          const safeFilename = String(att.name).replace(/["\r\n]/g, '_');
          const mimeType = att.mimeType || 'application/octet-stream';
          headers.push(
            `--${boundary}`,
            `Content-Type: ${mimeType}; name="${safeFilename}"`,
            `Content-Disposition: attachment; filename="${safeFilename}"`,
            `Content-Transfer-Encoding: base64`,
            ``,
            cleanBase64
          );
        }
      }

      headers.push(`--${boundary}--`, ``);
      const rawMessage = headers.join('\r\n');
      const encodedRaw = Buffer.from(rawMessage, 'utf-8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const sendRes = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedRaw }
      });

      return res.json({ success: true, id: sendRes.data.id });
    }

    // DELETE logic
    if (url.includes('/delete') || req.method === 'DELETE') {
      if (!messageId) return res.status(400).json({ error: "Missing messageId" });
      await gmail.users.messages.trash({ userId: "me", id: messageId });
      return res.json({ success: true });
    }

    // GET logic
    if (!messageId) {
      const msgs = await gmail.users.messages.list({ userId: "me", maxResults: 10 });
      return res.json(msgs.data.messages || []);
    } else {
      const msgResponse = await gmail.users.messages.get({ userId: "me", id: messageId, format: "full" });
      const payload = msgResponse.data.payload;
      const headers = payload?.headers || [];
      
      const decode = (data: string) => Buffer.from(data, 'base64').toString('utf-8');
      let body = "", html = "";

      const findParts = (parts: any[]) => {
        for (const p of parts) {
          if (p.mimeType === "text/plain" && p.body?.data) body = decode(p.body.data);
          else if (p.mimeType === "text/html" && p.body?.data) html = decode(p.body.data);
          else if (p.parts) findParts(p.parts);
        }
      };

      if (payload?.parts) findParts(payload.parts);
      else if (payload?.body?.data) body = decode(payload.body.data);

      return res.json({
        id: messageId,
        subject: headers.find(h => h.name === 'Subject')?.value || 'Sin asunto',
        from: headers.find(h => h.name === 'From')?.value || 'Desconocido',
        date: headers.find(h => h.name === 'Date')?.value || '',
        content: body,
        htmlContent: html || body
      });
    }

  } catch (error: any) {
    console.error("Gmail error:", error);
    res.status(500).json({ error: error.message });
  }
}
