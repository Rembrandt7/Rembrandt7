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

export async function addQuickIdeaToCloud(idea: {
  title: string;
  category: string;
  notes?: string;
  priority?: 'Alta' | 'Media' | 'Baja';
}): Promise<boolean> {
  try {
    let currentBackup = await fetchListasFromSupabase();
    if (!currentBackup) {
      const localStr = localStorage.getItem('remb-backup-data');
      if (localStr) {
        try { currentBackup = JSON.parse(localStr); } catch (e) {}
      }
    }

    const defaultLists = ['Trabajo', 'Casa', 'Compras', 'Estudios', 'Impresión 3D'];
    const newTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: idea.title,
      category: idea.category || 'Trabajo',
      completed: false,
      dueDate: new Date().toISOString().split('T')[0],
      createdAt: Date.now(),
      notes: idea.notes || '',
      priority: idea.priority || 'Media',
      progress: 0
    };

    const updatedTasks = [newTask, ...(currentBackup?.tasks || [])];
    const lists = Array.from(new Set([...(currentBackup?.lists || defaultLists), idea.category].filter(Boolean)));

    const updatedBackup: ListasRembBackupData = {
      version: 1,
      timestamp: Date.now(),
      username: currentBackup?.username || 'Usuario',
      tasks: updatedTasks,
      lists: lists,
      listColors: currentBackup?.listColors || {},
      contacts: currentBackup?.contacts || [],
      notes: currentBackup?.notes || [],
      storedImages: currentBackup?.storedImages || [],
      safePin: currentBackup?.safePin || null,
      safeItems: currentBackup?.safeItems || [],
      links: currentBackup?.links || []
    };

    const jsonStr = JSON.stringify(updatedBackup, null, 2);
    localStorage.setItem('remb-backup-data', jsonStr);
    localStorage.setItem('remb-backup-ts', updatedBackup.timestamp.toString());

    await saveListasToSupabase(jsonStr);
    window.dispatchEvent(new CustomEvent('listas-updated', { detail: updatedBackup }));
    return true;
  } catch (err) {
    console.error('Error adding quick idea to cloud:', err);
    return false;
  }
}
