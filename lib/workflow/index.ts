export interface ExecutionContext {
  agentId: string;
  tenantId: string;
  userId: string;
  input: unknown;
  startTime: number;
  timeoutMs: number;
}

export interface ExecutionResult {
  success: boolean;
  output: unknown;
  cost: number;
  tokensUsed: number;
  durationMs: number;
  error?: string;
}

export async function executeWithTimeout(
  fn: () => Promise<unknown>,
  timeoutMs: number,
  agentId: string
): Promise<ExecutionResult> {
  const startTime = Date.now();

  try {
    const result = await Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Execution timeout')), timeoutMs)
      ),
    ]);

    return {
      success: true,
      output: result,
      cost: 0, // Calculate real cost
      tokensUsed: 0,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      output: null,
      cost: 0,
      tokensUsed: 0,
      durationMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
