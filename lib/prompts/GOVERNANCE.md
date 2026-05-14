---
title: "lib/prompts Governance"
description: "Module governance for versioned prompt registry"
---

# lib/prompts Governance

## Ownership

- **Owner:** Claude (AI agent)
- **Maintainers:** Opsly Engineering Team
- **Escalation:** Product Engineering Lead

## Versioning Policy

This module follows **semantic versioning** (MAJOR.MINOR.PATCH):

### Version Bumps

- **PATCH** (1.0.0 → 1.0.1) — Bug fixes, clarification, formatting
  - No functional change to prompt behavior
  - Automatic rollout, no migration needed
  - Example: Fix typo in prompt

- **MINOR** (1.0.0 → 1.1.0) — New capabilities, expanded scope
  - Backward compatible (old prompts still work)
  - May add new template variables `{{var}}`
  - Automatic rollout, no migration needed
  - Example: Add new context sections to prompt

- **MAJOR** (1.0.0 → 2.0.0) — Breaking changes
  - Incompatible output format, behavior change
  - Requires migration guide for consumers
  - Staged rollout (staging → prod)
  - Example: Complete prompt rewrite, different structure

### Release Process

1. Create feature branch: `feature/prompts-{description}`
2. Update prompt in `lib/prompts/templates/{domain}/`
3. Update version in metadata YAML
4. Add migration guide if MAJOR version
5. Run `npm run test --workspace=@intcloudsysops/prompts`
6. Submit PR, require 1 approval
7. Merge to main
8. Deploy (automated to staging, manual approval to prod)

## Review Process

### For Pull Requests

1. **Scope:** Changes to `lib/prompts/` directory
2. **Approvers Required:** 1 (Maintainers)
3. **Checks:**
   - ✅ Prompts validate with schema (no empty content)
   - ✅ Metadata is complete (name, version, author, tags)
   - ✅ Semantic versioning is correct
   - ✅ Migration guide provided (if MAJOR)
   - ✅ Tests pass

### For Prompt Content Changes

- **Documentation:** Clear description of what changed
- **Impact Assessment:** Which agents/services use this prompt?
- **Testing:** Validation that prompt template is well-formed

## Deprecation

### Deprecating Prompts

1. Mark prompt as `deprecated: true` in metadata
2. Document deprecation timeline (minimum 2 releases)
3. Provide migration path to replacement prompt
4. Update documentation

Example:
```yaml
---
name: old-agent-prompt
version: 3.0.0
deprecated: true
deprecationMessage: |
  Use 'agent-prompt-v2' instead.
  Migration: Replace {{context}} with {{enhanced_context}}.
  Timeline: Removed in v4.0.0 (3 months)
---
```

### Removing Prompts

- Only remove after deprecation period
- Update any code referencing the prompt
- Update CHANGELOG with migration notes

## Dependencies

### This Module Depends On

- None (zero external dependencies)

### Modules That Depend On This

- `@intcloudsysops/evaluation` — Uses prompts for validation
- `apps/orchestrator` — Loads agent prompts
- `apps/api` — Serves prompts to clients
- `tools/agents` — Consumes prompts for agent execution

**Constraint:** No circular dependencies. If a service needs to update prompts at runtime, it must call `loadPrompt()` not import directly.

## Usage Guidelines

### For Agents

```typescript
import { loadPrompt } from '@intcloudsysops/prompts';

const prompt = await loadPrompt('local-services-automation');
const agent = new Agent(prompt);
```

### For Services

```typescript
import { listPrompts } from '@intcloudsysops/prompts';

const available = listPrompts();
console.log(`${available.length} prompts loaded`);
```

### For Testing

```typescript
import { loadPrompt } from '@intcloudsysops/prompts';

describe('Prompts', () => {
  it('should load all prompts', async () => {
    const prompt = await loadPrompt('test-prompt');
    expect(prompt).toBeDefined();
  });
});
```

## Breaking Changes

If you must introduce a breaking change:

1. **Announce:** Update AGENTS.md with breaking change notice
2. **Provide Migration:** Document in this file
3. **Timeline:** Minimum 1 sprint before removal
4. **Test:** Ensure all consumers are updated

Example Breaking Change Note:

```markdown
## Breaking Change: v2.0.0

**What changed:** `{{context}}` renamed to `{{enhanced_context}}`

**Why:** Better semantic naming, supports richer context injection

**Migration:**
```typescript
// Before
const prompt = await loadPrompt('agent', { version: '1.0.0' });

// After
const prompt = await loadPrompt('agent', { version: '2.0.0' });
// Update templates to use {{enhanced_context}}
```

**Timeline:**
- v1.5.0 (current): Both `{{context}}` and `{{enhanced_context}}` work
- v2.0.0 (next): Only `{{enhanced_context}}` works
- v2.1.0: v1 compatibility removed

## Monitoring & Alerts

### Key Metrics

- **Prompt Load Success Rate** — Target: 99.9%
- **Validation Errors** — Target: 0 per week
- **Version Migration Time** — Target: <1 hour

### Alerts

- 🔴 **Critical:** Prompt registry fails to initialize
- 🟡 **Warning:** Validation errors in production prompts
- 🔵 **Info:** New prompt version deployed

## See Also

- `README.md` — API documentation, usage examples
- `__tests__/` — Integration tests
- `config/modules.json` — Module registry
