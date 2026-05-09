export interface TestCase {
  name: string;
  input: unknown;
  expectedOutput: unknown;
  metadata?: Record<string, any>;
}

export interface TestResult {
  testName: string;
  passed: boolean;
  actual: unknown;
  expected: unknown;
  duration: number;
  error?: string;
}

export async function runTest(testCase: TestCase, fn: (input: unknown) => Promise<unknown>): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const actual = await fn(testCase.input);
    const passed = JSON.stringify(actual) === JSON.stringify(testCase.expectedOutput);
    
    return {
      testName: testCase.name,
      passed,
      actual,
      expected: testCase.expectedOutput,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      testName: testCase.name,
      passed: false,
      actual: null,
      expected: testCase.expectedOutput,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
