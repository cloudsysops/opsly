# @intcloudsysops/prompts

Versioned prompt registry for all agents. Centralized management of agent prompts with semantic versioning, validation, and audit trails.

## Features

- 📦 **Single Registry** — All prompts in one place (`.cursor/prompts/`, `docs/prompts/`, `tools/agents/prompts/`)
- 🏷️ **Semantic Versioning** — Track prompt changes (1.0.0, 1.1.0, 2.0.0)
- ✅ **Validation** — Schema & template validation, prevent malformed prompts
- 📝 **Audit Trail** — Track who changed what and when
- 🔄 **Rollback** — Revert to previous prompt versions
- 📊 **Analytics** — Track prompt usage and performance

## Usage

### Initialize Registry

```typescript
import { initRegistry } from '@intcloudsysops/prompts';

initRegistry([
  '.cursor/prompts',
  'tools/agents/prompts',
  'docs/prompts'
]);
```

### Load Prompt

```typescript
import { loadPrompt } from '@intcloudsysops/prompts';

const prompt = await loadPrompt('local-services-automation');
const promptV1 = await loadPrompt('local-services-automation', { version: '1.0.0' });
```

### List Prompts

```typescript
import { listPrompts, listPromptIds } from '@intcloudsysops/prompts';

const all = listPrompts();
const ids = listPromptIds();
const tagged = listPromptIds('agent-automation');
```

### Validate Prompt

```typescript
import { validatePrompt } from '@intcloudsysops/prompts/schemas';

const result = validatePrompt(content, metadata);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

## Prompt Metadata

Each prompt should have YAML frontmatter:

```markdown
---
name: local-services-automation
version: 1.0.0
description: Automate local services deployment
tags:
  - agent-automation
  - deployment
author: claude
---

Your prompt content here...
```

## Versioning Policy

- **PATCH** — Bug fixes, clarification in prompt text
- **MINOR** — New capabilities, expanded scope
- **MAJOR** — Breaking changes, different behavior, incompatible output format

## Adding New Prompts

1. Create markdown file in `.cursor/prompts/` (e.g., `my-new-prompt.md`)
2. Include YAML frontmatter with metadata
3. Add tests in `__tests__/` to verify prompt loads correctly
4. Run `npm run test` to validate

## Migration Guide

Migrating from scattered prompts to registry:

```bash
# 1. Consolidate all prompts
cp .cursor/prompts/*.md lib/prompts/templates/
cp docs/prompts/*.md lib/prompts/templates/
cp tools/agents/prompts/*.md lib/prompts/templates/

# 2. Update references in code
# Old: import from .cursor/prompts
# New: import { loadPrompt } from '@intcloudsysops/prompts'

# 3. Run tests
npm run test --workspace=@intcloudsysops/prompts
```

## See Also

- `GOVERNANCE.md` — Module governance, review process
- `__tests__/` — Usage examples, integration tests
