# lib/evaluation Governance

## Ownership

- **Owner:** Claude (AI agent)
- **Maintainers:** QA & Testing Team
- **Escalation:** Quality Lead

## Quality Standards

All agents must pass:

1. **Input Validation** — Schema checks, required fields
2. **Safety Checks** — PII detection, hallucination detection
3. **Quality Metrics** — BLEU ≥ 0.45, ROUGE ≥ 0.50 (configurable per agent)
4. **Regression Tests** — Golden dataset baseline

## Test Coverage Requirements

- **Smoke Tests:** 100% of agent execution paths
- **Integration Tests:** Agent + orchestrator + API
- **Regression Tests:** Running on every deploy
- **Adversarial Tests:** Monthly against attack dataset

## Review Process

1. **Scope:** Changes to validators, metrics, test runners
2. **Approvers:** 1 (QA Maintainer)
3. **Checks:**
   - ✅ New validators tested
   - ✅ Test coverage >80%
   - ✅ Golden dataset updated if needed
   - ✅ Backward compatible

## Metrics SLOs (Service Level Objectives)

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Output Quality (BLEU) | ≥0.45 | <0.40 |
| Safety (PII Detection) | 100% | <99% |
| Hallucination Detection | ≥95% | <90% |
| Test Pass Rate | 100% | <99% |

## Adding New Validators

1. Create function in `validators/{domain}.ts`
2. Export from `validators/index.ts`
3. Add tests in `__tests__/validators/`
4. Document in `README.md`
5. Add to agent evaluation pipeline

Example:

```typescript
export function validateAgentOutput(output: AgentOutput): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!output.content) {
    errors.push({ field: 'content', message: 'Content required', severity: 'error' });
  }
  
  return errors;
}
```

## Adding New Test Datasets

1. Create `.json` file in `datasets/{golden,adversarial}/`
2. Include metadata (version, description, count)
3. Document in `datasets/README.md`
4. Load in test runners

Example format:

```json
{
  "version": "1.0.0",
  "description": "Golden dataset for agent-automation",
  "cases": [
    {
      "input": { "query": "..." },
      "expectedOutput": "...",
      "metadata": { "category": "..." }
    }
  ]
}
```

## Dependencies

### This Module Depends On

- `@intcloudsysops/prompts` — Load prompts for validation

### Modules That Depend On This

- `apps/orchestrator` — Run tests before agent execution
- `apps/api` — Validate outputs before returning
- CI/CD pipeline — Run regression tests on deploy

## Versioning

- Semantic versioning (MAJOR.MINOR.PATCH)
- New validators: MINOR bump
- Breaking validator changes: MAJOR bump

## See Also

- `README.md` — API documentation, examples
- `__tests__/` — Integration tests
- `datasets/` — Golden and adversarial test data
