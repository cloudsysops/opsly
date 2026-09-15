import { describe, expect, it, vi } from 'vitest';
import { startOrchestratorHeartbeatLoop } from '../infra/heartbeat.js';

describe('startOrchestratorHeartbeatLoop', () => {
  it('records immediately and repeatedly until stopped', async () => {
    vi.useFakeTimers();
    const record = vi.fn(async () => undefined);

    const stop = startOrchestratorHeartbeatLoop(
      'mac-local-agents-worker',
      { role: 'worker' },
      { intervalMs: 20_000, record }
    );

    await Promise.resolve();
    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenLastCalledWith('mac-local-agents-worker', { role: 'worker' });

    await vi.advanceTimersByTimeAsync(20_000);
    expect(record).toHaveBeenCalledTimes(2);

    stop();
    await vi.advanceTimersByTimeAsync(40_000);
    expect(record).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('reports recorder errors without crashing the loop', async () => {
    vi.useFakeTimers();
    const onError = vi.fn();
    const record = vi.fn(async () => {
      throw new Error('redis unavailable');
    });

    const stop = startOrchestratorHeartbeatLoop(
      'test-service',
      {},
      { intervalMs: 20_000, record, onError }
    );

    await Promise.resolve();
    await Promise.resolve();
    expect(onError).toHaveBeenCalledTimes(1);

    stop();
    vi.useRealTimers();
  });
});
