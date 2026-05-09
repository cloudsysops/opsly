---
title: "@intcloudsysops/security"
description: "Authentication, encryption, and PII handling"
---
# @intcloudsysops/security

Authentication, encryption, and PII redaction utilities for security and compliance.

## Features

- 🔐 **JWT Authentication** — Generate and verify tokens
- 🔒 **Encryption** — Encrypt sensitive data
- 🚫 **PII Redaction** — Remove personally identifiable information
- 🔑 **Key Management** — Secure key rotation support
- ✅ **Compliance Ready** — GDPR/CCPA compatible

## Usage

### Generate JWT Token

```typescript
import { generateToken } from '@intcloudsysops/security';

const user = {
  id: 'u123',
  tenantId: 'tenant-abc',
  email: 'user@example.com',
  role: 'admin'
};

const token = generateToken(user, '7d'); // 7 days
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Verify JWT Token

```typescript
import { verifyToken } from '@intcloudsysops/security';

const payload = verifyToken(token);
console.log(payload.userId);    // 'u123'
console.log(payload.tenantId);  // 'tenant-abc'
```

### Encrypt Secret

```typescript
import { encryptSecret, decryptSecret } from '@intcloudsysops/security';

const secret = 'sensitive-api-key';
const encrypted = encryptSecret(secret);
// Store in database

const decrypted = decryptSecret(encrypted);
console.log(decrypted); // 'sensitive-api-key'
```

### Redact PII

```typescript
import { redactPII } from '@intcloudsysops/security';

const message = 'User john@example.com called from 555-1234';
const redacted = redactPII(message);
// 'User [EMAIL] called from [PHONE]'
```

## Token Structure

```typescript
interface JWTPayload {
  userId: string;
  tenantId: string;
  role: 'user' | 'admin' | 'superadmin';
  iat: number;        // Issued at (Unix timestamp)
  exp: number;        // Expires at (Unix timestamp)
}
```

## Integration by Service

### API Middleware

```typescript
import { verifyToken } from '@intcloudsysops/security';

app.use((req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});
```

### Logging with PII Redaction

```typescript
import { redactPII, createLogger } from '@intcloudsysops/security';

const logger = createLogger('my-service');

logger.info('User created', {
  email: redactPII('user@example.com'),
  phone: redactPII('555-1234'),
  ssn: redactPII('123-45-6789')
});
```

### Secret Storage

```typescript
import { encryptSecret } from '@intcloudsysops/security';

// Store API key in database
const encrypted = encryptSecret(apiKey);
await db.from('api_keys').insert({
  user_id: userId,
  value: encrypted
});

// Retrieve and use
const row = await db.from('api_keys').select('*').single();
const decrypted = decryptSecret(row.value);
```

## PII Patterns Detected

- **Email:** john@example.com
- **Phone:** (555) 123-4567, 555-1234
- **Social Security:** 123-45-6789
- **Credit Card:** 4111-1111-1111-1111
- **API Keys:** bearer, token, secret patterns

## See Also

- `GOVERNANCE.md` — Security standards, review process
- `__tests__/` — Security examples
