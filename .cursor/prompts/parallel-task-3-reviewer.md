---
agent_role: reviewer
max_steps: 7
goal: Security audit of autonomous execution system
priority: 48000
---

# Task 3: Reviewer (Copilot) - Security & Code Audit

Review the autonomous execution system for security, reliability, and best practices.

**Scope:**
1. `apps/orchestrator/src/lib/iteration-manager.ts`
2. `apps/orchestrator/src/workers/TestValidatorWorker.ts`
3. `scripts/local-prompt-watcher.ts`
4. `scripts/local-git-auto-commit.ts`

**Audit Checklist:**
- [ ] **Security:** Any injection vulnerabilities? Token handling secure? File path traversal risks?
- [ ] **Error Handling:** All edge cases covered? Graceful failure modes?
- [ ] **Performance:** Any N+1 queries? Inefficient loops? Resource leaks?
- [ ] **Code Quality:** Proper typing? Consistent style? Testable design?
- [ ] **Reliability:** Idempotent operations? Proper cleanup? Retry logic sound?

**Deliverable:** Create `docs/SECURITY-CODE-AUDIT.md` with:
- Issues found (by severity: critical/high/medium/low)
- Recommendations for each
- Risk assessment
- Approval decision (safe for production or needs fixes)

**Success:** Audit is thorough, findings are actionable, recommendation is clear.
