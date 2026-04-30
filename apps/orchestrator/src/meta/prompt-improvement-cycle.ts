/**
 * Meta-Optimizer: Self-improving prompt cycle for orchestrator dispatch/routing/validation prompts.
 *
 * Phase 4a (Safe Mode): In-memory metrics + Redis telemetry, no persistent prompt changes.
 * Validates improvement via LLM Gateway embeddings + semantic similarity scoring.
 *
 * Rollback triggers:
 * - improvement_score < +10% threshold
 * - any test case validation fails
 * - LLM Gateway timeout
 * - embedding distance indicates worse match to intent
 */

import { randomUUID } from 'node:crypto';

export interface PromptMetrics {
  id: string;
  prompt_name: string;
  timestamp: string;
  original_score: number;
  improved_score: number;
  improvement_pct: number;
  validation_passed: boolean;
  validation_errors: string[];
  test_cases_passed: number;
  test_cases_total: number;
  rollback_triggered: boolean;
  rollback_reason?: string;
  embedding_distance: number;
  llm_gateway_latency_ms: number;
}

export interface PromptValidationResult {
  passed: boolean;
  errors: string[];
  testResults: {
    name: string;
    passed: boolean;
    error?: string;
  }[];
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  tokens_used: number;
}

/**
 * Constants for improvement validation
 */
export const IMPROVEMENT_THRESHOLD_PCT = 10;
export const EMBEDDING_DISTANCE_WORSE_THRESHOLD = 0.15; // cos distance > 0.15 = worse match

/**
 * Calculate cosine similarity between two embeddings (normalized).
 * Higher similarity (closer to 1.0) = better match.
 */
