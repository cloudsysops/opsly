import { validateInput, validateOutput, checkForPII } from '../validators/index';
import { scoreQuality } from '../metrics/index';

export interface TestCase {
  name: string;
  input: unknown;
  expectedOutput?: string;
  metadata?: Record<string, any>;
}

export interface TestResult {
  testName: string;
  passed: boolean;
  errors: string[];
  metrics?: any;
  duration: number;
}

export async function runSmokeTests(testCases: TestCase[]): Promise<TestResult[]> {
  const results: TestResult[] = [];

  for (const test of testCases) {
    const start = Date.now();
    const errors: string[] = [];

    // Validate input
    const inputValidation = validateInput(test.input, {});
    if (!inputValidation.valid) {
      errors.push(...inputValidation.errors.map(e => e.message));
    }

    results.push({
      testName: test.name,
      passed: errors.length === 0,
      errors,
      duration: Date.now() - start,
    });
  }

  return results;
}

export async function runRegressionTests(
  testCases: TestCase[]
): Promise<TestResult[]> {
  const results = await runSmokeTests(testCases);

  for (const result of results) {
    // Check for PII in inputs
    const piiErrors = checkForPII(JSON.stringify(result));
    result.errors.push(...piiErrors.map(e => e.message));
    result.passed = result.errors.length === 0;
  }

  return results;
}
