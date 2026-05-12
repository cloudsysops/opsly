import type { IntentRequest } from '../types.js';
import { applyOpenClawControlLayer } from './control-layer.js';
import type { OpenClawControlDecisionContract } from './contracts.js';

/**
 * Canonical OpenClaw command-layer controller.
 * Keeps orchestration entrypoints decoupled from lower-level policy modules.
 * Now applies validation feedback to adapt routing based on historical metrics.
 */
export async function runOpenClawController(
  req: IntentRequest
): Promise<OpenClawControlDecisionContract> {
  return applyOpenClawControlLayer(req);
}
