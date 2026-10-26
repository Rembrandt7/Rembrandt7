import { GoogleGenAI, Type } from "@google/genai";
// Fix: Use QuoteDetails instead of the undefined QuoteFormData and import GeneratedQuote.
import type { QuoteDetails, GeneratedQuote } from '../types';

const getApiKey = (): string => {
  return (
    (typeof process !== 'undefined' && process.env?.API_KEY) ||
    (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
    ''
  );
};

let aiClient: GoogleGenAI | null = null;
const getAIClient = (): GoogleGenAI => {
  if (aiClient) return aiClient;
  const key = getApiKey();
  if (!key) {
    throw new Error("API_KEY environment variable not set. Configure GEMINI_API_KEY en su archivo .env");
  }
  aiClient = new GoogleGenAI({ apiKey: key });
  return aiClient;
};

const quoteSchema = {
  type: Type.OBJECT,
  properties: {
    projectName: { 
      type: Type.STRING,
      description: "The name of the project provided by the user."
    },
    priceRange: {
      type: Type.OBJECT,
      description: "An estimated price range for the project in USD.",
      properties: {
        min: { type: Type.NUMBER, description: "The minimum estimated price." },
        max: { type: Type.NUMBER, description: "The maximum estimated price." }
      },
      required: ['min', 'max']
    },
    timeline: {
      type: Type.OBJECT,
      description: "An estimated timeline for the project in weeks.",
      properties: {
        min: { type: Type.NUMBER, description: "The minimum estimated timeline in weeks." },
        max: { type: Type.NUMBER, description: "The maximum estimated timeline in weeks." }
      },
      required: ['min', 'max']
    },
    costBreakdown: {
      type: Type.ARRAY,
      description: "A detailed breakdown of costs for each feature or phase of the project.",
      items: {
        type: Type.OBJECT,
        properties: {
          feature: { type: Type.STRING, description: "The name of the feature or work item." },
          description: { type: Type.STRING, description: "A brief description of the work involved for this item." },
          cost: { type: Type.NUMBER, description: "The estimated cost for this specific item in USD." }
        },
        required: ['feature', 'description', 'cost']
      }
    },
    summary: { 
      type: Type.STRING,
      description: "A professional, encouraging summary of the project proposal. Explain the value and next steps."
    }
  },
  required: ['projectName', 'priceRange', 'timeline', 'costBreakdown', 'summary']
};


// Fix: Use QuoteDetails as the type for formData to match the rest of the application.
export const generateQuote = async (formData: QuoteDetails): Promise<GeneratedQuote> => {
  const prompt = `
    Based on the following project requirements, generate a detailed and professional project quote.
    The prices should be in USD and reflect current market rates for high-quality freelance or small agency work.
    
    Project Requirements:
    ${JSON.stringify(formData, null, 2)}
  `;

  try {
    const response = await getAIClient().models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert senior web development project manager. Your task is to provide a detailed and realistic project quote based on the user's requirements. The output must be a valid JSON object that adheres to the provided schema.",
        responseMimeType: "application/json",
        responseSchema: quoteSchema,
        temperature: 0.5,
      },
    });

    const jsonText = response.text.trim();
    const quoteData: GeneratedQuote = JSON.parse(jsonText);
    return quoteData;

  } catch (error) {
    console.error("Error generating quote:", error);
    throw new Error("Failed to generate quote. The AI model may be temporarily unavailable.");
  }
};