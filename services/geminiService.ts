import { GoogleGenAI } from '@google/genai';
import { getFriendlyAiErrorMessage, isQuotaError, isUnavailableError } from '../utils/aiError';

/**
 * Model constants for Gemini API
 */
export const GEMINI_MODELS = {
  PRIMARY: 'gemini-2.5-flash',
  FALLBACK: 'gemini-3.5-flash-lite',
  PRO: 'gemini-2.5-pro',
  FLASH_LITE: 'gemini-3.5-flash-lite',
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

  // Check localStorage for GoogleApiConfig (support both camelCase and snake_case keys)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const storedConfig = localStorage.getItem('googleApiConfig') || localStorage.getItem('google_api_config');
      if (storedConfig) {
        const parsed = JSON.parse(storedConfig);
        if (parsed?.apiKey && parsed.apiKey.trim()) {
          return parsed.apiKey.trim();
        }
      }
    } catch (e) {
      // Ignore localStorage parse errors
    }
  }

  // Fallback to process.env (Vite replaces these exact tokens at build/dev time)
  const envKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  return (envKey || '').trim();
}

/**
 * Returns a configured GoogleGenAI client singleton or a newly configured client for a custom key.
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

  // Connect directly from browser to Google Generative Language API
  const client = new GoogleGenAI({
    apiKey,
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
 * Executes generateContent with automatic retry and model fallback cascade on 503/429 errors.
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
  const customFallback = options?.fallbackModel;
  // Multi-model resilience order
  const modelCascade: string[] = [primaryModel];
  if (customFallback && !modelCascade.includes(customFallback)) {
    modelCascade.push(customFallback);
  }
  if (!modelCascade.includes(GEMINI_MODELS.FALLBACK)) {
    modelCascade.push(GEMINI_MODELS.FALLBACK);
  }
  if (!modelCascade.includes(GEMINI_MODELS.PRO)) {
    modelCascade.push(GEMINI_MODELS.PRO);
  }

  let modelIdx = 0;
  let lastError: any = null;

  while (modelIdx < modelCascade.length) {
    const currentModel = modelCascade[modelIdx];
    try {
      const response = await ai.models.generateContent({
        ...params,
        model: currentModel,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      console.warn(`[GeminiService] Call failed with model ${currentModel}:`, err?.message || err);

      const isUnavailable = isUnavailableError(err);
      const isQuota = isQuotaError(err);

      // If error is 503, 429, or 404 (model not found), advance to next model in cascade
      if (isUnavailable || isQuota || err?.status === 404 || String(err).includes('404')) {
        modelIdx++;
        if (modelIdx < modelCascade.length) {
          console.warn(`[GeminiService] Switching to cascade model: ${modelCascade[modelIdx]}`);
          // Small backoff before next model attempt
          await new Promise(res => setTimeout(res, 500));
          continue;
        }
      }

      // If user had a custom API key that hit quota, attempt once with the default system key if available
      const defaultEnvKey = (process.env.GEMINI_API_KEY || '').trim();
      if (isQuota && options?.apiKey && defaultEnvKey && options.apiKey !== defaultEnvKey) {
        try {
          console.warn('[GeminiService] Custom key hit quota. Falling back to default system key...');
          const fallbackAi = new GoogleGenAI({ apiKey: defaultEnvKey });
          const response = await fallbackAi.models.generateContent({
            ...params,
            model: primaryModel,
          });
          return response;
        } catch (fbErr) {
          console.warn('[GeminiService] Default key fallback also failed:', fbErr);
        }
      }

      break;
    }
  }

  const friendlyMessage = getFriendlyAiErrorMessage(lastError, !!options?.apiKey);
  const enhancedError = new Error(friendlyMessage);
  (enhancedError as any).originalError = lastError;
  (enhancedError as any).status = lastError?.status || lastError?.statusCode;
  throw enhancedError;
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
