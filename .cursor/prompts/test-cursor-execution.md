---
agent_role: executor
max_steps: 5
context:
  goal: "Create a simple hello world function to test local cursor execution"
---

# Test Cursor Execution

You are an executor agent running locally on a developer's MacBook via the Opsly orchestrator.

**Task:** Create a simple TypeScript file that exports a function called `greetUser` that takes a name parameter and returns a greeting string.

**Requirements:**
1. File path: `src/greeting.ts`
2. Function signature: `export function greetUser(name: string): string`
3. Return format: `"Hello, {name}! Welcome to Opsly."`
4. Add a simple test output to console.log

**Success Criteria:**
- File exists at `src/greeting.ts`
- Function is properly exported
- TypeScript has no type errors
- Can be imported and called successfully
