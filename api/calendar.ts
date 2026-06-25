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
  
  const redirectUri = `${baseUrl.replace(/\/$/, '')}/api/auth/callback`;
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

function getTimeFromDateTime(dateTimeStr?: string): string {
  if (!dateTimeStr) return "";
  const parts = dateTimeStr.split('T');
  if (parts.length < 2) return "";
  return parts[1].substring(0, 5); // HH:MM
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send("Method Not Allowed");

  const { tokens, localEvents, localTokens, timeZone } = req.body;
  if (!tokens) return res.status(401).json({ error: "Missing tokens" });

  const clientTimeZone = timeZone || "America/Mexico_City";

  try {
    const { google } = await import("googleapis");
    const oauth2Client = await getOAuth2Client(req);
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // 1. Listen for token refreshes
    let refreshedTokens: any = null;
    oauth2Client.on('tokens', (newTokens) => {
      refreshedTokens = { ...tokens, ...newTokens };
    });

    const localEventsList = localEvents || [];
    const localTokensList = localTokens || [];

    const allLocalItems = [
      ...localEventsList,
      ...localTokensList.map((t: any) => ({
        id: `token-${t.id}`,
        title: `TOKEN: ${t.name}`,
        date: t.currentActiveDate,
        time: t.reminderTime || "",
        description: `Token recurrente cada ${t.intervalDays} días.`,
        reminderMinutes: t.reminderMinutes,
        type: 'event',
        googleEventId: t.googleEventId
      }))
    ];

    // 2. Fetch remote events (up to 1 year ago)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const listResponse = await calendar.events.list({
      calendarId: "primary",
      timeMin: oneYearAgo.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const googleEvents = listResponse.data.items || [];

    // Build maps of active Google events by Google ID and local ID
    const remoteByGoogleId = new Map<string, any>();
    const remoteByLocalId = new Map<string, any>();

    googleEvents.forEach(ge => {
      if (ge.status === 'cancelled') return;
      if (ge.id) {
        remoteByGoogleId.set(ge.id, ge);
      }
      const localId = ge.extendedProperties?.private?.localId;
      if (localId) {
        remoteByLocalId.set(localId, ge);
      }
    });

    // Helper to format start/end time for Google Calendar
    const getEventDateTime = (date: string, time?: string) => {
      if (time && /^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
        const startDateTime = `${date}T${time}:00`;
        // Default duration: 1 hour
        const [hourStr, minStr] = time.split(':');
        let hour = parseInt(hourStr, 10);
        hour = (hour + 1) % 24;
        const endHourStr = hour.toString().padStart(2, '0');
        let endDate = date;
        if (hour === 0 && hourStr === '23') {
          const d = new Date(`${date}T00:00:00`);
          d.setDate(d.getDate() + 1);
          const yyyy = d.getFullYear();
          const mm = (d.getMonth() + 1).toString().padStart(2, '0');
          const dd = d.getDate().toString().padStart(2, '0');
          endDate = `${yyyy}-${mm}-${dd}`;
        }
        const endDateTime = `${endDate}T${endHourStr}:${minStr}:00`;
        return {
          start: { dateTime: startDateTime, timeZone: clientTimeZone },
          end: { dateTime: endDateTime, timeZone: clientTimeZone }
        };
      } else {
        return {
          start: { date, timeZone: clientTimeZone },
          end: { date, timeZone: clientTimeZone }
        };
      }
    };

    const syncedItems: any[] = [];
    const localIdsProcessed = new Set<string>();

    // Step A: Sync local events to Google Calendar (new creations and updates)
    for (const item of allLocalItems) {
      if (!item.date || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
        // Keep invalid items locally so we don't drop them, but don't push them
        syncedItems.push(item);
        continue;
      }

      localIdsProcessed.add(item.id);

      if (!item.googleEventId) {
        // A.1: Brand new local item -> Insert in Google
        try {
          const { start, end } = getEventDateTime(item.date, item.time);
          const created = await calendar.events.insert({
            calendarId: "primary",
            requestBody: {
              summary: item.title,
              description: item.description || "",
              extendedProperties: { private: { localId: item.id } },
              start,
              end
            }
          });
          syncedItems.push({
            ...item,
            googleEventId: created.data.id || undefined
          });
        } catch (err) {
          console.error(`Error inserting event ${item.id} to Google:`, err);
          syncedItems.push(item); // Keep locally anyway
        }
      } else {
        // A.2: Existing local item -> Check remote corresponding event
        const remoteEvent = remoteByGoogleId.get(item.googleEventId) || remoteByLocalId.get(item.id);

        if (remoteEvent) {
          // Check if modified locally compared to Google Calendar
          const remoteSummary = remoteEvent.summary || "";
          const remoteDesc = remoteEvent.description || "";
          const remoteStartDate = remoteEvent.start?.date || (remoteEvent.start?.dateTime ? remoteEvent.start.dateTime.split("T")[0] : "");
          const remoteStartTime = remoteEvent.start?.dateTime ? getTimeFromDateTime(remoteEvent.start.dateTime) : "";

          const isModified = 
            item.title !== remoteSummary ||
            (item.description || "") !== remoteDesc ||
            item.date !== remoteStartDate ||
            (item.time || "") !== remoteStartTime;

          if (isModified) {
            // Update Google Calendar with local values
            try {
              const { start, end } = getEventDateTime(item.date, item.time);
              await calendar.events.patch({
                calendarId: "primary",
                eventId: item.googleEventId,
                requestBody: {
                  summary: item.title,
                  description: item.description || "",
                  start,
                  end
                }
              });
            } catch (err) {
              console.error(`Error updating event ${item.id} in Google:`, err);
            }
          }
          syncedItems.push(item);
        } else {
          // Remote event not found. Was it deleted in Google Calendar, or is it just older than 1 year?
          const eventDate = new Date(`${item.date}T00:00:00`);
          const isOlderThanOneYear = eventDate < oneYearAgo;

          if (isOlderThanOneYear) {
            // Keep it locally (don't delete historical events outside search window)
            syncedItems.push(item);
          } else {
            // Deleted in Google -> Drop it locally
            console.log(`Event ${item.id} / ${item.title} was deleted on Google Calendar. Removing locally.`);
          }
        }
      }
    }

    // Step B: Import new Google events OR delete locally-deleted Rembrandt events from Google
    for (const ge of googleEvents) {
      if (ge.status === 'cancelled') continue;
      
      const localId = ge.extendedProperties?.private?.localId;

      if (!localId) {
        // B.1: Google-native event -> Import it!
        const date = ge.start?.date || (ge.start?.dateTime ? ge.start.dateTime.split("T")[0] : new Date().toISOString().split("T")[0]);
        const time = ge.start?.dateTime ? getTimeFromDateTime(ge.start.dateTime) : "";
        syncedItems.push({
          id: ge.id || `google-${Date.now()}-${Math.random()}`,
          title: ge.summary || "Sin título",
          date,
          time,
          description: ge.description || "",
          type: "event",
          color: "#3b82f6",
          googleEventId: ge.id || undefined
        });
      } else {
        // B.2: Rembrandt-native event, but not in allLocalItems -> It was deleted in Rembrandt app!
        if (!localIdsProcessed.has(localId)) {
          // If within the active sync window, delete it from Google Calendar
          const remoteStartDate = ge.start?.date || (ge.start?.dateTime ? ge.start.dateTime.split("T")[0] : "");
          if (remoteStartDate) {
            const eventDate = new Date(`${remoteStartDate}T00:00:00`);
            if (eventDate >= oneYearAgo) {
              try {
                console.log(`Event ${localId} was deleted locally. Deleting from Google Calendar: ${ge.id}`);
                await calendar.events.delete({
                  calendarId: "primary",
                  eventId: ge.id
                });
              } catch (err) {
                console.error(`Error deleting event ${ge.id} from Google:`, err);
              }
            }
          }
        }
      }
    }

    // Split synced items back to events and tokens
    const syncedEvents = syncedItems.filter(item => !item.id.toString().startsWith('token-'));
    
    const syncedTokens = localTokensList.map((t: any) => {
      const mappedEvent = syncedItems.find(item => item.id === `token-${t.id}`);
      if (mappedEvent && mappedEvent.googleEventId) {
        return { ...t, googleEventId: mappedEvent.googleEventId };
      }
      return t;
    });

    res.json({
      events: syncedEvents,
      tokens: syncedTokens,
      ...(refreshedTokens ? { googleCalendarTokens: refreshedTokens } : {})
    });

  } catch (error: any) {
    console.error("Calendar sync error:", error);
    res.status(500).json({ error: error.message });
  }
}
