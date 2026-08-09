import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  decryptPeskidsPiiField,
  encryptPeskidsPiiField,
  isEncryptedPeskidsPii,
  maskPeskidsDocument,
  PESKIDS_PII_PREFIX,
} from '../pii-crypto';

const TEST_SECRET = '12345678901234567890123456789012';

describe('peskids pii-crypto', () => {
  const previous = process.env.ENCRYPTION_SECRET;

  beforeEach(() => {
    process.env.ENCRYPTION_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.ENCRYPTION_SECRET;
    } else {
      process.env.ENCRYPTION_SECRET = previous;
    }
  });

  it('encrypts and decrypts round-trip with prefix', () => {
    const encrypted = encryptPeskidsPiiField('1122334455');
    expect(encrypted).toBeTruthy();
    expect(encrypted?.startsWith(PESKIDS_PII_PREFIX)).toBe(true);
    expect(isEncryptedPeskidsPii(encrypted!)).toBe(true);
    expect(decryptPeskidsPiiField(encrypted)).toBe('1122334455');
  });

  it('returns null for empty values without requiring secret', () => {
    delete process.env.ENCRYPTION_SECRET;
    expect(encryptPeskidsPiiField(null)).toBeNull();
    expect(encryptPeskidsPiiField('')).toBeNull();
    expect(encryptPeskidsPiiField('   ')).toBeNull();
  });

  it('throws when encrypting without ENCRYPTION_SECRET', () => {
    delete process.env.ENCRYPTION_SECRET;
    expect(() => encryptPeskidsPiiField('1122334455')).toThrow(/ENCRYPTION_SECRET/);
  });

  it('passes through legacy plaintext on decrypt', () => {
    expect(decryptPeskidsPiiField('legacy-cedula')).toBe('legacy-cedula');
  });

  it('masks documents to last 4 for emails/logs', () => {
    const encrypted = encryptPeskidsPiiField('1122334455');
    expect(maskPeskidsDocument(encrypted)).toBe('****4455');
    expect(maskPeskidsDocument(null)).toBe('No indicada');
  });

  it('is idempotent when value is already encrypted', () => {
    const once = encryptPeskidsPiiField('900123456');
    const twice = encryptPeskidsPiiField(once);
    expect(twice).toBe(once);
  });
});
