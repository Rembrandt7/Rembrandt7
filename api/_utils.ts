import type { VercelRequest } from '@vercel/node';

/**
 * Creates a Google OAuth2 client from the request headers or environment variables.
 */
export async function getOAuth2Client(req: VercelRequest) {
  const { google } = await import("googleapis");
  const protocol = (req.headers["x-forwarded-proto"] as string) || 'https';
  const host = (req.headers["x-forwarded-host"] as string) || req.headers.host || '';
  
  const redirectUri = process.env.APP_URL 
    ? `${process.env.APP_URL}/auth/callback`
    : `${protocol}://${host}/auth/callback`;

  const clientId = (req.headers["x-client-id"] as string) || process.env.CLIENT_ID;
  const clientSecret = (req.headers["x-client-secret"] as string) || process.env.CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Google API credentials.");
  }

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
}

/**
 * Parses user tokens from request headers.
 */
export function getTokensFromHeaders(req: VercelRequest) {
  const accessToken = req.headers["x-access-token"] as string;
  const refreshToken = req.headers["x-refresh-token"] as string;
  
  if (!accessToken) return null;
  
  return {
    access_token: accessToken,
    refresh_token: refreshToken
  };
}
