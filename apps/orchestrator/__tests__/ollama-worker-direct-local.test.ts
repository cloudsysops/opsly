import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  directOllamaBaseUrl,
  directOllamaEnabled,
  directOllamaModel,
} from '../src/workers/OllamaWorker.js';

describe('OllamaWorker direct local mode', () => {
  it('enables direct mode explicitly or for ephemeral compute workers', () => {
    expect(directOllamaEnabled({ OPSLY_OLLAMA_DIRECT: 'true' })).toBe(true);
    expect(directOllamaEnabled({ OPSLY_EPHEMERAL_WORKER: 'true' })).toBe(true);
    expect(directOllamaEnabled({ OPSLY_OLLAMA_DIRECT: 'false' })).toBe(false);
  });

  it('uses only the worker-local Ollama endpoint/model configuration', () => {
    expect(directOllamaBaseUrl({ OLLAMA_URL: 'http://127.0.0.1:11434/' })).toBe(
      'http://127.0.0.1:11434'
    );
    expect(directOllamaModel({ OLLAMA_MODEL: 'qwen2.5-coder:7b' })).toBe(
      'qwen2.5-coder:7b'
    );
  });

  it('fails closed in direct mode instead of falling back to the gateway path', () => {
    const source = readFileSync('apps/orchestrator/src/workers/OllamaWorker.ts', 'utf8');
    expect(source).toContain('json = await callDirectOllama(taskType, prompt)');
    expect(source).toContain('never bounce back to the VPS/cloud chain');
    expect(source).not.toMatch(/callDirectOllama[\s\S]{0,300}catch[\s\S]{0,300}gatewayBaseUrl/);
  });

  it('records zero local cost and physical worker identity evidence', () => {
    const source = readFileSync('apps/orchestrator/src/workers/OllamaWorker.ts', 'utf8');
    expect(source).toContain('cost_usd: 0');
    expect(source).toContain('direct_ollama: directOllamaEnabled()');
    expect(source).toContain('worker_id: process.env.WORKER_ID ?? null');
  });
});
