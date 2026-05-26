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

export {
  buildRecoveryRedirectTo,
  forwardRecoveryToOrigin,
  inviteActivationPathFromUrl,
  isInviteLink,
  isRecoveryLink,
  metadataFromJwtAccessToken,
  resolveRecoveryTargetFromMetadata,
  type RecoveryApp,
  type RecoveryRoutingConfig,
  type RecoveryTarget,
  type TenantRecoveryRule,
} from './tenant-auth-routing.js';

export {
  isTenantSlugMatch,
  tenantIdentityFromUser,
  tenantRoleFromUserMetadata,
  tenantSlugFromUserMetadata,
  type TenantMetadata,
} from './tenant-identity.js';

export {
  isInviteSurfacePath,
  isLoginSurfacePath,
  isPathUnderAuthSurface,
  isRecoverySurfacePath,
  isUpdatePasswordSurfacePath,
  type AuthSurfaceConfig,
} from './tenant-auth-surface.js';

export {
  resolveTenantSiteTarget,
  type TenantSiteRoutingConfig,
  type TenantSiteRule,
  type TenantSiteTarget,
} from './tenant-site-routing.js';
