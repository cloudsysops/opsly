export {
  commandExists,
  createDefaultDeps,
  detectEnvironment,
  detectOs,
  generateRecommendation,
  toMissionControlPayload,
  validateEnvironment,
  type DetectorDeps,
  type OpsOs,
  type RuntimeProfile,
  type RuntimeRecommendation,
  type SystemInfo,
} from './environment-detector.js';

export {
  detectCapabilityRegistry,
  type CapabilityCategory,
  type CapabilityPresence,
  type CapabilityRegistry,
  type RuntimeCapability,
} from './capability-registry.js';
