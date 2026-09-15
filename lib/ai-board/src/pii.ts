/** Keys that must never appear on AI Board signal or job payloads. */
export const FORBIDDEN_PII_KEYS = [
  'name',
  'full_name',
  'parent_name',
  'child_name',
  'student_name',
  'email',
  'parent_email',
  'phone',
  'whatsapp',
  'body',
  'suggestion',
  'notes',
  'message',
  'draft',
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function findForbiddenPiiKeys(value: unknown, prefix = ''): string[] {
  if (!isPlainObject(value)) {
    return [];
  }
  const hits: string[] = [];
  for (const [key, nested] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const normalized = key.toLowerCase();
    if ((FORBIDDEN_PII_KEYS as readonly string[]).includes(normalized)) {
      hits.push(path);
    }
    hits.push(...findForbiddenPiiKeys(nested, path));
  }
  return hits;
}

export function payloadContainsPii(value: unknown): boolean {
  return findForbiddenPiiKeys(value).length > 0;
}

export function stripForbiddenPii(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stripForbiddenPii(item));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    if ((FORBIDDEN_PII_KEYS as readonly string[]).includes(key.toLowerCase())) {
      continue;
    }
    out[key] = stripForbiddenPii(nested);
  }
  return out;
}
