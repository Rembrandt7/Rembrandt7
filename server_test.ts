import express from "express";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import { Readable } from "stream";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3005;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(cookieParser());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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
          "https://www.googleapis.com/auth/gmail.readonly"
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

    // Send code back to the client via postMessage, client will exchange it
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_CODE_SUCCESS', 
                code: '${code}' 
              }, '*');
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
          // Si el evento local tiene un googleEventId, significa que alguna vez estuvo sincronizado.
          // Si ya no está en mergedItemsMap (que se llenó con importedEvents de Google), indica que 
          // probablemente fue eliminado en Google Calendar. Así que lo omitimos (borrado local).
          if (!li.googleEventId) {
            mergedItemsMap.set(li.id, li);
          } else {
             // Pero cuidado: Google Calendar API solo nos devolvió eventos del último año (timeMin).
             // Si el evento es más antiguo de un año, no está borrado, simplemente no se devolvió. Lo conservamos.
             if (li.date) {
               const eventDate = new Date(li.date);
               const oneYearAgo = new Date();
               oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
               if (eventDate < oneYearAgo) {
                 mergedItemsMap.set(li.id, li);
               }
               // Si es del último año y no está, se asume borrado en Google Calendar (lo omitimos).
             } else {
               // Si no tiene fecha, lo conservamos por seguridad
               mergedItemsMap.set(li.id, li);
             }
          }
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
          bodyData = JSON.stringify(req.body);
      }

      const fetchRes = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: bodyData,
      });

      res.status(fetchRes.status);
      
      fetchRes.headers.forEach((value, key) => {
         res.setHeader(key, value);
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