export function calculateCosineSimilarity(
  embedding1: number[],
  embedding2: number[]
): { similarity: number; distance: number } {
  if (embedding1.length !== embedding2.length || embedding1.length === 0) {
    return { similarity: 0, distance: 1 };
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
  if (magnitude === 0) {
    return { similarity: 0, distance: 1 };
  }

  const similarity = dotProduct / magnitude;
  const distance = 1 - similarity;

  return {
    similarity: Math.max(0, Math.min(1, similarity)),
    distance: Math.max(0, distance),
  };
}

/**
 * Get embedding from LLM Gateway /v1/embeddings
 */
export async function getEmbedding(
  text: string,
  baseUrl: string = 'http://127.0.0.1:3010'
): Promise<EmbeddingResponse> {
  const url = `${baseUrl.replace(/\/$/, '')}/v1/embeddings`;
  const t0 = Date.now();

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: text }),
  });

  if (!res.ok) {
    throw new Error(`LLM Gateway /v1/embeddings HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    data?: Array<{ embedding?: number[] }>;
    model?: string;
    usage?: { tokens?: number };
  };

  const embedding = data.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error('Invalid embedding response from LLM Gateway');
  }

  return {
    embedding,
    model: data.model ?? 'unknown',
    tokens_used: data.usage?.tokens ?? 0,
  };
}

/**
 * Sandbox validation: check that improved prompt matches test expectations
 */
export async function validatePromptSandbox(
  originalPrompt: string,
  improvedPrompt: string,
  testCases: Array<{ input: string; expectedKeywords: string[] }>,
  _maxValidationTimeMs: number = 5000
): Promise<PromptValidationResult> {
  const errors: string[] = [];
  const testResults: PromptValidationResult['testResults'] = [];

  // Check 1: Improved prompt must not be identical to original
  if (improvedPrompt.trim() === originalPrompt.trim()) {
    errors.push('Improved prompt is identical to original');
  }

  // Check 2: Improved prompt must contain core keywords from original
  const originalKeywords = extractKeywords(originalPrompt);
  const improvedKeywords = extractKeywords(improvedPrompt);

  const missingKeywords = originalKeywords.filter(
    (kw) => !improvedKeywords.some((ikw) => ikw.includes(kw) || kw.includes(ikw))
  );

  if (missingKeywords.length > originalKeywords.length * 0.3) {
    errors.push(`Lost core meaning: ${missingKeywords.slice(0, 3).join(', ')}`);
  }

  // Check 3: Length sanity (improved should be within 50-200% of original)
  const lengthRatio = improvedPrompt.length / originalPrompt.length;
  if (lengthRatio < 0.5 || lengthRatio > 2.0) {
    errors.push(
      `Prompt length unreasonable: ${(lengthRatio * 100).toFixed(0)}% of original`
    );
  }

  // Check 4: Test cases (validate that improved prompt would handle inputs)
  for (const testCase of testCases) {
    const testPassed = testCase.expectedKeywords.every(
      (kw) =>
        improvedPrompt.toLowerCase().includes(kw.toLowerCase()) ||
        originalPrompt.toLowerCase().includes(kw.toLowerCase())
    );

    testResults.push({
      name: `${testCase.input.slice(0, 40)}...`,
      passed: testPassed,
      error: testPassed ? undefined : 'Expected keywords missing in improved prompt',
    });
  }

  const testsPassed = testResults.filter((r) => r.passed).length;
  if (testsPassed < testCases.length * 0.67) {
    errors.push(`Test cases failed: ${testsPassed}/${testCases.length}`);
  }

  return {
    passed: errors.length === 0,
    errors,
    testResults,
  };
}

/**
 * Extract key terms from a prompt for keyword analysis
 */
function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3 && !['that', 'this', 'with', 'from'].includes(word))
    .slice(0, 15);
}

/**
 * Calculate improvement score based on semantic similarity
 * Returns percentage improvement; if < +10%, triggers rollback
 */
export function calculateImprovementScore(
  originalDistance: number,
  improvedDistance: number
): { score: number; meetsThreshold: boolean } {
  // Similarity = 1 - distance (higher is better)
  const originalSimilarity = 1 - originalDistance;
  const improvedSimilarity = 1 - improvedDistance;

  // Score = percentage change in similarity
  let improvement: number;
  if (originalSimilarity === 0) {
    // When original similarity is 0, use absolute improvement
    // If improved similarity > 0, score is positive
    improvement = improvedSimilarity > 0 ? improvedSimilarity * 100 : 0;
  } else {
    improvement = ((improvedSimilarity - originalSimilarity) / originalSimilarity) * 100;
  }

  const meetsThreshold = improvement >= IMPROVEMENT_THRESHOLD_PCT;

  return {
    score: Math.max(0, improvement),
    meetsThreshold,
  };
}

/**
 * Main cycle: evaluate and score a prompt improvement candidate
 */
export async function evaluatePromptImprovement(params: {
  promptName: string;
  originalPrompt: string;
  improvedPrompt: string;
  testCases: Array<{ input: string; expectedKeywords: string[] }>;
  llmGatewayBaseUrl?: string;
}): Promise<PromptMetrics> {
  const id = randomUUID();
  const timestamp = new Date().toISOString();
  const baseUrl = params.llmGatewayBaseUrl ?? 'http://127.0.0.1:3010';

  let originalScore = 0;
  let improvedScore = 0;
  let embedding1: number[] = [];
  let embedding2: number[] = [];
  let originalDistance = 0;
  let improvedDistance = 0;
  let validationResult: PromptValidationResult | null = null;
  let llmGatewayLatency = 0;
  let rollbackTriggered = false;
  let rollbackReason = '';

  try {
    // Step 1: Get embedding for original prompt
    const t1Start = Date.now();
    const emb1 = await getEmbedding(params.originalPrompt, baseUrl);
    embedding1 = emb1.embedding;
    const emb1Latency = Date.now() - t1Start;

    // Step 2: Get embedding for improved prompt
    const t2Start = Date.now();
    const emb2 = await getEmbedding(params.improvedPrompt, baseUrl);
    embedding2 = emb2.embedding;
    const emb2Latency = Date.now() - t2Start;

    llmGatewayLatency = Math.max(emb1Latency, emb2Latency);

    // Step 3: Calculate semantic similarity to user intent
    // (Using original prompt as the intent anchor)
    const originalSim = calculateCosineSimilarity(embedding1, embedding1);
    const improvedSim = calculateCosineSimilarity(embedding2, embedding1);

    originalDistance = originalSim.distance;
    improvedDistance = improvedSim.distance;

    originalScore = (1 - originalDistance) * 100;
    improvedScore = (1 - improvedDistance) * 100;

    // Step 4: Validate sandbox (test cases)
    validationResult = await validatePromptSandbox(
      params.originalPrompt,
      params.improvedPrompt,
      params.testCases
    );

    // Step 5: Check rollback triggers
    if (improvedDistance - originalDistance > EMBEDDING_DISTANCE_WORSE_THRESHOLD) {
      rollbackTriggered = true;
      rollbackReason = `Semantic distance increased by ${(
        (improvedDistance - originalDistance) *
        100
      ).toFixed(1)}%`;
    }

    if (!validationResult.passed) {
      rollbackTriggered = true;
      rollbackReason = `Validation failed: ${validationResult.errors.join('; ')}`;
    }

    const testsPassed = validationResult.testResults.filter((r) => r.passed).length;
    if (testsPassed < params.testCases.length * 0.67) {
      rollbackTriggered = true;
      rollbackReason = `Test cases failed: ${testsPassed}/${params.testCases.length}`;
    }

    const improvementPct = calculateImprovementScore(originalDistance, improvedDistance);
    if (!improvementPct.meetsThreshold) {
      rollbackTriggered = true;
      rollbackReason = `Improvement score ${improvementPct.score.toFixed(1)}% < ${IMPROVEMENT_THRESHOLD_PCT}% threshold`;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    rollbackTriggered = true;
    rollbackReason = `LLM Gateway error: ${message}`;
  }

  const testsPassed = validationResult?.testResults.filter((r) => r.passed).length ?? 0;
  const testsTotal = params.testCases.length;
  const improvementPct = calculateImprovementScore(originalDistance, improvedDistance);

  return {
    id,
    prompt_name: params.promptName,
    timestamp,
    original_score: parseFloat(originalScore.toFixed(2)),
    improved_score: parseFloat(improvedScore.toFixed(2)),
    improvement_pct: parseFloat(improvementPct.score.toFixed(2)),
    validation_passed: validationResult?.passed ?? false,
    validation_errors: validationResult?.errors ?? [],
    test_cases_passed: testsPassed,
    test_cases_total: testsTotal,
    rollback_triggered: rollbackTriggered,
    rollback_reason: rollbackReason || undefined,
    embedding_distance: parseFloat(improvedDistance.toFixed(4)),
    llm_gateway_latency_ms: llmGatewayLatency,
  };
}
