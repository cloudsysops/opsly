/** Map dev bind address 0.0.0.0 to localhost for redirects and Supabase allowlists. */
export function normalizeRequestOrigin(origin: string): string {
  try {
    const url = new URL(origin);
    if (url.hostname === '0.0.0.0') {
      url.hostname = 'localhost';
      return url.origin;
    }
    return url.origin;
  } catch {
    return origin;
  }
}
