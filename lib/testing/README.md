---
title: "@intcloudsysops/testing"
description: "Unified test framework for agents and services"
---
# @intcloudsysops/testing

Unified test framework for running and reporting test results consistently across all services and agents.

## Features

- ✅ **Test Cases** — Structured test definition format
- 🧪 **Test Runner** — Execute tests with timing and error capture
- 📊 **Reporting** — JSON test results for CI/CD integration
- 🔄 **Assertions** — Built-in assertion helpers
- 📈 **Metrics** — Track test execution time and pass rate

## Usage

### Define Test Cases

```typescript
import { TestCase } from '@intcloudsysops/testing';

const tests: TestCase[] = [
  {
    name: 'greet-user',
    input: { name: 'Alice' },
    expectedOutput: 'Hello, Alice!',
    metadata: { category: 'happy-path', priority: 'high' }
  },
  {
    name: 'greet-empty-name',
    input: { name: '' },
    expectedOutput: 'Hello, Guest!',
    metadata: { category: 'edge-case' }
  }
];
```

### Run Tests

```typescript
import { runTest } from '@intcloudsysops/testing';

async function testAgent(agent) {
  const results = [];

  for (const testCase of tests) {
    const result = await runTest(
      testCase,
      (input) => agent.execute(input)
    );

    results.push(result);
    console.log(`${result.testName}: ${result.passed ? '✓' : '✗'}`);
  }

  return results;
}
```

### Test Result Structure

```typescript
interface TestResult {
  testName: string;          // Test case name
  passed: boolean;           // true if output matches expected
  actual: unknown;           // Actual output
  expected: unknown;         // Expected output
  duration: number;          // Execution time (ms)
  error?: {
    message: string;
    stack: string;
  };
}
```

## Integration by Service

### Agent Testing

```typescript
import { runTest } from '@intcloudsysops/testing';

async function validateAgent(agentId) {
  const agent = await loadAgent(agentId);
  const testCases = await loadTestCases(agentId);

  const results = [];
  let passed = 0;

  for (const testCase of testCases) {
    const result = await runTest(testCase, (input) => agent.execute(input));
    results.push(result);
    
    if (result.passed) passed++;
  }

  const passRate = (passed / results.length) * 100;
  console.log(`Pass rate: ${passRate.toFixed(2)}%`);

  return { results, passRate, passed, total: results.length };
}
```

### CI/CD Integration

```typescript
import { runTest } from '@intcloudsysops/testing';

async function ciTestStep() {
  const testCases = await loadAllTestCases();
  const results = [];

  for (const testCase of testCases) {
    const result = await runTest(testCase, executeTestable);
    results.push(result);
  }

  // Write JSON report
  fs.writeFileSync(
    'test-results.json',
    JSON.stringify(results, null, 2)
  );

  // Exit with error if any test failed
  const failed = results.filter(r => !r.passed).length;
  if (failed > 0) {
    console.error(`${failed} test(s) failed`);
    process.exit(1);
  }
}
```

### Dashboard Reporting

```typescript
import { runTest } from '@intcloudsysops/testing';

async function reportTestMetrics(agentId) {
  const results = await runTests(agentId);
  
  const metrics = {
    totalTests: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    avgDurationMs: average(results.map(r => r.duration)),
    passRate: (passed / results.length) * 100
  };

  await db.from('test_metrics')
    .insert({
      agent_id: agentId,
      ...metrics,
      timestamp: Date.now()
    });

  return metrics;
}
```

## Test Categories

Tests can be organized by category:

```typescript
// Happy path — common/expected inputs
{ name: 'create-agent', category: 'happy-path', priority: 'high' }

// Edge cases — boundary conditions
{ name: 'empty-input', category: 'edge-case', priority: 'medium' }

// Error cases — invalid inputs
{ name: 'invalid-json', category: 'error', priority: 'medium' }

// Regression — prevent bug recurrence
{ name: 'regression-issue-123', category: 'regression', priority: 'high' }
```

## See Also

- `GOVERNANCE.md` — Testing standards, review process
- `__tests__/` — Testing examples
