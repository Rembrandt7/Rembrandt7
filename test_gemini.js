require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const aiResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Dame el pronóstico del tiempo para Monterrey, Nuevo León, para los próximos 7 días (incluyendo hoy). Devuelve un JSON: [{day: string, weather: string, temp: string, condition: 'sun' | 'partially cloudy' | 'cloud' | 'rain' | 'shower'}]. Asegúrate de incluir la temperatura promedio (ej. '25°C') en el campo 'temp'.",
        config: { 
            tools: [{ googleSearch: {} }], 
            responseMimeType: "application/json",
        }
    });
    console.log("Weather:", aiResponse.text);
  } catch(e) {
    console.error("Weather error:", e);
  }

  try {
    const tutResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Busca 4 videos tutoriales REALES y muy recientes en YouTube (en español mayormente) sobre inteligencia artificial, renders, arquitectura. Busca específicamente si el canal 'AleJavi' sacó algo nuevo, o novedades de Unreal Engine, AutoCAD y Photoshop. Es CRÍTICO que devuelvas enlaces reales que existan y que tengan una miniatura válida. NO incluyas videos que no tengan imagen de miniatura. Si un video no tiene miniatura, busca otro que sí la tenga. Devuelve un JSON con un array de 4 objetos, cada uno con 'title', 'source' (nombre del canal), 'url' (enlace real de YouTube, ej: https://www.youtube.com/watch?v=...), 'audioSummary' (resumen de máximo 3 líneas) y 'thumbnail' (URL real de la miniatura de YouTube).",
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
        },
      });
      console.log("Tutorials:", tutResponse.text);
  } catch(e) {
    console.error("Tutorials error:", e);
  }
}

test();
