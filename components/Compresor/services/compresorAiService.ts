import { generateContentWithFallback, GEMINI_MODELS } from '../../../services/geminiService';

export const refineGlobalTitle = async (currentTitle: string): Promise<string> => {
  if (!currentTitle.trim()) return currentTitle;

  try {
    const response = await generateContentWithFallback({
      model: GEMINI_MODELS.PRIMARY,
      contents: {
        parts: [{
          text: `Corrige la ortografía y aplica formato "Title Case" (La Primera Letra De Cada Palabra En Mayúscula) al siguiente texto. 
          Ejemplo entrada: "render casa playa" -> Salida: "Render Casa Playa".
          Texto a corregir: "${currentTitle}".
          Solo devuelve el texto corregido, sin comillas ni explicaciones.`
        }]
      }
    });
    return response.text?.trim() || currentTitle;
  } catch (error) {
    console.error("Error refining title:", error);
    return currentTitle;
  }
};

export const generateSmartFileName = async (file: File, contextText: string = ""): Promise<string> => {
  // Convert file to base64
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  try {
    const prompt = `
      Actúa como un experto en visualización arquitectónica e inmobiliaria.
      Analiza esta imagen y genera una descripción muy breve para el nombre del archivo (máximo 5-6 palabras).
      
      Reglas:
      1. Identifica la perspectiva: (Vista Principal, Lateral, Aérea, Trasera, Ojo de pez, etc).
      2. Identifica el espacio: (Fachada, Sala, Comedor, Cocina, Recámara, Baño, Patio, Terraza, etc).
      3. Si el usuario proveyó este texto de contexto: "${contextText}", ÚSALO como base, mejóralo y añade los detalles visuales que falten. Si el contexto está vacío, genera uno desde cero.
      4. Formato de salida: minúsculas, separado por guiones medios (kebab-case). Sin acentos ni caracteres especiales (usa n en vez de ñ).
      5. Ejemplo: fachada-principal-moderna, recamara-vista-aerea, cocina-isla-central.
      
      Solo devuelve el nombre generado.
    `;

    const response = await generateContentWithFallback({
      model: GEMINI_MODELS.PRIMARY,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: file.type,
              data: base64Data
            }
          },
          { text: prompt }
        ]
      }
    });

    const text = response.text?.trim();
    if (!text) return "archivo-sin-nombre";
    
    // Clean up
    return text.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase();

  } catch (error) {
    console.error("Error generating name:", error);
    throw error;
  }
};
