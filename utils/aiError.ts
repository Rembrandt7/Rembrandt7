/**
 * Utility to identify and format errors from the Gemini/Google Gen AI API.
 */

export function isQuotaError(error: any): boolean {
  if (!error) return false;
  const message = error.message || String(error);
  const status = error.status || error.statusCode;

  return (
    status === 429 ||
    message.includes('429') ||
    message.toLowerCase().includes('quota') ||
    message.toLowerCase().includes('limit') ||
    message.toLowerCase().includes('exhausted') ||
    message.toLowerCase().includes('resource_exhausted')
  );
}

export function isUnavailableError(error: any): boolean {
  if (!error) return false;
  const message = error.message || String(error);
  const status = error.status || error.statusCode;

  return (
    status === 503 ||
    message.includes('503') ||
    message.toLowerCase().includes('high demand') ||
    message.toLowerCase().includes('unavailable') ||
    message.toLowerCase().includes('overloaded')
  );
}

export function getFriendlyAiErrorMessage(error: any, isCustomKey = false): string {
  if (isQuotaError(error)) {
    if (isCustomKey) {
      return 'Límite de cuota excedido (429) en tu clave de API de Gemini. Las claves gratuitas de Google AI Studio están limitadas a 15 consultas por minuto. Por favor, espera unos segundos antes de intentar de nuevo.';
    }
    return 'Límite de cuota excedido (429) en la API de Gemini. La clave de API gratuita compartida ha superado el número de solicitudes permitidas por Google. Para solucionarlo y tener uso ilimitado, te recomendamos configurar tu propia API Key gratuita en la sección de Ajustes.';
  }

  if (isUnavailableError(error)) {
    return 'Los servidores de Google Gemini están experimentando un pico temporal de alta demanda (Error 503). Por favor, intenta de nuevo en un momento.';
  }

  const rawMsg = error?.message || String(error) || '';
  try {
    const trimmed = rawMsg.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsed = JSON.parse(trimmed);
      if (parsed.error?.code === 503 || parsed.error?.status === 'UNAVAILABLE' || (parsed.error?.message && parsed.error.message.includes('high demand'))) {
        return 'Los servidores de Google Gemini están experimentando un pico temporal de alta demanda (Error 503). Por favor, intenta de nuevo en un momento.';
      }
      if (parsed.error?.message) {
        return parsed.error.message;
      }
    }
  } catch {}

  return rawMsg || 'Ocurrió un error inesperado al procesar la solicitud con la IA.';
}
