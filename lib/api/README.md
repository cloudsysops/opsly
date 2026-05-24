---
title: "@intcloudsysops/api"
description: "Unified API response format and versioning"
---
# @intcloudsysops/api

Centralized API response formatting, pagination, and versioning for consistent client experiences.

## Features

- ✅ **Unified Response Format** — All endpoints return consistent JSON
- 📄 **Pagination** — Built-in page/limit/offset support
- 🔢 **API Versioning** — v1, v2, v3 support simultaneously
- 🆔 **Request Tracking** — Unique requestId for debugging
- ⏰ **Timestamps** — ISO 8601 timestamps on all responses

## Usage

### Success Response

```typescript
import { createResponse } from '@intcloudsysops/api';

const data = { id: 'a123', name: 'My Agent' };
const response = createResponse(data, requestId);

// Returns:
// {
//   success: true,
//   data: { id: 'a123', name: 'My Agent' },
//   error: null,
//   requestId: 'req-abc123',
//   timestamp: '2024-05-09T10:30:00Z'
// }
```

### Error Response

```typescript
import { createErrorResponse } from '@intcloudsysops/api';

const response = createErrorResponse('AGENT_NOT_FOUND', 'Agent not found', requestId);

// Returns:
// {
//   success: false,
//   data: null,
//   error: {
//     code: 'AGENT_NOT_FOUND',
//     message: 'Agent not found'
//   },
//   requestId: 'req-abc123',
//   timestamp: '2024-05-09T10:30:00Z'
// }
```

### Pagination

```typescript
import { createResponse, PaginationParams } from '@intcloudsysops/api';

const params: PaginationParams = {
  page: 1,      // 1-indexed
  limit: 20,
  offset: 0     // (page - 1) * limit
};

const agents = await agentRepo.findAll(tenantId, params);
const response = createResponse(
  {
    items: agents,
    total: 150,
    page: 1,
    limit: 20,
    totalPages: 8
  },
  requestId
);
```

### API Versioning

```typescript
import { API_VERSIONS } from '@intcloudsysops/api';

// Detect version from request
const version = req.query.version || API_VERSIONS.V2;

if (version === API_VERSIONS.V1) {
  // Legacy response format
  res.json({ agents: [] });
} else if (version === API_VERSIONS.V2) {
  // Modern response format
  res.json(createResponse({ items: [] }, requestId));
}
```

## Response Format

```typescript
interface APIResponse<T> {
  success: boolean;           // true if successful, false otherwise
  data: T | null;             // Response data (null if error)
  error: ErrorDetail | null;  // Error details (null if success)
  requestId: string;          // Unique request identifier
  timestamp: string;          // ISO 8601 timestamp
}

interface ErrorDetail {
  code: string;       // Machine-readable error code
  message: string;    // Human-readable message
  details?: Record<string, any>; // Additional error context
}
```

## Integration by Service

### Express API

```typescript
import { createResponse, createErrorResponse } from '@intcloudsysops/api';

app.post('/api/agents', async (req, res) => {
  const requestId = req.id; // From middleware

  try {
    const agent = await agentService.create(req.body, req.user.tenantId);
    const response = createResponse(agent, requestId);
    res.json(response);
  } catch (error) {
    const response = createErrorResponse(
      error.code || 'INTERNAL_ERROR',
      error.message,
      requestId
    );
    res.status(error.statusCode || 500).json(response);
  }
});
```

### Middleware for Request ID

```typescript
import { nanoid } from 'nanoid';

app.use((req, res, next) => {
  req.id = nanoid();
  res.header('X-Request-ID', req.id);
  next();
});
```

### Client-Side Usage

```typescript
// Fetch agent
const response = await fetch('/api/agents/a123');
const json = await response.json();

if (json.success) {
  console.log('Agent:', json.data);
} else {
  console.error('Error:', json.error.message);
}

// Track request for support
console.log('Request ID:', json.requestId);
```

## See Also

- `GOVERNANCE.md` — API standards, review process
- `__tests__/` — API examples

---

## Enlaces relacionados

- [[lib/api/README|api]]
- [[README|Inicio]]
