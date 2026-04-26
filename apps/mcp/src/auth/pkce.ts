import { createHash, randomBytes } from 'node:crypto';

export function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url');
}

export function generateCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

export function verifyCodeChallenge(
  verifier: string,
  challenge: string,
  method: 'S256' | 'plain' = 'S256'
): boolean {
  if (method === 'S256') {
    const expected = createHash('sha256').update(verifier).digest('base64url');
    return expected === challenge;
  }
  return verifier === challenge;
}
