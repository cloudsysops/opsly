import type { IntentRequest } from '../types.js';
import { applyOpenClawControlLayer } from './control-layer.js';
import type { OpenClawControllerContract } from './contracts.js';

/**
 * Canonical OpenClaw command-layer controller.
 * Keeps orchestration entrypoints decoupled from lower-level policy modules.
 */
export function runOpenClawController(
  req: IntentRequest
): ReturnType<OpenClawControllerContract> {
  return applyOpenClawControlLayer(req);
}
