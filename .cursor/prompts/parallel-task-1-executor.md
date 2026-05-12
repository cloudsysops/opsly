---
agent_role: executor
max_steps: 5
goal: Build test utility module with proper types
priority: 50000
---

# Task 1: Executor (Cursor) - Build Test Utilities

Create a TypeScript utility module for testing the autonomous system.

**File:** `src/test-utils.ts`

**Requirements:**
- Export `createMockJob(jobId: string): Job`
- Export `createMockValidation(status: 'passed' | 'failed'): ValidationReport`
- Export `sleep(ms: number): Promise<void>`
- All functions properly typed with TypeScript
- ESM export syntax

**Success:** TypeScript type-checks pass, file compiles without errors.
