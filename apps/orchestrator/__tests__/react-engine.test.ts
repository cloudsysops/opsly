import { describe, expect, it, vi } from 'vitest';
import {
  parseReActModelOutput,
  runReActStrategy,
  type ReActLlmGatewayClient,
} from '../src/runtime/strategies/react-engine.js';
import type { AgentActionPort } from '../src/runtime/interfaces/agent-action-port.js';
import type { MemoryInterface } from '../src/runtime/interfaces/memory.interface.js';

describe('parseReActModelOutput', () => {
  it('parses final_answer', () => {
    const r = parseReActModelOutput('{"final_answer":"done"}');
    expect(r).toEqual({ kind: 'final_answer', answer: 'done' });
  });

  it('parses action and args', () => {
    const r = parseReActModelOutput('{"action":"echo","args":{"x":1},"thought":"try echo"}');
    expect(r).toEqual({
      kind: 'action',
      actionName: 'echo',
      args: { x: 1 },
      thought: 'try echo',
    });
  });

  it('strips markdown fences', () => {
    const r = parseReActModelOutput('```json\n{"final_answer":"ok"}\n```');
    expect(r).toEqual({ kind: 'final_answer', answer: 'ok' });
  });

  it('returns parse_error for invalid JSON', () => {
    const r = parseReActModelOutput('not json');
    expect(r.kind).toBe('parse_error');
  });
});

describe('runReActStrategy', () => {
  it('returns completed when model emits final_answer', async () => {
    const llm: ReActLlmGatewayClient = {
      complete: vi.fn().mockResolvedValue('{"final_answer":"hello"}'),
    };
    const actionPort: AgentActionPort = {
      executeAction: vi.fn(),
    };
    const memory: MemoryInterface = {
      getWorkingContext: vi.fn().mockResolvedValue({}),
      appendObservation: vi.fn().mockResolvedValue(undefined),
      querySemantic: vi.fn().mockResolvedValue([]),
    };

    const result = await runReActStrategy('t1', 's1', 'Say hello', actionPort, memory, llm);

    expect(result.state).toBe('completed');
    expect(result.finalAnswer).toBe('hello');
    expect(actionPort.executeAction).not.toHaveBeenCalled();
  });

  it('runs one action then completes', async () => {
    const llm: ReActLlmGatewayClient = {
      complete: vi
        .fn()
        .mockResolvedValueOnce('{"action":"noop","args":{},"thought":"need tool"}')
        .mockResolvedValueOnce('{"final_answer":"after tool"}'),
    };
    const actionPort: AgentActionPort = {
      executeAction: vi.fn().mockResolvedValue({
        success: true,
        observation: 'tool ok',
      }),
    };
    const memory: MemoryInterface = {
      getWorkingContext: vi.fn().mockResolvedValue({}),
      appendObservation: vi.fn().mockResolvedValue(undefined),
      querySemantic: vi.fn().mockResolvedValue([]),
    };

    const result = await runReActStrategy('t1', 's1', 'Task', actionPort, memory, llm);

    expect(result.state).toBe('completed');
    expect(result.finalAnswer).toBe('after tool');
    expect(actionPort.executeAction).toHaveBeenCalledTimes(1);
    expect(memory.appendObservation).toHaveBeenCalled();
  });

  it('fails when max steps exhausted', async () => {
    const llm: ReActLlmGatewayClient = {
      complete: vi.fn().mockResolvedValue('{"action":"loop","args":{}}'),
    };
    const actionPort: AgentActionPort = {
      executeAction: vi.fn().mockResolvedValue({
        success: true,
        observation: 'ok',
      }),
    };
    const memory: MemoryInterface = {
      getWorkingContext: vi.fn().mockResolvedValue({}),
      appendObservation: vi.fn().mockResolvedValue(undefined),
      querySemantic: vi.fn().mockResolvedValue([]),
    };

    const result = await runReActStrategy('t1', 's1', 'Task', actionPort, memory, llm, {
      maxSteps: 3,
    });

    expect(result.state).toBe('failed');
    expect(result.errorMessage).toMatch(/maximum steps/);
    expect(llm.complete).toHaveBeenCalledTimes(3);
  });

  it('continues after action failure and records observation', async () => {
    const llm: ReActLlmGatewayClient = {
      complete: vi
        .fn()
        .mockResolvedValueOnce('{"action":"bad","args":{}}')
        .mockResolvedValueOnce('{"final_answer":"recovered"}'),
    };
    const actionPort: AgentActionPort = {
      executeAction: vi.fn().mockResolvedValue({
        success: false,
        error: 'boom',
        observation: 'failed',
      }),
    };
    const memory: MemoryInterface = {
      getWorkingContext: vi.fn().mockResolvedValue({}),
      appendObservation: vi.fn().mockResolvedValue(undefined),
      querySemantic: vi.fn().mockResolvedValue([]),
    };

    const result = await runReActStrategy('t1', 's1', 'Task', actionPort, memory, llm);

    expect(result.state).toBe('completed');
    expect(memory.appendObservation).toHaveBeenCalledWith(
      't1',
      's1',
      0,
      expect.stringContaining('[action error]')
    );
  });
});
