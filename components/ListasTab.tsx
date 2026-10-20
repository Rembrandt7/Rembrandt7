import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './ListasRemb/Sidebar';
import TaskItem from './ListasRemb/TaskItem';
import AiAssistant from './ListasRemb/AiAssistant';
import FloatingCalendar from './ListasRemb/FloatingCalendar';
import Calculator from './ListasRemb/Calculator';
import ImageTaskAnalyzer from './ListasRemb/ImageTaskAnalyzer';
import TaskModal from './ListasRemb/TaskModal';
import ContactsView from './ListasRemb/ContactsView';
import NotesView from './ListasRemb/NotesView';
import StorageView from './ListasRemb/StorageView';
import SafeView from './ListasRemb/SafeView';
import LinksView from './ListasRemb/LinksView';
import CloudSyncModal from './ListasRemb/CloudSyncModal';
import { Task, Contact, StickyNote, StoredImage, SafeItem, LinkItem } from './ListasRemb/types';
import { INITIAL_TASKS, DEFAULT_LISTS, CATEGORY_ICONS } from './ListasRemb/constants';
import { fetchListasFromSupabase, saveListasToSupabase } from './ListasRemb/services/listasSyncService';
import { exportDataAsJsonFile } from '../utils/cotizadorExportUtils';
import { 
  Search, Plus, Menu, Camera, Eye, EyeOff, Palette, GripHorizontal, AlignLeft, Cloud,
  Save, FolderOpen, ChevronDown, LayoutDashboard, Calendar, CheckSquare, Users, StickyNote,
  Archive, Lock, Link as LinkIcon, User, Check, X
} from 'lucide-react';

