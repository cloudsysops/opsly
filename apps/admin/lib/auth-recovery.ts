export function buildRecoveryRedirectTo(origin: string): string {
  const base = origin.replace(/\/$/, '')
  return `${base}/auth/recovery`
}

export function isRecoveryLink(url: URL): boolean {
  if (url.searchParams.get('code')) {
    return true
  }
  if (url.searchParams.get('type') === 'recovery') {
    return true
  }
  const hash = url.hash.replace(/^#/, '')
  if (!hash) {
    return false
  }
  const params = new URLSearchParams(hash)
  return params.get('type') === 'recovery' || Boolean(params.get('access_token'))
}
