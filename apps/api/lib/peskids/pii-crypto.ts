import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/** Prefix so we can distinguish ciphertext from legacy plaintext rows. */
export const PESKIDS_PII_PREFIX = 'enc:v1:' as const;

function getEncryptionSecret(): string {
  const secret = process.env.ENCRYPTION_SECRET?.trim();
  if (!secret || secret.length !== 32) {
    throw new Error(
      'ENCRYPTION_SECRET must be set and exactly 32 characters to protect Peskids PII'
    );
  }
  return secret;
}

function encryptRaw(plaintext: string): string {
  const key = getEncryptionSecret();
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(key), iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decryptRaw(payload: string): string {
  const key = getEncryptionSecret();
  const [ivHex, authTagHex, ciphertext] = payload.split(':');
  if (!ivHex || !authTagHex || !ciphertext) {
    throw new Error('Invalid encrypted PII format');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(key), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function isEncryptedPeskidsPii(value: string): boolean {
  return value.startsWith(PESKIDS_PII_PREFIX);
}

/**
 * Encrypt a sensitive Peskids field (cédula, NIT). Empty → null.
 * Idempotent if already prefixed. Requires ENCRYPTION_SECRET.
 */
export function encryptPeskidsPiiField(plaintext: string | null | undefined): string | null {
  if (plaintext === undefined || plaintext === null) {
    return null;
  }
  const trimmed = plaintext.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (isEncryptedPeskidsPii(trimmed)) {
    return trimmed;
  }
  return `${PESKIDS_PII_PREFIX}${encryptRaw(trimmed)}`;
}

/**
 * Decrypt for authorized server use. Legacy plaintext (no prefix) returned as-is.
 */
export function decryptPeskidsPiiField(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value.length === 0) {
    return null;
  }
  if (!isEncryptedPeskidsPii(value)) {
    return value;
  }
  return decryptRaw(value.slice(PESKIDS_PII_PREFIX.length));
}

/** Last-4 mask for emails / logs — never send full document numbers. */
export function maskPeskidsDocument(
  value: string | null | undefined,
  emptyLabel = 'No indicada'
): string {
  let plain: string | null;
  try {
    plain = decryptPeskidsPiiField(value);
  } catch {
    return '****';
  }
  if (!plain) {
    return emptyLabel;
  }
  if (plain.length <= 4) {
    return '****';
  }
  return `****${plain.slice(-4)}`;
}
