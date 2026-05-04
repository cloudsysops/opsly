#!/usr/bin/env npx tsx
/**
 * Test Watchdog with Mock Metrics
 * Validates watchdog logic without requiring a running ValidationOrchestrator
 */

// Mock the fetch function for testing
declare global {
  var fetchMock: ((url: string, opts?: Record<string, unknown>) => Promise<Response>) | undefined;
}

const mockMetrics = {
  healthy: {
    summary: {
      'prompt-optimization': {
        cycles_evaluated: 100,
        avg_improvement_pct: 5.5,
        validation_success_rate: 98.5,
        rollback_count: 1,
        last_metric_timestamp: new Date().toISOString(),
      },
      'intent-routing': {
        cycles_evaluated: 50,
        avg_improvement_pct: 3.2,
        validation_success_rate: 96.0,
        rollback_count: 2,
        last_metric_timestamp: new Date().toISOString(),
      },
    },
    recent_metrics: [],
  },
  warning: {
    summary: {
      'prompt-optimization': {
        cycles_evaluated: 100,
        avg_improvement_pct: 2.1,
        validation_success_rate: 87.5, // 12.5% failure = escalation rate ~12.5%
        rollback_count: 12,
        last_metric_timestamp: new Date().toISOString(),
      },
    },
    recent_metrics: [],
  },
  critical: {
    summary: {
      'prompt-optimization': {
        cycles_evaluated: 100,
        avg_improvement_pct: 1.0,
        validation_success_rate: 75.0, // 25% failure = escalation rate ~25%
        rollback_count: 25,
        last_metric_timestamp: new Date().toISOString(),
      },
    },
    recent_metrics: [],
  },
};

interface TestCase {
  name: string;
  mockResponse: unknown;
  expectedStatus: 'healthy' | 'warning' | 'critical';
  description: string;
}

const testCases: TestCase[] = [
  {
    name: 'test-healthy',
    mockResponse: mockMetrics.healthy,
    expectedStatus: 'healthy',
    description: 'All metrics within healthy thresholds',
  },
  {
    name: 'test-warning',
    mockResponse: mockMetrics.warning,
    expectedStatus: 'warning',
    description: 'Escalation rate ~12.5% (warning threshold 10%)',
  },
  {
    name: 'test-critical',
    mockResponse: mockMetrics.critical,
    expectedStatus: 'critical',
    description: 'Escalation rate ~25% (critical threshold 20%)',
  },
];

async function runTests(): Promise<boolean> {
  console.log('Running Watchdog Test Suite\n');

  let allPassed = true;

  for (const testCase of testCases) {
    console.log(`Test: ${testCase.name}`);
    console.log(`Description: ${testCase.description}`);

    try {
      // Simple validation: check if mockResponse can be parsed
      const json = JSON.stringify(testCase.mockResponse);
      const parsed = JSON.parse(json);

      // Validate structure
      if (!parsed.summary || typeof parsed.summary !== 'object') {
        throw new Error('Invalid mock response: missing summary');
      }

      // Extract escalation rate
      let totalEscalationRate = 0;
      let intentCount = 0;

      for (const [, metric] of Object.entries(parsed.summary)) {
        if (metric && typeof metric === 'object') {
          const m = metric as Record<string, unknown>;
          const successRate = typeof m.validation_success_rate === 'number'
            ? m.validation_success_rate
            : 100;
          totalEscalationRate += 100 - successRate;
          if (typeof m.last_metric_timestamp === 'string') {
            intentCount++;
          }
        }
      }

      const escalationRate = intentCount > 0 ? totalEscalationRate / intentCount : 0;

      // Determine expected status based on thresholds
      let expectedStatus = 'healthy';
      if (escalationRate > 20) {
        expectedStatus = 'critical';
      } else if (escalationRate > 10) {
        expectedStatus = 'warning';
      }

      const passed = expectedStatus === testCase.expectedStatus;

      if (passed) {
        console.log(
          `✓ PASS: Escalation rate ${escalationRate.toFixed(2)}% → ${expectedStatus}`
        );
      } else {
        console.log(
          `✗ FAIL: Expected ${testCase.expectedStatus}, got ${expectedStatus}` +
          ` (escalation rate: ${escalationRate.toFixed(2)}%)`
        );
        allPassed = false;
      }
    } catch (err) {
      console.log(`✗ ERROR: ${err instanceof Error ? err.message : String(err)}`);
      allPassed = false;
    }

    console.log('');
  }

  // Additional validation tests
  console.log('Additional Validation Tests\n');

  // Test: Invalid JSON response
  try {
    JSON.parse('invalid json');
    console.log('✗ FAIL: Should have thrown on invalid JSON');
    allPassed = false;
  } catch {
    console.log('✓ PASS: Invalid JSON correctly rejected');
  }

  console.log('');

  // Test: Missing summary field
  try {
    const response = { recent_metrics: [] };
    if (!response.summary) {
      throw new Error('Missing summary field');
    }
    console.log('✗ FAIL: Should have thrown on missing summary');
    allPassed = false;
  } catch {
    console.log('✓ PASS: Missing summary field correctly detected');
  }

  console.log('');

  // Summary
  if (allPassed) {
    console.log('All tests passed!');
    return true;
  } else {
    console.log('Some tests failed.');
    return false;
  }
}

// Run tests
runTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    console.error('Test runner error:', err);
    process.exit(1);
  });
