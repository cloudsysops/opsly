import type { User } from "@supabase/supabase-js";

function metadataRecord(meta: unknown): Record<string, unknown> {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return {};
  }
  return meta as Record<string, unknown>;
}

/** Alineado con `apps/api/lib/super-admin-auth.ts`. */
export function isSuperAdminUser(user: User | null | undefined): boolean {
  if (!user) {
    return false;
  }
  const userMeta = metadataRecord(user.user_metadata);
  const appMeta = metadataRecord(user.app_metadata);
  if (userMeta.role === "admin" || appMeta.role === "admin") {
    return true;
  }
  if (userMeta.is_superuser === true || appMeta.is_superuser === true) {
    return true;
  }
  return false;
}
