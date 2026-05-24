export function buildRecoveryRedirectTo(origin: string): string {
  const base = origin.replace(/\/$/, '')
  return `${base}/auth/recovery`
}

function hashAuthParams(url: URL): URLSearchParams | null {
  const hash = url.hash.replace(/^#/, '')
  if (!hash) {
    return null
  }
  return new URLSearchParams(hash)
}

/** Supabase password-reset callbacks (query or hash), including error hashes. */
export function isRecoveryLink(url: URL): boolean {
  if (url.searchParams.get('code')) {
    return true
  }
  if (url.searchParams.get('type') === 'recovery') {
    return true
  }
  const params = hashAuthParams(url)
  if (!params) {
    return false
  }
  if (params.get('type') === 'recovery' || Boolean(params.get('access_token'))) {
    return true
  }
  const errorCode = params.get('error_code') ?? ''
  if (
    params.get('error') &&
    (errorCode.startsWith('otp') || errorCode === 'flow_state_expired')
  ) {
    return true
  }
  return false
}
