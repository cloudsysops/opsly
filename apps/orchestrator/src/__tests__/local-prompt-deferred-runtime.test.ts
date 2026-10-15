import { describe, expect, it } from 'vitest';
import {
  canQueueForDeferredRuntime,
  canQueueGamerPlaneDeferred,
} from '../lib/local-worker-utils.js';

describe('deferred local-agent queue admission', () => {
  it('allows queueing when a distributed runtime is temporarily unknown or unreachable', () => {
    expect(canQueueForDeferredRuntime('runtime_unknown')).toBe(true);
    expect(canQueueForDeferredRuntime('runtime_unreachable')).toBe(true);
  });

  it('still fails closed for unhealthy or policy-blocked runtimes', () => {
    expect(canQueueForDeferredRuntime('runtime_unhealthy')).toBe(false);
    expect(canQueueForDeferredRuntime('registry_disabled')).toBe(false);
    expect(canQueueForDeferredRuntime('unsupported_adapter')).toBe(false);
    expect(canQueueForDeferredRuntime(null)).toBe(false);
  });

  it('Gamer plane treats unhealthy OpenCode as queueable (fail-closed, no Mac fallback)', () => {
    expect(canQueueGamerPlaneDeferred('runtime_unhealthy')).toBe(true);
    expect(canQueueGamerPlaneDeferred('runtime_unreachable')).toBe(true);
    expect(canQueueGamerPlaneDeferred('runtime_unknown')).toBe(true);
    expect(canQueueGamerPlaneDeferred('registry_disabled')).toBe(false);
    expect(canQueueGamerPlaneDeferred(null)).toBe(false);
  });
});
