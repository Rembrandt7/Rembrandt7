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

export function getFriendlyAiErrorMessage(error: any, isCustomKey = false): string {
  if (isQuotaError(error)) {
    if (isCustomKey) {
      return 'Límite de cuota excedido (429) en tu clave de API de Gemini. Las claves gratuitas de Google AI Studio están limitadas a 15 consultas por minuto. Por favor, espera unos segundos antes de intentar de nuevo.';
    }
    return 'Límite de cuota excedido (429) en la API de Gemini. La clave de API gratuita compartida ha superado el número de solicitudes permitidas por Google. Para solucionarlo y tener uso ilimitado, te recomendamos configurar tu propia API Key gratuita en la sección de Ajustes.';
  }
  return error?.message || String(error) || 'Ocurrió un error inesperado al procesar la solicitud con la IA.';
}
