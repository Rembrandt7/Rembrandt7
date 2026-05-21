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
  const [lastUpdatedText, setLastUpdatedText] = useState<string>('');

  const updateLastUpdatedText = () => {
    const lastFetched = localStorage.getItem('lastFetchedWeather');
    if (!lastFetched) {
      setLastUpdatedText('');
      return;
    }
    const diffMs = Date.now() - parseInt(lastFetched);
    const diffMins = Math.floor(diffMs / (60 * 1000));
    if (diffMins < 1) {
      setLastUpdatedText('Actualizado ahora');
    } else if (diffMins < 60) {
      setLastUpdatedText(`Actualizado hace ${diffMins} min`);
    } else {
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours >= 24) {
        setLastUpdatedText('Actualizado hace más de 1 día');
      } else {
        setLastUpdatedText(`Actualizado hace ${diffHours} hr${diffHours > 1 ? 's' : ''}`);
      }
    }
  };

  const mapWeatherCode = (code: number): { condition: string; weather: string } => {
    if (code === 0) return { condition: 'sun', weather: 'Despejado' };
    if (code === 1 || code === 2) return { condition: 'partially cloudy', weather: 'Medio nublado' };
    if (code === 3) return { condition: 'cloud', weather: 'Nublado' };
    if (code === 45 || code === 48) return { condition: 'cloud', weather: 'Niebla' };
    if (code >= 51 && code <= 57) return { condition: 'shower', weather: 'Llovizna' };
    if (code >= 61 && code <= 67) return { condition: 'rain', weather: 'Lluvia' };
    if (code >= 71 && code <= 77) return { condition: 'cloud', weather: 'Nieve' };
    if (code >= 80 && code <= 82) return { condition: 'shower', weather: 'Chubasco' };
    if (code >= 85 && code <= 86) return { condition: 'cloud', weather: 'Nevada' };
    if (code >= 95 && code <= 99) return { condition: 'rain', weather: 'Tormenta' };
    return { condition: 'partially cloudy', weather: 'Parcial' };
  };

  const getDayName = (dateStr: string, index: number) => {
    if (index === 0) return 'Hoy';
    const date = new Date(dateStr + 'T00:00:00');
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[date.getDay()];
  };

  const fetchData = async (force: boolean = false) => {
    const now = Date.now();
    const lastFetched = localStorage.getItem('lastFetchedWeather');
    const cooldown = 6 * 60 * 60 * 1000; // 6 hours
    
    if (!force && lastFetched && (now - parseInt(lastFetched) < cooldown) && weatherData.length > 0) {
      updateLastUpdatedText();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=25.6866&longitude=-100.3161&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto'
      );
      if (!response.ok) throw new Error('Error al conectar con el servicio meteorológico.');
      const data = await response.json();
      
      if (data && data.daily) {
        const formattedWeather = data.daily.time.slice(0, 7).map((timeStr: string, idx: number) => {
          const code = data.daily.weather_code[idx];
          const max = data.daily.temperature_2m_max[idx];
          const min = data.daily.temperature_2m_min[idx];
          const avg = Math.round((max + min) / 2);
          const mapped = mapWeatherCode(code);
          return {
            day: getDayName(timeStr, idx),
            weather: mapped.weather,
            temp: `${avg}°C`,
            condition: mapped.condition
          };
        });
        
        setWeatherData(formattedWeather);
        localStorage.setItem('weatherData', JSON.stringify(formattedWeather));
        localStorage.setItem('lastFetchedWeather', now.toString());
        setTimeout(() => updateLastUpdatedText(), 100);
      } else {
        throw new Error('Formato de datos incorrecto.');
      }
    } catch (err: any) {
      console.error('Error fetching weather:', err);
      setError("No se pudo obtener el clima más reciente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Actualizar el texto del indicador cada 30 segundos
    const timerId = setInterval(() => {
      updateLastUpdatedText();
    }, 30 * 1000);

    // Intentar actualizar el clima cada 5 minutos en segundo plano (cooldown interno de 6 horas)
    const backgroundFetchId = setInterval(() => {
      fetchData();
    }, 5 * 60 * 1000);

    // Comprobar actualización al enfocar la pestaña
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timerId);
      clearInterval(backgroundFetchId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div className="bg-zinc-900/50 rounded-2xl border border-white/10 p-4 shadow-xl">
      <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CloudSun size={20} className="text-amber-400" />
                Pronóstico Monterrey
              </h2>
              {lastUpdatedText && (
                <span className="text-[10px] text-zinc-400 font-medium ml-7 leading-none mt-0.5">
                  {lastUpdatedText}
                </span>
              )}
          </div>
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
