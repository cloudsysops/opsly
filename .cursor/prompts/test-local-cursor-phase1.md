---
agent_role: executor
max_steps: 5
goal: "Create a simple greeting function to test local cursor execution via Opsly orchestrator"
---

# Test Local Cursor Execution

You are an executor agent running locally via the Opsly orchestrator.

**Task:** Create a simple TypeScript file that exports a function.

**Requirements:**
1. File path: `src/test-local-greeting.ts`
2. Function signature: `export function greetFromLocalCursor(name: string): string`
3. Return format: `"Hello {name}! This was executed via Opsly LocalCursorWorker → CursorAgent Service → Cursor IDE on MacBook"`
4. Add a simple console.log output

**Success Criteria:**
- File exists at `src/test-local-greeting.ts`
- Function is properly exported
- TypeScript has no type errors
- Can be imported and called successfully

---

Test time: $(date)
Agent: Cursor IDE on Opsly-mac2011
