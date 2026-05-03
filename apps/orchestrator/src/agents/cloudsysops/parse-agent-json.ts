/**
 * Extrae un objeto JSON del texto del modelo (respuesta única JSON o bloque ```json).
 */

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```/im.exec(trimmed);
  if (fence?.[1]) {
    return JSON.parse(fence[1].trim()) as unknown;
  }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new Error('No JSON object found in model output');
  }
  return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
}
