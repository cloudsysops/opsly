export function safeCallbackUrl(value: string | null | undefined, fallback = '/admin'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;
  return value;
}
