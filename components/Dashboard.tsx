import React, { useEffect, useState } from 'react';
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Bell, RefreshCw, BookOpen, CloudSun, Sun, Cloud, CloudRain, CloudDrizzle, Mic, AlertTriangle, TrendingUp, Trash2, Mail } from 'lucide-react';
import { useLinks } from '../contexts/LinkContext';
import AiTutorials from './AiTutorials';
import { decode, createWavBlob } from '../utils/audioUtils';
import { cleanJsonResponse } from '../utils/jsonUtils';


const Dashboard: React.FC = () => {
  const { config, updateConfig, saveToSupabase, googleApiConfig } = useLinks();
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
        }
    } catch (error) {
        console.error("TTS Error:", error);
        setPlaying(null);
    }
  };

  const fetchData = async (force: boolean = false) => {
    const now = Date.now();
    const lastFetched = localStorage.getItem('lastFetchedData');
    const lastError = localStorage.getItem('lastErrorTime');
    
    // Cooldown: 24 hours (86400000 ms)
    const cooldown = 86400000;
    
    if (!force && lastFetched && (now - parseInt(lastFetched) < cooldown)) return;
    
    if (!force && lastError && (now - parseInt(lastError) < cooldown)) {
        setError("Límite de cuota excedido. Usando datos cacheados. Reintentando en unas horas.");
        return;
    }

    setLoading(true);
    setError(null);
    try {
      const apiKey = googleApiConfig?.apiKey || process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
          setError("No se ha configurado la API Key de Gemini. Haz clic en el icono de engrane > APIs para configurarla.");
          setLoading(false);
          return;
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        baseUrl: `${window.location.origin}/api/proxy/google`
      });
      
      const mtyQuery = encodeURIComponent('"Monterrey" OR "Nuevo León"');
      const finQuery = encodeURIComponent('finanzas OR economía OR negocios México');
      
      const [mtyNewsData, finNewsData] = await Promise.all([
        fetch(`https://gnews.io/api/v4/search?q=${mtyQuery}&lang=es&country=mx&max=10&token=a4830994e2cabc9a042ef52cbbcb25ee`)
            .then(res => res.ok ? res.json() : Promise.reject(res))
            .catch(() => null),
        fetch(`https://gnews.io/api/v4/search?q=${finQuery}&lang=es&country=mx&max=10&token=a4830994e2cabc9a042ef52cbbcb25ee`)
            .then(res => res.ok ? res.json() : Promise.reject(res))
            .catch(() => null)
      ]);

      const processArticles = (articles: any[]) => {
        if (!articles) return [];
        return articles.map((article: any) => ({
          title: article.title,
          source: article.source?.name || 'GNews',
          url: article.url,
          audioSummary: article.description,
          thumbnail: article.image
        }));
      };

      const mtyNews = processArticles(mtyNewsData?.articles);
      const finNews = processArticles(finNewsData?.articles);

      // If GNews failed, fallback to Gemini for MTY news at least
      let finalMtyNews = mtyNews;
      if (mtyNews.length === 0) {
        try {
          const newsResponse = await ai.models.generateContent({
              model: "gemini-3.1-flash-preview",
              contents: "Busca 4 noticias REALES y recientes de Monterrey, NL. Devuelve EXCLUSIVAMENTE un JSON array plano con title, source, url, audioSummary, thumbnail.",
              config: { tools: [{ googleSearch: {} }] },
          });
          if (newsResponse.text) {
            const fallback = JSON.parse(cleanJsonResponse(newsResponse.text));
            finalMtyNews = fallback.map((n: any) => ({ ...n, thumbnail: n.thumbnail || '' }));
          }
        } catch (e) {
          console.error("Error fetching fallback news:", e);
        }
      }

      updateConfig({ 
        ...config, 
        news: finalMtyNews,
        finanzasNews: finNews 
      });

      localStorage.setItem('lastFetchedData', now.toString());
      localStorage.removeItem('lastErrorTime');
      setError(null);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError("Error al actualizar datos.");
    } finally {
      setLoading(false);
    }
  };

  const [newsTab, setNewsTab] = useState<'mty' | 'fin' | 'grok'>('grok');
  const [grokLoading, setGrokLoading] = useState(false);
  const [grokEmailData, setGrokEmailData] = useState<any>(null);

  const fetchGrokEmail = async (force = false) => {
    if (!config.googleCalendarTokens) return;
    
    const lastFetched = localStorage.getItem('lastGrokFetchDate');
    const today = new Date().toISOString().split('T')[0];
    
    if (!force && lastFetched === today && config.grokEmail && grokEmailData) {
      return; // Already fetched today
    }

    setGrokLoading(true);
    try {
      const response = await fetch('/api/gmail/grok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens: config.googleCalendarTokens })
      });
      
      if (response.status === 401) {
        const updatedConfig = { ...config, googleCalendarTokens: null };
        updateConfig(updatedConfig);
        saveToSupabase(updatedConfig);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.htmlContent || data.content) {
        setGrokEmailData(data);
        updateConfig({ ...config, grokEmail: data.htmlContent || data.content });
        localStorage.setItem('lastGrokFetchDate', today);
      } else {
        setGrokEmailData(null);
        updateConfig({ ...config, grokEmail: null });
        localStorage.setItem('lastGrokFetchDate', today);
      }
    } catch (error) {
      console.error("Error fetching Grok email:", error);
    } finally {
      setGrokLoading(false);
    }
  };

  const deleteGrokEmail = async () => {
    if (!grokEmailData?.id || !config.googleCalendarTokens) return;
    
    if (!confirm('¿Estás seguro de que quieres eliminar este correo de tu Gmail?')) return;

    setGrokLoading(true);
    try {
      const response = await fetch('/api/gmail/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tokens: config.googleCalendarTokens,
          messageId: grokEmailData.id
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        // Clear current and refetch
        updateConfig({ ...config, grokEmail: null });
        setGrokEmailData(null);
        localStorage.removeItem('lastGrokFetchDate');
        await fetchGrokEmail(true);
      }
    } catch (error) {
      console.error("Error deleting Grok email:", error);
    } finally {
      setGrokLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if data is missing, but respect cooldown
    if (!config.news || config.news.length === 0) {
        fetchData();
    }
    if (!config.grokEmail) {
        fetchGrokEmail();
    }
  }, []);

  useEffect(() => {
    if (config.googleCalendarTokens) {
      fetchGrokEmail();
    }
  }, [config.googleCalendarTokens]);

  return (
    <div className="p-6 h-full overflow-y-auto space-y-8">
      {error && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-amber-200 text-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="shrink-0 text-amber-400" />
            <p>{error}</p>
          </div>
          {(error.toLowerCase().includes('cuota') || error.toLowerCase().includes('key') || error.toLowerCase().includes('configur')) && (
            <button 
                onClick={() => window.dispatchEvent(new Event('open-google-config'))}
                className="shrink-0 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded font-black text-xs uppercase transition-colors cursor-pointer"
            >
                Configurar API
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-zinc-900/50 rounded-2xl border border-white/10 p-4">
          <AiTutorials />
        </div>
        <div className="bg-zinc-900/50 rounded-2xl border border-white/10 p-4 space-y-4 flex flex-col h-full">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setNewsTab('mty')}
                className={`text-xl font-bold flex items-center gap-2 transition-colors ${newsTab === 'mty' ? 'text-amber-400' : 'text-white/40 hover:text-white/60'}`}
              >
                <Bell size={20} /> Monterrey
              </button>
              <button 
                onClick={() => setNewsTab('fin')}
                className={`text-xl font-bold flex items-center gap-2 transition-colors ${newsTab === 'fin' ? 'text-amber-400' : 'text-white/40 hover:text-white/60'}`}
              >
                <TrendingUp size={20} /> Finanzas
              </button>
              <button 
                onClick={() => setNewsTab('grok')}
                className={`text-xl font-bold flex items-center gap-2 transition-colors ${newsTab === 'grok' ? 'text-amber-400' : 'text-white/40 hover:text-white/60'}`}
              >
                <BookOpen size={20} /> Grok
              </button>
            </div>
            <div className="flex items-center gap-2">
              {newsTab === 'grok' && (
                <>
                  <button 
                    onClick={deleteGrokEmail}
                    disabled={grokLoading || !grokEmailData}
                    className="p-2 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-400 transition-colors text-sm"
                    title="Eliminar correo"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button 
                    onClick={() => fetchGrokEmail(true)} 
                    disabled={grokLoading}
                    className="p-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 transition-colors text-sm"
                    title="Actualizar Grok"
                  >
                    <RefreshCw size={16} className={grokLoading ? 'animate-spin' : ''} />
                  </button>
                </>
              )}
              <button 
                onClick={() => fetchData(true)} 
                disabled={loading}
                className="p-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 transition-colors text-sm"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          <div className={`flex flex-col gap-4 ${newsTab === 'grok' ? '' : 'max-h-[500px]'} overflow-y-auto pr-2 custom-scrollbar`}>
            {newsTab === 'grok' ? (
              <div className="bg-zinc-800/50 rounded-xl border border-amber-500/20 p-4 text-amber-100 text-sm overflow-hidden flex flex-col gap-4">
                {grokLoading ? (
                  <div className="flex items-center justify-center py-8 text-amber-500/50">
                    <RefreshCw className="animate-spin" size={24} />
                  </div>
                ) : grokEmailData ? (
                  <>
                    <div className="border-b border-white/10 pb-3 mb-1">
                      <div className="flex items-center gap-2 text-amber-400 font-bold mb-1">
                        <Mail size={16} />
                        <span className="truncate">{grokEmailData.subject}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-white/40 uppercase tracking-tighter">
                        <span>De: {grokEmailData.from}</span>
                        <span>{grokEmailData.date}</span>
                      </div>
                      {grokEmailData.isFallback && !grokEmailData.from.toLowerCase().includes('x.ai') && (
                        <div className="mt-2 text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded inline-block border border-amber-500/20">
                          Mostrando último correo recibido (Grok no encontrado)
                        </div>
                      )}
                    </div>
                    <div 
                      className="grok-email-content prose prose-invert prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: grokEmailData.htmlContent || grokEmailData.content }} 
                    />
                  </>
                ) : config.grokEmail ? (
                   <div 
                    className="grok-email-content prose prose-invert prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: config.grokEmail }} 
                  />
                ) : (
                  <div className="text-center py-8 text-white/50">
                    No hay correos disponibles.
                  </div>
                )}
              </div>
            ) : (
              ((newsTab === 'mty' ? config.news : config.finanzasNews) || []).slice(0, 10).map((item: any, index: number) => (
                <a 
                  key={index} 
                  href={item.url || '#'} 
                  target="_blank" 
                  rel="noreferrer"
                  className="bg-zinc-800/50 rounded-xl border border-amber-500/20 p-3 flex gap-4 hover:border-amber-500/50 transition-all cursor-pointer group"
                >
                  <div className="relative w-32 h-20 shrink-0">
                    <img 
                      src={item.thumbnail || ''} 
                      alt={item.title || 'Noticia'} 
                      className="w-full h-full object-cover rounded-lg" 
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.title || 'N')}&background=random`; }} 
                      referrerPolicy="no-referrer" 
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                      <button 
                          onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              speak((item.audioSummary || '').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.,]/g, ''), item.url || '');
                          }} 
                          className={`p-2 rounded-full ${playing === item.url ? 'bg-amber-500' : 'bg-amber-600/80 hover:bg-amber-500'} transition-colors`}
                      >
                          <Mic size={18} className='text-white' />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col flex-grow justify-center">
                    <h3 className="font-bold text-sm text-amber-100 line-clamp-2 mb-1">{item.title || 'Sin título'}</h3>
                    <p className="text-xs text-white/60 line-clamp-2">{item.source || 'N/A'} - {item.audioSummary || ''}</p>
                  </div>
                </a>
              ))
            )}
            {newsTab !== 'grok' && ((newsTab === 'mty' ? config.news : config.finanzasNews) || []).length === 0 && !loading && (
              <div className="text-center py-8 text-white/50 text-sm">
                No hay noticias disponibles en esta categoría.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
