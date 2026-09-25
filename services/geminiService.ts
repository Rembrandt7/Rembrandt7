import { GoogleGenAI } from '@google/genai';
import { getFriendlyAiErrorMessage, isQuotaError, isUnavailableError } from '../utils/aiError';

/**
 * Model constants for Gemini API
 */
export const GEMINI_MODELS = {
  PRIMARY: 'gemini-2.5-flash',
  FALLBACK: 'gemini-1.5-flash',
  PRO: 'gemini-2.5-pro',
  FLASH_LITE: 'gemini-2.0-flash-lite',
} as const;

export type GeminiModelName = string;

let cachedClient: { apiKey: string; client: GoogleGenAI } | null = null;

/**
 * Retrieves the resolved API Key from custom parameters, localStorage or environment variables.
 */
export function getResolvedApiKey(customApiKey?: string): string {
  if (customApiKey && customApiKey.trim()) {
    return customApiKey.trim();
  }

  // Check localStorage for GoogleApiConfig
  try {
    const storedConfig = localStorage.getItem('google_api_config');
    if (storedConfig) {
      const parsed = JSON.parse(storedConfig);
      if (parsed?.apiKey && parsed.apiKey.trim()) {
        return parsed.apiKey.trim();
      }
    }
  } catch (e) {
    // Ignore localStorage parse errors
  }

  // Fallback to process.env
  const envKey = (typeof process !== 'undefined' && process.env) 
    ? (process.env.GEMINI_API_KEY || process.env.API_KEY || (process.env as any).VITE_GEMINI_API_KEY)
    : '';

  return (envKey || '').trim();
}

/**
 * Returns a configured GoogleGenAI client singleton or a newly configured client for a custom key.
 * Always routes through the local NodeJS proxy (/api/proxy/google) to evade network and firewall restrictions.
 */
export function getGeminiClient(customApiKey?: string): GoogleGenAI {
  const apiKey = getResolvedApiKey(customApiKey);

  if (!apiKey) {
    throw new Error('API Key de Gemini no configurada. Por favor configúrala en Ajustes o Base de Datos.');
  }

  // Return cached client if the API key matches
  if (cachedClient && cachedClient.apiKey === apiKey) {
    return cachedClient.client;
  }

  const client = new GoogleGenAI({
    apiKey,
    baseUrl: `${window.location.origin}/api/proxy/google`,
  });

  cachedClient = { apiKey, client };
  return client;
}

export interface GeminiRequestOptions {
  apiKey?: string;
  fallbackModel?: string;
  retries?: number;
}

/**
 * Executes generateContent with automatic retry and model fallback on 503/429 errors.
 * Accepts either:
 *   generateContentWithFallback(params, options)
 *   or legacy: generateContentWithFallback(ai, params, options)
 */
export async function generateContentWithFallback(
  aiOrParams: any,
  paramsOrOptions?: any,
  maybeOptions?: GeminiRequestOptions
): Promise<any> {
  let ai: GoogleGenAI;
  let params: any;
  let options: GeminiRequestOptions | undefined;

  if (aiOrParams && typeof aiOrParams.models?.generateContent === 'function') {
    // Legacy call: generateContentWithFallback(ai, params, options)
    ai = aiOrParams;
    params = paramsOrOptions;
    options = maybeOptions;
  } else {
    // Standard call: generateContentWithFallback(params, options)
    params = aiOrParams;
    options = paramsOrOptions;
    ai = getGeminiClient(options?.apiKey);
  }

  const primaryModel = params?.model || GEMINI_MODELS.PRIMARY;
  const fallbackModel = options?.fallbackModel || GEMINI_MODELS.FALLBACK;
  const maxRetries = options?.retries ?? 2;

  let attempt = 0;
  let currentModel = primaryModel;

  while (attempt <= maxRetries) {
    try {
      const response = await ai.models.generateContent({
        ...params,
        model: currentModel,
      });
      return response;
    } catch (err: any) {
      attempt++;
      console.warn(`[GeminiService] Attempt ${attempt} failed with model ${currentModel}:`, err.message || err);

      const isUnavailable = isUnavailableError(err);
      const isQuota = isQuotaError(err);

      // If primary model failed due to high demand or quota and we haven't tried fallback yet
      if ((isUnavailable || isQuota) && currentModel !== fallbackModel) {
        console.warn(`[GeminiService] Switching to fallback model: ${fallbackModel}`);
        currentModel = fallbackModel;
        continue;
      }

      // If we still have retries left for transient errors, wait with exponential backoff
      if (attempt <= maxRetries && isUnavailable) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[GeminiService] Retrying in ${delay}ms...`);
        await new Promise(res => setTimeout(res, delay));
        continue;
      }

      // No more retries or non-recoverable error
      const friendlyMessage = getFriendlyAiErrorMessage(err, !!options?.apiKey);
      const enhancedError = new Error(friendlyMessage);
      (enhancedError as any).originalError = err;
      throw enhancedError;
    }
  }
}

/**
 * Streams content in real-time chunk by chunk, executing onChunk callback as text arrives.
 * Returns the complete generated text when finished.
 */
export async function streamContent(
  params: any,
  onChunk: (chunkText: string, accumulatedText: string) => void,
  options?: GeminiRequestOptions
): Promise<string> {
  const apiKey = options?.apiKey;
  const ai = getGeminiClient(apiKey);
  const primaryModel = params.model || GEMINI_MODELS.PRIMARY;
  const fallbackModel = options?.fallbackModel || GEMINI_MODELS.FALLBACK;

  let currentModel = primaryModel;
  let accumulatedText = '';

  const tryStream = async (model: string) => {
    accumulatedText = '';
    const responseStream = await ai.models.generateContentStream({
      ...params,
      model,
    });

    for await (const chunk of responseStream) {
      const text = chunk.text || '';
      if (text) {
        accumulatedText += text;
        onChunk(text, accumulatedText);
      }
    }
    return accumulatedText;
  };

  try {
    return await tryStream(currentModel);
  } catch (err: any) {
    console.warn(`[GeminiService] Streaming with ${currentModel} failed:`, err.message || err);

    if ((isUnavailableError(err) || isQuotaError(err)) && currentModel !== fallbackModel) {
      console.warn(`[GeminiService] Falling back streaming to ${fallbackModel}`);
      try {
        return await tryStream(fallbackModel);
      } catch (fallbackErr: any) {
        const friendlyMessage = getFriendlyAiErrorMessage(fallbackErr, !!apiKey);
        throw new Error(friendlyMessage);
      }
    }

    const friendlyMessage = getFriendlyAiErrorMessage(err, !!apiKey);
    throw new Error(friendlyMessage);
  }
}
