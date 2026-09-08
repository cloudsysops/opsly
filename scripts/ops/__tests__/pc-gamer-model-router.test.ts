import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  canScheduleHeavyJob,
  canonicalModelName,
  isApprovedModel,
  modelForTask,
  resolvePcGamerModel,
} from '../pc-gamer-model-router';

describe('PC gamer model routing', () => {
  it('canonicalizes local Ollama model names', () => {
    assert.equal(canonicalModelName('qwen3:14b'), 'ollama/qwen3:14b');
    assert.equal(canonicalModelName('ollama/qwen3:8b'), 'ollama/qwen3:8b');
  });

  it('routes capabilities to the canonical models', () => {
    assert.equal(modelForTask('code'), 'ollama/qwen3:14b');
    assert.equal(modelForTask('classify'), 'ollama/qwen3:8b');
    assert.equal(modelForTask('vision'), 'ollama/gemma3:12b');
    assert.equal(modelForTask('fallback'), 'ollama/llama3.2:latest');
  });

  it('prefers explicit model, then task route, then environment default', () => {
    assert.equal(
      resolvePcGamerModel({ requestedModel: 'qwen3:8b', taskType: 'code' }).model,
      'ollama/qwen3:8b'
    );
    assert.equal(
      resolvePcGamerModel({ taskType: 'code', environmentModel: 'ollama/llama3.2:latest' }).model,
      'ollama/qwen3:14b'
    );
    assert.equal(
      resolvePcGamerModel({ environmentModel: 'ollama/llama3.2:latest' }).model,
      'ollama/llama3.2:latest'
    );
  });

  it('rejects unapproved models', () => {
    assert.equal(isApprovedModel('qwen3:30b'), false);
    assert.throws(() => resolvePcGamerModel({ requestedModel: 'qwen3:30b' }), /not approved/);
  });

  it('enforces one heavy job and a free-VRAM safety margin', () => {
    assert.deepEqual(canScheduleHeavyJob({ model: 'qwen3:14b', activeHeavyJobs: 1 }), {
      ok: false,
      reason: 'heavy_model_concurrency_limit',
    });
    assert.deepEqual(
      canScheduleHeavyJob({
        model: 'gemma3:12b',
        activeHeavyJobs: 0,
        vramTotalGb: 16.3,
        vramUsedGb: 14,
      }),
      {
        ok: false,
        reason: 'insufficient_free_vram',
      }
    );
    assert.deepEqual(
      canScheduleHeavyJob({
        model: 'qwen3:8b',
        activeHeavyJobs: 1,
        vramTotalGb: 16.3,
        vramUsedGb: 15,
      }),
      { ok: true }
    );
  });
});
