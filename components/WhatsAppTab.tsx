import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  MessageSquare,
  Send,
  Search,
  Edit3,
  Check,
  CheckCheck,
  Sparkles,
  UserPlus,
  ExternalLink,
  RefreshCw,
  QrCode,
  ChevronLeft,
  X,
  Zap,
  Wifi,
  Paperclip,
  Image as ImageIcon,
  Film,
  FileText,
  Download,
  Maximize2,
  Minimize2,
  Smile,
  Star,
  ArrowUpDown
} from 'lucide-react';
import { toast } from 'sonner';
import { generateContentWithFallback, GEMINI_MODELS } from '../services/geminiService';

export interface WaMessage {
  id: string;
  direction: 'outgoing' | 'incoming';
  text: string;
  timestamp: string;
  rawTimestamp?: number;
  edited?: boolean;
  status?: 'pending' | 'sent' | 'delivered' | 'read';
  statusVerified?: boolean;
  mediaType?: 'image' | 'video' | 'audio' | 'document' | 'sticker';
  mediaUrl?: string;
  thumbnailBase64?: string;
  fileName?: string;
  mimeType?: string;
}

export interface WhatsAppTabProps {
  isActiveTab?: boolean;
  onReturnToTab?: () => void;
}

export interface WaChat {
  id: string; // e.g. "5218112345678@c.us"
  name: string;
  phone: string;
  avatarColor: string;
  avatarUrl?: string;
  messages: WaMessage[];
  unread?: number;
  lastUpdated?: number;
}

interface WaConnectionConfig {
  apiHost: string;
  instanceId: string;
  accessKey: string;
}

const STORAGE_KEY_CHATS = 'remb_wa_qr_chats_v2';
const STORAGE_KEY_CONN = 'remb_wa_qr_conn_v2';
const STORAGE_KEY_STICKERS = 'remb_wa_stickers_v1';
const STORAGE_KEY_LINKED = 'remb_wa_is_linked_v1';

export interface SavedStickerItem {
  id: string;
  url: string;
  addedAt: number;
}

const AVATAR_GRADIENTS = [
  'from-emerald-500 to-teal-600',
  'from-cyan-500 to-blue-600',
  'from-indigo-500 to-purple-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600'
];

const pickGradient = (seed: string) => {
  let sum = 0;
  for (let i = 0; i < seed.length; i++) sum += seed.charCodeAt(i);
  return AVATAR_GRADIENTS[sum % AVATAR_GRADIENTS.length];
};

const formatPhoneDisplay = (chatIdOrPhone: string) => {
  const digits = chatIdOrPhone.replace(/@.*$/, '').replace(/\D/g, '');
  if (!digits) return chatIdOrPhone;
  return `+${digits}`;
};

const formatTimeFromUnix = (unixSec?: number) => {
  const d = unixSec ? new Date(unixSec * 1000) : new Date();
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
};

// Extract text, media metadata, and REAL delivery/read status from any Green-API message object
const parseGreenApiMessage = (item: any, chatId: string, forcedDirection?: 'outgoing' | 'incoming'): WaMessage | null => {
  const typeMsg: string = item.typeMessage || '';
  const direction: 'outgoing' | 'incoming' =
    forcedDirection || (item.type === 'outgoing' ? 'outgoing' : 'incoming');

  let mediaType: WaMessage['mediaType'] = undefined;
  if (typeMsg === 'imageMessage') mediaType = 'image';
  else if (typeMsg === 'stickerMessage') mediaType = 'sticker';
  else if (typeMsg === 'videoMessage') mediaType = 'video';
  else if (typeMsg === 'audioMessage' || typeMsg === 'voiceMessage') mediaType = 'audio';
  else if (typeMsg === 'documentMessage') mediaType = 'document';

  const mediaUrl: string | undefined =
    item.downloadUrl || item.fileMessageData?.downloadUrl || undefined;
  const thumbnailBase64: string | undefined =
    item.jpegThumbnail || item.fileMessageData?.jpegThumbnail || undefined;
  const fileName: string | undefined =
    item.fileName || item.fileMessageData?.fileName || undefined;
  const mimeType: string | undefined =
    item.mimeType || item.fileMessageData?.mimeType || undefined;

  const text =
    item.textMessage ||
    item.extendedTextMessageData?.text ||
    item.caption ||
    item.fileMessageData?.caption ||
    '';

  if (!text && !mediaType) return null;

  // Determine real WhatsApp delivery/read status so unread messages are NEVER falsely marked as read
  const rawStatus = String(item.statusMessage || item.status || '').toLowerCase();
  let realStatus: WaMessage['status'] = 'sent';
  if (rawStatus === 'read' || rawStatus === 'played') {
    realStatus = 'read';
  } else if (rawStatus === 'delivered') {
    realStatus = 'delivered';
  } else if (rawStatus === 'pending') {
    realStatus = 'pending';
  } else {
    realStatus = 'sent';
  }

  return {
    id: item.idMessage || `${chatId}-${item.timestamp || Date.now()}`,
    direction,
    text,
    timestamp: formatTimeFromUnix(item.timestamp),
    rawTimestamp: item.timestamp || Math.floor(Date.now() / 1000),
    status: realStatus,
    statusVerified: true,
    mediaType,
    mediaUrl,
    thumbnailBase64,
    fileName,
    mimeType
  };
};

