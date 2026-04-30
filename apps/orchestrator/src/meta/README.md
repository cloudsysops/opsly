# Meta-Optimizer: Prompt Self-Improvement Framework

## Overview

The Meta-Optimizer is a Phase 4a (Safe Mode) implementation of autonomous prompt improvement for the Opsly orchestrator. It uses semantic similarity scoring and sandbox validation to evaluate and safely test prompt improvements without persisting changes.

**Key Characteristics:**
- In-memory + Redis metrics only (no persistent prompt changes)
- Embedding-based semantic similarity validation
- Automatic rollback on validation failure or low improvement score
- Conservative scope: dispatch/routing/validation prompts only

## Components

### 1. `prompt-improvement-cycle.ts` (Core Engine)

Main improvement evaluation pipeline with:

- **`evaluatePromptImprovement()`** - Complete evaluation cycle:
  - Fetches embeddings from LLM Gateway (`/v1/embeddings`)
  - Calculates cosine similarity between original and improved prompts
  - Runs sandbox validation against test cases
  - Returns metrics with rollback decision

- **`calculateCosineSimilarity()`** - Semantic similarity scoring
  - Computes dot product of embedding vectors
  - Returns normalized similarity [0, 1] and distance [0, 1]
  - Used to determine if improved prompt matches intent better

- **`validatePromptSandbox()`** - Safety validation
  - Checks improved prompt is not identical to original
  - Verifies core keywords are preserved
  - Validates prompt length is reasonable (50-200% of original)
  - Runs test cases to ensure improved prompt handles expected inputs

- **`calculateImprovementScore()`** - Improvement threshold check
  - Percentage improvement = `(improved_sim - original_sim) / original_sim * 100`
  - **Threshold: +10% improvement required to pass**
  - Returns whether improvement meets `IMPROVEMENT_THRESHOLD_PCT`

### 2. `orchestrator-metrics-store.ts` (Telemetry & Circuit Breaker)

In-memory metrics store with:

- **`recordMetric()`** - Store evaluation results from each cycle
- **`getSummary()`** - Summary statistics per prompt (avg improvement, validation rate, rollback count)
- **`getAllMetrics()`** - Retrieve all evaluation records (for monitoring)
- **`isPromptInCooldown()`** - Circuit breaker pattern
  - Prevents thrashing if a prompt fails repeatedly
  - Tracks rollback count in 5-minute window
  - Triggers cooldown if >= 3 rollbacks in 5 minutes

**Memory Management:**
- Keeps last 100 metrics per prompt
- Automatically compresses old records when limit reached
- Survives orchestrator restart (in-memory only)

## Validation Rules (Rollback Triggers)

A prompt improvement **rolls back** if ANY of these conditions trigger:

1. **Semantic Distance Degrades** - `distance_improved - distance_original > 0.15`
   - Indicates worse match to user intent

2. **Validation Fails** - Any validation error detected
   - Prompt too different from original
   - Lost core keywords
   - Length unreasonable
   - Test cases fail

3. **Test Cases Insufficient** - `< 67% test cases pass`
   - Indicates improved prompt won't handle expected inputs

4. **Improvement Score Below Threshold** - `improvement_pct < 10%`
   - Must show meaningful semantic improvement

5. **LLM Gateway Error** - Timeout or HTTP error
   - Connection failure or embedding service unavailable

## Test Fixtures

### Real-World Test Cases

Located in `__tests__/fixtures/meta-optimizer-test-prompts.ts`:

1. **ROUTING_DISPATCH_PROMPT** (IntentDispatchWorker context)
   - Tests intent routing decisions
   - Validates dispatch to appropriate handler

2. **INTENT_VALIDATION_PROMPT** (Payload structure validation)
   - Tests intent payload validation
   - Checks required fields and types

3. **CONTEXT_ENRICHMENT_PROMPT** (ReAct context building)
   - Tests memory/context enhancement
   - Validates working state enrichment

Each test case includes:
- Original prompt
- Expected keywords for validation
- Test inputs to verify improved prompt handles them

## Health Server Integration

Endpoint: `GET /internal/meta-optimizer/metrics`

Returns:
```json
{
  "success": true,
  "summary": {
    "routing-dispatch": {
      "cycles_evaluated": 5,
      "avg_improvement_pct": 12.5,
      "validation_success_rate": 80.0,
      "rollback_count": 1,
      "last_metric_timestamp": "2026-04-29T16:11:52Z"
    }
  },
  "recent_metrics": [
    {
      "id": "uuid",
      "prompt_name": "routing-dispatch",
      "timestamp": "2026-04-29T16:11:52Z",
      "original_score": 75.2,
      "improved_score": 85.1,
      "improvement_pct": 13.2,
      "validation_passed": true,
      "test_cases_passed": 2,
      "test_cases_total": 2,
      "rollback_triggered": false,
      "embedding_distance": 0.1487,
      "llm_gateway_latency_ms": 342
    }
  ]
}
```

## Usage Example

```typescript
import { evaluatePromptImprovement } from './prompt-improvement-cycle.js';
import { metricsStore } from './orchestrator-metrics-store.js';

const result = await evaluatePromptImprovement({
  promptName: 'routing-dispatch',
  originalPrompt: 'Determine which worker handles this intent...',
  improvedPrompt: 'Analyze tenant context and determine worker routing...',
  testCases: [
    { input: 'deploy to production', expectedKeywords: ['routing', 'dispatch'] },
    { input: 'execute terraform', expectedKeywords: ['routing', 'handler'] },
  ],
});

if (!result.rollback_triggered) {
  console.log(`Improvement: ${result.improvement_pct}%`);
  metricsStore.recordMetric(result);
} else {
  console.log(`Rollback: ${result.rollback_reason}`);
}
```

## Phase 4a Scope (Conservative Mode)

**What's Included:**
- Orchestrator dispatch prompts (`src/workers/**/prompt*.ts`)
- Intent validation prompts
- Context enrichment prompts
- Routing decision prompts

**What's Excluded:**
- System prompts (kernel level)
- User-facing templates (customer-visible content)
- Sensitive instruction sets
- External service prompts

**Expansion Path:**
Once Phase 4a validates stability, Phase 4b can expand to:
- LLM Gateway system prompts
- Planning engine prompts
- Reflection/critique prompts

## Circuit Breaker Pattern

Prevents infinite failure loops:

```typescript
// If prompt fails 3+ times in 5 minutes, block further attempts
if (metricsStore.isPromptInCooldown('routing-dispatch')) {
  console.log('Prompt in cooldown after repeated failures');
  // Fallback to original prompt or alert ops team
}
```

## Future Enhancements

- **Phase 4b**: Expand to more prompt types
- **Phase 4c**: Persistent storage of validated improvements
- **Phase 5**: Automated prompt generation using fine-tuned models
- **Phase 5+**: Multi-modal optimization (code, workflows, data schemas)

## References

- **LLM Gateway**: `apps/llm-gateway/src/embedding-route.ts`
- **ReAct Strategy**: `src/runtime/strategies/react-engine.ts`
- **Orchestrator Engine**: `src/engine.ts`
- **Health Server**: `src/health-server.ts`
