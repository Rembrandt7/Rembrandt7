import express from "express";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import { Readable } from "stream";
import { 
  listBodegaObjects, 
  uploadBodegaObject, 
  deleteBodegaObject, 
  getBodegaPreSignedUrl,
  createBodegaFolder,
  deleteBodegaFolder
} from "./services/r2Client";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ limit: '25mb', extended: true }));
  app.use(cookieParser());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // --- BODEGA (CLOUDFLARE R2) ENDPOINTS ---
  app.get(["/api/bodega/list", "/api/bodega"], async (req, res) => {
    try {
      const prefix = typeof req.query.prefix === 'string' ? req.query.prefix : undefined;
      const data = await listBodegaObjects(prefix);
      res.json(data);
    } catch (err: any) {
      console.error("Error in /api/bodega/list:", err);
      res.status(500).json({ error: err.message || "Failed to list Bodega files" });
    }
  });

  app.post(["/api/bodega/upload", "/api/bodega"], async (req, res) => {
    try {
      const { key, base64Data, contentType } = req.body;
      if (!key || !base64Data) {
        return res.status(400).json({ error: "Missing key or base64Data" });
      }
      const buffer = Buffer.from(base64Data, 'base64');
      await uploadBodegaObject(key, buffer, contentType || 'application/octet-stream');
      const downloadUrl = getBodegaPreSignedUrl(key, 'GET', 86400);
      res.json({ success: true, key, downloadUrl });
    } catch (err: any) {
      console.error("Error in /api/bodega/upload:", err);
      res.status(500).json({ error: err.message || "Failed to upload to Bodega" });
    }
  });

  app.post("/api/bodega/create-folder", async (req, res) => {
    try {
      const folder = req.body?.folder || req.body?.name || req.body?.path;
      if (!folder || typeof folder !== "string" || !folder.trim()) {
        return res.status(400).json({ error: "Nombre de carpeta no especificado" });
      }
      const ok = await createBodegaFolder(folder);
      res.json({ success: ok, folder });
    } catch (err: any) {
      console.error("Error creating Bodega folder:", err);
      res.status(500).json({ error: err.message || "Error al crear la carpeta" });
    }
  });

  app.delete("/api/bodega/delete-folder", async (req, res) => {
    try {
      const folder = typeof req.query.folder === "string" ? req.query.folder : req.body?.folder;
      if (!folder) {
        return res.status(400).json({ error: "Falta el parámetro folder" });
      }
      const ok = await deleteBodegaFolder(folder);
      res.json({ success: ok });
    } catch (err: any) {
      console.error("Error deleting Bodega folder:", err);
      res.status(500).json({ error: err.message || "Error al eliminar la carpeta" });
    }
  });

  app.delete(["/api/bodega/delete", "/api/bodega"], async (req, res) => {
    try {
      const isFolder = req.query.isFolder === "true" || req.body?.isFolder === true;
      if (isFolder) {
        const folder = typeof req.query.folder === "string" ? req.query.folder : req.body?.folder || req.query.key;
        if (!folder) return res.status(400).json({ error: "Falta el parámetro folder" });
        const ok = await deleteBodegaFolder(folder);
        return res.json({ success: ok });
      }
      const key = typeof req.query.key === 'string' ? req.query.key : req.body?.key;
      if (!key) {
        return res.status(400).json({ error: "Missing key parameter" });
      }
      const ok = await deleteBodegaObject(key);
      res.json({ success: ok });
    } catch (err: any) {
      console.error("Error in /api/bodega/delete:", err);
      res.status(500).json({ error: err.message || "Failed to delete from Bodega" });
    }
  });

  app.get("/api/bodega/download-url", (req, res) => {
    try {
      const key = typeof req.query.key === 'string' ? req.query.key : '';
      if (!key) {
        return res.status(400).json({ error: "Missing key parameter" });
      }
      const url = getBodegaPreSignedUrl(key, 'GET', 86400);
      res.json({ url });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Helper to create OAuth2 client
  const getOAuth2Client = (req: express.Request) => {
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const redirectUri = process.env.APP_URL 
      ? `${process.env.APP_URL}/auth/callback`
      : `${protocol}://${host}/auth/callback`;

    const clientId = req.headers["x-client-id"] || process.env.CLIENT_ID;
    const clientSecret = req.headers["x-client-secret"] || process.env.CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Missing Google API credentials. Please set them in the app settings or .env file.");
    }

    return new google.auth.OAuth2(
      clientId.toString(),
      clientSecret.toString(),
      redirectUri
    );
  };

  // 1. Get OAuth URL
  app.get(["/api/auth/url", "/api/auth/url/"], (req, res) => {
    console.log("GET /api/auth/url hit");
    try {
      const oauth2Client = getOAuth2Client(req);

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: [
          "https://www.googleapis.com/auth/calendar",
          "https://www.googleapis.com/auth/gmail.readonly",
          "https://www.googleapis.com/auth/gmail.send"
        ],
        prompt: "consent" // Force to get refresh token
      });

      console.log("Generated auth URL successfully");
      res.json({ url: authUrl });
    } catch (error) {
      console.error("Error generating auth URL:", error);
      res.status(500).json({ error: "Failed to generate auth URL" });
    }
  });

  // 2. OAuth Callback
  app.get(["/auth/callback", "/auth/callback/"], async (req, res) => {
    console.log("GET /auth/callback hit");
    const { code } = req.query;
    if (!code || typeof code !== "string") {
      console.error("Missing code in callback");
      return res.status(400).send("Missing code");
    }

    // Safely serialize code and restrict postMessage origin
    const safeCodeJson = JSON.stringify(code);
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_CODE_SUCCESS', 
                code: ${safeCodeJson} 
              }, window.location.origin);
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  });

  // 2b. Exchange Code for Tokens
  app.post(["/api/auth/exchange", "/api/auth/exchange/"], async (req, res) => {
    console.log("POST /api/auth/exchange hit");
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ error: "Missing authorization code" });
      }
      
      const oauth2Client = getOAuth2Client(req);
      const { tokens } = await oauth2Client.getToken(code);
      console.log("Tokens exchanged successfully");
      
      res.json({ tokens });
    } catch (error) {
      console.error("Error exchanging code for tokens:", error);
      res.status(500).json({ error: "Failed to exchange code" });
    }
  });

  // 3. Sync Calendar Endpoint
  app.post(["/api/calendar/sync", "/api/calendar/sync/"], async (req, res) => {
    console.log("POST /api/calendar/sync hit");
    const { tokens, localEvents, localTokens } = req.body;
    if (!tokens) {
      console.error("Missing tokens in sync request");
      return res.status(401).json({ error: "Missing tokens" });
    }

    try {
      const oauth2Client = getOAuth2Client(req);
      oauth2Client.setCredentials(tokens);
      const calendar = google.calendar({ version: "v3", auth: oauth2Client });

      // Convert tokens to event-like objects for syncing
      const tokenEvents = (localTokens || []).map((token: any) => ({
        id: `token-${token.id}`,
        title: `TOKEN: ${token.name}`,
        date: token.currentActiveDate,
        time: token.reminderTime || "",
        description: `Token recurrente cada ${token.intervalDays} días.`,
        reminderMinutes: token.reminderMinutes,
        type: 'event'
      }));

      const allLocalItems = [...(localEvents || []), ...tokenEvents];

      console.log("Fetching events from Google Calendar...");
      // Get events from primary calendar
      const response = await calendar.events.list({
        calendarId: "primary",
        timeMin: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString(),
        maxResults: 2500,
        singleEvents: true,
        orderBy: "startTime",
      });

      const googleEvents = response.data.items || [];
      console.log(`Received ${googleEvents.length} events from Google`);

      // We need to map Google events to our local format
      const importedEvents = googleEvents.map(ge => {
        // Try to extract our custom ID if we stored it in extendedProperties
        const customId = ge.extendedProperties?.private?.localId;
        
        return {
          id: customId || ge.id || Date.now().toString() + Math.random().toString(),
          title: ge.summary || "Sin título",
          date: ge.start?.date || (ge.start?.dateTime ? ge.start.dateTime.split("T")[0] : new Date().toISOString().split("T")[0]),
          time: ge.start?.dateTime ? new Date(ge.start.dateTime).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'}) : "",
          description: ge.description || "",
          type: "event",
          color: "#3b82f6", // Default color
          googleEventId: ge.id
        };
      });

      // Find local items that are not in Google Calendar (no googleEventId)
      const itemsToPush = allLocalItems.filter(item => !item.googleEventId);
      console.log(`Pushing ${itemsToPush.length} local items to Google...`);
      
      for (const item of itemsToPush) {
        try {
          // Basic validation of date
          if (!item.date || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
            console.warn(`Skipping item with invalid date: ${item.title} (${item.date})`);
            continue;
          }

          // Construct start and end times
          let startDateTime, endDateTime;
          if (item.time && /^([01]\d|2[0-3]):([0-5]\d)$/.test(item.time)) {
            const dateObj = new Date(`${item.date}T${item.time}:00`);
            if (!isNaN(dateObj.getTime())) {
              startDateTime = dateObj.toISOString();
              // Default to 1 hour duration
              const endDate = new Date(dateObj.getTime() + 60 * 60 * 1000);
              endDateTime = endDate.toISOString();
            }
          }

          const eventBody: any = {
            summary: item.title,
            description: item.description,
            extendedProperties: {
              private: {
                localId: item.id
              }
            },
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'popup', minutes: item.reminderMinutes !== undefined ? item.reminderMinutes : 30 }
              ]
            }
          };

          if (startDateTime && endDateTime) {
            eventBody.start = { dateTime: startDateTime };
            eventBody.end = { dateTime: endDateTime };
          } else {
            eventBody.start = { date: item.date };
            // End date is exclusive for all-day events in Google Calendar
            const dateParts = item.date.split('-').map(Number);
            const endDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
            endDate.setDate(endDate.getDate() + 1);
            
            const year = endDate.getFullYear();
            const month = String(endDate.getMonth() + 1).padStart(2, '0');
            const day = String(endDate.getDate()).padStart(2, '0');
            eventBody.end = { date: `${year}-${month}-${day}` };
          }

          if (item.googleEventId) {
            // Try to update
            try {
              await calendar.events.update({
                calendarId: "primary",
                eventId: item.googleEventId,
                requestBody: eventBody
              });
            } catch (updateErr: any) {
              // If not found, it might have been deleted in Google Calendar
              if (updateErr.code === 404) {
                const createdEvent = await calendar.events.insert({
                  calendarId: "primary",
                  requestBody: eventBody
                });
                item.googleEventId = createdEvent.data.id;
              }
            }
          } else {
            const createdEvent = await calendar.events.insert({
              calendarId: "primary",
              requestBody: eventBody
            });
            item.googleEventId = createdEvent.data.id;
          }
        } catch (pushErr) {
          console.error("Error pushing item to Google Calendar:", pushErr);
        }
      }

      // Merge items: keep local items, update them if they have a googleEventId, and add new google events
      const mergedItemsMap = new Map();
      
      // First add all imported events
      for (const ie of importedEvents) {
        mergedItemsMap.set(ie.id, ie);
      }

      // Then add/overwrite with local items, but keep the googleEventId
      for (const li of allLocalItems) {
        if (mergedItemsMap.has(li.id)) {
          const existing = mergedItemsMap.get(li.id);
          // Extraemos type y color locales para no perderlos, y permitimos que la data de Google domine (title, date, desc)
          mergedItemsMap.set(li.id, { 
            ...li, 
            ...existing, 
            type: li.type || existing.type, 
            color: li.color || existing.color,
            isPaid: li.isPaid,
            amount: li.amount,
            isVariable: li.isVariable,
            isFinished: li.isFinished,
            recurrence: li.recurrence,
            googleEventId: existing.googleEventId || li.googleEventId 
          });
        } else {
          // Conservar SIEMPRE el evento local (nunca borrar eventos locales ni vacaciones)
          mergedItemsMap.set(li.id, li);
        }
      }

      const finalItems = Array.from(mergedItemsMap.values());
      
      const syncedEvents = finalItems.filter(item => !item.id.toString().startsWith('token-'));
      const syncedTokens = (localTokens || []).map((token: any) => {
        const syncedTokenEvent = finalItems.find(item => item.id === `token-${token.id}`);
        return syncedTokenEvent ? { ...token, googleEventId: syncedTokenEvent.googleEventId } : token;
      });

      console.log("Sync completed successfully");

      res.json({ success: true, events: syncedEvents, tokens: syncedTokens });
    } catch (error: any) {
      if (error.message?.includes('invalid_grant') || error.response?.data?.error === 'invalid_grant') {
        console.log("Calendar sync: Token expired or revoked (invalid_grant)");
        return res.status(401).json({ error: "Token expired or revoked" });
      }
      console.error("Error syncing calendar:", error);
      res.status(500).json({ 
        error: "Failed to sync calendar", 
        details: error.message,
        code: error.code
      });
    }
  });

  // 4. Fetch Grok Email Endpoint
  app.post(["/api/gmail/grok", "/api/gmail/grok/"], async (req, res) => {
    console.log("POST /api/gmail/grok hit");
    const { tokens, index = 0 } = req.body;
    if (!tokens) {
      console.error("Missing tokens in gmail request");
      return res.status(401).json({ error: "Missing tokens" });
    }

    try {
      const oauth2Client = getOAuth2Client(req);
      oauth2Client.setCredentials(tokens);
      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      // 1. Try to search for Grok emails
      const grokQuery = `from:noreply@x.ai`;
      console.log(`Searching Gmail for Grok: ${grokQuery}`);

      let response = await gmail.users.messages.list({
        userId: "me",
        q: grokQuery,
        maxResults: index + 1
      });

      let messages = response.data.messages;
      let isFallback = false;

      // 2. If no Grok emails found, or we need more than available, fallback to general inbox
      if (!messages || messages.length <= index) {
        console.log("Grok email not found or index out of range, falling back to last received.");
        isFallback = true;
        response = await gmail.users.messages.list({
          userId: "me",
          q: "label:INBOX",
          maxResults: index + 1
        });
        messages = response.data.messages;
      }

      if (!messages || messages.length <= index) {
        return res.json({ content: null, message: "No se encontraron correos." });
      }

      // Fetch the specific message by index
      const messageId = messages[index].id!;
      const msgResponse = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full"
      });

      const payload = msgResponse.data.payload;
      const headers = payload?.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value || 'Sin asunto';
      const from = headers.find(h => h.name === 'From')?.value || 'Desconocido';
      const date = headers.find(h => h.name === 'Date')?.value || '';

      let emailBody = "";
      let htmlBody = "";

      // Helper to decode base64url
      const decodeBase64 = (data: string) => {
        return Buffer.from(data, 'base64').toString('utf-8');
      };

      // Extract body
      const findParts = (parts: any[]) => {
        for (const part of parts) {
          if (part.mimeType === "text/plain" && part.body?.data) {
            emailBody = decodeBase64(part.body.data);
          } else if (part.mimeType === "text/html" && part.body?.data) {
            htmlBody = decodeBase64(part.body.data);
          } else if (part.parts) {
            findParts(part.parts);
          }
        }
      };

      if (payload?.parts) {
        findParts(payload.parts);
      } else if (payload?.body?.data) {
        const body = decodeBase64(payload.body.data);
        if (payload.mimeType === "text/html") {
          htmlBody = body;
        } else {
          emailBody = body;
        }
      }

      res.json({ 
        id: messageId,
        subject,
        from,
        date,
        content: emailBody,
        htmlContent: htmlBody || emailBody,
        isFallback
      });
    } catch (error: any) {
      if (error.message?.includes('invalid_grant') || error.response?.data?.error === 'invalid_grant') {
        console.log("Gmail fetch: Token expired or revoked (invalid_grant)");
        return res.status(401).json({ error: "Token expired or revoked" });
      }
      console.error("Error fetching Gmail:", error);
      res.status(500).json({ error: "Failed to fetch Gmail", details: error.message });
    }
  });

  // 5. Delete (Trash) Email Endpoint
  app.post(["/api/gmail/delete", "/api/gmail/delete/"], async (req, res) => {
    console.log("POST /api/gmail/delete hit");
    const { tokens, messageId } = req.body;
    if (!tokens || !messageId) {
      return res.status(400).json({ error: "Missing tokens or messageId" });
    }

    try {
      const oauth2Client = getOAuth2Client(req);
      oauth2Client.setCredentials(tokens);
      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      await gmail.users.messages.trash({
        userId: "me",
        id: messageId
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error trashing Gmail message:", error);
      res.status(500).json({ error: "Failed to delete email", details: error.message });
    }
  });

  // 5b. Send Email with Attachments via Gmail API
  app.post(["/api/gmail/send", "/api/gmail/send/"], async (req, res) => {
    const { tokens, to, cc, subject, body: emailBody, attachments } = req.body;
    if (!tokens || !to) {
      return res.status(400).json({ error: "Faltan tokens o destinatario (Para:)" });
    }
    try {
      const oauth2Client = getOAuth2Client(req);
      oauth2Client.setCredentials(tokens);
      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

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

      res.json({ success: true, id: sendRes.data.id });
    } catch (error: any) {
      console.error("Error sending Gmail:", error);
      res.status(500).json({ error: error.message || "Error al enviar correo" });
    }
  });

  // 6. Gemini API Proxy (evade corporate firewalls)
  app.all(/^\/api\/proxy\/google\/(.*)/, async (req, res) => {
    console.log(`[PROXY] Intercepted request to: ${req.method} ${req.url}`);
    try {
      const targetUrl = req.originalUrl.replace('/api/proxy/google', 'https://generativelanguage.googleapis.com');
      
      const headers = new Headers();
      const forbiddenHeaders = ['host', 'connection', 'content-length', 'origin', 'referer', 'accept-encoding'];
      
      for (const [key, value] of Object.entries(req.headers)) {
        if (!forbiddenHeaders.includes(key.toLowerCase()) && typeof value === 'string') {
          headers.set(key, value);
        }
      }
      
      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      if (!headers.has('x-goog-api-key') && apiKey) {
        headers.set('x-goog-api-key', apiKey);
      }

      // Reconstruct JSON body if applicable (since express.json() consumed it)
      let bodyData;
      if (req.method !== 'GET' && req.method !== 'HEAD' && req.body && Object.keys(req.body).length > 0) {
          const parsedBody = req.body;
          
          // FIX: Tool use with responseMimeType: 'application/json' is unsupported in some models
          if (parsedBody.generationConfig && parsedBody.tools && parsedBody.tools.length > 0) {
              console.log("[PROXY] Tools detected, forcing responseMimeType to text/plain");
              parsedBody.generationConfig.responseMimeType = 'text/plain';
              delete parsedBody.generationConfig.responseSchema;
          }
          
          bodyData = JSON.stringify(parsedBody);
      }

      const fetchRes = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: bodyData,
      });

      res.status(fetchRes.status);
      
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

      if (fetchRes.body) {
         try {
           const buffer = await fetchRes.arrayBuffer();
           res.end(Buffer.from(buffer));
         } catch(e) {
           console.error("Error buffering response:", e);
           res.end();
         }
      } else {
         res.end();
      }

    } catch (error: any) {
      console.error("[PROXY] Error:", error);
      res.status(500).json({ error: "Proxy connection failed", details: error.message });
    }
  });

  // 7. Song import from LaCuerda & YouTube search endpoint
  app.all(["/api/song-import", "/api/song-import/"], async (req, res) => {
    const query = (req.body?.query || req.body?.url || req.query?.query || req.query?.url || '') as string;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Missing query or url parameter' });
    }

    try {
      const { scrapeSongAndMedia } = await import("./api/song-import");
      const data = await scrapeSongAndMedia(query);
      res.json({ success: true, ...data });
    } catch (error: any) {
      console.error('Song import error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 8. Live 3D Print Suggestions endpoint (Printables GraphQL)
  app.all(["/api/print-suggestions", "/api/print-suggestions/"], async (req, res) => {
    try {
      const printSuggestionsHandler = (await import("./api/print-suggestions")).default;
      await printSuggestionsHandler(req as any, res as any);
    } catch (error: any) {
      console.error("Print suggestions error:", error);
      res.status(500).json({ ok: false, error: error.message, models: [] });
    }
  });

  app.post(["/api/config/save-local", "/api/config/save-local/"], async (req, res) => {
    try {
      const fs = await import("fs");
      const configData = req.body;
      const candidates = [
        path.resolve(process.cwd(), "..", "rembrandt_config2.json"),
        path.resolve(process.cwd(), "rembrandt_config2.json")
      ];
      let saved = false;
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          fs.writeFileSync(p, JSON.stringify(configData, null, 2), "utf8");
          console.log(`[CONFIG] Saved locally to ${p}`);
          saved = true;
        }
      }
      res.json({ success: true, saved });
    } catch (e: any) {
      console.warn("[CONFIG] Local file save failed:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.post(["/api/dev/deploy", "/api/dev/deploy/"], async (req, res) => {
    try {
      const fs = await import("fs");
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);

      console.log("[DEV-DEPLOY] Iniciando proceso de despliegue a Vercel desde panel local...");

      // 1. Leer y actualizar package.json version
      const pkgPath = path.resolve(process.cwd(), "package.json");
      let currentVersion = "0.114.0";
      if (fs.existsSync(pkgPath)) {
        const pkgData = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        const vParts = (pkgData.version || "0.114.0").split(".").map(Number);
        vParts[2] = (vParts[2] || 0) + 1;
        const newVersion = `${vParts[0]}.${vParts[1]}.${vParts[2]}`;
        pkgData.version = newVersion;
        fs.writeFileSync(pkgPath, JSON.stringify(pkgData, null, 2), "utf8");
        currentVersion = newVersion;
        console.log(`[DEV-DEPLOY] package.json actualizado a v${newVersion}`);
      }

      // 2. Actualizar public/sw.js CACHE_NAME
      const swPath = path.resolve(process.cwd(), "public", "sw.js");
      if (fs.existsSync(swPath)) {
        let swContent = fs.readFileSync(swPath, "utf8");
        const match = swContent.match(/rembrandt-pwa-v(\d+)/);
        if (match) {
          const nextSwV = parseInt(match[1], 10) + 1;
          swContent = swContent.replace(/rembrandt-pwa-v\d+/, `rembrandt-pwa-v${nextSwV}`);
          fs.writeFileSync(swPath, swContent, "utf8");
          console.log(`[DEV-DEPLOY] public/sw.js actualizado a rembrandt-pwa-v${nextSwV}`);
        }
      }

      // 3. Eliminar carpeta dist si existe (EDR antivirus protection)
      const distPath = path.resolve(process.cwd(), "dist");
      if (fs.existsSync(distPath)) {
        fs.rmSync(distPath, { recursive: true, force: true });
        console.log("[DEV-DEPLOY] Carpeta dist eliminada.");
      }

      // 4. Git add, commit y push
      const commitMsg = req.body?.message || `feat: despliegue desde panel local (v${currentVersion})`;
      await execAsync("git add .");
      try {
        await execAsync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`);
      } catch (commitErr: any) {
        if (commitErr.stdout?.includes("nothing to commit") || commitErr.stderr?.includes("nothing to commit")) {
          console.log("[DEV-DEPLOY] No hay cambios adicionales para comitear.");
        } else {
          throw commitErr;
        }
      }
      await execAsync("git push origin main");
      await execAsync("git push origin HEAD:main-Rembrandt7");

      console.log("[DEV-DEPLOY] Cambios subidos a GitHub (main y main-Rembrandt7). Vercel desplegará automáticamente.");
      res.json({
        success: true,
        version: currentVersion,
        message: `¡Despliegue a Vercel iniciado exitosamente (v${currentVersion})! Tu app se actualizará en minutos.`
      });
    } catch (e: any) {
      console.error("[DEV-DEPLOY] Error al desplegar:", e);
      res.status(500).json({
        success: false,
        error: e.message || "Error al ejecutar el despliegue"
      });
    }
  });

  app.post(/(.*)/, (req, res) => {
    console.log(`POST ${req.url} not matched`);
    res.status(404).json({ error: `Route ${req.url} not found` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get(/(.*)/, (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
