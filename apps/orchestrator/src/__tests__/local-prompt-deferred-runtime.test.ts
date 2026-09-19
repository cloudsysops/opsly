import { describe, expect, it } from 'vitest';
import { canQueueForDeferredRuntime } from '../http/routes/local.js';

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
});