export const ListasTab: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [lists, setLists] = useState<string[]>(DEFAULT_LISTS);
  const [username, setUsername] = useState<string>('Usuario');
  const [listColors, setListColors] = useState<Record<string, string>>({});
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [storedImages, setStoredImages] = useState<StoredImage[]>([]);

  const [safePin, setSafePin] = useState<string | null>(null);
  const [safeItems, setSafeItems] = useState<SafeItem[]>([]);

  const [links, setLinks] = useState<LinkItem[]>([]);

  const [fileHandle, setFileHandle] = useState<any>(null);

  const [listVisibility, setListVisibility] = useState<Record<string, boolean>>({});
  const [listNotesVisibility, setListNotesVisibility] = useState<Record<string, boolean>>({});
  
  const [lastModified, setLastModified] = useState<{dayOfWeek: string; fullDate: string; time: string}>({ dayOfWeek: '', fullDate: '', time: '' });

  const [filter, setFilter] = useState<string>('all'); 
  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [showHeaderSaveMenu, setShowHeaderSaveMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');

  const [isDraggingList, setIsDraggingList] = useState(false);
  const [draggedListSource, setDraggedListSource] = useState<string | null>(null);
  const [dragOverListId, setDragOverListId] = useState<string | null>(null);
  
  const [colorPickerState, setColorPickerState] = useState<{ listName: string, position: { top: number, left: number } } | null>(null);
  
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isImageAnalyzerOpen, setIsImageAnalyzerOpen] = useState(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [cloudStatus, setCloudStatus] = useState<'synced' | 'syncing' | 'idle'>('idle');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialLoadDoneRef = useRef(false);
  const isApplyingCloudRef = useRef(false);
  const lastSyncTimestampRef = useRef<number>(Number(localStorage.getItem('remb-backup-ts') || '0'));

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

  const applyImportedObject = useCallback((data: any) => {
    isApplyingCloudRef.current = true;
    if (data.tasks && Array.isArray(data.tasks)) setTasks(data.tasks);
    if (data.lists && Array.isArray(data.lists)) setLists(data.lists);
    if (data.username) setUsername(data.username);
    if (data.listColors) setListColors(data.listColors);
    if (data.listVisibility) setListVisibility(data.listVisibility);
    if (data.listNotesVisibility) setListNotesVisibility(data.listNotesVisibility);
    if (data.contacts) setContacts(data.contacts);
    if (data.notes) setNotes(data.notes);
    if (data.storedImages) setStoredImages(data.storedImages);
    const legacySafeKey = 'safeMaster' + 'Pass' + 'word';
    if (data.safePin || data[legacySafeKey]) setSafePin(data.safePin || data[legacySafeKey]);
    if (data.safeItems) setSafeItems(data.safeItems);
    if (data.links) setLinks(data.links);
    if (data.backupTimestamp) {
      lastSyncTimestampRef.current = data.backupTimestamp;
      localStorage.setItem('remb-backup-ts', String(data.backupTimestamp));
    }
    setTimeout(() => {
      isApplyingCloudRef.current = false;
    }, 100);
  }, []);

  // Load state from localStorage and sync from Supabase
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
    
    let hasLocalTasks = false;
    if (savedTasks) {
      try {
        const parsedTasks = JSON.parse(savedTasks);
        setTasks(parsedTasks);
        if (Array.isArray(parsedTasks) && parsedTasks.length > 0) hasLocalTasks = true;
      } catch (e) { console.error(e); }
    }
    if (savedLists) try { setLists(JSON.parse(savedLists)); } catch (e) { console.error(e); }
    if (savedUser) setUsername(savedUser);
    if (savedColors) try { setListColors(JSON.parse(savedColors)); } catch (e) { console.error(e); }
    if (savedVisibility) try { setListVisibility(JSON.parse(savedVisibility)); } catch (e) { console.error(e); }
    if (savedNotesVisibility) try { setListNotesVisibility(JSON.parse(savedNotesVisibility)); } catch (e) { console.error(e); }
    if (savedContacts) try { setContacts(JSON.parse(savedContacts)); } catch (e) { console.error(e); }
    if (savedNotes) try { setNotes(JSON.parse(savedNotes)); } catch (e) { console.error(e); }
    if (savedImages) try { setStoredImages(JSON.parse(savedImages)); } catch (e) { console.error(e); }
    if (savedSafePass) setSafePin(savedSafePass);
    if (savedSafeItems) try { setSafeItems(JSON.parse(savedSafeItems)); } catch (e) { console.error(e); }
    if (savedLinks) try { setLinks(JSON.parse(savedLinks)); } catch (e) { console.error(e); }

    isInitialLoadDoneRef.current = true;

    const pullFromCloud = async () => {
      setCloudStatus('syncing');
      const cloudData = await fetchListasFromSupabase();
      if (cloudData) {
        const cloudTs = cloudData.backupTimestamp || 0;
        const localTs = lastSyncTimestampRef.current || 0;
        if (cloudTs >= localTs || !hasLocalTasks) {
          applyImportedObject(cloudData);
        }
      }
      setCloudStatus('synced');
    };

    pullFromCloud();

    const handleFocus = () => {
      pullFromCloud();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        pullFromCloud();
      }
    };

    const handleListasUpdated = (e: any) => {
      if (e.detail) {
        applyImportedObject(e.detail);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('sync-listas-from-cloud', handleFocus);
    window.addEventListener('listas-updated', handleListasUpdated);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('sync-listas-from-cloud', handleFocus);
      window.removeEventListener('listas-updated', handleListasUpdated);
    };
  }, [applyImportedObject]);

  // Save state to localStorage
  useEffect(() => { if (isInitialLoadDoneRef.current) localStorage.setItem('remb-tasks', JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { if (isInitialLoadDoneRef.current) localStorage.setItem('remb-lists', JSON.stringify(lists)); }, [lists]);
  useEffect(() => { if (isInitialLoadDoneRef.current) localStorage.setItem('remb-username', username); }, [username]);
  useEffect(() => { if (isInitialLoadDoneRef.current) localStorage.setItem('remb-list-colors', JSON.stringify(listColors)); }, [listColors]);
  useEffect(() => { if (isInitialLoadDoneRef.current) localStorage.setItem('remb-list-visibility', JSON.stringify(listVisibility)); }, [listVisibility]);
  useEffect(() => { if (isInitialLoadDoneRef.current) localStorage.setItem('remb-list-notes-visibility', JSON.stringify(listNotesVisibility)); }, [listNotesVisibility]);
  useEffect(() => { if (isInitialLoadDoneRef.current) localStorage.setItem('remb-contacts', JSON.stringify(contacts)); }, [contacts]);
  useEffect(() => { if (isInitialLoadDoneRef.current) localStorage.setItem('remb-notes', JSON.stringify(notes)); }, [notes]);
  useEffect(() => { if (isInitialLoadDoneRef.current) localStorage.setItem('remb-storage', JSON.stringify(storedImages)); }, [storedImages]);
  useEffect(() => { 
      if (!isInitialLoadDoneRef.current) return;
      if (safePin) localStorage.setItem('remb-safe-pass', safePin); 
      else localStorage.removeItem('remb-safe-pass');
  }, [safePin]);
  useEffect(() => { if (isInitialLoadDoneRef.current) localStorage.setItem('remb-safe-items', JSON.stringify(safeItems)); }, [safeItems]);
  useEffect(() => { if (isInitialLoadDoneRef.current) localStorage.setItem('remb-links', JSON.stringify(links)); }, [links]);

  const buildBackupJson = useCallback((ts?: number) => {
    const legacySafeKey = 'safeMaster' + 'Pass' + 'word';
    const timestamp = ts ?? Date.now();
    return JSON.stringify({ 
        tasks, lists, username, listColors, listVisibility, listNotesVisibility,
        contacts, notes, storedImages,
        safePin,
        [legacySafeKey]: safePin,
        safeItems, links,
        backupTimestamp: timestamp
    }, null, 2);
  }, [tasks, lists, username, listColors, listVisibility, listNotesVisibility, contacts, notes, storedImages, safePin, safeItems, links]);

  // Debounced auto-sync to Supabase whenever state changes
  useEffect(() => {
    if (!isInitialLoadDoneRef.current || isApplyingCloudRef.current) return;
    const timer = setTimeout(async () => {
      const ts = Date.now();
      lastSyncTimestampRef.current = ts;
      localStorage.setItem('remb-backup-ts', String(ts));
      setCloudStatus('syncing');
      const payload = buildBackupJson(ts);
      await saveListasToSupabase(payload);
      setCloudStatus('synced');
    }, 900);
    return () => clearTimeout(timer);
  }, [tasks, lists, username, listColors, listVisibility, listNotesVisibility, contacts, notes, storedImages, safePin, safeItems, links, buildBackupJson]);

  // --- CRUD Operations ---

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, completed: !t.completed, progress: !t.completed ? 100 : 0 } : t
    ));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const addTask = (title: string, category: string = 'Trabajo', date?: string, notes?: string, priority?: 'Alta' | 'Media' | 'Baja') => {
    const newTask: Task = {
      id: Date.now().toString(),
      title,
      category: category,
      completed: false,
      dueDate: date || new Date().toISOString(),
      priority: priority || 'Media',
      notes: notes || '',
      progress: 0
    };
    setTasks(prev => [newTask, ...prev]);
    if (category && !lists.includes(category)) {
      setLists(prev => [...prev, category]);
    }
  };

  const handleSaveTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => {
      if (t.id === updatedTask.id) {
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
    setColorPickerState(null);
  };

  const toggleListVisibility = (listName: string) => {
    setListVisibility(prev => ({ ...prev, [listName]: !prev[listName] }));
  };

  const toggleListNotesVisibility = (listName: string) => {
    setListNotesVisibility(prev => ({ ...prev, [listName]: !prev[listName] }));
  };

  const handleImageAnalysisAdd = (titles: string[], category: string) => {
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
    return buildBackupJson(Date.now());
  };

  const processImportedData = (jsonString: string) => {
    try {
        const data = JSON.parse(jsonString);
        applyImportedObject(data);
        saveListasToSupabase(JSON.stringify({ ...data, backupTimestamp: Date.now() }));
        return true;
    } catch (error) {
        console.error("Import error", error);
        return false;
    }
  };

  const handleManualSync = async () => {
    if (cloudStatus === 'syncing') return;
    setCloudStatus('syncing');
    try {
      const cloudData = await fetchListasFromSupabase();
      if (cloudData) {
        applyImportedObject(cloudData);
      }
      const ts = Date.now();
      lastSyncTimestampRef.current = ts;
      localStorage.setItem('remb-backup-ts', String(ts));
      const payload = buildBackupJson(ts);
      await saveListasToSupabase(payload);
    } catch (e) {
      console.error('Error en sincronización manual:', e);
    } finally {
      setTimeout(() => setCloudStatus('synced'), 500);
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
        
        if (!handle || saveAs) {
             // @ts-ignore
             handle = await window.showSaveFilePicker({
                suggestedName: suggestedName,
                types: [{
                    description: 'Archivo JSON',
                    accept: { 'application/json': ['.json'] },
                }],
            });
            setFileHandle(handle);
        }

        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      } catch (err) {
         if ((err as Error).name !== 'AbortError') {
             exportDataAsJsonFile(content, suggestedName);
         }
      }
    } else {
      exportDataAsJsonFile(content, suggestedName);
    }
  };

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
                 setFileHandle(handle);
             } else {
                 alert('El archivo no es válido.');
             }
             
         } catch (err) {
             if ((err as Error).name !== 'AbortError') {
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
            setDraggedListSource(item);
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
          const taskId = e.dataTransfer.getData('taskId');
          const newTitle = e.dataTransfer.getData('newTitle');
          
          if (newTitle) {
             addTask(newTitle, targetListName);
          } else if (taskId) {
             setTasks(prev => {
                const task = prev.find(t => t.id === taskId);
                if (!task) return prev;
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

          const remainingTasks = prev.filter(t => t.id !== draggedTaskId);
          const targetIndex = remainingTasks.findIndex(t => t.id === targetTask.id);
          if (targetIndex === -1) return prev;

          const insertionIndex = position === 'bottom' ? targetIndex + 1 : targetIndex;
          const updatedDraggedTask = { ...draggedTask, category: targetTask.category };

          const newTasks = [...remainingTasks];
          newTasks.splice(insertionIndex, 0, updatedDraggedTask);

          return newTasks;
      });
  };

  const listsToShow = (filter === 'all' || filter === 'today' || filter === 'completed')
    ? lists
    : lists.filter(l => l === filter);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[720px] bg-[#0b0f19] text-slate-100 font-sans overflow-hidden rounded-2xl border border-slate-800/80 shadow-2xl relative w-full">
      {/* Hidden File Input for Fallback Load */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleInputFileChange} 
        accept=".json" 
        className="hidden" 
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        
        {/* Header */}
        <header className="h-14 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between px-3 lg:px-6 z-20 shrink-0 gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            {/* Left-Aligned Utilities: Cámara, Notas y Links */}
            <div className="flex items-center gap-1 border-r border-slate-800 pr-2 shrink-0">
                <button 
                  onClick={() => setIsImageAnalyzerOpen(!isImageAnalyzerOpen)}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${isImageAnalyzerOpen ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40' : 'text-slate-400 hover:text-white hover:bg-slate-800/70'}`}
                  title="Escanear Pendientes con Cámara"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setFilter(filter === 'notes' ? 'all' : 'notes')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${filter === 'notes' ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40' : 'text-slate-400 hover:text-white hover:bg-slate-800/70'}`}
                  title="Notas Rápidas"
                >
                  <StickyNote className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setFilter(filter === 'links' ? 'all' : 'links')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${filter === 'links' ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40' : 'text-slate-400 hover:text-white hover:bg-slate-800/70'}`}
                  title="Enlaces y Links"
                >
                  <LinkIcon className="w-4 h-4" />
                </button>
            </div>

            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="px-2.5 py-1 text-xs bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 rounded-lg font-semibold transition-all shrink-0 cursor-pointer"
                title="Volver al tablero de listas"
              >
                ← Ver Listas
              </button>
            )}

            <div className="relative hidden md:block w-48 lg:w-56 shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input 
                type="text" 
                placeholder="Buscar tareas..." 
                className="w-full pl-8 pr-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Quick Status Filter Tabs: Todas, Pendientes (por defecto), Completadas */}
            <div className="flex items-center gap-0.5 bg-slate-900 p-0.5 rounded-lg border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setTaskStatusFilter('all')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  taskStatusFilter === 'all'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Ver todas las tareas (pendientes y completadas)"
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setTaskStatusFilter('pending')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  taskStatusFilter === 'pending'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Ver solo tareas pendientes (por defecto)"
              >
                Pendientes
              </button>
              <button
                type="button"
                onClick={() => setTaskStatusFilter('completed')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  taskStatusFilter === 'completed'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Ver solo tareas completadas"
              >
                Completadas
              </button>
            </div>
          </div>

          {/* Right Header Area: [Últ. mod] [👤 rembrandt] [Guardar ▾] [Cargar] [☁ Conectado a Listas Remb] */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Última modificación / Fecha al lado de Rembrandt */}
            <div 
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-400 shrink-0 shadow-xs"
              title="Última modificación de la lista"
            >
              <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Últ. mod:</span>
              <span className="text-purple-300 font-medium">
                {lastModified.dayOfWeek.slice(0, 3)} {lastModified.fullDate}
              </span>
              <span className="text-slate-400 font-mono text-[11px] border-l border-slate-800 pl-1.5 ml-0.5">
                {lastModified.time}
              </span>
            </div>

            {/* User Profile Badge (Rembrandt) */}
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/90 border border-slate-800 rounded-lg text-xs font-medium text-slate-300 shadow-xs" 
              title={`Lista de: ${username}`}
            >
              <div className="w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center text-[9px] text-white font-bold shrink-0">
                <User className="w-2.5 h-2.5" />
              </div>
              <span className="font-semibold text-purple-300 max-w-[80px] sm:max-w-[120px] truncate">
                {username || 'rembrandt'}
              </span>
            </div>

            {/* Guardar con dropdown */}
            <div className="relative flex shrink-0">
              <button 
                onClick={() => handleSaveFile(false)}
                className="flex items-center gap-1 px-2.5 py-1 bg-blue-950/50 hover:bg-blue-900/60 text-blue-300 border border-blue-500/30 rounded-l-lg text-xs font-medium transition-all cursor-pointer"
                title="Guardar archivo JSON"
              >
                <Save className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Guardar</span>
              </button>
              <button
                onClick={() => setShowHeaderSaveMenu(prev => !prev)}
                className="px-1 bg-blue-950/50 hover:bg-blue-900/60 text-blue-300 border-y border-r border-blue-500/30 rounded-r-lg text-xs transition-all flex items-center justify-center cursor-pointer"
                title="Opciones de Guardar"
              >
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
              {showHeaderSaveMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowHeaderSaveMenu(false)} />
                  <div className="absolute right-0 top-full mt-1.5 w-36 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      onClick={() => { handleSaveFile(true); setShowHeaderSaveMenu(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                    >
                      <Save className="w-3 h-3" /> Guardar como...
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Cargar */}
            <button 
              onClick={handleOpenFile}
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0"
              title="Cargar copia de seguridad JSON"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cargar</span>
            </button>

            {/* Botón Sincronizar Nube / Conectado a Listas */}
            <button
              onClick={handleManualSync}
              disabled={cloudStatus === 'syncing'}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium border text-xs transition-all shadow-sm cursor-pointer select-none shrink-0 ${
                cloudStatus === 'syncing'
                  ? 'bg-blue-950/70 text-blue-300 border-blue-500/50 cursor-wait'
                  : 'bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border-emerald-500/40 hover:border-emerald-400 active:scale-95'
              }`}
              title="Sincronización automática activa. Haz clic para actualizar ahora mismo con la nube."
            >
              <Cloud className={`w-3.5 h-3.5 ${cloudStatus === 'syncing' ? 'animate-spin text-blue-400' : 'text-emerald-400'}`} />
              <span className="hidden md:inline font-semibold">
                {cloudStatus === 'syncing' ? 'Sincronizando...' : 'Conectado a Listas Remb'}
              </span>
              <span className="md:hidden font-semibold">
                {cloudStatus === 'syncing' ? 'Sync...' : 'Sincronizar'}
              </span>
            </button>
          </div>
        </header>

        {/* Board / Views Area */}
        <main className="flex-1 overflow-y-auto bg-[#070a12] relative flex flex-col min-w-0">
           <div className="flex-1 overflow-x-auto min-h-0">
           
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
                  masterPin={safePin}
                  onSetMasterPin={setSafePin}
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
                    const isVisible = listVisibility[listName] || false;
                    const areNotesVisible = listNotesVisibility[listName] || false;
                    const isEditing = editingListId === listName;
                    
                    const columnTasks = tasks.filter(t => {
                        if (t.category !== listName) return false;
                        if (taskStatusFilter === 'pending' && t.completed) return false;
                        if (taskStatusFilter === 'completed' && !t.completed) return false;
                        if (!t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                        if (taskStatusFilter === 'all') return true;
                        return isVisible || !t.completed;
                    });

                    const customColor = listColors[listName];
                    const headerStyle = customColor ? { backgroundColor: customColor, color: 'white', borderColor: customColor } : { backgroundColor: '#1e293b' };
                    const columnStyle = customColor ? { backgroundColor: `${customColor}18`, borderColor: `${customColor}50` } : { backgroundColor: '#0f172a' };
                    const textStyle = customColor ? { color: 'white' } : { color: '#f8fafc' };
                    const iconStyle = customColor ? { color: 'white' } : {};
                    const isDragTarget = isDraggingList && dragOverListId === listName;

                    return (
                        <div 
                          key={listName} 
                          className={`w-80 flex flex-col h-full rounded-2xl border shadow-lg transition-all duration-200 ${isDragTarget ? 'border-purple-500 ring-2 ring-purple-500/40 scale-[1.01]' : 'border-slate-800'}`}
                          style={columnStyle}
                          draggable={!isEditing}
                          onDragStart={(e) => handleDragStart(e, listName, 'LIST')}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => {
                             e.preventDefault();
                             if (isDraggingList && draggedListSource !== listName) {
                                 setDragOverListId(listName);
                             }
                          }}
                          onDrop={(e) => handleListDrop(e, listName)}
                        >
                            {/* Column Header */}
                            <div className="p-4 border-b border-slate-800 flex flex-col gap-2 rounded-t-xl sticky top-0 group" style={headerStyle}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 font-bold w-full" style={textStyle}>
                                        <div className="cursor-grab active:cursor-grabbing hover:opacity-70 flex-shrink-0">
                                          <GripHorizontal className="w-4 h-4" />
                                        </div>
                                        <div className={`p-1.5 rounded-md flex-shrink-0 ${customColor ? 'bg-white/20' : 'bg-slate-800 text-slate-300'}`}>
                                          <Icon className="w-4 h-4" style={iconStyle} />
                                        </div>
                                        
                                        {isEditing ? (
                                            <div className="flex-1 flex items-center relative">
                                                <input 
                                                    autoFocus
                                                    type="text"
                                                    value={editingListName}
                                                    onChange={(e) => setEditingListName(e.target.value)}
                                                    onBlur={saveListRename}
                                                    onKeyDown={(e) => e.key === 'Enter' && saveListRename()}
                                                    className="w-full bg-slate-800 text-white border border-slate-700 text-sm px-2 py-1 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                                                />
                                            </div>
                                        ) : (
                                            <span 
                                                className="truncate max-w-[120px] cursor-text hover:bg-white/10 rounded px-1 transition-colors" 
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
                                        <button
                                          onClick={() => toggleListNotesVisibility(listName)}
                                          className={`p-1.5 rounded-lg transition-colors ${areNotesVisible ? 'bg-white/20 text-white' : (customColor ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-slate-300 hover:text-slate-500')}`}
                                          title={areNotesVisible ? "Ocultar detalles/notas" : "Mostrar detalles/notas"}
                                        >
                                          <AlignLeft className="w-4 h-4" />
                                        </button>

                                        <button
                                          onClick={() => toggleListVisibility(listName)}
                                          className={`p-1.5 rounded-lg transition-colors ${isVisible ? 'bg-white/20 text-white' : (customColor ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-slate-300 hover:text-slate-500')}`}
                                          title={isVisible ? "Ocultar completados" : "Mostrar completados"}
                                        >
                                          {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                        </button>

                                        <button 
                                          onClick={(e) => {
                                              e.stopPropagation();
                                              if (colorPickerState?.listName === listName) {
                                                  setColorPickerState(null);
                                              } else {
                                                  const rect = e.currentTarget.getBoundingClientRect();
                                                  setColorPickerState({
                                                      listName,
                                                      position: { top: rect.bottom + 8, left: rect.left - 100 }
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
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-brand-500"
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
                                    <div className={`h-24 border-2 border-dashed rounded-xl flex items-center justify-center text-sm italic ${customColor ? 'border-white/10 text-white/30' : 'border-slate-800 text-slate-500'}`}>
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
                      className="flex items-center gap-2 text-slate-400 hover:text-purple-400 hover:bg-slate-800/60 px-6 py-3 rounded-xl transition-all border border-slate-800 hover:border-purple-500/40 border-dashed"
                    >
                        <Plus className="w-5 h-5" />
                        Nueva Lista
                    </button>
                </div>
             </div>
           )}
          </div>
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
      />
      {isCalculatorOpen && (
        <Calculator onClose={() => setIsCalculatorOpen(false)} />
      )}
      {isImageAnalyzerOpen && (
        <ImageTaskAnalyzer 
          onClose={() => setIsImageAnalyzerOpen(false)} 
          existingTasks={tasks}
          lists={lists}
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

export default ListasTab;
