/**
 * Barrel re-export for @intcloudsysops/content-studio/studio.
 * Admin imports this subpath for Content Studio creator workflow.
 */
export { assertSameTenant } from './src/content-engine/storage.js';
export { brandKitFromPreset } from './src/content-engine/presets.js';
export { evaluateRightsGate } from './src/content-engine/rights.js';
export { listAllTrendCandidates } from './src/content-engine/trends.js';
export {
  listProjectEnvelopes,
  saveProjectEnvelope,
  loadProjectEnvelopeByTenant,
  setProjectApproval,
} from './src/content-engine/storage.js';
export {
  loadAllContentChannelPresets,
} from './src/content-engine/presets.js';
export {
  loadContentCharacters,
  loadContentFormats,
  loadContentPortals,
} from './src/content-engine/taxonomy.js';
export type { ContentProjectEnvelope } from './src/content-engine/types.js';
export type { ContentProjectStatus } from './src/content-engine/types.js';
