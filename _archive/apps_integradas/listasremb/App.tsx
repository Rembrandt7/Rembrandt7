import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import TaskItem from './components/TaskItem';
import StatsCards from './components/StatsCards';
import AiAssistant from './components/AiAssistant';
import FloatingCalendar from './components/FloatingCalendar';
import Calculator from './components/Calculator';
import ImageTaskAnalyzer from './components/ImageTaskAnalyzer';
import TaskModal from './components/TaskModal';
import ContactsView from './components/ContactsView';
import NotesView from './components/NotesView';
import StorageView from './components/StorageView';
import SafeView from './components/SafeView';
import LinksView from './components/LinksView';
import CloudSyncModal from './components/CloudSyncModal';
import { Task, Contact, StickyNote, StoredImage, SafeItem, LinkItem } from './types';
import { INITIAL_TASKS, DEFAULT_LISTS, CATEGORY_ICONS } from './constants';
import { exportJsonBackup } from './utils/fileExport';
import { fetchListasFromSupabase, saveListasToSupabase, ListasCloudPayload } from './services/listasSyncService';
import { Search, Plus, Menu, Bot, Calendar as CalIcon, Calculator as CalcIcon, Camera, MessageCircle, Eye, EyeOff, Palette, GripHorizontal, AlignLeft } from 'lucide-react';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [lists, setLists] = useState<string[]>(DEFAULT_LISTS);
  const [username, setUsername] = useState<string>('Usuario');
  const [listColors, setListColors] = useState<Record<string, string>>({});
  
  // New States for Utilities
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [storedImages, setStoredImages] = useState<StoredImage[]>([]);

  // Safe / Vault State
  const [safeMasterPassword, setSafeMasterPassword] = useState<string | null>(null);
  const [safeItems, setSafeItems] = useState<SafeItem[]>([]);

  // Links State
  const [links, setLinks] = useState<LinkItem[]>([]);

  // File System Handle State (For overwriting files)
  const [fileHandle, setFileHandle] = useState<any>(null);

  // Visibility State per list (default false/hidden)
  const [listVisibility, setListVisibility] = useState<Record<string, boolean>>({});
  
  // Notes Visibility State per list (default false/hidden)
  const [listNotesVisibility, setListNotesVisibility] = useState<Record<string, boolean>>({});
  
  // Date State with structured info
  const [lastModified, setLastModified] = useState<{dayOfWeek: string; fullDate: string; time: string}>({ dayOfWeek: '', fullDate: '', time: '' });

  const [filter, setFilter] = useState<string>('all'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // List Editing State
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');

  // Drag State for Lists
  const [isDraggingList, setIsDraggingList] = useState(false);
  const [draggedListSource, setDraggedListSource] = useState<string | null>(null);
  const [dragOverListId, setDragOverListId] = useState<string | null>(null);
  
  // Color Picker State (Fixed Position)
  const [colorPickerState, setColorPickerState] = useState<{ listName: string, position: { top: number, left: number } } | null>(null);
  
  // Modals State
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isImageAnalyzerOpen, setIsImageAnalyzerOpen] = useState(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [supabaseSyncStatus, setSupabaseSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('synced');
  const isInitialLoadDoneRef = useRef(false);
  const skipNextRemotePushRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // For file upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableColors = [
    '#3b82f6', // blue (brand)
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#64748b', // slate
    '#0ea5e9', // sky
  ];

  // Helper for Date Format
  const getFormattedDate = (date: Date) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    const dayName = days[date.getDay()];
    const dayNum = date.getDate();
    const monthName = months[date.getMonth()];
    
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    
    return {
      dayOfWeek: dayName,
      fullDate: `${dayNum} de ${monthName}`,
      time: `${hours}:${minutes} ${ampm}`
    };
  };

  useEffect(() => {
    setLastModified(getFormattedDate(new Date()));
  }, []);

  useEffect(() => {
    setLastModified(getFormattedDate(new Date()));
  }, [tasks, lists, username, listColors, contacts, notes, storedImages, safeItems, links]);

  const applyPayload = (data: Partial<ListasCloudPayload>) => {
    skipNextRemotePushRef.current = true;
    if (data.tasks && Array.isArray(data.tasks)) setTasks(data.tasks);
    if (data.lists && Array.isArray(data.lists)) setLists(data.lists);
    if (data.username) setUsername(data.username);
    if (data.listColors) setListColors(data.listColors);
    if (data.listVisibility) setListVisibility(data.listVisibility);
    if (data.listNotesVisibility) setListNotesVisibility(data.listNotesVisibility);
    if (data.contacts) setContacts(data.contacts);
    if (data.notes) setNotes(data.notes);
    if (data.storedImages) setStoredImages(data.storedImages);
    if (data.safeMasterPassword !== undefined) setSafeMasterPassword(data.safeMasterPassword);
    if (data.safeItems) setSafeItems(data.safeItems);
    if (data.links) setLinks(data.links);
    if (data.updatedAt) {
      localStorage.setItem('remb-listas-updated-at', String(data.updatedAt));
    }
  };

  const buildPayload = (updatedAtOverride?: number): ListasCloudPayload => {
    const ts = updatedAtOverride || Date.now();
    return {
      version: 1,
      timestamp: new Date(ts).toISOString(),
      updatedAt: ts,
      username,
      lists,
      listColors,
      listVisibility,
      listNotesVisibility,
      tasks,
      contacts,
      notes,
      storedImages,
      safeMasterPassword,
      safeItems,
      links
    };
  };

  // Load state from localStorage + Supabase
  useEffect(() => {
    const savedTasks = localStorage.getItem('remb-tasks');
    const savedLists = localStorage.getItem('remb-lists');
    const savedUser = localStorage.getItem('remb-username');
    const savedColors = localStorage.getItem('remb-list-colors');
    const savedVisibility = localStorage.getItem('remb-list-visibility');
    const savedNotesVisibility = localStorage.getItem('remb-list-notes-visibility');
    const savedContacts = localStorage.getItem('remb-contacts');
    const savedNotes = localStorage.getItem('remb-notes');
    const savedImages = localStorage.getItem('remb-storage');
    const savedSafePass = localStorage.getItem('remb-safe-pass');
    const savedSafeItems = localStorage.getItem('remb-safe-items');
    const savedLinks = localStorage.getItem('remb-links');
    
    if (savedTasks) try { setTasks(JSON.parse(savedTasks)); } catch (e) { console.error(e); }
    if (savedLists) try { setLists(JSON.parse(savedLists)); } catch (e) { console.error(e); }
    if (savedUser) setUsername(savedUser);
    if (savedColors) try { setListColors(JSON.parse(savedColors)); } catch (e) { console.error(e); }
    if (savedVisibility) try { setListVisibility(JSON.parse(savedVisibility)); } catch (e) { console.error(e); }
    if (savedNotesVisibility) try { setListNotesVisibility(JSON.parse(savedNotesVisibility)); } catch (e) { console.error(e); }
    if (savedContacts) try { setContacts(JSON.parse(savedContacts)); } catch (e) { console.error(e); }
    if (savedNotes) try { setNotes(JSON.parse(savedNotes)); } catch (e) { console.error(e); }
    if (savedImages) try { setStoredImages(JSON.parse(savedImages)); } catch (e) { console.error(e); }
    if (savedSafePass) setSafeMasterPassword(savedSafePass);
    if (savedSafeItems) try { setSafeItems(JSON.parse(savedSafeItems)); } catch (e) { console.error(e); }
    if (savedLinks) try { setLinks(JSON.parse(savedLinks)); } catch (e) { console.error(e); }

    let cancelled = false;
    (async () => {
      setSupabaseSyncStatus('syncing');
      const remote = await fetchListasFromSupabase();
      if (cancelled) return;
      if (remote) {
        const localUpdatedAt = Number(localStorage.getItem('remb-listas-updated-at') || '0');
        const remoteUpdatedAt = Number(remote.updatedAt || 0);
        if (!savedTasks || remoteUpdatedAt >= localUpdatedAt) {
          applyPayload(remote);
        }
        setSupabaseSyncStatus('synced');
      } else {
        setSupabaseSyncStatus('synced');
      }
      isInitialLoadDoneRef.current = true;
    })();

    return () => { cancelled = true; };
  }, []);

  // Poll on window focus
  useEffect(() => {
    const handleFocus = async () => {
      if (!isInitialLoadDoneRef.current) return;
      const remote = await fetchListasFromSupabase();
      if (remote) {
        const localUpdatedAt = Number(localStorage.getItem('remb-listas-updated-at') || '0');
        const remoteUpdatedAt = Number(remote.updatedAt || 0);
        if (remoteUpdatedAt > localUpdatedAt) {
          applyPayload(remote);
          setSupabaseSyncStatus('synced');
        }
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Save state
  useEffect(() => { localStorage.setItem('remb-tasks', JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem('remb-lists', JSON.stringify(lists)); }, [lists]);
  useEffect(() => { localStorage.setItem('remb-username', username); }, [username]);
  useEffect(() => { localStorage.setItem('remb-list-colors', JSON.stringify(listColors)); }, [listColors]);
  useEffect(() => { localStorage.setItem('remb-list-visibility', JSON.stringify(listVisibility)); }, [listVisibility]);
  useEffect(() => { localStorage.setItem('remb-list-notes-visibility', JSON.stringify(listNotesVisibility)); }, [listNotesVisibility]);
  useEffect(() => { localStorage.setItem('remb-contacts', JSON.stringify(contacts)); }, [contacts]);
  useEffect(() => { localStorage.setItem('remb-notes', JSON.stringify(notes)); }, [notes]);
  useEffect(() => { localStorage.setItem('remb-storage', JSON.stringify(storedImages)); }, [storedImages]);
  useEffect(() => { 
      if (safeMasterPassword) localStorage.setItem('remb-safe-pass', safeMasterPassword); 
      else localStorage.removeItem('remb-safe-pass');
  }, [safeMasterPassword]);
  useEffect(() => { localStorage.setItem('remb-safe-items', JSON.stringify(safeItems)); }, [safeItems]);
  useEffect(() => { localStorage.setItem('remb-links', JSON.stringify(links)); }, [links]);

  // Debounced auto-save to Supabase
  useEffect(() => {
    if (!isInitialLoadDoneRef.current) return;
    if (skipNextRemotePushRef.current) {
      skipNextRemotePushRef.current = false;
      return;
    }

    const nowTs = Date.now();
    localStorage.setItem('remb-listas-updated-at', String(nowTs));

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setSupabaseSyncStatus('syncing');
    debounceTimerRef.current = setTimeout(async () => {
      const payload = buildPayload(nowTs);
      const ok = await saveListasToSupabase(payload);
      setSupabaseSyncStatus(ok ? 'synced' : 'error');
    }, 1200);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [tasks, lists, username, listColors, listVisibility, listNotesVisibility, contacts, notes, storedImages, safeMasterPassword, safeItems, links]);

  const handleSupabasePush = async (): Promise<boolean> => {
    setSupabaseSyncStatus('syncing');
    const nowTs = Date.now();
    localStorage.setItem('remb-listas-updated-at', String(nowTs));
    const ok = await saveListasToSupabase(buildPayload(nowTs));
    setSupabaseSyncStatus(ok ? 'synced' : 'error');
    return ok;
  };

  const handleSupabasePull = async (): Promise<boolean> => {
    setSupabaseSyncStatus('syncing');
    const remote = await fetchListasFromSupabase();
    if (remote) {
      applyPayload(remote);
      setSupabaseSyncStatus('synced');
      return true;
    }
    setSupabaseSyncStatus('error');
    return false;
  };

  // --- CRUD Operations ---

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, completed: !t.completed, progress: !t.completed ? 100 : 0 } : t
    ));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const addTask = (title: string, category: string = 'Trabajo', date?: string) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title,
      category: category,
      completed: false,
      dueDate: date || new Date().toISOString(),
      priority: 'Media',
      notes: '',
      progress: 0
    };
    setTasks(prev => [newTask, ...prev]);
  };

  const handleSaveTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => {
      if (t.id === updatedTask.id) {
         // Auto complete if progress is 100
         const isCompleted = (updatedTask.progress === 100);
         return { ...updatedTask, completed: isCompleted };
      }
      return t;
    }));
  };

  const updateTaskDate = (id: string, dateStr: string) => {
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, dueDate: new Date(dateStr).toISOString() } : t
    ));
  };

  const handleQuickAdd = (e: React.FormEvent<HTMLFormElement>, category: string) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem('quickTask') as HTMLInputElement;
    if (input.value.trim()) {
      addTask(input.value.trim(), category);
      input.value = '';
    }
  };

  const handleAddList = (name: string) => {
    if (!lists.includes(name)) {
      setLists([...lists, name]);
    }
  };

  const startEditingList = (name: string) => {
      setEditingListId(name);
      setEditingListName(name);
  };

  const saveListRename = () => {
    if (!editingListId || !editingListName.trim() || editingListName === editingListId) {
        setEditingListId(null);
        return;
    }
    const newName = editingListName.trim();
    if (lists.includes(newName)) {
        alert("Ya existe una lista con ese nombre.");
        return;
    }

    setLists(prev => prev.map(l => l === editingListId ? newName : l));
    setTasks(prev => prev.map(t => t.category === editingListId ? { ...t, category: newName } : t));
    setListColors(prev => {
      const next = { ...prev };
      if (next[editingListId]) {
        next[newName] = next[editingListId];
        delete next[editingListId];
      }
      return next;
    });
    setListVisibility(prev => {
      const next = { ...prev };
      if (next[editingListId] !== undefined) {
        next[newName] = next[editingListId];
        delete next[editingListId];
      }
      return next;
    });
    // Migrate notes visibility too
    setListNotesVisibility(prev => {
        const next = { ...prev };
        if (next[editingListId] !== undefined) {
            next[newName] = next[editingListId];
            delete next[editingListId];
        }
        return next;
    });

    if (filter === editingListId) setFilter(newName);
    setEditingListId(null);
  };

  const handleDeleteList = (name: string) => {
    if (confirm(`¿Estás seguro de eliminar la lista "${name}"? Las tareas pasarán a "General".`)) {
        setLists(prev => prev.filter(l => l !== name));
        if (filter === name) setFilter('all');
        setTasks(prev => prev.map(t => t.category === name ? { ...t, category: 'General' } : t));
    }
  };

  const handleChangeListColor = (listName: string, color: string) => {
    setListColors(prev => ({ ...prev, [listName]: color }));
    setColorPickerState(null); // Close picker after selection
  };

  const toggleListVisibility = (listName: string) => {
    setListVisibility(prev => ({ ...prev, [listName]: !prev[listName] }));
  };

  const toggleListNotesVisibility = (listName: string) => {
    setListNotesVisibility(prev => ({ ...prev, [listName]: !prev[listName] }));
  };

  const handleImageAnalysisAdd = (titles: string[], category: string) => {
      // Use the category passed from the scanner component
      const newTasks = titles.map((title, idx) => ({
        id: Date.now().toString() + idx,
        title,
        category: category,
        completed: false,
        dueDate: new Date().toISOString(),
        priority: 'Media' as const,
        progress: 0
      }));
      setTasks(prev => [...newTasks, ...prev]);
  };

  // --- Utility Functions ---

  const addContact = (contact: Contact) => {
      setContacts(prev => [...prev, contact]);
  };
  const deleteContact = (id: string) => {
      setContacts(prev => prev.filter(c => c.id !== id));
  };

  const addNote = (note: StickyNote) => {
      setNotes(prev => [note, ...prev]);
  };
  const deleteNote = (id: string) => {
      setNotes(prev => prev.filter(n => n.id !== id));
  };

  const addStoredImage = (img: StoredImage) => {
      setStoredImages(prev => [img, ...prev]);
  };
  const deleteStoredImage = (id: string) => {
      setStoredImages(prev => prev.filter(i => i.id !== id));
  };
  
  const addSafeItem = (item: SafeItem) => {
      setSafeItems(prev => [item, ...prev]);
  };
  const deleteSafeItem = (id: string) => {
      setSafeItems(prev => prev.filter(i => i.id !== id));
  };

  const addLink = (link: LinkItem) => {
      setLinks(prev => [link, ...prev]);
  };
  
  const updateLink = (updatedLink: LinkItem) => {
    setLinks(prev => prev.map(l => l.id === updatedLink.id ? updatedLink : l));
  };

  const deleteLink = (id: string) => {
      setLinks(prev => prev.filter(l => l.id !== id));
  };


  // --- JSON Backup & Cloud Logic ---

  const getExportData = () => {
    return JSON.stringify({ 
        tasks, lists, username, listColors, listVisibility, 
        contacts, notes, storedImages,
        safeMasterPassword, safeItems, links,
        // Include timestamp for versioning
        backupTimestamp: Date.now()
    }, null, 2);
  };

  const processImportedData = (jsonString: string) => {
    try {
        const data = JSON.parse(jsonString);
        if (data.tasks && Array.isArray(data.tasks)) setTasks(data.tasks);
        if (data.lists && Array.isArray(data.lists)) setLists(data.lists);
        if (data.username) setUsername(data.username);
        if (data.listColors) setListColors(data.listColors);
        if (data.listVisibility) setListVisibility(data.listVisibility);
        if (data.contacts) setContacts(data.contacts);
        if (data.notes) setNotes(data.notes);
        if (data.storedImages) setStoredImages(data.storedImages);
        // Restore safe data
        if (data.safeMasterPassword) setSafeMasterPassword(data.safeMasterPassword);
        if (data.safeItems) setSafeItems(data.safeItems);
        if (data.links) setLinks(data.links);
        
        return true;
    } catch (error) {
        console.error("Import error", error);
        return false;
    }
  };

  const handleSaveFile = async (saveAs: boolean = false) => {
    const now = new Date();
    setLastModified(getFormattedDate(now));
    
    const content = getExportData();
    const suggestedName = `Pendientes (${username || 'Usuario'}).json`;
    const isIframe = window.self !== window.top;

    if ('showSaveFilePicker' in window && !isIframe) {
      try {
        let handle = fileHandle;
        
        // If we don't have a handle, OR if the user explicitly requested "Save As"
        if (!handle || saveAs) {
             // @ts-ignore
             handle = await window.showSaveFilePicker({
                suggestedName: suggestedName,
                types: [{
                    description: 'Archivo JSON',
                    accept: { 'application/json': ['.json'] },
                }],
            });
            // Store the handle for next time
            setFileHandle(handle);
        }

        // Create a writable stream to the file
        // This might prompt for permission if it's a re-save on an existing handle
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      } catch (err) {
         if ((err as Error).name !== 'AbortError') {
             console.warn("Save failed or permission denied, falling back to download.");
             fallbackDownload(content, suggestedName);
         }
      }
    } else {
      fallbackDownload(content, suggestedName);
    }
  };

  const fallbackDownload = (content: string, fileName: string) => {
    exportJsonBackup(content, fileName);
  };

  // Smart Open - Tries to use FS API to get handle, falls back to input
  const handleOpenFile = async () => {
     const isIframe = window.self !== window.top;
     if ('showOpenFilePicker' in window && !isIframe) {
         try {
             // @ts-ignore
             const [handle] = await window.showOpenFilePicker({
                 types: [{
                     description: 'Archivo JSON',
                     accept: { 'application/json': ['.json'] },
                 }],
                 multiple: false
             });
             
             const file = await handle.getFile();
             const text = await file.text();
             if (processImportedData(text)) {
                 alert('Datos cargados correctamente.');
                 // Store handle for future "Save"
                 setFileHandle(handle);
             } else {
                 alert('El archivo no es válido.');
             }
             
         } catch (err) {
             // Ignore abort
             if ((err as Error).name !== 'AbortError') {
                 console.warn("Open file picker failed", err);
                 fileInputRef.current?.click();
             }
         }
     } else {
         fileInputRef.current?.click();
     }
  };

  const handleInputFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
          if (processImportedData(event.target?.result as string)) {
              alert('Datos cargados correctamente.');
          } else {
              alert('El archivo no es válido.');
          }
      };
      reader.readAsText(file);
    }
    // Reset value so same file can be selected again if needed
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Drag and Drop Logic ---

  const handleDragStart = (e: React.DragEvent, item: Task | string, type: 'TASK' | 'LIST') => {
    if (type === 'TASK') {
        if (typeof item === 'string') {
            e.dataTransfer.setData('newTitle', item);
            e.dataTransfer.setData('type', 'NEW_TASK');
        } else {
            e.dataTransfer.setData('taskId', item.id);
            e.dataTransfer.setData('type', 'TASK');
        }
    } else {
        if (typeof item === 'string') {
            e.dataTransfer.setData('listName', item);
            e.dataTransfer.setData('type', 'LIST');
            setIsDraggingList(true);
            setDraggedListSource(item); // Track locally
        }
    }
  };

  const handleDragEnd = () => {
    setIsDraggingList(false);
    setDragOverListId(null);
    setDraggedListSource(null);
  };

  const handleListDrop = (e: React.DragEvent, targetListName: string) => {
      e.preventDefault();
      setIsDraggingList(false);
      setDragOverListId(null);
      setDraggedListSource(null);
      
      const type = e.dataTransfer.getData('type');
      
      if (type === 'LIST') {
          const draggedList = e.dataTransfer.getData('listName');
          if (draggedList === targetListName) return;

          const newLists = [...lists];
          const draggedIndex = newLists.indexOf(draggedList);
          const targetIndex = newLists.indexOf(targetListName);

          if (draggedIndex !== -1 && targetIndex !== -1) {
              newLists.splice(draggedIndex, 1);
              newLists.splice(targetIndex, 0, draggedList);
              setLists(newLists);
          }
      } else {
          // Dropped a Task on a List (Empty area of list) - Appends to end
          const taskId = e.dataTransfer.getData('taskId');
          const newTitle = e.dataTransfer.getData('newTitle');
          
          if (newTitle) {
             addTask(newTitle, targetListName);
          } else if (taskId) {
             // Just change category, append to end
             setTasks(prev => {
                const task = prev.find(t => t.id === taskId);
                if (!task) return prev;
                // Move to end of new list
                const filtered = prev.filter(t => t.id !== taskId);
                const updatedTask = { ...task, category: targetListName };
                return [...filtered, updatedTask];
             });
          }
      }
  };

  const handleDropOnTask = (e: React.DragEvent, targetTask: Task, position: 'top' | 'bottom') => {
      e.stopPropagation();
      e.preventDefault();
      const type = e.dataTransfer.getData('type');
      if (type !== 'TASK') return;

      const draggedTaskId = e.dataTransfer.getData('taskId');
      if (draggedTaskId === targetTask.id) return;

      setTasks(prev => {
          const draggedTask = prev.find(t => t.id === draggedTaskId);
          if (!draggedTask) return prev;

          // 1. Remove the dragged task from the array
          const remainingTasks = prev.filter(t => t.id !== draggedTaskId);

          // 2. Find the index of the target task within the REMAINING array
          const targetIndex = remainingTasks.findIndex(t => t.id === targetTask.id);
          if (targetIndex === -1) return prev; // Should not happen

          // 3. Determine insertion index
          // If dropping on bottom, we want it AFTER the target.
          // If dropping on top, we want it AT the target index (pushing target down).
          const insertionIndex = position === 'bottom' ? targetIndex + 1 : targetIndex;

          // 4. Update the category of the dragged task to match target
          const updatedDraggedTask = { ...draggedTask, category: targetTask.category };

          // 5. Insert into the new position
          const newTasks = [...remainingTasks];
          newTasks.splice(insertionIndex, 0, updatedDraggedTask);

          return newTasks;
      });
  };

  const listsToShow = filter === 'all' ? lists : lists.filter(l => l === filter);

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Invisible backdrop for color picker */}
      {/* activeColorPicker refactored to colorPickerState */}

      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        lists={lists}
        activeFilter={filter}
        onFilterChange={setFilter}
        onAddList={handleAddList}
        onDeleteList={handleDeleteList}
        lastModified={lastModified}
        username={username}
        setUsername={setUsername}
        onSaveFile={() => handleSaveFile(false)}
        onSaveFileAs={() => handleSaveFile(true)}
        onLoadFile={handleOpenFile}
        onOpenCloud={() => setIsCloudSyncOpen(true)}
        fileInputRef={fileInputRef}
        listColors={listColors}
      />

      {/* Hidden File Input for Fallback Load */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleInputFileChange} 
        accept=".json" 
        className="hidden" 
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen relative">
        
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 z-10 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <button 
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            
             {/* Left-Aligned Utilities */}
            <div className="flex items-center gap-1 border-r border-slate-200 pr-4 mr-2">
                <button 
                className={`p-2 rounded-full transition-all duration-300 relative ${isAIModalOpen ? 'text-brand-600 bg-brand-50' : 'text-slate-400 hover:text-brand-600 hover:bg-brand-50'}`}
                onClick={() => setIsAIModalOpen(!isAIModalOpen)}
                title="Asistente IA"
                >
                <Bot className="w-6 h-6" />
                </button>
                <button 
                onClick={() => setIsImageAnalyzerOpen(!isImageAnalyzerOpen)}
                className={`p-2 rounded-full transition-colors ${isImageAnalyzerOpen ? 'bg-brand-100 text-brand-700' : 'text-slate-400 hover:text-brand-600 hover:bg-slate-100'}`}
                title="Escanear Pendientes"
                >
                <Camera className="w-5 h-5" />
                </button>
                <button 
                onClick={() => setIsCalculatorOpen(!isCalculatorOpen)}
                className={`p-2 rounded-full transition-colors ${isCalculatorOpen ? 'bg-brand-100 text-brand-700' : 'text-slate-400 hover:text-brand-600 hover:bg-slate-100'}`}
                title="Calculadora"
                >
                <CalcIcon className="w-5 h-5" />
                </button>
                 <button 
                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                className={`p-2 rounded-full transition-colors ${isCalendarOpen ? 'bg-brand-100 text-brand-700' : 'text-slate-400 hover:text-brand-600 hover:bg-slate-100'}`}
                title="Calendario"
                >
                <CalIcon className="w-5 h-5" />
                </button>
                <button 
                onClick={() => window.open('https://web.whatsapp.com', '_blank')}
                className="p-2 rounded-full transition-colors text-[#00a884] hover:bg-[#00a884]/10"
                title="Ir a WhatsApp Web"
                >
                <MessageCircle className="w-5 h-5" />
                </button>
            </div>

            <div className="relative hidden md:block w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar tareas..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </header>

        {/* Board / Views Area */}
        <main className="flex-1 overflow-x-auto overflow-y-hidden bg-slate-100/50 relative">
           
           {/* -- LOGIC FOR VIEWS -- */}
           {filter === 'contacts' ? (
              <ContactsView 
                 contacts={contacts} 
                 onAddContact={addContact} 
                 onDeleteContact={deleteContact} 
                 onUpdateContact={(c) => setContacts(prev => prev.map(old => old.id === c.id ? c : old))}
              />
           ) : filter === 'notes' ? (
              <NotesView 
                 notes={notes}
                 onAddNote={addNote}
                 onDeleteNote={deleteNote}
                 onUpdateNote={(n) => setNotes(prev => prev.map(old => old.id === n.id ? n : old))}
              />
           ) : filter === 'storage' ? (
               <StorageView
                  images={storedImages}
                  onAddImage={addStoredImage}
                  onDeleteImage={deleteStoredImage}
               />
           ) : filter === 'safe' ? (
               <SafeView 
                  masterPassword={safeMasterPassword}
                  onSetMasterPassword={setSafeMasterPassword}
                  items={safeItems}
                  onAddItem={addSafeItem}
                  onDeleteItem={deleteSafeItem}
               />
           ) : filter === 'links' ? (
               <LinksView
                  links={links}
                  onAddLink={addLink}
                  onDeleteLink={deleteLink}
                  onUpdateLink={updateLink}
               />
           ) : (
             /* -- KANBAN BOARD -- */
             <div className="h-full flex gap-6 min-w-max pb-2 p-4 lg:p-6">
                {listsToShow.map(listName => {
                    const Icon = CATEGORY_ICONS[listName] || CATEGORY_ICONS['default'];
                    const isVisible = listVisibility[listName] || false; // Default false (hidden)
                    const areNotesVisible = listNotesVisibility[listName] || false; // Default false (hidden)
                    const isEditing = editingListId === listName;
                    
                    const columnTasks = tasks.filter(t => 
                        t.category === listName && 
                        t.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
                        (isVisible || !t.completed)
                    );

                    const customColor = listColors[listName];
                    const headerStyle = customColor ? { backgroundColor: customColor, color: 'white', borderColor: customColor } : { backgroundColor: 'white' };
                    const columnStyle = customColor ? { backgroundColor: `${customColor}15`, borderColor: customColor } : { backgroundColor: '#f8fafc' }; // Hex alpha
                    const textStyle = customColor ? { color: 'white' } : { color: '#334155' };
                    const iconStyle = customColor ? { color: 'white' } : {};
                    const isDragTarget = isDraggingList && dragOverListId === listName;

                    return (
                        <div 
                          key={listName} 
                          className={`w-80 flex flex-col h-full rounded-2xl border shadow-sm transition-all duration-200 ${isDragTarget ? 'border-brand-500 ring-2 ring-brand-200 ring-opacity-50 scale-[1.01]' : 'border-slate-200'}`}
                          style={columnStyle}
                          draggable={!isEditing}
                          onDragStart={(e) => handleDragStart(e, listName, 'LIST')}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => {
                             e.preventDefault(); // Essential for allowing Drop
                             if (isDraggingList && draggedListSource !== listName) {
                                 setDragOverListId(listName);
                             }
                          }}
                          onDrop={(e) => handleListDrop(e, listName)}
                        >
                            {/* Column Header */}
                            <div className="p-4 border-b border-slate-100 flex flex-col gap-2 rounded-t-xl sticky top-0 group" style={headerStyle}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 font-bold w-full" style={textStyle}>
                                        <div className="cursor-grab active:cursor-grabbing hover:opacity-70 flex-shrink-0">
                                          <GripHorizontal className="w-4 h-4" />
                                        </div>
                                        <div className={`p-1.5 rounded-md flex-shrink-0 ${customColor ? 'bg-white/20' : 'bg-slate-100'}`}>
                                          <Icon className="w-4 h-4" style={iconStyle} />
                                        </div>
                                        
                                        {/* Inline Editing */}
                                        {isEditing ? (
                                            <div className="flex-1 flex items-center relative">
                                                <input 
                                                    autoFocus
                                                    type="text"
                                                    value={editingListName}
                                                    onChange={(e) => setEditingListName(e.target.value)}
                                                    onBlur={saveListRename}
                                                    onKeyDown={(e) => e.key === 'Enter' && saveListRename()}
                                                    className="w-full bg-white text-slate-800 text-sm px-2 py-1 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                                                />
                                            </div>
                                        ) : (
                                            <span 
                                                className="truncate max-w-[120px] cursor-text hover:bg-black/5 rounded px-1 transition-colors" 
                                                title={listName}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    startEditingList(listName);
                                                }}
                                            >
                                                {listName}
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-1">
                                        {/* Toggle Notes Visibility */}
                                        <button
                                          onClick={() => toggleListNotesVisibility(listName)}
                                          className={`p-1.5 rounded-lg transition-colors ${areNotesVisible ? 'bg-white/20 text-white' : (customColor ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-slate-300 hover:text-slate-500')}`}
                                          title={areNotesVisible ? "Ocultar detalles/notas" : "Mostrar detalles/notas"}
                                        >
                                          <AlignLeft className="w-4 h-4" />
                                        </button>

                                        {/* Toggle Visibility Per List */}
                                        <button
                                          onClick={() => toggleListVisibility(listName)}
                                          className={`p-1.5 rounded-lg transition-colors ${isVisible ? 'bg-white/20 text-white' : (customColor ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-slate-300 hover:text-slate-500')}`}
                                          title={isVisible ? "Ocultar completados" : "Mostrar completados"}
                                        >
                                          {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                        </button>

                                        {/* Color Picker Trigger */}
                                        <button 
                                          onClick={(e) => {
                                              e.stopPropagation();
                                              // Toggle logic with Rect calculation
                                              if (colorPickerState?.listName === listName) {
                                                  setColorPickerState(null);
                                              } else {
                                                  const rect = e.currentTarget.getBoundingClientRect();
                                                  setColorPickerState({
                                                      listName,
                                                      position: { top: rect.bottom + 8, left: rect.left - 100 } // -100 to align better leftwards
                                                  });
                                              }
                                          }}
                                          className={`p-1.5 rounded transition-opacity ${customColor ? 'text-white/70 hover:text-white' : 'text-slate-300 hover:text-slate-500'}`}
                                        >
                                          <Palette className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center px-1">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${customColor ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                    {columnTasks.length} Tareas
                                  </span>
                                </div>
                            </div>

                            {/* Quick Add */}
                            <div className="px-3 pt-3">
                                <form onSubmit={(e) => handleQuickAdd(e, listName)} className="relative">
                                    <input 
                                        name="quickTask"
                                        type="text" 
                                        placeholder="+ Añadir tarea" 
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                                        autoComplete="off"
                                    />
                                </form>
                            </div>

                            {/* Task List (Droppable Area) */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                {columnTasks.map((task) => (
                                    <TaskItem 
                                        key={task.id}
                                        task={task}
                                        onToggle={toggleTask}
                                        onDelete={deleteTask}
                                        onDragStart={(e, t) => handleDragStart(e, t, 'TASK')}
                                        onDrop={handleDropOnTask}
                                        onDateChange={updateTaskDate}
                                        onEdit={(t) => setEditingTask(t)}
                                        customColor={customColor}
                                        showNotes={areNotesVisible}
                                    />
                                ))}
                                {columnTasks.length === 0 && (
                                    <div className={`h-24 border-2 border-dashed rounded-xl flex items-center justify-center text-sm italic ${customColor ? 'border-black/5 text-black/30' : 'border-slate-200 text-slate-400'}`}>
                                        Arrastra tareas aquí
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                
                {/* Add List Button (Board Column) */}
                <div className="w-80 h-16 flex items-center justify-center shrink-0">
                    <button 
                      onClick={() => {
                          const name = prompt("Nombre de la nueva lista:");
                          if (name) handleAddList(name);
                      }}
                      className="flex items-center gap-2 text-slate-400 hover:text-brand-600 hover:bg-slate-200/50 px-6 py-3 rounded-xl transition-all border border-transparent hover:border-slate-300 border-dashed"
                    >
                        <Plus className="w-5 h-5" />
                        Nueva Lista
                    </button>
                </div>
             </div>
           )}
        </main>
      </div>

      {/* Components / Modals */}
      <AiAssistant 
        isOpen={isAIModalOpen} 
        onClose={() => setIsAIModalOpen(false)} 
      />
      <FloatingCalendar 
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        tasks={tasks}
        onAddTask={(title, date) => addTask(title, lists.includes(filter) ? filter : 'Trabajo', date)}
        onEditTask={(t) => setEditingTask(t)}
      />
      <CloudSyncModal 
        isOpen={isCloudSyncOpen}
        onClose={() => setIsCloudSyncOpen(false)}
        getExportData={getExportData}
        onImportData={processImportedData}
        onSupabasePush={handleSupabasePush}
        onSupabasePull={handleSupabasePull}
        supabaseSyncStatus={supabaseSyncStatus}
      />
      {isCalculatorOpen && (
        <Calculator onClose={() => setIsCalculatorOpen(false)} />
      )}
      {isImageAnalyzerOpen && (
        <ImageTaskAnalyzer 
          onClose={() => setIsImageAnalyzerOpen(false)} 
          existingTasks={tasks}
          lists={lists} // Pass lists here
          onAddTasks={handleImageAnalysisAdd}
          onDragStart={(e, t) => handleDragStart(e, t, 'TASK')}
        />
      )}
      <TaskModal 
        isOpen={!!editingTask}
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onSave={handleSaveTask}
        onDelete={deleteTask}
        lists={lists}
      />
      
      {/* GLOBAL COLOR PICKER POPOVER */}
      {colorPickerState && (
          <>
            <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setColorPickerState(null)}></div>
            <div 
               className="fixed bg-white border border-slate-200 shadow-2xl rounded-lg p-2 grid grid-cols-4 gap-1 z-50 w-32 animate-in fade-in zoom-in-95 duration-100"
               style={{ top: Math.min(colorPickerState.position.top, window.innerHeight - 150), left: Math.max(10, Math.min(colorPickerState.position.left, window.innerWidth - 140)) }}
            >
                {availableColors.map(c => (
                <button 
                    key={c}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleChangeListColor(colorPickerState.listName, c);
                    }}
                    className="w-6 h-6 rounded-full hover:scale-110 transition-transform shadow-sm border border-black/5"
                    style={{ backgroundColor: c }}
                />
                ))}
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        handleChangeListColor(colorPickerState.listName, '');
                    }}
                    className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-500 hover:bg-slate-50"
                    title="Restaurar"
                >
                    X
                </button>
            </div>
          </>
      )}

    </div>
  );
};

export default App;