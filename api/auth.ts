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
  console.log(`[AUTH] Using Redirect URI: ${redirectUri}`);

  const clientId = (req.headers["x-client-id"] as string) || process.env.CLIENT_ID;
  const clientSecret = (req.headers["x-client-secret"] as string) || process.env.CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("[AUTH] Missing credentials. Host:", host);
    throw new Error("Missing Google API credentials.");
  }

  return new google.auth.OAuth2(
    clientId.toString(),
    clientSecret.toString(),
    redirectUri
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.url || '';

  try {
    // 1. Get OAuth URL
    if (url.includes('/url')) {
      const oauth2Client = await getOAuth2Client(req);
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: [
          "https://www.googleapis.com/auth/calendar",
          "https://www.googleapis.com/auth/gmail.readonly"
        ],
        prompt: "consent"
      });
      return res.json({ url: authUrl });
    }

    // 2. Exchange Code for Tokens
    if (url.includes('/exchange')) {
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: "Missing code" });
      
      const oauth2Client = await getOAuth2Client(req);
      const { tokens } = await oauth2Client.getToken(code);
      return res.json(tokens);
    }

    // 3. Auth Callback (HTML)
    if (url.includes('/callback')) {
      const { code } = req.query;
      if (!code) return res.status(400).send("Missing code");
      
      return res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_CODE_SUCCESS', code: '${code}' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. Window closing...</p>
          </body>
        </html>
      `);
    }

    res.status(404).json({ error: "Auth route not found" });

  } catch (error: any) {
    console.error("[AUTH ERROR]:", error);
    res.status(500).json({ 
      error: error.message,
      details: "Check Vercel logs for more information."
    });
  }
}
