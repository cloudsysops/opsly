export {
  checkEntitlement,
  grantEntitlement,
  listEntitlements,
  revokeEntitlement,
  type PlatformSupabaseClient,
} from './client.js';
export {
  TenantNotFoundError,
  type EntitlementSource,
  type GrantEntitlementInput,
  type TenantEntitlement,
} from './types.js';
