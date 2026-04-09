import { getApiBaseUrl } from "./api";
import { requestPortalApi } from "./http";
import type {
  PortalMode,
  PortalTenantPayload,
  PortalUsagePayload,
  PortalUsagePeriod,
} from "./types";

export async function fetchPortalTenant(
  accessToken: string,
): Promise<PortalTenantPayload> {
  return requestPortalApi<PortalTenantPayload>(`${getApiBaseUrl()}/api/portal/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
}

export async function postPortalMode(
  accessToken: string,
  mode: PortalMode,
): Promise<void> {
  await requestPortalApi(`${getApiBaseUrl()}/api/portal/mode`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mode }),
  });
}

export async function fetchPortalUsage(
  accessToken: string,
  period: PortalUsagePeriod = "today",
): Promise<PortalUsagePayload> {
  const qs = new URLSearchParams({ period });
  return requestPortalApi<PortalUsagePayload>(
    `${getApiBaseUrl()}/api/portal/usage?${qs.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
  );
}
