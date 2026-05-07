import React, { useEffect, useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { RefreshCw, Sun, CloudSun, Cloud, CloudRain, CloudDrizzle, AlertTriangle } from 'lucide-react';
import { useLinks } from '../contexts/LinkContext';
import { cleanJsonResponse } from '../utils/jsonUtils';

const getWeatherCardColor = (condition: string) => {
  switch (condition.toLowerCase()) {
    case 'sun': return 'bg-yellow-400';
    case 'partially cloudy': return 'bg-yellow-100';
    case 'cloud': return 'bg-white';
    case 'rain': return 'bg-sky-300';
    case 'shower': return 'bg-sky-700';
    default: return 'bg-blue-400';
  }
};

const WeatherIcon = ({ condition }: { condition: string }) => {
  switch (condition.toLowerCase()) {
    case 'sun': return <Sun className="text-black" size={24} />;
    case 'partially cloudy': return <CloudSun className="text-black" size={24} />;
    case 'cloud': return <Cloud className="text-black" size={24} />;
    case 'rain': return <CloudRain className="text-white" size={24} />;
    case 'shower': return <CloudDrizzle className="text-white" size={24} />;
    default: return <CloudSun className="text-black" size={24} />;
  }
};

const WeatherForecast: React.FC = () => {
  const { googleApiConfig } = useLinks();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<any[]>(() => {
    const cached = localStorage.getItem('weatherData');
    return cached ? JSON.parse(cached) : [];
  });

  const fetchData = async (force: boolean = false) => {
    const now = Date.now();
    const lastFetched = localStorage.getItem('lastFetchedWeather');
    const cooldown = 86400000; // 24 hours
    
    if (!force && lastFetched && (now - parseInt(lastFetched) < cooldown) && weatherData.length > 0) return;

    setLoading(true);
    setError(null);
    try {
      const apiKey = googleApiConfig?.apiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
          setError("Configura la API Key para ver el clima.");
          setLoading(false);
          return;
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        baseUrl: `${window.location.origin}/api/proxy/google`
      });
      
      const weatherResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: "Dame el pronóstico del tiempo para Monterrey, Nuevo León, para los próximos 7 días (incluyendo hoy). Devuelve EXCLUSIVAMENTE UN ARRAY JSON: [{day: string, weather: string, temp: string, condition: 'sun' | 'partially cloudy' | 'cloud' | 'rain' | 'shower'}]. Asegúrate de incluir la temperatura promedio (ej. '25°C') en el campo 'temp'. No escribas texto adicional.",
          config: { tools: [{ googleSearch: {} }] }
      });

      if (weatherResponse.text) {
        try {
          const weather = JSON.parse(cleanJsonResponse(weatherResponse.text));
          if (weather.length > 0 && !weather[0].day.toLowerCase().includes('hoy')) {
              weather[0].day = 'Hoy';
          }
          setWeatherData(weather);
          localStorage.setItem('weatherData', JSON.stringify(weather));
          localStorage.setItem('lastFetchedWeather', now.toString());
        } catch (e) {
          console.error("Error parsing weather data:", e);
        }
      }
    } catch (error: any) {
      console.error('Error fetching weather:', error);
      setError("Error al actualizar clima.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (weatherData.length === 0) {
      fetchData();
    }
  }, []);

  return (
    <div className="bg-zinc-900/50 rounded-2xl border border-white/10 p-4 shadow-xl">
      <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CloudSun size={20} className="text-amber-400" />
            Pronóstico Monterrey
          </h2>
          <button onClick={() => fetchData(true)} disabled={loading} className="p-1.5 rounded-lg bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 transition-colors">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
      </div>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 mb-4 text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {weatherData.slice(0, 7).map((w, i) => {
              const isToday = w.day.toLowerCase().includes('hoy');
              return (
                  <div 
                      key={i} 
                      className={`
                          ${getWeatherCardColor(w.condition || 'sun')} 
                          p-2.5 rounded-xl border border-white/5 flex flex-col items-center text-center relative
                          ${isToday ? 'ring-2 ring-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.4)] z-10 scale-105' : ''}
                          transition-all duration-300
                      `}
                  >
                      <span className="font-bold text-black mb-1.5 text-[10px] uppercase tracking-wider">{w.day || 'Hoy'}</span>
                      <div className="flex flex-col items-center justify-center gap-1">
                          <WeatherIcon condition={w.condition || 'sun'} />
                          <span className="text-xl font-black text-black leading-none">{w.temp || '--°'}</span>
                      </div>
                      <span className="text-[9px] text-black/70 font-bold uppercase mt-1 line-clamp-1">{w.weather || 'N/A'}</span>
                  </div>
              );
          })}
      </div>
      <div className="flex justify-center">
        <a href="https://weather.com/es-MX/tiempo/hoy/l/c73fb09690eebac96043e45dcf3da6bf05d064c32d087ab3a4eff9989e59dd61" target="_blank" rel="noreferrer" className="mt-3 text-blue-300 hover:text-blue-200 underline text-[10px] transition-colors">Ver detalles</a>
      </div>
    </div>
  );
};

export default WeatherForecast;
