import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function testWeather() {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const weatherResponse = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite", // Testing other model
            contents: "Dame el pronóstico del tiempo para Monterrey, Nuevo León, para los próximos 7 días (incluyendo hoy). Devuelve EXCLUSIVAMENTE UN ARRAY JSON: [{day: string, weather: string, temp: string, condition: 'sun' | 'partially cloudy' | 'cloud' | 'rain' | 'shower'}]. Asegúrate de incluir la temperatura promedio (ej. '25°C') en el campo 'temp'. No escribas texto adicional.",
            config: { tools: [{ googleSearch: {} }] }
        });
        console.log("Response text:", weatherResponse.text);
    } catch (e) {
        console.error("Error:", e);
    }
}

testWeather();
