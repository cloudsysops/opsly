import { NextRequest } from 'next/server';
import { timingSafeSecretsEqual } from './internal-auth';

export function getAdminSecret(): string | undefined {
  return process.env.DASHBOARD_ADMIN_SECRET;
}

export function validateAdminRequest(req: NextRequest): { valid: boolean; error?: string } {
  const adminSecret = getAdminSecret();
  if (!adminSecret) {
    return { valid: false, error: 'Admin authentication not configured' };
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (timingSafeSecretsEqual(token, adminSecret)) {
      return { valid: true };
    }
    return { valid: false, error: 'Invalid admin token' };
  }

  const cookieToken = req.cookies.get('admin-token')?.value;
  if (cookieToken && timingSafeSecretsEqual(cookieToken, adminSecret)) {
    return { valid: true };
  }

  return { valid: false, error: 'Missing authorization header' };
}
