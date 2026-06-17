'use client';

import { useEffect } from 'react';
import { inviteActivationPathFromUrl, isInviteLink, isRecoveryLink } from '@/lib/auth-recovery';
import { recoveryForwardPathFromUrl } from '@/lib/runtime/tenant-auth-routing';
import {
  isLoginSurfacePath,
  isRecoverySurfacePath,
} from '@/lib/runtime/tenant-auth-surface';

const PESKIDS_AUTH_SURFACE = {
  entryPaths: ['/', '/admin/login'],
  loginPaths: ['/admin/login'],
  invitePath: '/invite',
  recoveryPath: '/auth/recovery',
  updatePasswordPaths: ['/admin/update-password'],
  authPrefixes: ['/admin/login/'],
} as const;

/**
 * Recovery links that hit the public landing or admin login are forwarded to the server
 * auth callback (PKCE `code`) or /auth/recovery (hash-only legacy links).
 */
export function AuthSessionRedirect(): null {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const url = new URL(window.location.href);
    if (!isLoginSurfacePath(url.pathname, PESKIDS_AUTH_SURFACE)) {
      return;
    }
    if (isRecoverySurfacePath(url.pathname, PESKIDS_AUTH_SURFACE)) {
      return;
    }

    if (isInviteLink(url)) {
      window.location.replace(inviteActivationPathFromUrl(url, window.location.origin));
      return;
    }

    if (!isRecoveryLink(url)) {
      return;
    }

    window.location.replace(
      recoveryForwardPathFromUrl(url, { next: '/admin/update-password' })
    );
  }, []);

  return null;
}
