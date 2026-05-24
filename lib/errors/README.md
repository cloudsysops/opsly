---
title: "@intcloudsysops/errors"
description: "Unified error handling and context tracking"
---
# @intcloudsysops/errors

Centralized error handling with consistent response format, context tracking, and HTTP status codes.

## Features

- ✅ **Typed Error Classes** — AppError, ValidationError, AuthError, NotFoundError, RateLimitError
- 🔍 **Context Tracking** — Attach metadata to errors for debugging
- 📊 **HTTP Status Codes** — Automatic code-to-status mapping
- 📝 **Structured Logging** — Error serialization with stack traces
- 🔄 **Error Handling** — Global error handler with recovery options

## Usage

### Throw Typed Errors

```typescript
import { ValidationError, NotFoundError, RateLimitError } from '@intcloudsysops/errors';

// Validation error
throw new ValidationError('Invalid input', { field: 'email', value: 'invalid' });

// Not found
throw new NotFoundError('Agent not found', { agentId: 'a123' });

// Rate limit
throw new RateLimitError('Too many requests', { userId: 'u456', retryAfter: 60 });
```

### Catch and Handle

```typescript
import { handleError } from '@intcloudsysops/errors';

try {
  await agent.execute(input);
} catch (error) {
  const response = handleError(error);
  // { code: 'VALIDATION_ERROR', statusCode: 400, message: '...', context: {...} }
}
```

### Custom Errors

```typescript
import { AppError } from '@intcloudsysops/errors';

class CustomError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super('CUSTOM_ERROR', 500, message, context);
  }
}
```

## Error Types

| Error | Status | When to Use |
|-------|--------|------------|
| ValidationError | 400 | Invalid input, schema mismatch |
| AuthError | 401 | Missing or invalid credentials |
| NotFoundError | 404 | Resource not found |
| RateLimitError | 429 | Too many requests |
| AppError | 500 | Generic server error |

## Integration by Service

### API

```typescript
import { handleError } from '@intcloudsysops/errors';

app.post('/api/agents/:id/execute', async (req, res) => {
  try {
    const output = await agent.execute(req.body);
    res.json({ success: true, output });
  } catch (error) {
    const response = handleError(error);
    res.status(response.statusCode).json(response);
  }
});
```

### Orchestrator

```typescript
import { AppError } from '@intcloudsysops/errors';

async function executeAgent(agentId, input) {
  try {
    return await agent.execute(input);
  } catch (error) {
    if (error instanceof RateLimitError) {
      // Queue for retry
    } else {
      throw error; // Re-throw
    }
  }
}
```

## See Also

- `GOVERNANCE.md` — Error handling standards, review process
- `__tests__/` — Error handling examples

---

## Enlaces relacionados

- [[lib/errors/README|errors]]
- [[README|Inicio]]
