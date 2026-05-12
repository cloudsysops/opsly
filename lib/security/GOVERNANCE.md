---
title: 'lib/security Governance'
description: 'Module governance for authentication and encryption'
---

# lib/security Governance

## Ownership

- **Owner:** Claude (AI agent)
- **Maintainers:** Security & Identity Team
- **Escalation:** Security Lead

## Security Standards

All authentication and encryption must:

1. **Use Industry Standards** — JWT, AES-256, bcrypt
2. **Have Key Rotation** — Monthly key rotation schedule
3. **Be Audited** — All token generation/revocation logged
4. **Never Log Secrets** — Redact PII and credentials
5. **Have Expiry** — Tokens expire (default 7 days)

## Authentication Policy

- ✅ JWT for API authentication (stateless)
- ✅ Token expiry: 7 days (configurable)
- ✅ Refresh tokens: 30 days
- ✅ Keys rotated: Monthly
- ❌ Never store plaintext passwords
- ❌ Never transmit tokens in query params

## Encryption Policy

- ✅ AES-256-GCM for data encryption
- ✅ Keys from Doppler secrets
- ✅ IV (Initialization Vector) stored with ciphertext
- ✅ Separate encryption keys per environment
- ❌ Never hardcode encryption keys

## PII Handling

All personal data must:

1. **Be Redacted in Logs** — Use redactPII() before logging
2. **Be Encrypted in DB** — Encrypt sensitive fields
3. **Have Access Control** — Only authorized users see PII
4. **Be Auditable** — Track who accessed what
5. **Be Deletable** — Support GDPR right to delete

## Review Process

1. **Scope:** Authentication, encryption, PII handling changes
2. **Approvers:** 1 (Security Maintainer)
3. **Checks:**
   - ✅ No plaintext secrets
   - ✅ PII redacted in logs
   - ✅ Encryption algorithm standard (AES-256)
   - ✅ Key rotation documented
   - ✅ GDPR compliance checked

## Versioning

- Semantic versioning (MAJOR.MINOR.PATCH)
- New authentication methods: MINOR bump
- Algorithm changes (e.g., SHA1 → SHA256): MAJOR bump

## Key Rotation

Rotate keys quarterly:

```bash
# 1. Generate new key
openssl rand -base64 32 > /tmp/new-key

# 2. Add to Doppler
doppler secrets set ENCRYPTION_KEY_V2 < /tmp/new-key

# 3. Update code to use new key
export ENCRYPTION_KEY_VERSION=2

# 4. Re-encrypt data in background job
npm run scripts/rotate-encryption-keys.ts

# 5. Remove old key after successful rotation
doppler secrets delete ENCRYPTION_KEY_V1
```

## Dependencies

### This Module Depends On

None

### Modules That Depend On This

- `@intcloudsysops/api` — Token verification
- `apps/api` — Request authentication
- `apps/orchestrator` — Agent authorization
- `@intcloudsysops/observability` — PII redaction

## Compliance

- GDPR: PII deletion, data retention
- CCPA: Consumer right-to-know, opt-out
- HIPAA: Encryption in transit/at rest (if applicable)
- SOC 2: Audit logs for all access

## See Also

- `README.md` — API documentation, examples
- `__tests__/` — Security examples
