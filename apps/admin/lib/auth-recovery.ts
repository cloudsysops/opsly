export function buildRecoveryRedirectTo(origin: string): string {
  const base = origin.replace(/\/$/, '');
  return `${base}/login`;
}

function inviteAuthParams(url: URL): URLSearchParams | null {
  const hash = url.hash.replace(/^#/, '');
  if (!hash) {
    return null;
  }
  return new URLSearchParams(hash);
}

/** Supabase invite callbacks (query or hash), including token-based links. */
export function isInviteLink(url: URL): boolean {
  if (url.searchParams.get('type')?.toLowerCase() === 'invite') {
    return true;
  }

  const token =
    url.searchParams.get('token') ||
    url.searchParams.get('token_hash') ||
    url.searchParams.get('tokenHash');
  if (token && url.searchParams.get('email')) {
    return true;
  }

  const params = inviteAuthParams(url);
  if (!params) {
    return false;
  }

  if (params.get('type')?.toLowerCase() === 'invite') {
    return true;
  }

  const hashToken = params.get('token') || params.get('token_hash') || params.get('tokenHash');
  return Boolean(hashToken && params.get('email'));
}

export function inviteActivationPathFromUrl(url: URL, fallbackOrigin: string): string {
  const base = fallbackOrigin.replace(/\/$/, '');
  const params = inviteAuthParams(url);
  const token =
    url.searchParams.get('token') ||
    url.searchParams.get('token_hash') ||
    url.searchParams.get('tokenHash') ||
    params?.get('token') ||
    params?.get('token_hash') ||
    params?.get('tokenHash') ||
    '';
  const email = url.searchParams.get('email') || params?.get('email') || '';
  const tokenPart = token ? `/${encodeURIComponent(token)}` : '';
  const emailPart = email ? `?email=${encodeURIComponent(email)}` : '';
  return `${base}/invite${tokenPart}${emailPart}`;
}

function hashAuthParams(url: URL): URLSearchParams | null {
  const hash = url.hash.replace(/^#/, '');
  if (!hash) {
    return null;
  }
  return new URLSearchParams(hash);
}

/** Supabase password-reset callbacks (query or hash), including error hashes. */
export function isRecoveryLink(url: URL): boolean {
  if (url.searchParams.get('code')) {
    return true;
  }
  if (url.searchParams.get('type') === 'recovery') {
    return true;
  }
  const params = hashAuthParams(url);
  if (!params) {
    return false;
  }
  if (params.get('type') === 'recovery' || Boolean(params.get('access_token'))) {
    return true;
  }
  const errorCode = params.get('error_code') ?? '';
  if (params.get('error') && (errorCode.startsWith('otp') || errorCode === 'flow_state_expired')) {
    return true;
  }
  return false;
}
