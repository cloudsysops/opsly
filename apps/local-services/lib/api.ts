function inferApiBase(hostname: string): string | null {
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://127.0.0.1:3000';
  }
  return null;
}

export function getApiBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (base && base.length > 0) {
    return base.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    const inferred = inferApiBase(window.location.hostname);
    if (inferred !== null) {
      return inferred;
    }
  }
  return 'https://api.ops.smiletripcare.com';
}