export const WhatsAppTab: React.FC<WhatsAppTabProps> = ({ isActiveTab = true, onReturnToTab }) => {
  const [conn, setConn] = useState<WaConnectionConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONN);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {
      apiHost: 'https://api.green-api.com',
      instanceId: '',
      accessKey: ''
    };
  });

  const [instanceState, setInstanceState] = useState<
    'unconfigured' | 'checking' | 'notAuthorized' | 'authorized' | 'error'
  >(() => (conn.instanceId && conn.accessKey ? 'checking' : 'unconfigured'));
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [showSetupModal, setShowSetupModal] = useState(false);

  const [chats, setChats] = useState<WaChat[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CHATS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Sanitize any legacy messages that had hardcoded status: 'read' without statusVerified
          return parsed.map((c: WaChat) => ({
            ...c,
            messages: Array.isArray(c.messages)
              ? c.messages.map((m: WaMessage) =>
                  m.direction === 'outgoing' && !m.statusVerified && m.status === 'read'
                    ? { ...m, status: 'delivered' }
                    : m
                )
              : []
          }));
        }
      }
    } catch (_) {}
    return [];
  });

  const [activeChatId, setActiveChatId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  // Composer & media states
  const [composerText, setComposerText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSyncingChats, setIsSyncingChats] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiWorkingMode, setAiWorkingMode] = useState<null | 'improve' | 'reply'>(null);
  const [aiSuccessMode, setAiSuccessMode] = useState<null | 'improve' | 'reply'>(null);
  const [loadingMediaIds, setLoadingMediaIds] = useState<Record<string, boolean>>({});
  const [lightboxMedia, setLightboxMedia] = useState<{
    url: string;
    type: 'image' | 'video';
    caption?: string;
  } | null>(null);

  // Floating Mini-Tab states when moving away from the WhatsApp tab
  const [floatingMaximized, setFloatingMaximized] = useState(false);
  const [floatingHiddenManual, setFloatingHiddenManual] = useState(false);

  // In-place message editing
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingMsgText, setEditingMsgText] = useState('');

  // Quick new number modal
  const [showNewChatInput, setShowNewChatInput] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('52');
  const [newChatName, setNewChatName] = useState('');

  // Saved cell phone & custom stickers tray (stored locally in browser, 0 bytes on Vercel)
  const [showStickerDrawer, setShowStickerDrawer] = useState(false);
  const [savedStickers, setSavedStickers] = useState<SavedStickerItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_STICKERS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
  });

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesTopContainerRef = useRef<HTMLDivElement | null>(null);
  const floatingMessagesTopRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const stickerInputRef = useRef<HTMLInputElement | null>(null);

  // Reset manual hide whenever the user comes back to the WhatsApp tab
  useEffect(() => {
    if (isActiveTab) {
      setFloatingHiddenManual(false);
      setFloatingMaximized(false);
    }
  }, [isActiveTab]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONN, JSON.stringify(conn));
    } catch (_) {}
  }, [conn]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CHATS, JSON.stringify(chats));
    } catch (_) {}
  }, [chats]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STICKERS, JSON.stringify(savedStickers.slice(0, 60)));
    } catch (_) {}
  }, [savedStickers]);

  // Broadcast whether WhatsApp is linked on this computer so EmailGenerator can default to Email when unlinked
  useEffect(() => {
    try {
      if (instanceState === 'authorized') {
        localStorage.setItem(STORAGE_KEY_LINKED, 'true');
        window.dispatchEvent(new CustomEvent('remb-wa-sync-changed', { detail: { linked: true } }));
      } else if (instanceState === 'unconfigured' || instanceState === 'notAuthorized') {
        localStorage.setItem(STORAGE_KEY_LINKED, 'false');
        window.dispatchEvent(new CustomEvent('remb-wa-sync-changed', { detail: { linked: false } }));
      }
    } catch (_) {}
  }, [instanceState]);

  const handleSaveStickerUrl = useCallback((url: string) => {
    if (!url) return;
    setSavedStickers(prev => {
      if (prev.some(s => s.url === url)) return prev;
      return [{ id: `stk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, url, addedAt: Date.now() }, ...prev].slice(0, 60);
    });
  }, []);

  const activeChat = useMemo(
    () => chats.find(c => c.id === activeChatId) || chats[0] || null,
    [chats, activeChatId]
  );

  // Messages ordered newest at the top and oldest at the bottom
  const newestFirstMessages = useMemo(() => {
    if (!activeChat?.messages) return [];
    return [...activeChat.messages].sort((a, b) => (b.rawTimestamp || 0) - (a.rawTimestamp || 0));
  }, [activeChat]);

  useEffect(() => {
    if (!activeChatId && chats.length > 0) {
      setActiveChatId(chats[0].id);
    }
  }, [chats, activeChatId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesTopContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      floatingMessagesTopRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 80);
  };

  // Smart paste handler: auto-extract idInstance & apiTokenInstance
  const handleSmartPasteCredentials = (rawInput: string) => {
    const idMatch = rawInput.match(/\b(\d{10})\b/);
    const tokenMatch = rawInput.match(/\b([a-f0-9]{40,60})\b/i);
    const hostMatch = rawInput.match(/https:\/\/[a-z0-9.-]+\.green-api\.com/i);

    if (idMatch && tokenMatch) {
      setConn({
        apiHost: hostMatch ? hostMatch[0] : conn.apiHost || 'https://api.green-api.com',
        instanceId: idMatch[1],
        accessKey: tokenMatch[1]
      });
      toast.success('¡Datos detectados automáticamente! Conectando con el código QR...');
      return true;
    }
    return false;
  };

  // Firewall-bypassing bridge helper via /api/wa-proxy on Vercel
  const callWaApi = useCallback(
    async (
      action: string,
      options?: { method?: 'GET' | 'POST'; queryParams?: string; body?: any }
    ) => {
      const id = conn.instanceId.trim();
      const key = conn.accessKey.trim();
      const host = (conn.apiHost || 'https://api.green-api.com').replace(/\/$/, '');
      const method = options?.method || 'GET';
      const queryParams = options?.queryParams || '';

      try {
        const proxyRes = await fetch('/api/wa-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiHost: host,
            instanceId: id,
            accessKey: key,
            action,
            queryParams,
            method,
            body: options?.body
          })
        });
        const contentType = proxyRes.headers.get('content-type') || '';
        if (proxyRes.ok && contentType.includes('application/json')) {
          return await proxyRes.json();
        }
      } catch (_) {}

      const qs = queryParams ? `?${queryParams.replace(/^\?/, '')}` : '';
      const directUrl = `${host}/waInstance${id}/${action}/${key}${qs}`;
      const directRes = await fetch(directUrl, {
        method,
        headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
        body: method === 'POST' && options?.body ? JSON.stringify(options.body) : undefined
      });
      if (!directRes.ok) {
        throw new Error(`No se pudo conectar (Código ${directRes.status}). Verifica tu ID y Llave.`);
      }
      return await directRes.json();
    },
    [conn.apiHost, conn.instanceId, conn.accessKey]
  );

  // Fetch downloadUrl on demand if an image/video message only had a thumbnail
  const handleResolveMediaUrl = useCallback(
    async (chatId: string, msgId: string) => {
      if (loadingMediaIds[msgId]) return;
      try {
        setLoadingMediaIds(prev => ({ ...prev, [msgId]: true }));
        const data = await callWaApi('downloadFile', {
          method: 'POST',
          body: { chatId, idMessage: msgId }
        });
        if (data?.downloadUrl) {
          setChats(prev =>
            prev.map(c =>
              c.id === chatId
                ? {
                    ...c,
                    messages: c.messages.map(m =>
                      m.id === msgId ? { ...m, mediaUrl: data.downloadUrl } : m
                    )
                  }
                : c
            )
          );
          return data.downloadUrl as string;
        } else {
          toast.error('El archivo multimedia ya no está disponible en el servidor temporal');
        }
      } catch (_) {
        toast.error('No se pudo cargar el archivo multimedia');
      } finally {
        setLoadingMediaIds(prev => ({ ...prev, [msgId]: false }));
      }
      return null;
    },
    [callWaApi, loadingMediaIds]
  );

  // Auto-collect stickers from cell phone chats into savedStickers tray (and resolve missing sticker URLs in background)
  const resolvedStickerIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const foundUrls: string[] = [];
    chats.forEach(c => {
      c.messages.forEach(m => {
        if (m.mediaType === 'sticker') {
          if (m.mediaUrl) {
            foundUrls.push(m.mediaUrl);
          } else if (
            instanceState === 'authorized' &&
            !resolvedStickerIdsRef.current.has(m.id) &&
            !m.id.startsWith('local-')
          ) {
            resolvedStickerIdsRef.current.add(m.id);
            callWaApi('downloadFile', {
              method: 'POST',
              body: { chatId: c.id, idMessage: m.id }
            })
              .then(d => {
                if (d?.downloadUrl) {
                  handleSaveStickerUrl(d.downloadUrl);
                  setChats(prev =>
                    prev.map(ch =>
                      ch.id === c.id
                        ? {
                            ...ch,
                            messages: ch.messages.map(msg =>
                              msg.id === m.id ? { ...msg, mediaUrl: d.downloadUrl } : msg
                            )
                          }
                        : ch
                    )
                  );
                }
              })
              .catch(() => {});
          }
        }
      });
    });

    if (foundUrls.length > 0) {
      setSavedStickers(prev => {
        const existingSet = new Set(prev.map(s => s.url));
        const additions: SavedStickerItem[] = [];
        for (const u of foundUrls) {
          if (!existingSet.has(u)) {
            existingSet.add(u);
            additions.push({
              id: `stk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              url: u,
              addedAt: Date.now()
            });
          }
        }
        return additions.length > 0 ? [...additions, ...prev].slice(0, 60) : prev;
      });
    }
  }, [chats, instanceState, callWaApi, handleSaveStickerUrl]);

  // Send a sticker from the saved Stickers tray
  const handleSendStickerFromUrl = async (stickerUrl: string) => {
    if (!activeChat) {
      toast.error('Selecciona una conversación primero');
      return;
    }
    const nowUnix = Math.floor(Date.now() / 1000);
    const tempId = `local-stk-${Date.now()}`;
    const optimisticMsg: WaMessage = {
      id: tempId,
      direction: 'outgoing',
      text: '',
      timestamp: formatTimeFromUnix(nowUnix),
      rawTimestamp: nowUnix,
      status: 'sent',
      mediaType: 'sticker',
      mediaUrl: stickerUrl,
      fileName: 'sticker.webp',
      mimeType: 'image/webp'
    };

    setChats(prev =>
      prev.map(c =>
        c.id === activeChat.id
          ? { ...c, messages: [...c.messages, optimisticMsg], lastUpdated: nowUnix }
          : c
      )
    );
    setShowStickerDrawer(false);
    scrollToBottom();

    if (instanceState === 'authorized' && !stickerUrl.startsWith('data:')) {
      try {
        setIsSending(true);
        await callWaApi('sendFileByUrl', {
          method: 'POST',
          body: {
            chatId: activeChat.id,
            urlFile: stickerUrl,
            fileName: 'sticker.webp'
          }
        });
        toast.success('Sticker enviado');
      } catch (_) {
        toast.error('No se pudo reenviar el sticker por URL');
      } finally {
        setIsSending(false);
      }
    }
  };

  // Send Photo, Video, Sticker or Document from file input
  const handleUploadAndSendFile = async (e: React.ChangeEvent<HTMLInputElement>, forceAsSticker = false) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeChat) return;

    const id = conn.instanceId.trim();
    const key = conn.accessKey.trim();
    if (!id || !key || instanceState !== 'authorized') {
      toast.error('Vincula primero tu código QR para enviar archivos directos');
      return;
    }

    const localPreviewUrl = await new Promise<string>(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });

    if (forceAsSticker && localPreviewUrl) {
      handleSaveStickerUrl(localPreviewUrl);
    }

    const isStickerFile = forceAsSticker || file.type === 'image/webp' || file.name.toLowerCase().endsWith('.webp');
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    const mediaType: WaMessage['mediaType'] = isStickerFile
      ? 'sticker'
      : isImage
      ? 'image'
      : isVideo
      ? 'video'
      : isAudio
      ? 'audio'
      : 'document';

    const tempId = `local-file-${Date.now()}`;
    const nowUnix = Math.floor(Date.now() / 1000);
    const captionText = composerText.trim();

    const optimisticMsg: WaMessage = {
      id: tempId,
      direction: 'outgoing',
      text: captionText,
      timestamp: formatTimeFromUnix(nowUnix),
      rawTimestamp: nowUnix,
      status: 'sent',
      mediaType,
      mediaUrl: localPreviewUrl,
      fileName: file.name,
      mimeType: file.type
    };

    setChats(prev =>
      prev.map(c =>
        c.id === activeChat.id
          ? {
              ...c,
              messages: [...c.messages, optimisticMsg],
              lastUpdated: nowUnix
            }
          : c
      )
    );
    setComposerText('');
    scrollToBottom();

    try {
      setIsSending(true);
      const formData = new FormData();
      formData.append('chatId', activeChat.id);
      formData.append('file', file, file.name);
      formData.append('fileName', file.name);
      if (captionText) {
        formData.append('caption', captionText);
      }

      const uploadHost = conn.apiHost.includes('green-api.com')
        ? conn.apiHost.replace('https://api.', 'https://media.').replace(/\/$/, '')
        : 'https://media.green-api.com';

      const uploadUrl = `${uploadHost}/waInstance${id}/sendFileByUpload/${key}`;
      const res = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success('Archivo enviado por WhatsApp');
    } catch (err) {
      toast.error('No se pudo subir el archivo directamente desde esta red');
    } finally {
      setIsSending(false);
    }
  };

  // 1. Check Instance State & Fetch QR if notAuthorized
  const checkStateAndFetchQr = useCallback(async () => {
    const id = conn.instanceId.trim();
    const key = conn.accessKey.trim();

    if (!id || !key) {
      setInstanceState('unconfigured');
      return;
    }

    try {
      setQrLoading(true);
      const data = await callWaApi('getStateInstance');
      const state = data?.stateInstance;

      if (state === 'authorized') {
        setInstanceState('authorized');
        setQrBase64(null);
        setStatusMessage('WhatsApp vinculado y sincronizado en vivo');
        setShowSetupModal(false);
        return;
      }

      setInstanceState('notAuthorized');
      setStatusMessage('Escanea el código QR con tu celular para sincronizar tus chats');
      const qrData = await callWaApi('qr');
      if (qrData?.type === 'qrCode' && qrData?.message) {
        setQrBase64(`data:image/png;base64,${qrData.message}`);
      } else if (qrData?.type === 'alreadyLogged') {
        setInstanceState('authorized');
        setQrBase64(null);
      }
    } catch (err: any) {
      setInstanceState('error');
      setStatusMessage(
        err?.message || 'Error al verificar la instancia. Revisa que el ID y la Llave sean correctos.'
      );
    } finally {
      setQrLoading(false);
    }
  }, [conn.instanceId, conn.accessKey, callWaApi]);

  useEffect(() => {
    if (conn.instanceId.trim() && conn.accessKey.trim()) {
      checkStateAndFetchQr();
    } else {
      setInstanceState('unconfigured');
    }
  }, [conn.instanceId, conn.accessKey, checkStateAndFetchQr]);

  useEffect(() => {
    if (instanceState !== 'notAuthorized') return;
    const timer = setInterval(() => {
      checkStateAndFetchQr();
    }, 12000);
    return () => clearInterval(timer);
  }, [instanceState, checkStateAndFetchQr]);

  // 2. Sync Recent Chats & Messages (including Images, Videos, Audios, Documents)
  const syncAllRecentChats = useCallback(
    async (silent = false) => {
      const id = conn.instanceId.trim();
      const key = conn.accessKey.trim();
      if (!id || !key || instanceState !== 'authorized') return;

      try {
        if (!silent) setIsSyncingChats(true);

        const [incRes, outRes, contactsRes] = await Promise.allSettled([
          callWaApi('lastIncomingMessages', { queryParams: 'minutes=10080' }),
          callWaApi('lastOutgoingMessages', { queryParams: 'minutes=10080' }),
          callWaApi('getContacts')
        ]);

        const contactNameMap = new Map<string, string>();
        if (contactsRes.status === 'fulfilled' && Array.isArray(contactsRes.value)) {
          for (const c of contactsRes.value) {
            if (c.id && (c.name || c.contactName)) {
              contactNameMap.set(c.id, c.name || c.contactName);
            }
          }
        }

        const allRawMsgs: any[] = [];
        if (incRes.status === 'fulfilled' && Array.isArray(incRes.value)) {
          allRawMsgs.push(...incRes.value.map((m: any) => ({ ...m, _dir: 'incoming' })));
        }
        if (outRes.status === 'fulfilled' && Array.isArray(outRes.value)) {
          allRawMsgs.push(...outRes.value.map((m: any) => ({ ...m, _dir: 'outgoing' })));
        }

        if (allRawMsgs.length === 0) {
          if (!silent) toast.info('Conectado a WhatsApp. Aún no hay mensajes recientes.');
          return;
        }

        setChats(prevChats => {
          const map = new Map<string, WaChat>();
          for (const existing of prevChats) {
            map.set(existing.id, { ...existing, messages: [...existing.messages] });
          }

          for (const item of allRawMsgs) {
            const chatId: string = item.chatId;
            if (!chatId || chatId === 'status@broadcast') continue;

            const msgObj = parseGreenApiMessage(
              item,
              chatId,
              item._dir === 'outgoing' ? 'outgoing' : 'incoming'
            );
            if (!msgObj) continue;

            const existingChat = map.get(chatId);
            const resolvedName =
              contactNameMap.get(chatId) ||
              item.senderName ||
              item.senderContactName ||
              existingChat?.name ||
              formatPhoneDisplay(chatId);

            if (!existingChat) {
              map.set(chatId, {
                id: chatId,
                name: resolvedName,
                phone: formatPhoneDisplay(chatId),
                avatarColor: pickGradient(chatId),
                messages: [msgObj],
                lastUpdated: msgObj.rawTimestamp
              });
            } else {
              if (
                resolvedName &&
                resolvedName !== formatPhoneDisplay(chatId) &&
                existingChat.name.startsWith('+')
              ) {
                existingChat.name = resolvedName;
              }
              const existingIdx = existingChat.messages.findIndex(m => m.id === msgObj.id);
              if (existingIdx === -1) {
                existingChat.messages.push(msgObj);
              } else {
                existingChat.messages[existingIdx] = {
                  ...existingChat.messages[existingIdx],
                  ...msgObj,
                  status: msgObj.status || existingChat.messages[existingIdx].status,
                  statusVerified: true,
                  mediaUrl: msgObj.mediaUrl || existingChat.messages[existingIdx].mediaUrl
                };
              }
              existingChat.lastUpdated = Math.max(
                existingChat.lastUpdated || 0,
                msgObj.rawTimestamp || 0
              );
            }
          }

          const updatedList = Array.from(map.values()).map(chat => ({
            ...chat,
            messages: chat.messages.sort((a, b) => (a.rawTimestamp || 0) - (b.rawTimestamp || 0))
          }));

          updatedList.sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));
          return updatedList;
        });

        if (!silent) {
          toast.success('Chats, fotos y videos sincronizados');
        }
      } catch (err) {
        console.warn('Error sincronizando chats:', err);
      } finally {
        if (!silent) setIsSyncingChats(false);
      }
    },
    [conn.instanceId, conn.accessKey, instanceState, callWaApi]
  );

  useEffect(() => {
    if (instanceState !== 'authorized') return;
    syncAllRecentChats(false);
    const interval = setInterval(() => {
      syncAllRecentChats(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [instanceState, syncAllRecentChats]);

  // Automatically fetch contact profile photos (getAvatar) for chats missing avatarUrl
  const fetchedAvatarsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (instanceState !== 'authorized') return;
    const missing = chats
      .slice(0, 20)
      .filter(c => !c.avatarUrl && !fetchedAvatarsRef.current.has(c.id));
    if (missing.length === 0) return;

    missing.forEach(c => {
      fetchedAvatarsRef.current.add(c.id);
      callWaApi('getAvatar', { method: 'POST', body: { chatId: c.id } })
        .then(avData => {
          if (avData?.urlAvatar) {
            setChats(prev =>
              prev.map(chat => (chat.id === c.id ? { ...chat, avatarUrl: avData.urlAvatar } : chat))
            );
          }
        })
        .catch(() => {});
    });
  }, [chats, instanceState, callWaApi]);

  // Fetch full history AND contact profile picture (getAvatar) for selected chat
  const loadSingleChatHistory = async (chatId: string) => {
    const id = conn.instanceId.trim();
    const key = conn.accessKey.trim();
    if (!id || !key || instanceState !== 'authorized') return;

    // Fetch real contact profile picture (getAvatar) in parallel
    callWaApi('getAvatar', {
      method: 'POST',
      body: { chatId }
    })
      .then(avData => {
        if (avData?.urlAvatar) {
          setChats(prev =>
            prev.map(c => (c.id === chatId ? { ...c, avatarUrl: avData.urlAvatar } : c))
          );
        }
      })
      .catch(() => {});

    try {
      const data = await callWaApi('getChatHistory', {
        method: 'POST',
        body: { chatId, count: 40 }
      });
      if (!Array.isArray(data)) return;

      const parsedMsgs: WaMessage[] = data
        .reverse()
        .map((item: any) => parseGreenApiMessage(item, chatId))
        .filter(Boolean) as WaMessage[];

      if (parsedMsgs.length > 0) {
        setChats(prev =>
          prev.map(c => {
            if (c.id !== chatId) return c;
            // Preserve any already-resolved mediaUrls from previous state
            const existingUrlMap = new Map<string, string>();
            c.messages.forEach(m => {
              if (m.mediaUrl) existingUrlMap.set(m.id, m.mediaUrl);
            });
            return {
              ...c,
              messages: parsedMsgs.map(pm => ({
                ...pm,
                mediaUrl: pm.mediaUrl || existingUrlMap.get(pm.id)
              }))
            };
          })
        );
        scrollToBottom();
      }
    } catch (_) {}
  };

  // Send text message
  const handleSendMessage = async () => {
    const text = composerText.trim();
    if (!text) return;

    if (!activeChat) {
      toast.error('Selecciona o agrega un contacto primero');
      return;
    }

    const tempId = `local-${Date.now()}`;
    const nowUnix = Math.floor(Date.now() / 1000);
    const optimisticMsg: WaMessage = {
      id: tempId,
      direction: 'outgoing',
      text,
      timestamp: formatTimeFromUnix(nowUnix),
      rawTimestamp: nowUnix,
      status: 'sent'
    };

    setChats(prev =>
      prev.map(c =>
        c.id === activeChat.id
          ? {
              ...c,
              messages: [...c.messages, optimisticMsg],
              lastUpdated: nowUnix
            }
          : c
      )
    );
    setComposerText('');
    scrollToBottom();

    if (instanceState === 'authorized') {
      try {
        setIsSending(true);
        const data = await callWaApi('sendMessage', {
          method: 'POST',
          body: {
            chatId: activeChat.id,
            message: text
          }
        });
        if (data?.idMessage) {
          setChats(prev =>
            prev.map(c =>
              c.id === activeChat.id
                ? {
                    ...c,
                    messages: c.messages.map(m =>
                      m.id === tempId
                        ? { ...m, id: data.idMessage, status: 'sent', statusVerified: true }
                        : m
                    )
                  }
                : c
            )
          );
        }
      } catch (err) {
        toast.error('No se pudo enviar por API; abriendo WhatsApp Web como respaldo');
        const digits = activeChat.id.replace(/@.*$/, '').replace(/\D/g, '');
        window.open(
          `https://web.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(text)}`,
          '_blank'
        );
      } finally {
        setIsSending(false);
      }
    } else {
      const digits = activeChat.id.replace(/@.*$/, '').replace(/\D/g, '');
      window.open(
        `https://web.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(text)}`,
        '_blank'
      );
    }
  };

  // Edit a message
  const handleSaveEditedMessage = async () => {
    if (!activeChat || !editingMsgId) return;
    const newText = editingMsgText.trim();
    if (!newText) return;

    setChats(prev =>
      prev.map(c =>
        c.id === activeChat.id
          ? {
              ...c,
              messages: c.messages.map(m =>
                m.id === editingMsgId ? { ...m, text: newText, edited: true } : m
              )
            }
          : c
      )
    );

    const msgIdToEdit = editingMsgId;
    setEditingMsgId(null);
    setEditingMsgText('');

    if (instanceState === 'authorized' && !msgIdToEdit.startsWith('local-')) {
      try {
        await callWaApi('editMessage', {
          method: 'POST',
          body: {
            chatId: activeChat.id,
            idMessage: msgIdToEdit,
            message: newText
          }
        });
        toast.success('Mensaje editado en WhatsApp');
      } catch (_) {
        toast.success('Mensaje editado en la conversación');
      }
    } else {
      toast.success('Mensaje editado');
    }
  };

  // Create new chat by phone number
  const handleAddNewChat = () => {
    const cleanDigits = newChatPhone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      toast.error('Ingresa el número con código de país (ej. 528112345678)');
      return;
    }
    const chatId = `${cleanDigits}@c.us`;
    const exists = chats.find(c => c.id === chatId);
    if (exists) {
      setActiveChatId(chatId);
      setShowNewChatInput(false);
      return;
    }
    const newChat: WaChat = {
      id: chatId,
      name: newChatName.trim() || `+${cleanDigits}`,
      phone: `+${cleanDigits}`,
      avatarColor: pickGradient(chatId),
      messages: [],
      lastUpdated: Math.floor(Date.now() / 1000)
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(chatId);
    setNewChatName('');
    setShowNewChatInput(false);
    setMobileView('chat');
    if (instanceState === 'authorized') {
      loadSingleChatHistory(chatId);
    }
  };

  // AI helper with live working & finished animations
  const handleAiAssist = async (mode: 'improve' | 'reply') => {
    try {
      if (mode === 'improve' && !composerText.trim()) {
        toast.error('Escribe primero tu idea en la barra de mensaje para mejorarla con IA');
        return;
      }
      setIsAiProcessing(true);
      setAiWorkingMode(mode);
      setAiSuccessMode(null);

      const contactName = activeChat?.name || 'el contacto';
      let prompt = '';

      if (mode === 'improve') {
        prompt = `Mejora la ortografía, claridad y redacción de este mensaje de WhatsApp para "${contactName}". Devuelve ÚNICAMENTE el mensaje corregido listo para enviar:\n\n"${composerText}"`;
      } else {
        const recentContext = activeChat?.messages
          .slice(-6)
          .map(m => `${m.direction === 'incoming' ? contactName : 'Yo'}: ${m.text}`)
          .join('\n');
        prompt = `Con base en estos últimos mensajes de WhatsApp con "${contactName}":\n${
          recentContext || 'Saludo inicial'
        }\nRedacta una respuesta cordial, breve y profesional lista para enviar. Devuelve ÚNICAMENTE el texto del mensaje:`;
      }

      const res = await generateContentWithFallback({
        model: GEMINI_MODELS.PRIMARY,
        contents: prompt
      });
      const text = (res?.text || '').trim();
      if (text) {
        setComposerText(text);
        setAiSuccessMode(mode);
        setTimeout(() => {
          setAiSuccessMode(prev => (prev === mode ? null : prev));
        }, 4500);
        toast.success(
          mode === 'improve'
            ? '✨ ¡Texto mejorado con IA listo para enviar!'
            : '⚡ ¡Respuesta sugerida con IA lista para enviar!'
        );
      }
    } catch (err: any) {
      toast.error('No se pudo usar IA en este momento');
    } finally {
      setIsAiProcessing(false);
      setAiWorkingMode(null);
    }
  };

  const handleOpenOfficialWhatsAppPopup = () => {
    const width = Math.min(980, Math.floor(window.screen.availWidth * 0.78));
    const height = Math.floor(window.screen.availHeight * 0.86);
    const left = Math.floor((window.screen.availWidth - width) / 2);
    const top = Math.floor((window.screen.availHeight - height) / 2);

    window.open(
      'https://web.whatsapp.com/',
      'WhatsAppWebOfficialQR',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  };

  const filteredChats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.messages.some(m => m.text.toLowerCase().includes(q))
    );
  }, [chats, searchQuery]);

  // ============================================================================
  // SCREEN 1: QR LINKING & FREE SETUP WIZARD
  // ============================================================================
  if (instanceState !== 'authorized' || showSetupModal) {
    return (
      <div className="w-full min-h-[640px] bg-[#0b141a] text-slate-100 rounded-2xl border border-emerald-500/25 shadow-2xl overflow-hidden flex flex-col">
        <div className="h-14 px-5 bg-[#111b21] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Vincular WhatsApp con Código QR (100% Gratis)
              </h2>
              <p className="text-[11px] text-slate-400">
                Sincroniza tus mensajes, fotos, videos y audios escaneando el QR ($0)
              </p>
            </div>
          </div>

          {instanceState === 'authorized' && (
            <button
              onClick={() => setShowSetupModal(false)}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs"
            >
              Volver a mis Chats
            </button>
          )}
        </div>

        <div className="flex-1 p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start max-w-6xl mx-auto w-full">
          {/* LEFT COLUMN: LIVE QR SCANNER BOX */}
          <div className="lg:col-span-5 bg-[#111b21] rounded-2xl border border-white/10 p-6 flex flex-col items-center text-center shadow-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-semibold mb-4">
              <QrCode className="w-4 h-4" />
              Escáner de Código QR en Vivo
            </div>

            {qrBase64 ? (
              <div className="space-y-4 flex flex-col items-center">
                <div className="p-4 bg-white rounded-2xl shadow-2xl border-4 border-emerald-500">
                  <img
                    src={qrBase64}
                    alt="Código QR de WhatsApp"
                    className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
                  />
                </div>
                <p className="text-xs text-emerald-300 font-medium max-w-xs">
                  1. Abre WhatsApp en tu teléfono
                  <br />
                  2. Toca <strong>Dispositivos vinculados → Vincular un dispositivo</strong>
                  <br />
                  3. Apunta tu cámara a este código QR
                </p>
                <button
                  onClick={checkStateAndFetchQr}
                  disabled={qrLoading}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${qrLoading ? 'animate-spin' : ''}`} />
                  Actualizar Código QR
                </button>
              </div>
            ) : (
              <div className="w-60 h-60 rounded-2xl bg-[#202c33] border-2 border-dashed border-emerald-500/30 flex flex-col items-center justify-center p-6 text-center space-y-3 my-2">
                {qrLoading ? (
                  <>
                    <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" />
                    <p className="text-xs text-slate-300">Generando tu código QR de WhatsApp...</p>
                  </>
                ) : (
                  <>
                    <QrCode className="w-14 h-14 text-emerald-400/60" />
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {instanceState === 'error'
                        ? statusMessage
                        : 'Completa los 2 datos gratuitos de la derecha para que aparezca aquí tu Código QR y puedas escanearlo.'}
                    </p>
                  </>
                )}
              </div>
            )}

            <div className="w-full mt-6 pt-5 border-t border-white/10 space-y-2.5">
              <p className="text-[11px] text-slate-400">
                ¿Prefieres escanear el QR directo en la ventana oficial de WhatsApp Web sin crear cuenta?
              </p>
              <button
                onClick={handleOpenOfficialWhatsAppPopup}
                className="w-full py-2.5 px-4 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir WhatsApp Web Oficial con QR Directo (Sin registro)
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: 3-STEP 100% FREE GUIDE */}
          <div className="lg:col-span-7 bg-[#111b21] rounded-2xl border border-white/10 p-6 space-y-5 shadow-xl">
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold">
                100% GRATIS PARA SIEMPRE ($0 / SIN TARJETA)
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white mt-2">
                ¿Cómo activar el QR dentro de esta pestaña en 1 minuto?
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Con el puente gratuito <strong>Green-API (Plan Developer $0)</strong> puedes ver tus chats, <strong>imágenes, videos, audios y documentos</strong> directamente aquí adentro (incluso en la red de la oficina):
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#202c33] border border-white/5 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <div className="space-y-1.5 flex-1">
                  <p className="font-semibold text-white">
                    Abre Green-API (desde tu celular o PC) y elige el plan gratuito "Developer ($0)"
                  </p>
                  <p className="text-slate-300 text-[11px]">
                    Regístrate con tu correo y presiona <strong>"Create Instance" → "Developer (Free)"</strong>.
                  </p>
                  <a
                    href="https://console.green-api.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs mt-1 shadow"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    1. Ir a Green-API Gratis (console.green-api.com)
                  </a>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#202c33] border border-white/5 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <div className="space-y-2.5 flex-1">
                  <p className="font-semibold text-white">
                    Pega aquí los 2 códigos que te da la página (<code className="text-emerald-300">idInstance</code> y <code className="text-emerald-300">apiTokenInstance</code>)
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        ID de Instancia (código de 10 dígitos de la API)
                      </label>
                      <input
                        type="text"
                        value={conn.instanceId}
                        onChange={e => {
                          const val = e.target.value;
                          if (!handleSmartPasteCredentials(val)) {
                            setConn(prev => ({ ...prev, instanceId: val.trim() }));
                          }
                        }}
                        placeholder="Ej. 7103948571"
                        className="w-full px-3 py-2 rounded-xl bg-[#111b21] text-xs text-white border border-white/15 focus:border-emerald-500 focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        Llave (apiTokenInstance)
                      </label>
                      <input
                        type="text"
                        value={conn.accessKey}
                        onChange={e => {
                          const val = e.target.value;
                          if (!handleSmartPasteCredentials(val)) {
                            setConn(prev => ({ ...prev, accessKey: val.trim() }));
                          }
                        }}
                        placeholder="Pega aquí tu apiTokenInstance..."
                        className="w-full px-3 py-2 rounded-xl bg-[#111b21] text-xs text-white border border-white/15 focus:border-emerald-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#202c33] border border-white/5 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-white">
                      Haz clic en "Mostrar mi Código QR" y escanéalo con tu WhatsApp
                    </p>
                    <p className="text-slate-300 text-[11px]">
                      Se conectará tu propio número de celular con tus conversaciones, fotos y videos.
                    </p>
                  </div>
                  <button
                    onClick={checkStateAndFetchQr}
                    disabled={!conn.instanceId.trim() || !conn.accessKey.trim() || qrLoading}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 disabled:opacity-40 text-slate-950 font-bold text-xs shrink-0 shadow-lg"
                  >
                    {qrLoading ? 'Cargando QR...' : 'Mostrar mi Código QR'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // SCREEN 2: LIVE SYNCHRONIZED WHATSAPP CHATS (With Images, Videos, Audios & Docs)
  // ============================================================================
  return (
    <div className="w-full h-[calc(100vh-7.5rem)] min-h-[620px] bg-[#0b141a] text-slate-100 rounded-2xl border border-emerald-500/25 shadow-2xl overflow-hidden flex flex-col relative">
      {/* Header */}
      <div className="h-14 px-4 bg-[#111b21] border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-md shrink-0">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white truncate">WhatsApp</h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Wifi className="w-3 h-3" />
                Sincronizado con QR
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate hidden sm:block">
              Mensajes, imágenes, videos, notas de voz y documentos en vivo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => syncAllRecentChats(false)}
            disabled={isSyncingChats}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-200 border border-white/10 flex items-center gap-1.5"
            title="Sincronizar últimos mensajes de WhatsApp"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncingChats ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar Chats</span>
          </button>

          <button
            onClick={() => setShowSetupModal(true)}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 border border-white/10 flex items-center gap-1.5"
            title="Ver estado de conexión QR"
          >
            <QrCode className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Conexión QR</span>
          </button>
        </div>
      </div>

      {/* Main Split View */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* LEFT COLUMN: Real Synchronized Chats List */}
        <div
          className={`${
            mobileView === 'list' ? 'flex' : 'hidden md:flex'
          } w-full md:w-80 lg:w-96 bg-[#111b21] border-r border-white/10 flex-col shrink-0`}
        >
          <div className="p-3 space-y-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar contacto o mensaje..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#202c33] text-xs text-white placeholder-slate-400 border border-white/5 focus:border-emerald-500/50 focus:outline-none"
                />
              </div>
              <button
                onClick={() => setShowNewChatInput(v => !v)}
                className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow"
                title="Escribir a un nuevo número"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>

            {showNewChatInput && (
              <div className="p-2.5 rounded-xl bg-[#202c33] border border-emerald-500/30 space-y-2">
                <div className="text-[11px] font-semibold text-emerald-300">
                  Abrir chat con número (con lada, ej. 528112345678):
                </div>
                <input
                  type="text"
                  value={newChatName}
                  onChange={e => setNewChatName(e.target.value)}
                  placeholder="Nombre (opcional)"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#111b21] text-xs text-white border border-white/10"
                />
                <div className="flex gap-1.5">
                  <input
                    type="tel"
                    value={newChatPhone}
                    onChange={e => setNewChatPhone(e.target.value)}
                    placeholder="528112345678"
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#111b21] text-xs text-white border border-white/10 font-mono"
                  />
                  <button
                    onClick={handleAddNewChat}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs"
                  >
                    Abrir
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {filteredChats.map(chat => {
              const lastMsg = chat.messages[chat.messages.length - 1];
              const isSelected = activeChat?.id === chat.id;
              const previewLabel = lastMsg
                ? lastMsg.text ||
                  (lastMsg.mediaType === 'image'
                    ? '📷 Foto'
                    : lastMsg.mediaType === 'video'
                    ? '🎬 Video'
                    : lastMsg.mediaType === 'audio'
                    ? '🎵 Nota de voz'
                    : lastMsg.mediaType === 'document'
                    ? `📄 ${lastMsg.fileName || 'Documento'}`
                    : 'Mensaje')
                : '';

              return (
                <div
                  key={chat.id}
                  onClick={() => {
                    setActiveChatId(chat.id);
                    setMobileView('chat');
                    loadSingleChatHistory(chat.id);
                  }}
                  className={`p-3 flex items-center gap-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]/70'
                  }`}
                >
                  {chat.avatarUrl ? (
                    <img
                      src={chat.avatarUrl}
                      alt={chat.name}
                      className="w-11 h-11 rounded-full object-cover shrink-0 border border-white/10"
                    />
                  ) : (
                    <div
                      className={`w-11 h-11 rounded-full bg-gradient-to-br ${chat.avatarColor} flex items-center justify-center text-white font-bold text-sm shrink-0`}
                    >
                      {chat.name.replace(/^\+/, '').slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="text-sm font-semibold text-white truncate">{chat.name}</h3>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {lastMsg?.timestamp || ''}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {lastMsg ? (
                        <>
                          {lastMsg.direction === 'outgoing' ? 'Tú: ' : ''}
                          {previewLabel}
                        </>
                      ) : (
                        <span className="italic text-slate-500">Toca para cargar mensajes</span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}

            {filteredChats.length === 0 && (
              <div className="p-8 text-center text-slate-400 space-y-3">
                <MessageSquare className="w-8 h-8 mx-auto opacity-40" />
                <p className="text-xs">
                  {isSyncingChats
                    ? 'Sincronizando tus conversaciones de WhatsApp...'
                    : 'Usa el botón "+" arriba para iniciar un chat o presiona "Actualizar Chats".'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Conversation Thread (Top Composer + Newest Messages First) */}
        <div
          className={`${
            mobileView === 'chat' ? 'flex' : 'hidden md:flex'
          } flex-1 flex-col bg-[#0b141a] min-w-0`}
        >
          {activeChat ? (
            <>
              {/* TOP HEADER + ACTION BUTTONS + COMPOSER BAR AT THE VERY TOP */}
              <div className="bg-[#202c33] border-b border-white/10 p-3 space-y-2.5 shrink-0 shadow-lg z-10">
                {/* Row 1: Contact Info + Action Buttons (Stickers, Mejorar IA, Sugerir IA, Cargar Historial) */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      onClick={() => setMobileView('list')}
                      className="md:hidden p-1.5 rounded-lg bg-white/5 text-slate-300"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {activeChat.avatarUrl ? (
                      <img
                        src={activeChat.avatarUrl}
                        alt={activeChat.name}
                        onClick={() =>
                          setLightboxMedia({
                            url: activeChat.avatarUrl!,
                            type: 'image',
                            caption: activeChat.name
                          })
                        }
                        className="w-9 h-9 rounded-full object-cover shrink-0 border border-emerald-500/30 cursor-pointer"
                        title="Ver foto de perfil del contacto"
                      />
                    ) : (
                      <div
                        className={`w-9 h-9 rounded-full bg-gradient-to-br ${activeChat.avatarColor} flex items-center justify-center text-white font-bold text-xs shrink-0`}
                      >
                        {activeChat.name.replace(/^\+/, '').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white truncate">{activeChat.name}</h3>
                      <p className="text-[11px] text-emerald-400 font-mono truncate">
                        {activeChat.phone}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons right at the top alongside the header */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => setShowStickerDrawer(prev => !prev)}
                      className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition-colors ${
                        showStickerDrawer
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      <Smile className="w-3.5 h-3.5" />
                      <span>Stickers ({savedStickers.length})</span>
                    </button>

                    {/* BOTÓN MEJORAR MI TEXTO CON IA CON ANIMACIÓN DE TRABAJO Y DE COMPLETADO */}
                    <button
                      onClick={() => handleAiAssist('improve')}
                      disabled={isAiProcessing}
                      className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                        aiWorkingMode === 'improve'
                          ? 'bg-purple-600/40 text-white border-purple-400 ring-2 ring-purple-400/60 animate-pulse shadow-[0_0_15px_rgba(168,85,247,0.6)]'
                          : aiSuccessMode === 'improve'
                          ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400 ring-2 ring-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.45)]'
                          : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border-purple-500/30'
                      }`}
                    >
                      {aiWorkingMode === 'improve' ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-200" />
                          <span>✨ Mejorando texto con IA...</span>
                        </>
                      ) : aiSuccessMode === 'improve' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300 animate-bounce" />
                          <span>¡Texto mejorado con IA!</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Mejorar mi texto con IA</span>
                        </>
                      )}
                    </button>

                    {/* BOTÓN SUGERIR RESPUESTA CON IA CON ANIMACIÓN DE TRABAJO Y DE COMPLETADO */}
                    <button
                      onClick={() => handleAiAssist('reply')}
                      disabled={isAiProcessing}
                      className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                        aiWorkingMode === 'reply'
                          ? 'bg-cyan-600/40 text-white border-cyan-400 ring-2 ring-cyan-400/60 animate-pulse shadow-[0_0_15px_rgba(34,211,238,0.6)]'
                          : aiSuccessMode === 'reply'
                          ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400 ring-2 ring-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.45)]'
                          : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {aiWorkingMode === 'reply' ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-200" />
                          <span>⚡ Generando respuesta IA...</span>
                        </>
                      ) : aiSuccessMode === 'reply' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300 animate-bounce" />
                          <span>¡Respuesta sugerida lista!</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5" />
                          <span>Sugerir respuesta con IA</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => loadSingleChatHistory(activeChat.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 flex items-center gap-1.5 border border-white/10"
                      title="Recargar historial de este chat"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Cargar historial</span>
                    </button>
                  </div>
                </div>

                {/* Animated AI Status Banner when working or just finished */}
                {(aiWorkingMode || aiSuccessMode) && (
                  <div
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 transition-all ${
                      aiWorkingMode
                        ? 'bg-gradient-to-r from-purple-900/60 via-indigo-900/60 to-emerald-900/60 border border-purple-400/50 text-purple-100 animate-pulse'
                        : 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {aiWorkingMode ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300 shrink-0" />
                          <span>
                            {aiWorkingMode === 'improve'
                              ? '✨ La IA está mejorando la redacción y ortografía de tu mensaje...'
                              : '⚡ La IA está leyendo la conversación y redactando una respuesta sugerida...'}
                          </span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-emerald-300 animate-bounce shrink-0" />
                          <span>
                            {aiSuccessMode === 'improve'
                              ? '✅ ¡Listo! Tu texto ya fue mejorado con IA arriba en la caja de escritura.'
                              : '✅ ¡Listo! Ya se redactó la respuesta sugerida arriba en la caja de escritura.'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Row 2: TOP MESSAGE COMPOSER BOX (Write message right at the top alongside the buttons) */}
                <div className="flex items-end gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,audio/*,.webp,.pdf,.doc,.docx,.xls,.xlsx,.zip"
                    onChange={e => handleUploadAndSendFile(e, false)}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSending}
                    className="p-2.5 rounded-xl bg-[#2a3942] hover:bg-white/15 text-emerald-300 border border-white/10 transition-colors shrink-0"
                    title="Adjuntar foto, video o documento"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowStickerDrawer(prev => !prev)}
                    className="p-2.5 rounded-xl bg-[#2a3942] hover:bg-white/15 text-amber-300 border border-white/10 transition-colors shrink-0"
                    title="Abrir bandeja de Stickers del celular"
                  >
                    <Smile className="w-4 h-4" />
                  </button>

                  <div className="relative flex-1">
                    <textarea
                      value={composerText}
                      onChange={e => setComposerText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      rows={1}
                      placeholder={
                        aiWorkingMode
                          ? '✨ La IA está trabajando en tu mensaje...'
                          : 'Escribe aquí arriba tu mensaje, usa IA ✨ o adjunta con 📎...'
                      }
                      className={`w-full px-4 py-2.5 rounded-xl bg-[#111b21] text-sm text-white placeholder-slate-400 border transition-all focus:outline-none resize-none max-h-32 ${
                        aiWorkingMode
                          ? 'border-purple-400 ring-2 ring-purple-500/40 animate-pulse'
                          : aiSuccessMode
                          ? 'border-emerald-400 ring-2 ring-emerald-500/40'
                          : 'border-white/15 focus:border-emerald-500'
                      }`}
                    />
                  </div>

                  <button
                    onClick={handleSendMessage}
                    disabled={isSending || !composerText.trim()}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-sm flex items-center gap-1.5 shadow-lg shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span>Enviar</span>
                  </button>
                </div>

                {/* Drawer de Stickers del Celular (desplegable arriba junto al cuadro de texto) */}
                {showStickerDrawer && (
                  <div className="p-3 rounded-2xl bg-[#111b21] border border-emerald-500/30 shadow-2xl space-y-2.5 mt-1">
                    <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <Smile className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-white">
                          Mis Stickers del Celular ({savedStickers.length})
                        </span>
                        <span className="text-[10px] text-emerald-300/80 hidden sm:inline">
                          • 0 KB en Vercel (se sincronizan de tus chats y se guardan en tu navegador)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          ref={stickerInputRef}
                          type="file"
                          accept="image/webp,image/png,image/gif,image/jpeg"
                          onChange={e => handleUploadAndSendFile(e, true)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => stickerInputRef.current?.click()}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold"
                        >
                          + Subir Sticker (.webp / .png)
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowStickerDrawer(false)}
                          className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {savedStickers.length > 0 ? (
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-44 overflow-y-auto p-1">
                        {savedStickers.map(stk => (
                          <div
                            key={stk.id}
                            className="group/item relative p-1.5 rounded-xl bg-white/5 hover:bg-emerald-500/20 border border-white/5 hover:border-emerald-500/40 flex flex-col items-center justify-center cursor-pointer transition-all"
                            onClick={() => handleSendStickerFromUrl(stk.url)}
                            title="Clic para enviar este sticker al chat activo"
                          >
                            <img
                              src={stk.url}
                              alt="Sticker guardado"
                              className="w-14 h-14 object-contain"
                            />
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                setSavedStickers(prev => prev.filter(s => s.id !== stk.id));
                              }}
                              className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/70 text-rose-300 text-[9px] opacity-0 group-hover/item:opacity-100 flex items-center justify-center"
                              title="Quitar de la bandeja"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center space-y-1.5 text-xs text-slate-300">
                        <p className="font-semibold text-emerald-300">
                          ¿Cómo hacer que aparezcan aquí los stickers de tu celular?
                        </p>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Envíate cualquier sticker desde tu celular a tu propio chat (o a cualquier conversación) y aparecerá automáticamente aquí listo para usarse con 1 clic, o toca <strong>"+ Subir Sticker"</strong> arriba.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Messages List Ordered Reverse: NEWEST AT THE TOP, OLDEST AT THE BOTTOM */}
              <div
                ref={messagesTopContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-2.5"
                style={{
                  backgroundImage:
                    'radial-gradient(rgba(16, 185, 129, 0.06) 1px, transparent 1px)',
                  backgroundSize: '20px 20px'
                }}
              >
                <div className="flex items-center justify-center pb-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#111b21]/90 border border-emerald-500/25 text-[10px] font-semibold text-emerald-300 shadow">
                    <ArrowUpDown className="w-3 h-3" />
                    Más nuevos arriba • Más antiguos abajo
                  </span>
                </div>

                {newestFirstMessages.map(msg => {
                  const isOutgoing = msg.direction === 'outgoing';
                  const isEditingThis = editingMsgId === msg.id;
                  const isLoadingMedia = !!loadingMediaIds[msg.id];
                  const isTrulyRead = msg.status === 'read' && Boolean(msg.statusVerified);
                  const isDelivered = msg.status === 'delivered' || (msg.status === 'read' && !msg.statusVerified);

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'} group`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[72%] rounded-2xl px-3.5 py-2 shadow-md ${
                          isOutgoing
                            ? 'bg-[#005c4b] text-slate-100 rounded-tr-none'
                            : 'bg-[#202c33] text-slate-100 rounded-tl-none'
                        }`}
                      >
                        {/* MEDIA RENDERER: STICKER */}
                        {msg.mediaType === 'sticker' && (
                          <div className="mb-1.5 flex flex-col items-center gap-1.5">
                            {msg.mediaUrl ? (
                              <div className="relative group/stk p-1">
                                <img
                                  src={msg.mediaUrl}
                                  alt="Sticker"
                                  className="w-28 h-28 sm:w-32 sm:h-32 object-contain drop-shadow-lg cursor-pointer hover:scale-105 transition-transform"
                                  onClick={() =>
                                    setLightboxMedia({
                                      url: msg.mediaUrl!,
                                      type: 'image',
                                      caption: 'Sticker de WhatsApp'
                                    })
                                  }
                                />
                                <div className="flex items-center justify-center gap-1 mt-1 opacity-90">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleSaveStickerUrl(msg.mediaUrl!);
                                      toast.success('Sticker guardado en Mis Stickers del Cel');
                                    }}
                                    className="px-2 py-0.5 rounded-md bg-black/50 hover:bg-black/80 text-amber-300 text-[10px] font-bold flex items-center gap-1"
                                    title="Guardar en mi bandeja de stickers"
                                  >
                                    <Star className="w-2.5 h-2.5 fill-amber-300" />
                                    <span>Guardar</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSendStickerFromUrl(msg.mediaUrl!)}
                                    className="px-2 py-0.5 rounded-md bg-emerald-500/30 hover:bg-emerald-500/50 text-emerald-200 text-[10px] font-bold"
                                    title="Enviar este mismo sticker al chat actual"
                                  >
                                    Enviar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleResolveMediaUrl(activeChat.id, msg.id)}
                                disabled={isLoadingMedia}
                                className="px-3 py-2 rounded-xl bg-black/30 hover:bg-black/45 text-emerald-300 text-xs font-medium flex items-center gap-1.5"
                              >
                                <Smile className="w-4 h-4" />
                                {isLoadingMedia ? 'Cargando sticker...' : 'Ver Sticker del Celular'}
                              </button>
                            )}
                          </div>
                        )}

                        {/* MEDIA RENDERER: IMAGE */}
                        {msg.mediaType === 'image' && (
                          <div className="mb-2 rounded-xl overflow-hidden bg-black/30 relative">
                            {msg.mediaUrl ? (
                              <div className="relative group/img">
                                <img
                                  src={msg.mediaUrl}
                                  alt={msg.text || 'Imagen de WhatsApp'}
                                  className="max-h-72 w-auto object-contain rounded-xl cursor-pointer"
                                  onClick={() =>
                                    setLightboxMedia({
                                      url: msg.mediaUrl!,
                                      type: 'image',
                                      caption: msg.text
                                    })
                                  }
                                />
                                <button
                                  onClick={() =>
                                    setLightboxMedia({
                                      url: msg.mediaUrl!,
                                      type: 'image',
                                      caption: msg.text
                                    })
                                  }
                                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover/img:opacity-100 transition-opacity"
                                  title="Ver en grande"
                                >
                                  <Maximize2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : msg.thumbnailBase64 ? (
                              <div className="relative">
                                <img
                                  src={`data:image/jpeg;base64,${msg.thumbnailBase64}`}
                                  alt="Vista previa"
                                  className="max-h-60 w-auto object-contain rounded-xl blur-[1px] opacity-85"
                                />
                                <button
                                  onClick={() => handleResolveMediaUrl(activeChat.id, msg.id)}
                                  disabled={isLoadingMedia}
                                  className="absolute inset-0 m-auto w-fit h-fit px-3 py-1.5 rounded-xl bg-black/75 hover:bg-black/90 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 shadow-lg border border-emerald-500/40"
                                >
                                  <ImageIcon className="w-3.5 h-3.5" />
                                  {isLoadingMedia ? 'Cargando HD...' : 'Ver Foto en HD'}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleResolveMediaUrl(activeChat.id, msg.id)}
                                disabled={isLoadingMedia}
                                className="px-3.5 py-2.5 rounded-xl bg-black/30 hover:bg-black/45 text-emerald-300 text-xs font-medium flex items-center gap-2"
                              >
                                <ImageIcon className="w-4 h-4" />
                                {isLoadingMedia ? 'Cargando imagen...' : 'Cargar Imagen de WhatsApp'}
                              </button>
                            )}
                          </div>
                        )}

                        {/* MEDIA RENDERER: VIDEO */}
                        {msg.mediaType === 'video' && (
                          <div
                            className="mb-2 rounded-xl overflow-hidden bg-black/50 border border-white/10"
                            onClick={e => e.stopPropagation()}
                          >
                            {msg.mediaUrl ? (
                              <div className="space-y-1.5 p-1.5">
                                <video
                                  src={msg.mediaUrl}
                                  controls
                                  playsInline
                                  preload="metadata"
                                  onClick={e => e.stopPropagation()}
                                  className="max-h-72 w-full rounded-lg bg-black"
                                />
                                <div className="flex items-center justify-between gap-2 px-1 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={e => {
                                      e.stopPropagation();
                                      setLightboxMedia({
                                        url: msg.mediaUrl!,
                                        type: 'video',
                                        caption: msg.text
                                      });
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 text-[11px] font-bold flex items-center gap-1"
                                  >
                                    <Maximize2 className="w-3 h-3" />
                                    <span>Ampliar Video</span>
                                  </button>
                                  <a
                                    href={msg.mediaUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] font-semibold flex items-center gap-1"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Abrir directo</span>
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <div className="p-3 flex flex-col items-center gap-2">
                                {msg.thumbnailBase64 && (
                                  <img
                                    src={`data:image/jpeg;base64,${msg.thumbnailBase64}`}
                                    alt="Video preview"
                                    className="max-h-48 rounded-lg opacity-85"
                                  />
                                )}
                                <button
                                  type="button"
                                  onClick={async e => {
                                    e.stopPropagation();
                                    const resolved = await handleResolveMediaUrl(activeChat.id, msg.id);
                                    if (resolved) {
                                      setLightboxMedia({
                                        url: resolved,
                                        type: 'video',
                                        caption: msg.text
                                      });
                                    }
                                  }}
                                  disabled={isLoadingMedia}
                                  className="px-3.5 py-2 rounded-xl bg-emerald-500/25 hover:bg-emerald-500/40 text-emerald-200 border border-emerald-500/40 text-xs font-bold flex items-center gap-2 shadow-md"
                                >
                                  <Film className="w-4 h-4" />
                                  {isLoadingMedia ? 'Cargando video...' : '▶ Cargar y Reproducir Video'}
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* MEDIA RENDERER: AUDIO / VOICE NOTE */}
                        {msg.mediaType === 'audio' && (
                          <div className="mb-1.5 min-w-[220px]">
                            {msg.mediaUrl ? (
                              <audio src={msg.mediaUrl} controls className="w-full h-9" />
                            ) : (
                              <button
                                onClick={() => handleResolveMediaUrl(activeChat.id, msg.id)}
                                disabled={isLoadingMedia}
                                className="px-3 py-1.5 rounded-xl bg-black/25 hover:bg-black/40 text-emerald-300 text-xs flex items-center gap-2"
                              >
                                🎵 {isLoadingMedia ? 'Cargando audio...' : 'Escuchar nota de voz'}
                              </button>
                            )}
                          </div>
                        )}

                        {/* MEDIA RENDERER: DOCUMENT / PDF */}
                        {msg.mediaType === 'document' && (
                          <div className="mb-1.5 p-2.5 rounded-xl bg-black/25 border border-white/10 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span className="text-xs text-white truncate">
                                {msg.fileName || 'Documento adjunto'}
                              </span>
                            </div>
                            {msg.mediaUrl ? (
                              <a
                                href={msg.mediaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-[11px] flex items-center gap-1 shrink-0"
                              >
                                <Download className="w-3 h-3" />
                                Abrir
                              </a>
                            ) : (
                              <button
                                onClick={() => handleResolveMediaUrl(activeChat.id, msg.id)}
                                disabled={isLoadingMedia}
                                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-emerald-300 shrink-0"
                              >
                                {isLoadingMedia ? '...' : 'Descargar'}
                              </button>
                            )}
                          </div>
                        )}

                        {/* TEXT CONTENT OR IN-PLACE EDITOR */}
                        {isEditingThis ? (
                          <div className="space-y-2 min-w-[240px]">
                            <textarea
                              value={editingMsgText}
                              onChange={e => setEditingMsgText(e.target.value)}
                              rows={2}
                              className="w-full p-2 rounded-lg bg-black/40 text-xs text-white border border-emerald-400/50 focus:outline-none"
                              autoFocus
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => setEditingMsgId(null)}
                                className="px-2 py-1 rounded bg-white/10 text-[11px] text-slate-300"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={handleSaveEditedMessage}
                                className="px-2.5 py-1 rounded bg-emerald-500 text-slate-950 font-bold text-[11px]"
                              >
                                Guardar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {msg.text && (
                              <p className="text-xs sm:text-sm whitespace-pre-wrap break-words select-text">
                                {msg.text}
                              </p>
                            )}
                            <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] text-slate-300/75">
                              {msg.edited && <span>editado •</span>}
                              <span>{msg.timestamp}</span>
                              {isOutgoing && (
                                <span
                                  className="inline-flex items-center gap-0.5"
                                  title={
                                    isTrulyRead
                                      ? 'Leído por el destinatario'
                                      : isDelivered
                                      ? 'Entregado (Aún no leído)'
                                      : 'Enviado (Aún no leído)'
                                  }
                                >
                                  {isTrulyRead ? (
                                    <>
                                      <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                                      <span className="text-[9px] text-sky-400 font-semibold">Leído</span>
                                    </>
                                  ) : isDelivered ? (
                                    <>
                                      <CheckCheck className="w-3.5 h-3.5 text-slate-300/70" />
                                      <span className="text-[9px] text-slate-300/70">No leído</span>
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-slate-300/70" />
                                      <span className="text-[9px] text-slate-300/70">Enviado</span>
                                    </>
                                  )}
                                </span>
                              )}
                              <button
                                onClick={() => {
                                  setEditingMsgId(msg.id);
                                  setEditingMsgText(msg.text);
                                }}
                                className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 rounded hover:bg-black/30 text-emerald-300 transition-opacity"
                                title="Editar mensaje"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <MessageSquare className="w-12 h-12 text-emerald-500/40 mb-3" />
              <p className="text-sm font-semibold text-slate-200">
                Selecciona una conversación a la izquierda
              </p>
              <p className="text-xs text-slate-400 mt-1">
                O toca el botón "+" para enviar un mensaje a cualquier número.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Lightbox for Images / Videos */}
      {lightboxMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4"
          onClick={() => setLightboxMedia(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <a
              href={lightboxMedia.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Abrir / Guardar original
            </a>
            <button
              onClick={() => setLightboxMedia(null)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="max-w-5xl max-h-[82vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            {lightboxMedia.type === 'image' ? (
              <img
                src={lightboxMedia.url}
                alt="Vista completa"
                className="max-h-[78vh] max-w-full object-contain rounded-xl shadow-2xl"
              />
            ) : (
              <video
                src={lightboxMedia.url}
                controls
                autoPlay
                className="max-h-[78vh] max-w-full rounded-xl shadow-2xl"
              />
            )}
            {lightboxMedia.caption && (
              <p className="mt-3 text-sm text-slate-200 text-center max-w-2xl">
                {lightboxMedia.caption}
              </p>
            )}
          </div>
        </div>
      )}

      {/* PESTAÑITA FLOTANTE (MANTIENE WHATSAPP VISIBLE CUANDO TE MUEVES A OTRA PESTAÑA Y PERMITE MAXIMIZAR HASTA VOLVER) */}
      {!isActiveTab &&
        !floatingHiddenManual &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed bottom-4 right-4 z-[9990] flex flex-col items-end">
            {floatingMaximized ? (
              <div className="w-[94vw] sm:w-[430px] h-[560px] max-h-[84vh] bg-[#0b141a] text-slate-100 rounded-2xl border-2 border-emerald-500/60 shadow-[0_18px_50px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden animate-fade-in">
                {/* Floating Header */}
                <div className="px-3.5 py-2.5 bg-gradient-to-r from-[#111b21] via-[#17262e] to-[#111b21] border-b border-emerald-500/30 flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shrink-0 shadow">
                      <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-white truncate">
                        WhatsApp Flotante • {activeChat?.name || 'Chats'}
                      </div>
                      <div className="text-[10px] text-emerald-300 truncate">
                        Más nuevos arriba • Escribe arriba
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {onReturnToTab && (
                      <button
                        type="button"
                        onClick={onReturnToTab}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[11px] flex items-center gap-1 shadow"
                        title="Volver a la pestaña completa de WhatsApp"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Ir a App</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setFloatingMaximized(false)}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200"
                      title="Minimizar a pestañita flotante"
                    >
                      <Minimize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Quick Contact Selector Pill Bar */}
                {chats.length > 0 && (
                  <div className="px-2.5 py-1.5 bg-[#111b21] border-b border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                    {chats.slice(0, 10).map(ch => {
                      const isSel = activeChat?.id === ch.id;
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => {
                            setActiveChatId(ch.id);
                            loadSingleChatHistory(ch.id);
                          }}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors shrink-0 ${
                            isSel
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-[#202c33] text-slate-300 hover:bg-[#2a3942]'
                          }`}
                        >
                          {ch.name}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Top Composer + AI Buttons inside Floating Window */}
                <div className="p-2.5 bg-[#202c33] border-b border-white/10 space-y-2 shrink-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleAiAssist('improve')}
                      disabled={isAiProcessing}
                      className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 ${
                        aiWorkingMode === 'improve'
                          ? 'bg-purple-600/40 text-white border-purple-400 animate-pulse'
                          : aiSuccessMode === 'improve'
                          ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400'
                          : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      }`}
                    >
                      {aiWorkingMode === 'improve' ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Mejorando...</span>
                        </>
                      ) : aiSuccessMode === 'improve' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-300" />
                          <span>¡Texto mejorado!</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" />
                          <span>Mejorar con IA</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAiAssist('reply')}
                      disabled={isAiProcessing}
                      className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 ${
                        aiWorkingMode === 'reply'
                          ? 'bg-cyan-600/40 text-white border-cyan-400 animate-pulse'
                          : aiSuccessMode === 'reply'
                          ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400'
                          : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {aiWorkingMode === 'reply' ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Generando...</span>
                        </>
                      ) : aiSuccessMode === 'reply' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-300" />
                          <span>¡Respuesta lista!</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3" />
                          <span>Sugerir respuesta IA</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-end gap-1.5">
                    <textarea
                      value={composerText}
                      onChange={e => setComposerText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      rows={1}
                      placeholder="Escribe arriba tu mensaje..."
                      className="flex-1 px-3 py-2 rounded-xl bg-[#111b21] text-xs text-white placeholder-slate-400 border border-white/15 focus:border-emerald-500 focus:outline-none resize-none"
                    />
                    <button
                      type="button"
                      onClick={handleSendMessage}
                      disabled={isSending || !composerText.trim()}
                      className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-1 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar</span>
                    </button>
                  </div>
                </div>

                {/* Newest-First Messages List inside Floating Window */}
                <div
                  ref={floatingMessagesTopRef}
                  className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#0b141a]"
                >
                  {newestFirstMessages.map(msg => {
                    const isOutgoing = msg.direction === 'outgoing';
                    const isTrulyRead = msg.status === 'read' && Boolean(msg.statusVerified);
                    const isDelivered =
                      msg.status === 'delivered' || (msg.status === 'read' && !msg.statusVerified);
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[86%] rounded-xl px-3 py-1.5 text-xs shadow ${
                            isOutgoing
                              ? 'bg-[#005c4b] text-slate-100 rounded-tr-none'
                              : 'bg-[#202c33] text-slate-100 rounded-tl-none'
                          }`}
                        >
                          {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}
                          <div className="flex items-center justify-end gap-1 mt-0.5 text-[9px] text-slate-300/75">
                            <span>{msg.timestamp}</span>
                            {isOutgoing &&
                              (isTrulyRead ? (
                                <CheckCheck className="w-3 h-3 text-sky-400" />
                              ) : isDelivered ? (
                                <CheckCheck className="w-3 h-3 text-slate-300/70" />
                              ) : (
                                <Check className="w-3 h-3 text-slate-300/70" />
                              ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* PESTAÑITA FLOTANTE COMPACTA CON BOTÓN PARA MAXIMIZAR O DEVOLVERSE A LA APLICACIÓN */
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-[#111b21] via-[#16272f] to-[#111b21] border-2 border-emerald-500/60 shadow-[0_12px_35px_rgba(0,0,0,0.75)] text-white">
                <button
                  type="button"
                  onClick={() => setFloatingMaximized(true)}
                  className="flex items-center gap-2.5 text-left group"
                  title="Clic para maximizar la ventana flotante de WhatsApp"
                >
                  <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-md shrink-0">
                    <MessageSquare className="w-4 h-4 text-white" />
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-300 animate-ping" />
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="max-w-[180px] sm:max-w-[220px]">
                    <div className="text-xs font-extrabold text-emerald-300 truncate flex items-center gap-1">
                      <span>WhatsApp: {activeChat?.name || 'Activo'}</span>
                    </div>
                    <div className="text-[11px] text-slate-300 truncate">
                      {newestFirstMessages[0]?.text || 'Toca para maximizar chat'}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFloatingMaximized(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1 shadow"
                  title="Maximizar ventana flotante de WhatsApp"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Maximizar</span>
                </button>

                {onReturnToTab && (
                  <button
                    type="button"
                    onClick={onReturnToTab}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-300"
                    title="Devolverme a la pestaña completa de WhatsApp"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};

export default WhatsAppTab;
