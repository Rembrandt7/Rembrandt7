
import React, { useState, useMemo, useEffect } from 'react';
import { useLinks } from '../contexts/LinkContext';
import { CalendarEvent } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Clock, 
  AlignLeft,
  X,
  Save,
  Pencil,
  Calendar,
  Mountain,
  PartyPopper,
  Stethoscope,
  Cake,
  Brain,
  DollarSign,
  CheckCircle2,
  StickyNote,
  Sparkles,
  Zap,
  RefreshCw
} from 'lucide-react';
import CalendarAiAssistant from './CalendarAiAssistant';

const CalendarTab: React.FC = () => {
  const { config, updateConfig, saveToSupabase, isEditing, googleApiConfig } = useLinks();

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = useMemo(() => formatDate(new Date()), []);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [editingToken, setEditingToken] = useState<any | null>(null);
  const [editingHeaderBtn, setEditingHeaderBtn] = useState<'save' | 'notes' | 'ai' | null>(null);
  const [visibleTypes, setVisibleTypes] = useState<string[]>(['event', 'holiday', 'vacation', 'mountain', 'party', 'off', 'medical', 'birthday', 'payment', 'ingreso']);
  
  const [newEvent, setNewEvent] = useState<Omit<CalendarEvent, 'id'>>({
    title: '',
    date: selectedDate,
    time: '',
    description: '',
    color: '#3b82f6',
    type: 'event',
    recurrence: 'none',
    isPaid: false,
    amount: '',
    isVariable: false,
    jobCategory: 'trabajos mios',
    isFinished: false,
    totalPayment: '',
    advancePayment: '',
    deliveryDate: selectedDate,
    isIndefinite: true,
    reminderMinutes: 30
  });

  const [newToken, setNewToken] = useState({
    name: '',
    symbol: 'Zap',
    intervalDays: 3,
    startDate: selectedDate,
    color: '#f59e0b',
    reminderMinutes: 30,
    reminderTime: '09:00'
  });

  const getIcon = (iconName: string, size: number = 24) => {
    switch (iconName) {
      case 'Save': return <Save size={size} />;
      case 'StickyNote': return <StickyNote size={size} />;
      case 'Brain': return <Brain size={size} />;
      case 'Sparkles': return <Sparkles size={size} />;
      case 'Plus': return <Plus size={size} />;
      case 'Calendar': return <Calendar size={size} />;
      case 'Clock': return <Clock size={size} />;
      case 'DollarSign': return <DollarSign size={size} />;
      case 'PartyPopper': return <PartyPopper size={size} />;
      case 'Stethoscope': return <Stethoscope size={size} />;
      case 'Cake': return <Cake size={size} />;
      case 'Mountain': return <Mountain size={size} />;
      case 'Zap': return <Zap size={size} />;
      default: return null;
    }
  };

  const events = config.calendarEvents || [];

  const getJobColor = (event: CalendarEvent) => {
    if (event.type !== 'trabajo') return event.color || '#3b82f6';
    if (event.isFinished) return '#94a3b8'; // Muted color for finished jobs
    if (event.isIndefinite) return '#22c55e'; // Green

    if (!event.deliveryDate) return '#22c55e';

    const deliveryDate = new Date(event.deliveryDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = deliveryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 3) return '#22c55e'; // Green
    if (diffDays > 0) return '#eab308'; // Yellow
    return '#ef4444'; // Red (today or passed)
  };

  const isEventOnDate = (event: CalendarEvent, targetDate: Date, ignoreFilters = false) => {
    // Filter by visible types
    if (!ignoreFilters && event.type && !visibleTypes.includes(event.type)) return false;

    const eventDate = new Date(event.date + 'T00:00:00');
    const targetDateStr = formatDate(targetDate);
    const eventDateStr = event.date;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // todayStr is defined at component level

    // Special case for unpaid payments: carry forward to today
    if (event.type === 'payment' && !event.isPaid) {
      if (eventDate < today) {
        if (targetDateStr === eventDateStr) return false;
        if (targetDateStr === todayStr) return true;
        return false;
      }
    }

    // Special case for jobs: only show if finished or floating on today/deadline
    if (event.type === 'trabajo') {
      if (event.isFinished) {
        return targetDateStr === event.finishedDate;
      } else {
        // Floating logic: show on today
        if (targetDateStr === todayStr) return true;
        // Also show on delivery date if it exists
        if (event.deliveryDate && !event.isIndefinite && targetDateStr === event.deliveryDate) {
          return true;
        }
        return false;
      }
    }

    // Direct match
    if (eventDateStr === targetDateStr) return true;
    
    // Recurrence check
    if (!event.recurrence || event.recurrence === 'none') return false;
    
    // Don't show recurring events before their start date
    if (targetDate < eventDate) return false;

    switch (event.recurrence) {
      case 'daily':
        return true;
      case 'weekly':
        return targetDate.getDay() === eventDate.getDay();
      case 'monthly':
        return targetDate.getDate() === eventDate.getDate();
      case 'yearly':
        return targetDate.getDate() === eventDate.getDate() && targetDate.getMonth() === eventDate.getMonth();
      default:
        return false;
    }
  };

  const isTokenOnDate = (token: any, targetDate: Date) => {
    const targetDateStr = formatDate(targetDate);
    const activeDateStr = token.currentActiveDate;
    
    // Direct match with active date
    if (targetDateStr === activeDateStr) return true;
    
    // Logic for "Pending" tokens: If the token's active date is in the past,
    // show it on TODAY so the user sees they have a pending task.
    const today = new Date();
    const todayStr = formatDate(today);
    
    if (targetDateStr === todayStr && activeDateStr < todayStr) {
        return true;
    }
    
    // Also show the next occurrence for planning purposes
    const nextDate = new Date(activeDateStr + 'T00:00:00');
    nextDate.setDate(nextDate.getDate() + (token.intervalDays || 1));
    const nextDateStr = formatDate(nextDate);
    
    return targetDateStr === nextDateStr;
  };

  const REFERENCE_OFF_SATURDAY = new Date('2026-03-07T00:00:00');

  const getDayStatus = (date: Date, events: CalendarEvent[]) => {
    const dateStr = formatDate(date);
    
    // Check for custom off days (vacation/holiday)
    const customOff = events.find(e => e.date === dateStr && (e.type === 'holiday' || e.type === 'vacation' || e.type === 'off'));
    if (customOff) return 'off-custom';

    const day = date.getDay(); // 0: Sun, 1: Mon, ..., 6: Sat
    
    if (day === 0) return 'off'; // Sunday is always OFF
    
    if (day >= 1 && day <= 5) return 'work'; // Mon-Fri is always WORK
    
    if (day === 6) {
      // Alternating Saturday
      // Reference: 2026-03-07 is OFF
      const diffTime = date.getTime() - REFERENCE_OFF_SATURDAY.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      const diffWeeks = Math.round(diffDays / 7);
      return diffWeeks % 2 === 0 ? 'off' : 'work';
    }
    
    return 'work';
  };

  const vacationStats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const resetMonth = 6; // July (0-indexed)
    const resetDay = 21;
    
    let periodStart: Date;
    let periodEnd: Date;
    let allowance: number;

    const resetDateThisYear = new Date(currentYear, resetMonth, resetDay);
    
    if (now < resetDateThisYear) {
      periodStart = new Date(currentYear - 1, resetMonth, resetDay);
      periodEnd = new Date(currentYear, resetMonth, resetDay - 1, 23, 59, 59);
      allowance = currentYear === 2026 ? 11 : 26;
    } else {
      periodStart = new Date(currentYear, resetMonth, resetDay);
      periodEnd = new Date(currentYear + 1, resetMonth, resetDay - 1, 23, 59, 59);
      allowance = 26;
    }

    const usedDays = events.filter(e => {
      if (e.type !== 'vacation') return false;
      const eventDate = new Date(e.date + 'T00:00:00');
      return eventDate >= periodStart && eventDate <= periodEnd;
    }).length;

    // Calculate working days remaining until resetDate
    let workingDaysRemaining = 0;
    const tempDate = new Date(now);
    tempDate.setHours(0, 0, 0, 0);
    const endDate = new Date(periodEnd);
    
    while (tempDate <= endDate) {
      if (getDayStatus(tempDate, events) === 'work') {
        workingDaysRemaining++;
      }
      tempDate.setDate(tempDate.getDate() + 1);
    }

    return {
      available: allowance - usedDays,
      total: allowance,
      used: usedDays,
      resetDate: periodEnd,
      workingDaysRemaining
    };
  }, [events]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't navigate if an input is focused or modal is open
      if (isModalOpen || document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const date = new Date(selectedDate + 'T00:00:00');
        date.setDate(date.getDate() + (e.key === 'ArrowLeft' ? -1 : 1));
        const newDateStr = formatDate(date);
        setSelectedDate(newDateStr);
        
        // If the new date is in a different month, update currentDate
        if (date.getMonth() !== currentDate.getMonth() || date.getFullYear() !== currentDate.getFullYear()) {
          setCurrentDate(new Date(date.getFullYear(), date.getMonth(), 1));
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrevMonth();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleNextMonth();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDate, currentDate, isModalOpen]);

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncGoogleCalendar = async () => {
    setIsSyncing(true);
    try {
      let tokens = config.googleCalendarTokens;
      
      if (!tokens) {
        // 1. Fetch the OAuth URL from your server
        const response = await fetch('/api/auth/url', {
          headers: {
            'x-client-id': googleApiConfig?.clientId || '',
            'x-client-secret': googleApiConfig?.clientSecret || ''
          }
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Error al obtener la URL de autenticación. Verifica la configuración de Google API en tu perfil.');
        }
        const { url } = await response.json();

        // 2. Open the OAuth PROVIDER's URL directly in popup
        const authWindow = window.open(
          url,
          'oauth_popup',
          'width=600,height=700'
        );

        if (!authWindow) {
          alert('Por favor, permite las ventanas emergentes (popups) para conectar tu cuenta.');
          setIsSyncing(false);
          return;
        }

        // Wait for the popup to send the code back
        const code = await new Promise((resolve, reject) => {
          const handleMessage = (event: MessageEvent) => {
            const origin = event.origin;
            if (origin !== window.location.origin) {
              if (!origin.endsWith('.run.app') && !origin.endsWith('.vercel.app') && !origin.includes('localhost')) {
                return;
              }
            }
            if (event.data?.type === 'OAUTH_CODE_SUCCESS') {
              window.removeEventListener('message', handleMessage);
              clearInterval(checkClosed);
              resolve(event.data.code);
            }
          };
          window.addEventListener('message', handleMessage);
          
          const checkClosed = setInterval(() => {
            if (authWindow.closed) {
              window.removeEventListener('message', handleMessage);
              clearInterval(checkClosed);
              reject(new Error('Autenticación cancelada (ventana cerrada)'));
            }
          }, 1000);

          setTimeout(() => {
            window.removeEventListener('message', handleMessage);
            clearInterval(checkClosed);
            reject(new Error('Tiempo de espera agotado para la autenticación'));
          }, 5 * 60 * 1000);
        });

        // Use the code to get tokens
        const exchangeResponse = await fetch('/api/auth/exchange', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-id': googleApiConfig?.clientId || '',
            'x-client-secret': googleApiConfig?.clientSecret || ''
          },
          body: JSON.stringify({ code })
        });
        
        if (!exchangeResponse.ok) {
           throw new Error('Error al intercambiar el código. Verifica tus credenciales de Google API en tu perfil.');
        }
        
        const exchangeData = await exchangeResponse.json();
        tokens = exchangeData.tokens;

        // Save tokens
        const updatedConfigWithTokens = { ...config, googleCalendarTokens: tokens };
        updateConfig(updatedConfigWithTokens);
        await saveToSupabase(updatedConfigWithTokens);
      }

      // Sync with the server
      const syncResponse = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': googleApiConfig?.clientId || '',
          'x-client-secret': googleApiConfig?.clientSecret || ''
        },
        body: JSON.stringify({
          tokens,
          localEvents: config.calendarEvents || [],
          localTokens: config.calendarTokens || []
        })
      });

      if (!syncResponse.ok) {
        const errorData = await syncResponse.json().catch(() => ({}));
        if (syncResponse.status === 401) {
          // Tokens might be expired or invalid, clear them and retry
          const updatedConfig = { ...config, googleCalendarTokens: null };
          updateConfig(updatedConfig);
          await saveToSupabase(updatedConfig);
          throw new Error('Sesión expirada. Por favor, intenta sincronizar de nuevo.');
        }
        throw new Error(errorData.details || errorData.error || 'Error sincronizando con Google Calendar');
      }

      const { events: syncedEvents, tokens: syncedTokens } = await syncResponse.json();
      
      const finalConfig = { 
        ...config, 
        calendarEvents: syncedEvents,
        calendarTokens: syncedTokens || config.calendarTokens
      };
      updateConfig(finalConfig);
      await saveToSupabase(finalConfig);
      
      alert('¡Sincronización con Google Calendar completada!');
    } catch (error: any) {
      if (!error.message?.includes('Sesión expirada')) {
        console.error('Sync error:', error);
      }
      alert(error.message || 'Error al sincronizar con Google Calendar. Revisa que tu dominio esté autorizado en Google Cloud Console.');
    } finally {
      setIsSyncing(false);
    }
  };

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    
    // Add empty slots for days before the first of the month
    // Adjust for Monday start (0: Mon, 1: Tue, ..., 6: Sun)
    const firstDayIndex = date.getDay();
    const adjustedIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    for (let i = 0; i < adjustedIndex; i++) {
      days.push(null);
    }
    
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    
    return days;
  }, [currentDate]);

  const weeks = useMemo(() => {
    const result = [];
    const days = [...daysInMonth];
    while (days.length % 7 !== 0) {
      days.push(null);
    }
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [daysInMonth]);

  const monthName = currentDate.toLocaleString('es-MX', { month: 'long' });
  const year = currentDate.getFullYear();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDayClick = (date: Date) => {
    const dateStr = formatDate(date);
    setSelectedDate(dateStr);
    setNewEvent(prev => ({ ...prev, date: dateStr }));
    setNewToken(prev => ({ ...prev, startDate: dateStr }));
  };

  const handleAddEvent = async () => {
    if (!newEvent.title) return;

    if (newEvent.type === 'vacation' && !editingEvent && vacationStats.available <= 0) {
      if (!window.confirm('No tienes días de vacaciones disponibles para este periodo. ¿Deseas agregarlo de todos modos?')) {
        return;
      }
    }

    const event: CalendarEvent = {
      ...newEvent,
      id: editingEvent ? editingEvent.id : Date.now().toString()
    };

    const updatedEvents = editingEvent
      ? events.map(e => e.id === editingEvent.id ? event : e)
      : [...events, event];

    const newConfig = {
      ...config,
      calendarEvents: updatedEvents
    };

    // If it's a new job, add to reminders
    if (newEvent.type === 'trabajo' && !editingEvent) {
      newConfig.reminders = [...(config.reminders || []), `TRABAJO: ${newEvent.title}`];
    }

    updateConfig(newConfig);

    setIsModalOpen(false);
    setEditingEvent(null);
    setNewEvent({
      title: '',
      date: selectedDate,
      time: '',
      description: '',
      color: '#3b82f6',
      type: 'event',
      recurrence: 'none',
      isPaid: false,
      amount: '',
      isVariable: false
    });
    
    // Explicitly save to database
    setTimeout(() => saveToSupabase(), 100);
  };

  const handleAddToken = async () => {
    if (!newToken.name) return;

    const token = {
      ...newToken,
      id: editingToken ? editingToken.id : Date.now().toString(),
      currentActiveDate: editingToken ? editingToken.currentActiveDate : newToken.startDate,
      isCompleted: false
    };

    const tokens = config.calendarTokens || [];
    const updatedTokens = editingToken
      ? tokens.map((t: any) => t.id === editingToken.id ? token : t)
      : [...tokens, token];

    updateConfig({
      ...config,
      calendarTokens: updatedTokens
    });

    setIsTokenModalOpen(false);
    setEditingToken(null);
    setNewToken({
      name: '',
      symbol: 'Zap',
      intervalDays: 3,
      startDate: selectedDate,
      color: '#f59e0b',
      reminderMinutes: 30,
      reminderTime: '09:00'
    });
    setTimeout(() => saveToSupabase(), 100);
  };

  const handleToggleToken = (id: string, completed: boolean) => {
    const tokens = config.calendarTokens || [];
    const updatedTokens = tokens.map((t: any) => {
      if (t.id === id) {
        const activeDate = new Date(t.currentActiveDate + 'T00:00:00');
        if (completed) {
          // Move to next interval
          activeDate.setDate(activeDate.getDate() + t.intervalDays);
        } else {
          // Move to tomorrow
          activeDate.setDate(activeDate.getDate() + 1);
        }
        return { ...t, currentActiveDate: formatDate(activeDate) };
      }
      return t;
    });

    updateConfig({
      ...config,
      calendarTokens: updatedTokens
    });
    setTimeout(() => saveToSupabase(), 100);
  };

  const handleDeleteToken = (id: string) => {
    const updatedTokens = (config.calendarTokens || []).filter((t: any) => t.id !== id);
    updateConfig({
      ...config,
      calendarTokens: updatedTokens
    });
    setTimeout(() => saveToSupabase(), 100);
  };

  const handleTogglePaid = (id: string) => {
    // todayStr is defined at component level

    const updatedEvents = events.map(e => {
      if (e.id === id && e.type === 'payment') {
        const currentlyPaid = e.isPaid;
        const willBePaid = !currentlyPaid;

        if (willBePaid) {
          // If it's recurring, advance to next occurrence
          if (e.recurrence && e.recurrence !== 'none') {
            const nextDate = new Date(e.date + 'T00:00:00');
            switch (e.recurrence) {
              case 'daily': nextDate.setDate(nextDate.getDate() + 1); break;
              case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
              case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
              case 'yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
            }
            // Keep it unpaid for the next occurrence
            return { ...e, date: formatDate(nextDate), isPaid: false };
          } else {
            // Non-recurring: move to today and mark as paid
            return { ...e, date: todayStr, isPaid: true };
          }
        }
      }
      return e.id === id ? { ...e, isPaid: !e.isPaid } : e;
    });

    updateConfig({
      ...config,
      calendarEvents: updatedEvents
    });
    setTimeout(() => saveToSupabase(), 100);
  };

  const handleToggleFinished = (id: string) => {
    const today = new Date();
    // todayStr is defined at component level

    const updatedEvents = events.map(e => {
      if (e.id === id && e.type === 'trabajo') {
        const isNowFinished = !e.isFinished;
        return { 
          ...e, 
          isFinished: isNowFinished,
          finishedDate: isNowFinished ? todayStr : undefined
        };
      }
      return e;
    });

    updateConfig({
      ...config,
      calendarEvents: updatedEvents
    });
    setTimeout(() => saveToSupabase(), 100);
  };

  const handleDragStart = (e: React.DragEvent, eventId: string) => {
    e.dataTransfer.setData('eventId', eventId);
    e.dataTransfer.setData('type', 'event');
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDragDayStart = (e: React.DragEvent, dateStr: string) => {
    e.dataTransfer.setData('sourceDate', dateStr);
    e.dataTransfer.setData('type', 'day');
    e.dataTransfer.effectAllowed = 'move';
    
    // Create a ghost image or just set data
    const dayEvents = events.filter(ev => ev.date === dateStr);
    if (dayEvents.length === 0) {
      e.preventDefault();
      return;
    }
  };

  const handleDrop = async (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('type');
    const isCopy = e.altKey || e.ctrlKey || e.metaKey;

    if (type === 'event') {
      const eventId = e.dataTransfer.getData('eventId');
      if (!eventId) return;

      const eventToMove = events.find(ev => ev.id === eventId);
      if (!eventToMove || eventToMove.date === targetDate) return;

      let updatedEvents;
      if (isCopy) {
        const newEventCopy: CalendarEvent = {
          ...eventToMove,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          date: targetDate
        };
        updatedEvents = [...events, newEventCopy];
      } else {
        updatedEvents = events.map(ev => 
          ev.id === eventId ? { ...ev, date: targetDate } : ev
        );
      }

      updateConfig({
        ...config,
        calendarEvents: updatedEvents
      });
      setTimeout(() => saveToSupabase(), 100);
    } else if (type === 'day') {
      const sourceDate = e.dataTransfer.getData('sourceDate');
      if (!sourceDate || sourceDate === targetDate) return;

      const updatedEvents = events.map(ev => 
        ev.date === sourceDate ? { ...ev, date: targetDate } : ev
      );

      updateConfig({
        ...config,
        calendarEvents: updatedEvents
      });
      setTimeout(() => saveToSupabase(), 100);
    }
  };

  const handleDeleteEvent = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    const updatedEvents = events.filter(ev => ev.id !== id);
    updateConfig({
      ...config,
      calendarEvents: updatedEvents
    });
    
    // Explicitly save to database
    setTimeout(() => saveToSupabase(), 100);
  };

  const openEditModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    setNewEvent({
      title: event.title,
      date: event.date,
      time: event.time || '',
      description: event.description || '',
      color: event.color || '#3b82f6',
      type: event.type || 'event',
      recurrence: event.recurrence || 'none',
      isPaid: event.isPaid || false,
      amount: event.amount || '',
      isVariable: event.isVariable || false,
      jobCategory: event.jobCategory || 'trabajos mios',
      isFinished: event.isFinished || false,
      totalPayment: event.totalPayment || '',
      advancePayment: event.advancePayment || '',
      deliveryDate: event.deliveryDate || event.date,
      isIndefinite: event.isIndefinite || false,
      reminderMinutes: event.reminderMinutes || 30
    });
    setIsModalOpen(true);
  };

  const selectedDayEvents = useMemo(() => {
    const targetDate = new Date(selectedDate + 'T00:00:00');
    return events.filter(e => isEventOnDate(e, targetDate, true)).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [events, selectedDate]);

  const financialObligations = useMemo(() => {
    return selectedDayEvents.filter(e => e.type === 'payment');
  }, [selectedDayEvents]);

  const jobEvents = useMemo(() => {
    return selectedDayEvents.filter(e => e.type === 'trabajo');
  }, [selectedDayEvents]);

  const otherEvents = useMemo(() => {
    return selectedDayEvents.filter(e => e.type !== 'payment' && e.type !== 'trabajo');
  }, [selectedDayEvents]);

  const selectedDayTokens = useMemo(() => {
    const targetDate = new Date(selectedDate + 'T00:00:00');
    return (config.calendarTokens || []).filter((t: any) => isTokenOnDate(t, targetDate));
  }, [config.calendarTokens, selectedDate]);

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-800 rounded-xl shadow-2xl min-h-[80vh] flex flex-col border border-gray-700">
      <div className="flex justify-between items-start mb-8">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold text-white capitalize leading-none">
            {monthName} <span className="text-gray-500">{year}</span>
          </h2>
          <div className="flex gap-2 mt-1">
            <button 
              onClick={handlePrevMonth} 
              className="p-1.5 bg-gray-900/50 hover:bg-gray-700 rounded-md text-gray-400 hover:text-white transition-all border border-gray-700"
              title="Mes anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={handleNextMonth} 
              className="p-1.5 bg-gray-900/50 hover:bg-gray-700 rounded-md text-gray-400 hover:text-white transition-all border border-gray-700"
              title="Mes siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <div className="bg-gray-900/80 border border-gray-700 rounded-lg px-6 py-2 flex items-center gap-6 h-[88px]">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase">Vacaciones</span>
                <span className={`text-lg font-black ${vacationStats.available > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {vacationStats.available} / {vacationStats.total}
                </span>
              </div>
              <div className="text-base font-black text-gray-400 uppercase tracking-tight">
                Reinicia: {vacationStats.resetDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
            
            <div className="h-8 w-[1px] bg-gray-700" />

            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-blue-500 uppercase">Días Hábiles Restantes</span>
              <span className="text-2xl font-black text-blue-400 leading-none">
                {vacationStats.workingDaysRemaining}
              </span>
            </div>
          </div>

          {/* AI Button */}
          <div className="relative group/btn">
            <button
              onClick={() => setIsAiOpen(true)}
              className={`relative flex flex-col items-center justify-center p-3 text-white rounded-lg transition-all shadow-lg h-[88px] w-[88px] overflow-hidden ${config.calendarSettings?.aiButton?.color || 'bg-purple-600 hover:bg-purple-700'}`}
              title={config.calendarSettings?.aiButton?.label || "Asistente Estratégico"}
            >
              <div className="flex-1 flex items-center justify-center">
                {config.calendarSettings?.aiButton?.svg ? (
                  <div className="w-8 h-8 flex items-center justify-center" dangerouslySetInnerHTML={{ __html: config.calendarSettings.aiButton.svg }} />
                ) : (
                  getIcon(config.calendarSettings?.aiButton?.icon || 'Brain', 24)
                )}
              </div>
              <span className="text-[10px] font-black text-white/70 uppercase tracking-widest mt-auto truncate w-full text-center">
                {config.calendarSettings?.aiButton?.label || "Asistente"}
              </span>
            </button>
            {isEditing && (
              <button 
                onClick={() => setEditingHeaderBtn('ai')}
                className="absolute -top-2 -right-2 bg-blue-500 hover:bg-blue-600 rounded-full p-1.5 shadow-lg z-10 transition-transform hover:scale-110"
              >
                <Pencil size={12} className="text-white" />
              </button>
            )}
          </div>

          {/* Notes Button */}
          <div className="relative group/btn">
            <button
              onClick={() => setIsNotesOpen(true)}
              className={`relative flex flex-col items-center justify-center p-3 text-white rounded-lg transition-all shadow-lg h-[88px] w-[88px] overflow-hidden ${config.calendarSettings?.notesButton?.color || 'bg-amber-500 hover:bg-amber-600'}`}
              title={config.calendarSettings?.notesButton?.label || "Mis Notas"}
            >
              <div className="flex-1 flex items-center justify-center">
                {config.calendarSettings?.notesButton?.svg ? (
                  <div className="w-8 h-8 flex items-center justify-center" dangerouslySetInnerHTML={{ __html: config.calendarSettings.notesButton.svg }} />
                ) : (
                  getIcon(config.calendarSettings?.notesButton?.icon || 'StickyNote', 24)
                )}
              </div>
              <span className="text-[10px] font-black text-white/70 uppercase tracking-widest mt-auto truncate w-full text-center">
                {config.calendarSettings?.notesButton?.label || "Notas"}
              </span>
            </button>
            {isEditing && (
              <button 
                onClick={() => setEditingHeaderBtn('notes')}
                className="absolute -top-2 -right-2 bg-blue-500 hover:bg-blue-600 rounded-full p-1.5 shadow-lg z-10 transition-transform hover:scale-110"
              >
                <Pencil size={12} className="text-white" />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1 self-center">
            <button
              onClick={() => {
                setEditingEvent(null);
                setNewEvent({ title: '', date: selectedDate, time: '', description: '', color: '#3b82f6', type: 'event', recurrence: 'none', isPaid: false });
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-all shadow-md font-black text-[10px] uppercase tracking-tighter"
            >
              <Plus size={12} />
              Evento
            </button>
            <button
              onClick={() => {
                setEditingEvent(null);
                setNewEvent({ 
                  title: '', 
                  date: selectedDate, 
                  time: '', 
                  description: '', 
                  color: '#eab308', 
                  type: 'trabajo', 
                  recurrence: 'none', 
                  isPaid: false,
                  jobCategory: 'trabajos mios',
                  isFinished: false,
                  totalPayment: '',
                  advancePayment: '',
                  deliveryDate: selectedDate,
                  isIndefinite: true
                });
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md transition-all shadow-md font-black text-[10px] uppercase tracking-tighter"
            >
              <Plus size={12} />
              Trabajo
            </button>
            <button
              onClick={() => {
                setEditingToken(null);
                setNewToken({
                  name: '',
                  symbol: 'Zap',
                  intervalDays: 3,
                  startDate: selectedDate,
                  color: '#f59e0b',
                  reminderMinutes: 30,
                  reminderTime: '09:00'
                });
                setIsTokenModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-all shadow-md font-black text-[10px] uppercase tracking-tighter"
            >
              <Plus size={12} />
              Token
            </button>
          </div>

          {/* Spacer to push Save to the right */}
          <div className="flex-1" />

          {/* Save & Sync Section */}
          <div className="flex flex-col gap-1">
            <div className="relative group/btn">
              <button
                onClick={() => saveToSupabase()}
                className={`relative flex flex-col items-center justify-center p-2 text-white rounded-lg transition-all shadow-lg h-[64px] w-[88px] overflow-hidden ${config.calendarSettings?.saveButton?.color || 'bg-blue-600 hover:bg-blue-700'}`}
                title={config.calendarSettings?.saveButton?.label || "Guardar Cambios"}
              >
                <div className="flex-1 flex items-center justify-center">
                  {config.calendarSettings?.saveButton?.svg ? (
                    <div className="w-6 h-6 flex items-center justify-center" dangerouslySetInnerHTML={{ __html: config.calendarSettings.saveButton.svg }} />
                  ) : (
                    getIcon(config.calendarSettings?.saveButton?.icon || 'Save', 20)
                  )}
                </div>
                <span className="text-[10px] font-black text-white/70 uppercase tracking-widest mt-auto truncate w-full text-center">
                  {config.calendarSettings?.saveButton?.label || "Guardar"}
                </span>
              </button>
              {isEditing && (
                <button 
                  onClick={() => setEditingHeaderBtn('save')}
                  className="absolute -top-2 -right-2 bg-blue-500 hover:bg-blue-600 rounded-full p-1.5 shadow-lg z-10 transition-transform hover:scale-110"
                >
                  <Pencil size={12} className="text-white" />
                </button>
              )}
            </div>
            
            <button
              onClick={handleSyncGoogleCalendar}
              disabled={isSyncing}
              className="flex items-center justify-center gap-1.5 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all shadow-md font-black text-[9px] uppercase tracking-tighter disabled:opacity-50 w-[88px]"
              title="Sincronizar con Google Calendar"
            >
              <RefreshCw size={10} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Sync...' : 'Google Sync'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 bg-gray-900/30 p-3 rounded-xl border border-gray-700/50">
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest w-full mb-1">Filtros de Categoría</span>
        {[
          { id: 'event', label: 'Eventos', color: 'bg-blue-500' },
          { id: 'trabajo', label: 'Trabajos', color: 'bg-yellow-500' },
          { id: 'payment', label: 'Pagos', color: 'bg-green-500' },
          { id: 'ingreso', label: 'Ingresos', color: 'bg-emerald-600' },
          { id: 'holiday', label: 'Feriados', color: 'bg-red-500' },
          { id: 'vacation', label: 'Vacaciones', color: 'bg-purple-500' },
          { id: 'mountain', label: 'Montaña', color: 'bg-emerald-500' },
          { id: 'party', label: 'Fiesta', color: 'bg-pink-500' },
          { id: 'medical', label: 'Médico', color: 'bg-cyan-500' },
          { id: 'birthday', label: 'Cumpleaños', color: 'bg-orange-500' },
        ].map(type => (
          <button
            key={type.id}
            onClick={(e) => {
              if (e.shiftKey) {
                setVisibleTypes([type.id]);
              } else {
                setVisibleTypes(prev => 
                  prev.includes(type.id) 
                    ? prev.filter(t => t !== type.id) 
                    : [...prev, type.id]
                );
              }
            }}
            className={`flex items-center gap-2 px-2 py-1 rounded-md text-[10px] font-bold transition-all border ${
              visibleTypes.includes(type.id)
                ? `bg-gray-700 text-white border-gray-500`
                : 'bg-gray-800/50 text-gray-500 border-gray-700 opacity-50'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${type.color}`} />
            {type.label}
          </button>
        ))}
        <button 
          onClick={() => setVisibleTypes(['event', 'holiday', 'vacation', 'mountain', 'party', 'off', 'medical', 'birthday', 'payment', 'trabajo', 'ingreso'])}
          className="ml-auto text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
        >
          Mostrar Todo
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-grow">
        {/* Calendar Grid */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-7 mb-2">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
              <div key={day} className="text-center text-xs font-bold text-gray-500 uppercase py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {weeks.map((week, weekIdx) => {
              const isPastWeek = week.every(date => !date || formatDate(date) < todayStr);
              
              return (
                <div 
                  key={weekIdx} 
                  className={`grid grid-cols-7 gap-2 transition-all duration-300 ${
                    isPastWeek 
                      ? 'h-12 opacity-60 hover:h-32 hover:opacity-100 group/week' 
                      : ''
                  }`}
                >
                  {week.map((date, idx) => {
                    if (!date) return <div key={`empty-${weekIdx}-${idx}`} className={`${isPastWeek ? 'h-full' : 'aspect-square'}`} />;
                    
                    const dateStr = formatDate(date);
                    const isSelected = dateStr === selectedDate;
                    const isToday = dateStr === todayStr;
                    const isPast = dateStr < todayStr;
                    
                    const dayEvents = events.filter(e => isEventOnDate(e, date));
                    const dayHasEvents = dayEvents.length > 0;
                    const status = getDayStatus(date, events);
                    
                    const hasMountain = dayEvents.some(e => e.type === 'mountain');
                    const hasParty = dayEvents.some(e => e.type === 'party');
                    const hasMedical = dayEvents.some(e => e.type === 'medical');
                    const hasBirthday = dayEvents.some(e => e.type === 'birthday');
                    const hasPayment = dayEvents.some(e => e.type === 'payment');
                    
                    const dayTokens = (config.calendarTokens || []).filter((t: any) => isTokenOnDate(t, date));
                    const activeTokens = dayTokens.filter((t: any) => t.currentActiveDate === dateStr || (isToday && t.currentActiveDate < dateStr));

                    const hasUnpaidPastPayment = dayEvents.some(e => {
                      if (e.type !== 'payment' || e.isPaid) return false;
                      const eventDate = new Date(e.date + 'T00:00:00');
                      return eventDate < date;
                    });
                    
                    let statusClasses = '';
                    if (status === 'work') {
                      statusClasses = 'bg-orange-500/10 border-orange-500/20 text-orange-200/60';
                    } else if (status === 'off' || status === 'off-custom') {
                      statusClasses = 'bg-green-500/10 border-green-500/20 text-green-200/60';
                    } else {
                      statusClasses = 'bg-gray-900/50 border-gray-700 text-gray-300';
                    }

                    if (isPast && !isSelected && !isToday) {
                      statusClasses = 'bg-gray-900/30 border-gray-800 text-gray-600 opacity-60';
                    }

                    let borderClass = '';
                    let borderStyle: React.CSSProperties = {};

                    if (hasBirthday) {
                      borderClass = 'animate-rainbow-border';
                    } else if (hasMedical) {
                      borderClass = 'border-sky-400 border-2';
                    } else if (hasMountain) {
                      borderStyle = {
                        borderImage: 'linear-gradient(to bottom, #3b82f6, #22c55e) 1',
                        borderWidth: '2px'
                      };
                    }

                    return (
                      <div
                        key={dateStr}
                        onClick={() => handleDayClick(date)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, dateStr)}
                        className={`rounded-xl flex flex-col p-1.5 relative transition-all border overflow-hidden cursor-pointer ${
                          isPastWeek ? 'h-full' : 'aspect-square'
                        } ${
                          isSelected 
                            ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-900/20' 
                            : isToday
                              ? 'bg-gray-700 border-blue-500 text-blue-400'
                              : `${statusClasses} ${borderClass} hover:border-gray-500`
                        }`}
                        style={borderStyle}
                      >
                        {hasBirthday && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none animate-pulse">
                            <Cake size={isPastWeek ? 24 : 64} />
                          </div>
                        )}
                        {hasPayment && (
                          <div className={`absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none ${hasUnpaidPastPayment ? 'text-red-500 opacity-20' : ''}`}>
                            <DollarSign size={isPastWeek ? 24 : 64} />
                          </div>
                        )}

                        {/* Tokens */}
                        <div className="absolute top-1 right-1 flex flex-col gap-1 z-30">
                          {activeTokens.map((token: any) => (
                            <div 
                              key={token.id}
                              className="w-5 h-5 rounded-full flex items-center justify-center shadow-lg border border-white/20 animate-pulse"
                              style={{ backgroundColor: token.color || '#f59e0b' }}
                              title={token.name}
                            >
                              {getIcon(token.symbol, 10)}
                            </div>
                          ))}
                          {dayTokens.filter((t: any) => t.currentActiveDate !== dateStr).map((token: any) => (
                            <div 
                              key={token.id}
                              className="w-4 h-4 rounded-full flex items-center justify-center shadow-lg border border-white/10 opacity-40"
                              style={{ backgroundColor: token.color || '#f59e0b' }}
                              title={`${token.name} (Próximo)`}
                            >
                              {getIcon(token.symbol, 8)}
                            </div>
                          ))}
                        </div>
                        
                        {/* Event Titles */}
                        <div className={`flex-grow overflow-hidden flex flex-col gap-1 z-10 w-full ${isPastWeek ? 'group-hover/week:opacity-100 opacity-0' : ''}`}>
                          {(() => {
                            const payments = dayEvents.filter(e => e.type === 'payment');
                            const others = dayEvents.filter(e => e.type !== 'payment');
                            
                            const displayItems = [];
                            if (payments.length > 0) {
                              if (payments.length === 1) {
                                displayItems.push(payments[0]);
                              } else {
                                const allPaid = payments.every(p => p.isPaid);
                                displayItems.push({
                                  id: `stack-${dateStr}`,
                                  title: `${payments.length} Obligaciones`,
                                  type: 'payment',
                                  color: '#10b981',
                                  isPaid: allPaid,
                                  isStack: true
                                });
                              }
                            }
                            displayItems.push(...others);
                            
                            return displayItems.slice(0, isPastWeek ? 1 : 3).map(e => (
                              <div 
                                key={e.id} 
                                draggable={!(e as any).isStack}
                                onDragStart={(event) => !(e as any).isStack && handleDragStart(event, e.id)}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (!(e as any).isStack) openEditModal(e as any);
                                }}
                                className={`text-[10px] font-black leading-tight truncate px-1.5 py-0.5 rounded-md text-left w-full transition-all flex items-center gap-1 cursor-pointer ${
                                  (e as any).isStack ? 'bg-green-500/30 border border-green-500/40' : 'bg-black/40 hover:bg-black/60'
                                } ${e.isPaid || e.isFinished ? 'opacity-40 grayscale' : ''}`}
                                style={{ color: getJobColor(e as any) }}
                                title={(e as any).isStack ? 'Múltiples obligaciones financieras' : `${e.title}${e.recurrence && e.recurrence !== 'none' ? ` (Repite: ${e.recurrence})` : ''}${e.time ? ' - ' + e.time : ''}${e.description ? '\n' + e.description : ''}`}
                              >
                                {e.type === 'payment' && <DollarSign size={8} className="shrink-0" />}
                                {e.type === 'trabajo' && <Brain size={8} className="shrink-0" />}
                                <span className="truncate uppercase">{e.title}</span>
                              </div>
                            ));
                          })()}
                        </div>

                        <span 
                          className={`text-xl font-black z-20 absolute bottom-0.5 right-1.5 transition-all ${
                            isSelected ? 'opacity-100' : isPastWeek ? 'opacity-50' : 'opacity-30'
                          }`}
                        >
                          {date.getDate()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex gap-4 text-xs font-medium">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-orange-500/20 border border-orange-500/40" />
              <span className="text-gray-400">Día Laboral</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/40" />
              <span className="text-gray-400">Día Libre / Feriado</span>
            </div>
          </div>
        </div>

        {/* Events List for Selected Day */}
        <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6 flex flex-col">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            Eventos para el {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}
          </h3>
          
          <div className="space-y-6 overflow-y-auto flex-grow pr-2 scrollbar-thin scrollbar-thumb-gray-700">
            {selectedDayEvents.length === 0 && selectedDayTokens.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-600 py-12">
                <Calendar size={48} className="mb-4 opacity-20" />
                <p className="text-center italic">No hay eventos para este día</p>
              </div>
            ) : (
              <>
                {selectedDayTokens.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                      <Zap size={14} />
                      Tokens de Recuerdo
                    </h4>
                    {selectedDayTokens.map((token: any) => {
                      const isActiveToday = token.currentActiveDate === selectedDate || 
                                           (selectedDate === todayStr && token.currentActiveDate < todayStr);
                      return (
                        <div 
                          key={token.id} 
                          className={`bg-gray-800/80 rounded-lg p-3 border-l-4 group relative hover:bg-gray-750 transition-all ${!isActiveToday ? 'opacity-40' : 'opacity-100'}`}
                          style={{ borderLeftColor: token.color || '#f59e0b' }}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div 
                                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isActiveToday ? 'animate-pulse' : ''}`}
                                style={{ backgroundColor: token.color || '#f59e0b' }}
                              >
                                {getIcon(token.symbol, 16)}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <h4 className="font-bold text-white truncate text-sm">{token.name}</h4>
                                <span className="text-[10px] text-gray-500">
                                  {isActiveToday ? '¡Toca realizar hoy!' : `Próximo recordatorio`}
                                </span>
                              </div>
                            </div>
                            
                            {isActiveToday && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleToggleToken(token.id, true)}
                                  className="p-2 bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white rounded-lg transition-all"
                                  title="Marcar como realizado"
                                >
                                  <CheckCircle2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleToggleToken(token.id, false)}
                                  className="p-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-all"
                                  title="Mover a mañana"
                                >
                                  <ChevronRight size={16} />
                                </button>
                              </div>
                            )}
                            
                            <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              <button
                                onClick={() => {
                                  setEditingToken(token);
                                  setNewToken({ ...token });
                                  setIsTokenModalOpen(true);
                                }}
                                className="p-1 bg-gray-700 text-blue-400 hover:bg-gray-600 rounded-full shadow-lg"
                              >
                                <Pencil size={10} />
                              </button>
                              <button
                                onClick={() => handleDeleteToken(token.id)}
                                className="p-1 bg-gray-700 text-red-400 hover:bg-gray-600 rounded-full shadow-lg"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {financialObligations.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-green-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                      <DollarSign size={14} />
                      Obligaciones Financieras
                    </h4>
                    {financialObligations.map(event => (
                      <div 
                        key={event.id} 
                        className={`bg-gray-800/80 rounded-lg p-3 border-l-4 group relative hover:bg-gray-750 transition-all ${event.isPaid ? 'opacity-40 grayscale-[0.5]' : 'opacity-100'}`}
                        style={{ borderLeftColor: event.color || '#10b981' }}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex flex-col gap-1">
                              <h4 className="font-bold text-white truncate text-sm">{event.title}</h4>
                              <div className="flex flex-wrap items-center gap-2">
                                {event.amount && (
                                  <span className="text-[10px] font-black bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded border border-green-500/30">
                                    ${event.amount}{event.isVariable ? ' (Var)' : ''}
                                  </span>
                                )}
                                {(() => {
                                  const eventDate = new Date(event.date + 'T00:00:00');
                                  const targetDate = new Date(selectedDate + 'T00:00:00');
                                  if (eventDate < targetDate && !event.isPaid) {
                                    return (
                                      <span className="text-[8px] font-black bg-red-500 text-white px-1 rounded animate-pulse">
                                        RETRASADO
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                                {event.time && (
                                  <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                    <Clock size={10} />
                                    {event.time}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => openEditModal(event)}
                                className="p-1 text-gray-500 hover:text-blue-400 transition-colors"
                                title="Editar pago"
                              >
                                <AlignLeft size={12} />
                              </button>
                              
                              <button
                                onClick={() => handleTogglePaid(event.id)}
                              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black transition-all border ${
                                event.isPaid 
                                  ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                                  : 'bg-gray-700 text-gray-400 border-gray-600 hover:bg-gray-600 hover:text-white'
                              }`}
                            >
                              {event.isPaid ? <CheckCircle2 size={12} /> : <DollarSign size={12} />}
                              {event.isPaid ? 'PAGADO' : 'PAGAR'}
                            </button>
                            
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteEvent(event.id, e);
                                }} 
                                className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                        {event.description && (
                          <p className="text-[11px] text-gray-500 mt-1 line-clamp-1 italic">{event.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {jobEvents.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-yellow-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                      <Brain size={14} />
                      Trabajos Pendientes
                    </h4>
                    {jobEvents.map(event => (
                      <div 
                        key={event.id} 
                        className={`bg-gray-800/80 rounded-lg p-3 border-l-4 group relative hover:bg-gray-750 transition-all ${event.isFinished ? 'opacity-40 grayscale-[0.5]' : 'opacity-100'}`}
                        style={{ borderLeftColor: getJobColor(event) }}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleToggleFinished(event.id)}
                              className={`flex-shrink-0 transition-all ${
                                event.isFinished 
                                  ? 'text-green-500' 
                                  : 'hover:opacity-80'
                              }`}
                              style={{ color: event.isFinished ? '#22c55e' : getJobColor(event) }}
                              title={event.isFinished ? "Terminado" : "Marcar como terminado"}
                            >
                              {event.isFinished ? (
                                <CheckCircle2 size={20} className="fill-green-500/10" />
                              ) : (
                                <div 
                                  className="w-5 h-5 border-2 rounded-md transition-colors" 
                                  style={{ borderColor: getJobColor(event) }}
                                />
                              )}
                            </button>

                            <div className="flex flex-col flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className={`font-bold text-white whitespace-normal break-words text-sm ${event.isFinished ? 'line-through text-gray-500' : ''}`}>{event.title}</h4>
                                <span className="text-[8px] font-black bg-gray-700 text-gray-400 px-1 py-0.5 rounded border border-gray-600 uppercase">
                                  {event.jobCategory}
                                </span>
                                {(() => {
                                  if (event.isFinished) return null;
                                  const color = getJobColor(event);
                                  if (color === '#ef4444') {
                                    return (
                                      <span className="text-[8px] font-black bg-red-500 text-white px-1 rounded animate-pulse">
                                        URGENTE
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {event.jobCategory === 'trabajos mios' && event.totalPayment && (
                                  <span className="text-[10px] text-gray-400">Total: <span className="text-white font-bold">${event.totalPayment}</span></span>
                                )}
                                {event.deliveryDate && !event.isIndefinite && (
                                  <span 
                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                                    style={{ 
                                      color: getJobColor(event),
                                      borderColor: `${getJobColor(event)}40`,
                                      backgroundColor: `${getJobColor(event)}10`
                                    }}
                                  >
                                    Entrega: {event.deliveryDate}
                                  </span>
                                )}
                                {event.isIndefinite && !event.isFinished && (
                                  <span className="text-[10px] font-bold text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                                    Indefinido
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => openEditModal(event)}
                              className="p-1 text-gray-500 hover:text-blue-400 transition-colors"
                              title="Editar trabajo"
                            >
                              <AlignLeft size={12} />
                            </button>
                            
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteEvent(event.id, e);
                                }} 
                                className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                        {event.description && (
                          <p className="text-[11px] text-gray-500 mt-1 line-clamp-1 italic">{event.description}</p>
                        )}
                        {event.isFinished && event.finishedDate && (
                          <p className="text-[9px] text-green-500 mt-1 font-bold">Terminado el: {new Date(event.finishedDate + 'T00:00:00').toLocaleDateString('es-MX')}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {otherEvents.length > 0 && (
                  <div className="space-y-3">
                    {financialObligations.length > 0 && <div className="h-[1px] bg-gray-800 my-4" />}
                    <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                      <Calendar size={14} />
                      Otros Eventos
                    </h4>
                    {otherEvents.map(event => (
                      <div 
                        key={event.id} 
                        className="bg-gray-800 rounded-lg p-4 border-l-4 group relative hover:bg-gray-750 transition-all"
                        style={{ borderLeftColor: event.color || '#3b82f6' }}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex flex-col">
                            <h4 className="font-bold text-white pr-8">{event.title}</h4>
                            {event.recurrence && event.recurrence !== 'none' && (
                              <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">
                                Repite: {
                                  event.recurrence === 'daily' ? 'Diario' :
                                  event.recurrence === 'weekly' ? 'Semanal' :
                                  event.recurrence === 'monthly' ? 'Mensual' : 'Anual'
                                }
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEvent(event.id, e);
                              }} 
                              className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                              title="Eliminar evento"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        {event.time && (
                          <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                            <Clock size={12} />
                            {event.time}
                          </div>
                        )}
                        {event.description && (
                          <p className="text-sm text-gray-400 line-clamp-2">{event.description}</p>
                        )}
                        <button 
                          onClick={() => openEditModal(event)}
                          className="mt-2 text-xs text-purple-400 hover:text-purple-300 font-medium"
                        >
                          Editar detalles
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* AI Assistant Drawer */}
      <div className={`fixed inset-y-0 right-0 w-full sm:w-[400px] bg-gray-900 shadow-2xl z-[150] transform transition-transform duration-300 ease-in-out border-l border-gray-700 ${isAiOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <CalendarAiAssistant onClose={() => setIsAiOpen(false)} />
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-lg border border-gray-700 shadow-2xl my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                {editingEvent ? 'Editar' : 'Nuevo'} {newEvent.type === 'trabajo' ? 'Trabajo' : 'Evento'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              {/* Basic Info */}
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Título</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Ej: Reunión de Proyecto"
                  className="w-full bg-gray-900 text-white rounded-xl px-4 py-2 border border-gray-700 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Fecha Inicio</label>
                  <input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full bg-gray-900 text-white rounded-xl px-4 py-2 border border-gray-700 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Hora (Opcional)</label>
                  <input
                    type="time"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="w-full bg-gray-900 text-white rounded-xl px-4 py-2 border border-gray-700 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Type Selection */}
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Categoría</label>
                <select
                  value={newEvent.type}
                  onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as any })}
                  className="w-full bg-gray-900 text-white rounded-xl px-4 py-2 border border-gray-700 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                >
                  <option value="event">Evento General</option>
                  <option value="trabajo">Trabajo / Encargo</option>
                  <option value="payment">Pago / Obligación</option>
                  <option value="ingreso">Ingreso / Pago Recibido</option>
                  <option value="medical">Cita Médica</option>
                  <option value="birthday">Cumpleaños</option>
                  <option value="mountain">Montaña / Deporte</option>
                  <option value="party">Fiesta / Social</option>
                  <option value="holiday">Feriado</option>
                  <option value="vacation">Vacaciones</option>
                  <option value="off">Día Libre</option>
                </select>
              </div>

              {/* Recurrence */}
              {newEvent.type !== 'trabajo' && (
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Repetición</label>
                  <select
                    value={newEvent.recurrence}
                    onChange={(e) => setNewEvent({ ...newEvent, recurrence: e.target.value as any })}
                    className="w-full bg-gray-900 text-white rounded-xl px-4 py-2 border border-gray-700 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                  >
                    <option value="none">No se repite</option>
                    <option value="daily">Diario</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensual</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
              )}

              {/* Job Specific Fields */}
              {newEvent.type === 'trabajo' && (
                <div className="space-y-4 p-4 bg-gray-900/50 rounded-xl border border-yellow-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain size={16} className="text-yellow-500" />
                    <span className="text-xs font-bold text-yellow-500 uppercase">Detalles del Trabajo</span>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Tipo de Proyecto</label>
                    <select
                      value={newEvent.jobCategory}
                      onChange={(e) => setNewEvent({ ...newEvent, jobCategory: e.target.value as any })}
                      className="w-full bg-gray-900 text-white rounded-xl px-4 py-2 border border-gray-700 focus:ring-2 focus:ring-yellow-500 outline-none transition-all"
                    >
                      <option value="trabajos mios">Freelancer / Trabajos Míos</option>
                      <option value="javer">Javer</option>
                      <option value="proyectos personales">Proyecto Personal</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Fecha Entrega</label>
                      <input
                        type="date"
                        disabled={newEvent.isIndefinite}
                        value={newEvent.deliveryDate}
                        onChange={(e) => setNewEvent({ ...newEvent, deliveryDate: e.target.value })}
                        className="w-full bg-gray-900 text-white rounded-xl px-4 py-2 border border-gray-700 focus:ring-2 focus:ring-yellow-500 outline-none transition-all disabled:opacity-30"
                      />
                    </div>
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={newEvent.isIndefinite}
                          onChange={(e) => setNewEvent({ ...newEvent, isIndefinite: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-yellow-500 focus:ring-yellow-500"
                        />
                        <span className="text-xs font-bold text-gray-400 group-hover:text-white transition-colors">Indefinido</span>
                      </label>
                    </div>
                  </div>

                  {newEvent.jobCategory === 'trabajos mios' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Pago Total</label>
                        <div className="relative">
                          <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                          <input
                            type="text"
                            value={newEvent.totalPayment}
                            onChange={(e) => setNewEvent({ ...newEvent, totalPayment: e.target.value })}
                            placeholder="0.00"
                            className="w-full bg-gray-900 text-white rounded-xl pl-8 pr-4 py-2 border border-gray-700 focus:ring-2 focus:ring-yellow-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Anticipo</label>
                        <div className="relative">
                          <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                          <input
                            type="text"
                            value={newEvent.advancePayment}
                            onChange={(e) => setNewEvent({ ...newEvent, advancePayment: e.target.value })}
                            placeholder="0.00"
                            className="w-full bg-gray-900 text-white rounded-xl pl-8 pr-4 py-2 border border-gray-700 focus:ring-2 focus:ring-yellow-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Specific Fields */}
              {newEvent.type === 'payment' && (
                <div className="space-y-4 p-4 bg-gray-900/50 rounded-xl border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign size={16} className="text-green-500" />
                    <span className="text-xs font-bold text-green-500 uppercase">Detalles del Pago</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Monto</label>
                      <input
                        type="text"
                        value={newEvent.amount}
                        onChange={(e) => setNewEvent({ ...newEvent, amount: e.target.value })}
                        placeholder="0.00"
                        className="w-full bg-gray-900 text-white rounded-xl px-4 py-2 border border-gray-700 focus:ring-2 focus:ring-green-500 outline-none transition-all"
                      />
                    </div>
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={newEvent.isVariable}
                          onChange={(e) => setNewEvent({ ...newEvent, isVariable: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-green-500 focus:ring-green-500"
                        />
                        <span className="text-xs font-bold text-gray-400 group-hover:text-white transition-colors">Monto Variable</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Description & Color */}
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Descripción</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Detalles adicionales..."
                  rows={3}
                  className="w-full bg-gray-900 text-white rounded-xl px-4 py-2 border border-gray-700 focus:ring-2 focus:ring-purple-500 outline-none transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Recordatorio Google Calendar (minutos antes)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={newEvent.reminderMinutes}
                    onChange={(e) => setNewEvent({ ...newEvent, reminderMinutes: parseInt(e.target.value) || 0 })}
                    className="flex-1 bg-gray-900 text-white rounded-xl px-4 py-2 border border-gray-700 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                  />
                  <span className="text-xs text-gray-400">min</span>
                </div>
                <p className="text-[9px] text-gray-500 mt-1 ml-1">Se enviará una alerta a tu Google Calendar si está sincronizado.</p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 ml-1">Color del Evento</label>
                <div className="flex flex-wrap gap-2">
                  {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308'].map(c => (
                    <button
                      key={c}
                      onClick={() => setNewEvent({ ...newEvent, color: c })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${newEvent.color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAddEvent} 
                className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-lg shadow-purple-900/20 transition-all"
              >
                {editingEvent ? 'Guardar Cambios' : 'Crear Evento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Token Modal */}
      <AnimatePresence>
        {isTokenModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-gray-800 rounded-2xl p-8 w-full max-w-md border border-gray-700 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Zap className="text-amber-500" />
                  {editingToken ? 'Editar Token' : 'Nuevo Token de Recuerdo'}
                </h3>
                <button onClick={() => setIsTokenModalOpen(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre del Token</label>
                  <input
                    type="text"
                    value={newToken.name}
                    onChange={e => setNewToken({ ...newToken, name: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="Ej: Cargar Carro"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Símbolo</label>
                    <select
                      value={newToken.symbol}
                      onChange={e => setNewToken({ ...newToken, symbol: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    >
                      <option value="Zap">Rayo (⚡)</option>
                      <option value="Clock">Reloj (⏰)</option>
                      <option value="CheckCircle2">Check (✅)</option>
                      <option value="Brain">Cerebro (🧠)</option>
                      <option value="DollarSign">Dinero (💰)</option>
                      <option value="Stethoscope">Médico (🩺)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Color</label>
                    <input
                      type="color"
                      value={newToken.color}
                      onChange={e => setNewToken({ ...newToken, color: e.target.value })}
                      className="w-full h-10 bg-gray-900 border border-gray-700 rounded-lg px-1 py-1 outline-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Repetir cada (días)</label>
                    <input
                      type="number"
                      value={newToken.intervalDays}
                      onChange={e => setNewToken({ ...newToken, intervalDays: parseInt(e.target.value) || 1 })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha de Inicio</label>
                    <input
                      type="date"
                      value={newToken.startDate}
                      onChange={e => setNewToken({ ...newToken, startDate: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Recordatorio (minutos antes)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={newToken.reminderMinutes}
                        onChange={e => setNewToken({ ...newToken, reminderMinutes: parseInt(e.target.value) || 0 })}
                        className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                      <span className="text-xs text-gray-400">min</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hora del Recordatorio</label>
                    <input
                      type="time"
                      value={newToken.reminderTime}
                      onChange={e => setNewToken({ ...newToken, reminderTime: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleAddToken}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-all shadow-lg mt-4"
                >
                  {editingToken ? 'Guardar Cambios' : 'Crear Token'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header Button Editor Modal */}
      <AnimatePresence>
        {editingHeaderBtn && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Personalizar Botón</h2>
                <button onClick={() => setEditingHeaderBtn(null)} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Etiqueta (Tooltip)</label>
                  <input 
                    type="text"
                    value={editingHeaderBtn === 'save' 
                      ? (config.calendarSettings?.saveButton?.label || 'Guardar Cambios')
                      : editingHeaderBtn === 'notes'
                      ? (config.calendarSettings?.notesButton?.label || 'Mis Notas')
                      : (config.calendarSettings?.aiButton?.label || 'Asistente Estratégico')
                    }
                    onChange={(e) => {
                      const settings = config.calendarSettings || {};
                      const btnKey = editingHeaderBtn === 'save' ? 'saveButton' : editingHeaderBtn === 'notes' ? 'notesButton' : 'aiButton';
                      updateConfig({
                        ...config,
                        calendarSettings: {
                          ...settings,
                          [btnKey]: { ...(settings[btnKey] || {}), label: e.target.value }
                        }
                      });
                    }}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-3">Icono</label>
                  <div className="grid grid-cols-7 gap-2">
                    {[
                      'Save', 'StickyNote', 'Brain', 'Sparkles', 'Plus', 'Calendar', 'Clock',
                      'DollarSign', 'PartyPopper', 'Stethoscope', 'Cake', 'Mountain'
                    ].map((iconName) => (
                      <button
                        key={iconName}
                        onClick={() => {
                          const settings = config.calendarSettings || {};
                          const btnKey = editingHeaderBtn === 'save' ? 'saveButton' : editingHeaderBtn === 'notes' ? 'notesButton' : 'aiButton';
                          updateConfig({
                            ...config,
                            calendarSettings: {
                              ...settings,
                              [btnKey]: { ...(settings[btnKey] || {}), icon: iconName, svg: undefined }
                            }
                          });
                        }}
                        className={`p-2 rounded-lg border-2 transition-all flex items-center justify-center bg-gray-900 ${
                          (editingHeaderBtn === 'save' ? config.calendarSettings?.saveButton?.icon : editingHeaderBtn === 'notes' ? config.calendarSettings?.notesButton?.icon : config.calendarSettings?.aiButton?.icon) === iconName && !(editingHeaderBtn === 'save' ? config.calendarSettings?.saveButton?.svg : editingHeaderBtn === 'notes' ? config.calendarSettings?.notesButton?.svg : config.calendarSettings?.aiButton?.svg)
                            ? 'border-blue-500 text-blue-400 scale-110'
                            : 'border-gray-700 text-gray-500 hover:border-gray-600'
                        }`}
                        title={iconName}
                      >
                        {getIcon(iconName, 18)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Icono (Arrastra una imagen o SVG aquí)</label>
                  <div 
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file) {
                        const btnKey = editingHeaderBtn === 'save' ? 'saveButton' : editingHeaderBtn === 'notes' ? 'notesButton' : 'aiButton';
                        if (file.type === 'image/svg+xml') {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const settings = config.calendarSettings || {};
                            updateConfig({
                              ...config,
                              calendarSettings: {
                                ...settings,
                                [btnKey]: { ...(settings[btnKey] || {}), svg: ev.target?.result as string }
                              }
                            });
                          };
                          reader.readAsText(file);
                        } else if (file.type.startsWith('image/')) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const settings = config.calendarSettings || {};
                            updateConfig({
                              ...config,
                              calendarSettings: {
                                ...settings,
                                [btnKey]: { ...(settings[btnKey] || {}), svg: `<img src="${ev.target?.result}" class="w-full h-full object-contain" />` }
                              }
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    className="w-full bg-gray-900 border-2 border-dashed border-gray-700 rounded-xl px-3 py-6 text-center cursor-pointer hover:border-blue-500 transition-colors flex flex-col items-center justify-center gap-3"
                  >
                    <div className="w-12 h-12 flex items-center justify-center">
                      {(() => {
                        const svg = editingHeaderBtn === 'save' 
                          ? config.calendarSettings?.saveButton?.svg 
                          : editingHeaderBtn === 'notes' 
                          ? config.calendarSettings?.notesButton?.svg 
                          : config.calendarSettings?.aiButton?.svg;
                        
                        if (svg) {
                          return <div className="w-full h-full flex items-center justify-center" dangerouslySetInnerHTML={{ __html: svg }} />;
                        }
                        
                        const icon = editingHeaderBtn === 'save' 
                          ? config.calendarSettings?.saveButton?.icon 
                          : editingHeaderBtn === 'notes' 
                          ? config.calendarSettings?.notesButton?.icon 
                          : config.calendarSettings?.aiButton?.icon;
                        
                        return getIcon(icon || 'Brain', 32);
                      })()}
                    </div>
                    <span className="text-xs text-gray-500 font-medium">Arrastra y suelta un archivo PNG o SVG aquí</span>
                  </div>
                  <textarea 
                    value={editingHeaderBtn === 'save' 
                      ? (config.calendarSettings?.saveButton?.svg || '')
                      : editingHeaderBtn === 'notes'
                      ? (config.calendarSettings?.notesButton?.svg || '')
                      : (config.calendarSettings?.aiButton?.svg || '')
                    }
                    onChange={(e) => {
                      const settings = config.calendarSettings || {};
                      const btnKey = editingHeaderBtn === 'save' ? 'saveButton' : editingHeaderBtn === 'notes' ? 'notesButton' : 'aiButton';
                      updateConfig({
                        ...config,
                        calendarSettings: {
                          ...settings,
                          [btnKey]: { ...(settings[btnKey] || {}), svg: e.target.value }
                        }
                      });
                    }}
                    placeholder="O pega el código SVG aquí..."
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white font-mono text-xs h-24 focus:outline-none focus:border-blue-500 mt-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-3">Color de Fondo</label>
                  <div className="grid grid-cols-5 gap-3">
                    {[
                      { name: 'Azul', class: 'bg-blue-600 hover:bg-blue-700' },
                      { name: 'Ámbar', class: 'bg-amber-500 hover:bg-amber-600' },
                      { name: 'Rojo', class: 'bg-red-600 hover:bg-red-700' },
                      { name: 'Verde', class: 'bg-emerald-600 hover:bg-emerald-700' },
                      { name: 'Púrpura', class: 'bg-purple-600 hover:bg-purple-700' },
                      { name: 'Rosa', class: 'bg-pink-600 hover:bg-pink-700' },
                      { name: 'Indigo', class: 'bg-indigo-600 hover:bg-indigo-700' },
                      { name: 'Cian', class: 'bg-cyan-500 hover:bg-cyan-600' },
                      { name: 'Gris', class: 'bg-gray-600 hover:bg-gray-700' },
                      { name: 'Naranja', class: 'bg-orange-600 hover:bg-orange-700' },
                    ].map((color) => (
                      <button
                        key={color.class}
                        onClick={() => {
                          const settings = config.calendarSettings || {};
                          const btnKey = editingHeaderBtn === 'save' ? 'saveButton' : editingHeaderBtn === 'notes' ? 'notesButton' : 'aiButton';
                          updateConfig({
                            ...config,
                            calendarSettings: {
                              ...settings,
                              [btnKey]: { ...(settings[btnKey] || {}), color: color.class }
                            }
                          });
                        }}
                        className={`h-10 rounded-lg border-2 transition-all ${color.class} ${
                          (editingHeaderBtn === 'save' ? config.calendarSettings?.saveButton?.color : editingHeaderBtn === 'notes' ? config.calendarSettings?.notesButton?.color : config.calendarSettings?.aiButton?.color) === color.class
                            ? 'border-white scale-110 shadow-lg'
                            : 'border-transparent hover:scale-105'
                        }`}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button 
                  onClick={() => setEditingHeaderBtn(null)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all"
                >
                  Listo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notes Modal (Yellow Notepad) */}
      <AnimatePresence>
        {isNotesOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[300] flex items-center justify-center p-4 sm:p-8">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-4xl h-full max-h-[90vh] bg-[#fef08a] rounded-sm shadow-2xl flex flex-col relative overflow-hidden border-l-[40px] border-red-200/50"
            >
              {/* Notepad Header */}
              <div className="bg-[#facc15] p-4 flex justify-between items-center border-b-2 border-amber-400 shadow-sm">
                <div className="flex items-center gap-3">
                  <StickyNote className="text-amber-900" size={28} />
                  <h2 className="text-2xl font-black text-amber-900 uppercase tracking-tighter">Apuntes Rápidos</h2>
                </div>
                <button 
                  onClick={() => {
                    setIsNotesOpen(false);
                    saveToSupabase();
                  }}
                  className="p-2 hover:bg-amber-500 rounded-full text-amber-900 transition-colors"
                >
                  <X size={28} />
                </button>
              </div>

              {/* Notepad Body */}
              <div className="flex-1 relative bg-[#fef08a] p-8 overflow-hidden">
                {/* Lines */}
                <div className="absolute inset-0 pointer-events-none" style={{
                  backgroundImage: 'linear-gradient(#94a3b8 1px, transparent 1px)',
                  backgroundSize: '100% 2.5rem',
                  marginTop: '3rem'
                }} />
                
                <textarea
                  value={typeof config.notes === 'string' ? config.notes : ''}
                  onChange={(e) => updateConfig({ ...config, notes: e.target.value as any })}
                  placeholder="Escribe tus apuntes aquí..."
                  className="w-full h-full bg-transparent text-gray-800 text-xl font-medium leading-[2.5rem] focus:outline-none resize-none relative z-10 placeholder:text-amber-900/20"
                  style={{ paddingTop: '0.5rem' }}
                />
              </div>

              {/* Notepad Footer */}
              <div className="bg-amber-100/50 p-3 text-right text-[10px] font-bold text-amber-900/40 uppercase tracking-widest">
                Rembrandt IA Studio - Notas Persistentes
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CalendarTab;
