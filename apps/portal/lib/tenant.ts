import { getApiBaseUrl } from "./api";
import type { PortalMode, PortalTenantPayload } from "./types";

function parseErrorMessage(data: unknown): string {
  if (
    data !== null &&
    typeof data === "object" &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "string"
  ) {
    return (data as { error: string }).error;
  }
  return "Request failed";
}

export async function fetchPortalTenant(
  accessToken: string,
): Promise<PortalTenantPayload> {
  const res = await fetch(`${getApiBaseUrl()}/api/portal/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(parseErrorMessage(data));
  }
  return data as PortalTenantPayload;
}

export async function postPortalMode(
  accessToken: string,
  mode: PortalMode,
): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/api/portal/mode`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mode }),
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(parseErrorMessage(data));
  }
}
