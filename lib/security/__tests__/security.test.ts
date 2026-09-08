import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateToken,
  verifyToken,
  encryptSecret,
  decryptSecret,
  redactPII,
} from '../index';

const TEST_JWT_SECRET = 'a]'.padEnd(32, 'x');
const TEST_ENCRYPTION_SECRET = 'b'.repeat(32);

describe('JWT generateToken / verifyToken', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;
  });
  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('generates a valid JWT and verifies it', () => {
    const user = { id: 'u1', tenantId: 't1', email: 'a@b.com', role: 'admin' as const };
    const token = generateToken(user, 3600);

    expect(token.split('.')).toHaveLength(3);

    const payload = verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.userId).toBe('u1');
    expect(payload!.tenantId).toBe('t1');
    expect(payload!.role).toBe('admin');
  });

  it('rejects tampered tokens', () => {
    const user = { id: 'u1', tenantId: 't1', email: 'a@b.com', role: 'user' as const };
    const token = generateToken(user);
    const tampered = token.slice(0, -2) + 'xx';
    expect(verifyToken(tampered)).toBeNull();
  });

  it('rejects expired tokens', () => {
    const user = { id: 'u1', tenantId: 't1', email: 'a@b.com', role: 'user' as const };
    const token = generateToken(user, -1);
    expect(verifyToken(token)).toBeNull();
  });

  it('rejects malformed tokens', () => {
    expect(verifyToken('not.a.jwt.token')).toBeNull();
    expect(verifyToken('')).toBeNull();
    expect(verifyToken('onlyonepart')).toBeNull();
  });
});

describe('encryptSecret / decryptSecret', () => {
  beforeEach(() => {
    process.env.ENCRYPTION_SECRET = TEST_ENCRYPTION_SECRET;
  });
  afterEach(() => {
    delete process.env.ENCRYPTION_SECRET;
  });

  it('round-trips a secret', () => {
    const original = 'sk-ant-api-key-12345';
    const encrypted = encryptSecret(original);
    expect(encrypted).not.toBe(original);
    expect(encrypted.split(':')).toHaveLength(3);

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(original);
  });

  it('produces different ciphertext each time (random IV)', () => {
    const secret = 'same-secret';
    const a = encryptSecret(secret);
    const b = encryptSecret(secret);
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe(secret);
    expect(decryptSecret(b)).toBe(secret);
  });

  it('throws on invalid format', () => {
    expect(() => decryptSecret('bad-format')).toThrow();
  });
});

describe('redactPII', () => {
  it('redacts email addresses', () => {
    expect(redactPII('contact me at john@example.com please')).toContain('[EMAIL]');
    expect(redactPII('john@example.com')).not.toContain('john');
  });

  it('redacts SSN patterns', () => {
    expect(redactPII('SSN: 123-45-6789')).toContain('[SSN]');
  });

  it('redacts 16-digit card numbers', () => {
    expect(redactPII('card 4111111111111111')).toContain('[CARD]');
  });

  it('redacts Colombia phone numbers', () => {
    expect(redactPII('llamar al 305 479 0273')).toContain('[PHONE]');
    expect(redactPII('+57 305 479 0273')).toContain('[PHONE]');
  });

  it('returns text unchanged when no PII present', () => {
    const clean = 'Hello world, no PII here.';
    expect(redactPII(clean)).toBe(clean);
  });
});
