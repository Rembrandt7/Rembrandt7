import type { VercelRequest, VercelResponse } from '@vercel/node';

async function getOAuth2Client(req: VercelRequest) {
  const { google } = await import("googleapis");
  
  // Use Vercel headers for protocol and host
  const protocol = req.headers["x-forwarded-proto"] || 'https';
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  
  // Robust base URL detection
  let baseUrl = `${protocol}://${host}`;
  
  // Only override with APP_URL if it's set and NOT pointing to localhost while we are remote
  if (process.env.APP_URL) {
    const isRemote = host && !host.toString().includes('localhost');
    const appUrlIsLocal = process.env.APP_URL.includes('localhost');
    
    if (!(isRemote && appUrlIsLocal)) {
      baseUrl = process.env.APP_URL;
    }
  }
  
  const redirectUri = `${baseUrl.replace(/\/$/, '')}/auth/callback`;
  console.log(`[CALENDAR] Using Redirect URI: ${redirectUri}`);

  const clientId = (req.headers["x-client-id"] as string) || process.env.CLIENT_ID;
  const clientSecret = (req.headers["x-client-secret"] as string) || process.env.CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("[CALENDAR] Missing credentials. Host:", host);
    throw new Error("Missing Google API credentials.");
  }

  return new google.auth.OAuth2(
    clientId.toString(),
    clientSecret.toString(),
    redirectUri
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send("Method Not Allowed");

  const { tokens, localEvents, localTokens } = req.body;
  if (!tokens) return res.status(401).json({ error: "Missing tokens" });

  try {
    const { google } = await import("googleapis");
    const oauth2Client = await getOAuth2Client(req);
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const allLocalItems = [...(localEvents || []), ...(localTokens || []).map((t: any) => ({
      id: `token-${t.id}`,
      title: `TOKEN: ${t.name}`,
      date: t.currentActiveDate,
      time: t.reminderTime || "",
      description: `Token recurrente cada ${t.intervalDays} días.`,
      reminderMinutes: t.reminderMinutes,
      type: 'event'
    }))];

    // Get remote events
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: oneYearAgo.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const googleEvents = response.data.items || [];
    const importedEvents = googleEvents.map(ge => ({
      id: ge.extendedProperties?.private?.localId || ge.id || `google-${Date.now()}`,
      title: ge.summary || "Sin título",
      date: ge.start?.date || (ge.start?.dateTime ? ge.start.dateTime.split("T")[0] : new Date().toISOString().split("T")[0]),
      time: ge.start?.dateTime ? new Date(ge.start.dateTime).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'}) : "",
      description: ge.description || "",
      type: "event",
      color: "#3b82f6",
      googleEventId: ge.id
    }));

    // Sync local items to Google
    const itemsToPush = allLocalItems.filter(item => !item.googleEventId);
    for (const item of itemsToPush) {
      try {
        if (!item.date || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) continue;

        let startDateTime, endDateTime;
        if (item.time && /^([01]\d|2[0-3]):([0-5]\d)$/.test(item.time)) {
          const dateObj = new Date(`${item.date}T${item.time}:00`);
          if (!isNaN(dateObj.getTime())) {
            startDateTime = dateObj.toISOString();
            endDateTime = new Date(dateObj.getTime() + 60 * 60 * 1000).toISOString();
          }
        }

        const eventBody: any = {
          summary: item.title,
          description: item.description,
          extendedProperties: { private: { localId: item.id } },
          start: startDateTime ? { dateTime: startDateTime } : { date: item.date },
          end: endDateTime ? { dateTime: endDateTime } : { date: item.date }
        };

        const created = await calendar.events.insert({ calendarId: "primary", requestBody: eventBody });
        item.googleEventId = created.data.id;
      } catch (e) {
        console.error("Error pushing event:", e);
      }
    }

    // Merge results
    const merged = new Map();
    importedEvents.forEach(e => merged.set(e.id, e));
    allLocalItems.forEach(li => {
      if (merged.has(li.id)) {
        const ext = merged.get(li.id);
        merged.set(li.id, { ...li, ...ext, googleEventId: ext.googleEventId || li.googleEventId });
      } else if (!li.googleEventId) {
        merged.set(li.id, li);
      }
    });

    res.json(Array.from(merged.values()));

  } catch (error: any) {
    console.error("Calendar sync error:", error);
    res.status(500).json({ error: error.message });
  }
}
