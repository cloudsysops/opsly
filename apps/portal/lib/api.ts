function inferApiBaseFromPortalHost(hostname: string): string | null {
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://127.0.0.1:3000';
  }
  if (hostname.startsWith('portal.')) {
    return `https://api.${hostname.slice('portal.'.length)}`;
  }
  return null;
}

export function getApiBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (base && base.length > 0) {
    return base.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    const inferred = inferApiBaseFromPortalHost(window.location.hostname);
    if (inferred !== null) {
      return inferred;
    }
  }
  // Fallback for build or missing env - use default staging
  return 'https://api.ops.smiletripcare.com';
}
