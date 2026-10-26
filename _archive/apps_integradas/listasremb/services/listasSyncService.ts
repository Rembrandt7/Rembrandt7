const SUPABASE_URL = 'https://humndjymddoitxxkgtyt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1bW5kanltZGRvaXR4eGtndHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4ODkxOTAsImV4cCI6MjA4NzQ2NTE5MH0.wH3-j7PSRqF777vW8A-Y3n5-52O8-f5T8v3m6_y9m20';
const LISTAS_FILENAME = 'listas_remb.json';

export interface ListasCloudPayload {
  version: number;
  timestamp: string;
  updatedAt: number;
  username: string;
  lists: string[];
  listColors: Record<string, string>;
  listVisibility: Record<string, boolean>;
  listNotesVisibility: Record<string, boolean>;
  tasks: any[];
  contacts: any[];
  notes: any[];
  storedImages: any[];
  safeMasterPassword: string | null;
  safeItems: any[];
  links: any[];
}

export async function fetchListasFromSupabase(): Promise<ListasCloudPayload | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/savejson/${LISTAS_FILENAME}?t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Cache-Control': 'no-cache'
      }
    });

    if (!res.ok) {
      if (res.status === 404 || res.status === 400) return null;
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data && typeof data === 'object' && Array.isArray(data.tasks)) {
      return data as ListasCloudPayload;
    }
    return null;
  } catch (e) {
    console.warn('Error fetching listas_remb.json from Supabase:', e);
    return null;
  }
}

export async function saveListasToSupabase(payload: ListasCloudPayload): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/savejson/${LISTAS_FILENAME}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'x-upsert': 'true'
      },
      body: JSON.stringify(payload, null, 2)
    });

    return res.ok;
  } catch (e) {
    console.warn('Error saving listas_remb.json to Supabase:', e);
    return false;
  }
}
