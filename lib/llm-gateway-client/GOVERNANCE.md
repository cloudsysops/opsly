# @intcloudsysops/llm-gateway Governance

## Ownership

- **Owner:** Architecture team (claude)
- **Maintainers:** LLM infrastructure team

## Purpose

Client library for the LLM Gateway service. Provides a unified, typed interface for all packages (ml, orchestrator, api, etc.) to call the LLM Gateway HTTP service.

## Versioning

- Semantic versioning (MAJOR.MINOR.PATCH)
- Current version: 1.0.0
- Breaking changes (API signature changes) require MAJOR bump
- New features (new function exports) require MINOR bump
- Bug fixes require PATCH bump

## Review Process

- All PRs to lib/llm-gateway require 1+ approval from LLM infrastructure team
- Changes must pass:
  - TypeScript type-check
  - Unit tests (if added)
  - No console errors/warnings in builds

## API Stability

### Stable Exports (no changes without MAJOR bump)
- `llmCall(request)` - main entry point
- `llmCallDirect(request, options)` - provider-specific calls
- `LLMRequest`, `LLMResponse` types

### Experimental (may change)
- Environment variable configuration pattern

## Dependencies

- `@intcloudsysops/errors` - error handling utilities
- No external HTTP client library (uses native fetch)

## Usage

```typescript
import { llmCall } from '@intcloudsysops/llm-gateway';

const response = await llmCall({
  messages: [{ role: 'user', content: 'Hello' }],
  model: 'gpt-4',
});
```

## Related Services

- **apps/llm-gateway** - Backend HTTP service that processes requests
- **lib/observability** - For tracing/logging gateway calls
- **lib/telemetry** - For cost attribution and usage tracking
