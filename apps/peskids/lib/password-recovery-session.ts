/** Query param set by SSR /auth/callback after a successful recovery code exchange. */
export const PASSWORD_RECOVERY_CALLBACK_PARAM = 'recovery';

/** sessionStorage flag: user completed recovery auth and may update password. */
export const PASSWORD_RECOVERY_STORAGE_KEY = 'peskids_password_recovery_active';

export function markPasswordRecoveryActive(): void {
  try {
    sessionStorage.setItem(PASSWORD_RECOVERY_STORAGE_KEY, '1');
  } catch {
    // sessionStorage unavailable (private mode, SSR)
  }
}

export function hasPasswordRecoveryActive(): boolean {
  try {
    return sessionStorage.getItem(PASSWORD_RECOVERY_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearPasswordRecoveryActive(): void {
  try {
    sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Append recovery intent to a relative path (e.g. /auth/recovery → /auth/recovery?recovery=1). */
export function appendRecoveryCallbackParam(path: string): string {
  const url = new URL(path, 'http://localhost');
  url.searchParams.set(PASSWORD_RECOVERY_CALLBACK_PARAM, '1');
  return `${url.pathname}${url.search}`;
}
