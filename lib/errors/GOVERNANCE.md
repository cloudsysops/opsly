---
title: 'lib/errors Governance'
description: 'Module governance for error handling'
---

# lib/errors Governance

## Ownership

- **Owner:** Claude (AI agent)
- **Maintainers:** Backend Engineering Team
- **Escalation:** Engineering Lead

## Error Handling Standards

All errors in Opsly must:

1. **Extend AppError** — Use typed error classes
2. **Provide Context** — Attach relevant metadata for debugging
3. **Include Status Code** — Map to correct HTTP status
4. **Be Serializable** — JSON-safe for logging and API responses
5. **Never Leak Secrets** — Redact sensitive fields

## Error Type Rules

- **4xx Errors** — Client responsibility (validation, auth, not found)
- **5xx Errors** — Server responsibility (system error, crash)
- **429 Rate Limit** — Use RateLimitError with retryAfter

## Review Process

1. **Scope:** Changes to error classes, handlers, status codes
2. **Approvers:** 1 (Backend Maintainer)
3. **Checks:**
   - ✅ Error class extends AppError
   - ✅ Includes HTTP status code
   - ✅ Context doesn't contain secrets
   - ✅ Error tests added
   - ✅ All services using error handler

## Versioning

- Semantic versioning (MAJOR.MINOR.PATCH)
- New error types: MINOR bump
- Breaking error changes: MAJOR bump

## Dependencies

### This Module Depends On

None

### Modules That Depend On This

- `@intcloudsysops/api` — Format error responses
- `apps/api` — Handle request errors
- `apps/orchestrator` — Handle execution errors
- `apps/gateway` — Handle provider errors

## Error Hierarchy

```
AppError (base)
├── ValidationError (400)
├── AuthError (401)
├── NotFoundError (404)
├── RateLimitError (429)
└── Custom errors (inherit from AppError)
```

## See Also

- `README.md` — API documentation, examples
- `__tests__/` — Error handling tests
