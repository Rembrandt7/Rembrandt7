import { ListasRembBackupData } from '../types';

const SUPABASE_URL = 'https://humndjymddoitxxkgtyt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1bW5kanltZGRvaXR4eGtndHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTE2MjcsImV4cCI6MjA4NjIyNzYyN30.jiT4TWofUUWLsRb_B_4NjWfhCoZt8Vrfe0Jk1OuYERw';
const BUCKET_NAME = 'savejson';
const FILE_NAME = 'listas_remb.json';

export async function fetchListasFromSupabase(): Promise<ListasRembBackupData | null> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${FILE_NAME}?t=${Date.now()}`,
      {
        method: 'GET',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Cache-Control': 'no-cache'
        }
      }
    );

    if (!response.ok) {
      if (response.status === 404 || response.status === 400) {
        return null;
      }
      throw new Error(`Status ${response.status}`);
    }

    const data = await response.json();
    return data as ListasRembBackupData;
  } catch (err) {
    console.warn('Error fetching listas_remb.json from cloud:', err);
    return null;
  }
}

export async function saveListasToSupabase(jsonString: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${FILE_NAME}`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'x-upsert': 'true',
          'cache-control': 'no-cache'
        },
        body: jsonString
      }
    );

    return response.ok;
  } catch (err) {
    console.warn('Error saving listas_remb.json to cloud:', err);
    return false;
  }
}
