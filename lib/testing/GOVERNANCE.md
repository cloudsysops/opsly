---
title: "lib/testing Governance"
description: "Module governance for unified testing framework"
---
# lib/testing Governance

## Ownership

- **Owner:** Claude (AI agent)
- **Maintainers:** QA & Testing Team
- **Escalation:** Quality Lead

## Testing Standards

All tests must:

1. **Be Deterministic** — Same input always produces same output
2. **Be Isolated** — No test dependencies or shared state
3. **Be Fast** — Complete in < 100ms
4. **Have Clear Names** — Describe what is being tested
5. **Include Metadata** — Category, priority, tags

## Test Case Requirements

Every test case must have:

- ✅ Unique name (kebab-case)
- ✅ Sample input
- ✅ Expected output
- ✅ Category (happy-path, edge-case, error, regression)
- ✅ Priority (high, medium, low)

## Test Coverage Requirements

- **Happy Path** — 100% of agent execution paths
- **Edge Cases** — Boundary conditions (empty, null, max values)
- **Error Cases** — Invalid inputs, exceptions
- **Regression** — Previous bugs must have test

## Test Execution Rules

Tests run:
1. **Pre-deployment** — All tests must pass
2. **Per-agent** — Isolated test suite per agent
3. **Per-module** — Unit tests for each lib module
4. **Integration** — End-to-end with real services
5. **Nightly** — Full regression suite

Pass Criteria:
- ✅ > 95% of tests pass
- ✅ < 5 second timeout per test
- ✅ No memory leaks
- ✅ Deterministic results

## Review Process

1. **Scope:** New tests, test framework changes
2. **Approvers:** 1 (QA Maintainer)
3. **Checks:**
   - ✅ Test is deterministic
   - ✅ Test is isolated
   - ✅ Test name describes purpose
   - ✅ Expected output is correct
   - ✅ Metadata complete

## Test Organization

```
lib/testing/
├── __tests__/
│   ├── agent-tests/        # Agent-specific tests
│   ├── service-tests/      # Service-layer tests
│   └── integration-tests/  # End-to-end tests
└── datasets/
    ├── golden/             # Reference test data
    └── regression/         # Previous bug cases
```

## Versioning

- Semantic versioning (MAJOR.MINOR.PATCH)
- New test features: MINOR bump
- Breaking test changes: MAJOR bump

## SLOs for Testing

| Metric | Target | Alert |
|--------|--------|-------|
| Test Pass Rate | > 95% | < 90% |
| Test Execution Time | < 5s | > 10s |
| Coverage | > 80% | < 70% |
| Determinism | 100% | < 99.9% |

## Test Environments

Tests run in:
- **Local** — Developer machine
- **CI** — GitHub Actions on every commit
- **Staging** — Full integration tests
- **Production** — Smoke tests post-deploy

## Dependencies

### This Module Depends On

None

### Modules That Depend On This

- `@intcloudsysops/evaluation` — Quality metrics
- CI/CD pipeline — Test execution

## See Also

- `README.md` — API documentation, examples
- `__tests__/` — Testing examples

---

## Enlaces relacionados

- [[lib/testing/README|testing]]
- [[README|Inicio]]
