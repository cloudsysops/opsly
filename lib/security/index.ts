import crypto from 'crypto';

export interface User {
  id: string;
  tenantId: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
}

export interface JWTPayload {
  userId: string;
  tenantId: string;
  role: string;
  iat: number;
  exp: number;
}

export function generateToken(user: User, expiresIn = 3600): string {
  // Simplified - use jsonwebtoken in production
  const payload: JWTPayload = {
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresIn,
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export function encryptSecret(secret: string): string {
  // In production, use actual encryption (libsodium, etc)
  return Buffer.from(secret).toString('base64');
}

export function redactPII(text: string): string {
  return text
    .replace(/[\w\.-]+@[\w\.-]+\.\w+/g, '[EMAIL]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
    .replace(/\b\d{16}\b/g, '[CARD]');
}
