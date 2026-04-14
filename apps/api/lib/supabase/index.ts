import { getServiceClient } from "./client";

export { getServiceClient };
export type {
  Database,
  Json,
  PlanKey,
  Tenant,
  TenantStatus,
  TenantInsert,
  TenantUpdate,
} from "./types";

// Singleton supabase client for backward compatibility
export { getServiceClient as supabase };
