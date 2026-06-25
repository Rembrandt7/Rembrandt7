import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { BookOpen, RefreshCw, Mic, AlertTriangle } from 'lucide-react';
import { useLinks } from '../contexts/LinkContext';
import { decode, createWavBlob } from '../utils/audioUtils';
import { cleanJsonResponse } from '../utils/jsonUtils';

const getYouTubeThumbnail = (url: string, fallback: string) => {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com')) {
      const videoId = urlObj.searchParams.get('v');
      if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    } else if (urlObj.hostname.includes('youtu.be')) {
      const videoId = urlObj.pathname.slice(1);
      if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
  } catch (e) {
    // ignore
  }
  return fallback;
};

const AiTutorials: React.FC = () => {
  const { config, updateConfig, googleApiConfig } = useLinks();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  const speak = async (text: string, id: string) => {
    setPlaying(id);
    try {
        const apiKey = googleApiConfig?.apiKey || process.env.GEMINI_API_KEY || '';
        const ai = new GoogleGenAI({ 
            apiKey: googleApiConfig?.apiKey || process.env.GEMINI_API_KEY || '',
            baseUrl: `${window.location.origin}/api/proxy/google`
        });
        const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-preview-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        let base64Audio: string | undefined;
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                base64Audio = part.inlineData.data;
                break;
            }
        }
        
        if (base64Audio) {
            const pcmData = decode(base64Audio);
            const wavBlob = createWavBlob(pcmData, 24000, 1, 16);
            const audioUrl = URL.createObjectURL(wavBlob);
            const audio = new Audio(audioUrl);
            
            audio.onerror = (e) => {
                console.error("Audio playback error:", e);
                setPlaying(null);
                URL.revokeObjectURL(audioUrl);
            };
            audio.onended = () => {
                setPlaying(null);
                URL.revokeObjectURL(audioUrl);
            };
            audio.play().catch(e => {
                console.error("Play error:", e);
                setPlaying(null);
                URL.revokeObjectURL(audioUrl);
            });
        } else {
            console.error("No audio data found in response");
            setPlaying(null);
        }
    } catch (error) {
        console.error("TTS Error:", error);
        setPlaying(null);
    }
  };

  const fetchTutorials = async (force: boolean = false) => {
    const now = Date.now();
    const lastFetched = localStorage.getItem('lastFetchedTutorials');
    const lastError = localStorage.getItem('lastErrorTutorialsTime');
    
    // Cooldown: 24 hours (86400000 ms)
    const cooldown = 86400000;
    
    if (!force && lastFetched && (now - parseInt(lastFetched) < cooldown)) return;

    if (!force && lastError && (now - parseInt(lastError) < cooldown)) {
        setError("Límite de cuota excedido. Usando tutoriales cacheados.");
        return;
    }

    setLoading(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ 
        apiKey: googleApiConfig?.apiKey || process.env.GEMINI_API_KEY || '',
        baseUrl: `${window.location.origin}/api/proxy/google`
      });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-preview",
        contents: "Busca 4 videos tutoriales REALES y muy recientes en YouTube (en español mayormente) sobre inteligencia artificial, renders, arquitectura. Busca específicamente si el canal 'AleJavi' sacó algo nuevo, o novedades de Unreal Engine, AutoCAD y Photoshop. Es CRÍTICO que devuelvas enlaces reales que existan y que tengan una miniatura válida. NO incluyas videos que no tengan imagen de miniatura. Si un video no tiene miniatura, busca otro que sí la tenga. Devuelve EXCLUSIVAMENTE SÓLO UN JSON con un array de 4 objetos, cada uno con 'title', 'source' (nombre del canal), 'url' (enlace real de YouTube, ej: https://www.youtube.com/watch?v=...), 'audioSummary' (resumen de máximo 3 líneas) y 'thumbnail' (URL real de la miniatura de YouTube). Sin formatos adicionales ni bloques de sintaxis ocultos, SÓLO el JSON.",
        config: {
          tools: [{ googleSearch: {} }]
        },
      });
      
      if (response.text) {
        try {
          const tutorialsData = JSON.parse(cleanJsonResponse(response.text));
          const validTutorials = Array.isArray(tutorialsData) 
            ? tutorialsData.filter((item: any) => {
                if (!item.url || !item.url.startsWith('http')) return false;
                if (!item.thumbnail || !item.thumbnail.startsWith('http')) return false;
                try {
                  const urlObj = new URL(item.url);
                  return urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be');
                } catch (e) {
                  return false;
                }
              })
            : [];
          
          if (validTutorials.length > 0) {
            updateConfig({ ...config, aiTutorials: validTutorials });
            localStorage.setItem('aiTutorials', JSON.stringify(validTutorials));
            localStorage.setItem('lastFetchedTutorials', now.toString());
            localStorage.removeItem('lastErrorTutorialsTime'); // Clear error on success
            setError(null);
          }
        } catch (e) {
          console.error("Error parsing tutorials data:", e);
          throw e;
        }
      }
    } catch (error: any) {
      console.error("Error fetching tutorials:", error);
      if (error.status === 429) {
          setError("Límite de cuota de IA excedido.");
          localStorage.setItem('lastErrorTutorialsTime', now.toString());
      } else {
          setError("Error al cargar tutoriales.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cachedTutorials = localStorage.getItem('aiTutorials');
    if (cachedTutorials) {
        updateConfig({ ...config, aiTutorials: JSON.parse(cachedTutorials) });
    }
    
    if (!config.aiTutorials || config.aiTutorials.length === 0) {
      fetchTutorials();
    }
  }, []);

  return (
    <div className="p-4 space-y-4">
      {error && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-amber-200 text-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle size={14} className="shrink-0 text-amber-400" />
            <p>{error}</p>
          </div>
          {(error.toLowerCase().includes('cuota') || error.toLowerCase().includes('key') || error.toLowerCase().includes('configur')) && (
            <button 
                onClick={() => window.dispatchEvent(new Event('open-google-config'))}
                className="shrink-0 px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded font-black text-[10px] uppercase transition-colors cursor-pointer"
            >
                Configurar API
            </button>
          )}
        </div>
      )}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2 text-white">
          <BookOpen className="text-purple-400" /> Tutoriales IA
        </h2>
        <button 
          onClick={() => fetchTutorials(true)} 
          disabled={loading}
          className="p-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 transition-colors text-sm"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      <div className="flex flex-col gap-4">
        {config.aiTutorials?.filter(item => item.thumbnail || getYouTubeThumbnail(item.url, '')).slice(0, 4).map((item, index) => (
          <a 
            key={index} 
            href={item.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="group rounded-xl overflow-hidden border border-white/5 hover:border-purple-500/30 transition-all flex gap-4 bg-zinc-900 cursor-pointer"
          >
            <img 
                src={getYouTubeThumbnail(item.url, item.thumbnail)} 
                alt={item.title} 
                className="w-24 h-24 object-cover flex-shrink-0" 
                referrerPolicy="no-referrer" 
                onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.title)}&background=random`; }}
            />
            <div className="p-3 flex-grow">
              <h3 className="font-bold text-sm text-purple-200 line-clamp-1 mb-1 group-hover:text-purple-100">{item.title}</h3>
              <p className="text-xs text-white/60 line-clamp-2">{(item as any).source} - {(item as any).audioSummary}</p>
            </div>
            <div className='flex items-center p-2'>
                <button 
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        speak(((item as any).audioSummary || '').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.,]/g, ''), item.url);
                    }} 
                    className={`p-2 rounded-full ${playing === item.url ? 'bg-purple-500' : 'bg-purple-600/20'}`}
                >
                    <Mic size={16} className='text-white' />
                </button>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default AiTutorials;
