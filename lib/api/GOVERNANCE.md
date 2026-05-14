---
title: "lib/api Governance"
description: "Module governance for API response formatting"
---
# lib/api Governance

## Ownership

- **Owner:** Claude (AI agent)
- **Maintainers:** Backend & API Team
- **Escalation:** Engineering Lead

## API Standards

All API responses must:

1. **Use Unified Format** — All endpoints return APIResponse<T>
2. **Include RequestId** — Enable debugging and support
3. **Include Timestamp** — ISO 8601 format
4. **Have Status Code** — Correct HTTP status
5. **Document Versions** — Support multiple API versions

## Response Format Rules

- ✅ `success` boolean (true/false)
- ✅ `data` with response object (null if error)
- ✅ `error` with code + message (null if success)
- ✅ `requestId` for tracking
- ✅ `timestamp` in ISO 8601

Never:
- ❌ Return raw error messages
- ❌ Include stack traces in responses
- ❌ Leak internal implementation details
- ❌ Use inconsistent error codes

## API Versioning Policy

- **V1** — Legacy (deprecated, 1 year notice)
- **V2** — Current (active development)
- **V3** — Future (experimental)

Versions run in parallel:
```
GET /api/v1/agents     → Legacy response
GET /api/v2/agents     → Modern response
GET /api/v3/agents     → Experimental response
```

## Pagination Standards

All list endpoints must support:

```typescript
GET /api/v2/agents?page=1&limit=20

Response:
{
  success: true,
  data: {
    items: [...],
    total: 150,
    page: 1,
    limit: 20,
    totalPages: 8
  }
}
```

## Review Process

1. **Scope:** API response changes, new endpoints, versioning
2. **Approvers:** 1 (Backend Maintainer)
3. **Checks:**
   - ✅ All responses use APIResponse<T>
   - ✅ Error responses include error code
   - ✅ All timestamps ISO 8601
   - ✅ Pagination on list endpoints
   - ✅ No version breaking changes without V3+

## Versioning

- Semantic versioning (MAJOR.MINOR.PATCH)
- New response fields: MINOR bump
- Removed fields: MAJOR version (v2 → v3)

## Error Code Standardization

| Code | Status | Meaning |
|------|--------|---------|
| VALIDATION_ERROR | 400 | Input validation failed |
| AUTH_ERROR | 401 | Authentication required |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource already exists |
| RATE_LIMIT | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

## Dependencies

### This Module Depends On

- `@intcloudsysops/errors` — Error formatting

### Modules That Depend On This

- All API routes in `apps/api`
- Client SDKs and frontend applications

## See Also

- `README.md` — API documentation, examples
- `__tests__/` — API examples
