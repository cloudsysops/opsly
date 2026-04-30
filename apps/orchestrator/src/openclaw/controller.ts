import type { IntentRequest } from '../types.js';
import { applyOpenClawControlLayer } from './control-layer.js';
import type { OpenClawControllerContract } from './contracts.js';

/**
 * Canonical OpenClaw command-layer controller.
 * Keeps orchestration entrypoints decoupled from lower-level policy modules.
 */
export const runOpenClawController: OpenClawControllerContract = (req: IntentRequest) => {
  return applyOpenClawControlLayer(req);
};
