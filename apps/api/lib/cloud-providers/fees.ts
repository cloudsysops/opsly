import { PROVISIONING_OPSLY_FEE_USD } from "../constants";
import type { ProvisioningPlan } from "./interface.js";

/** Fee de gestión Opsly (USD/mes) por plan de aprovisionamiento; configurable por env. */
export function opslyManagementFeeUsd(plan: ProvisioningPlan): number {
  const raw = process.env.OPSLY_MANAGEMENT_FEE_USD;
  if (raw !== undefined && raw.trim() !== "") {
    const n = Number.parseFloat(raw);
    if (Number.isFinite(n) && n >= 0) {
      return n;
    }
  }
  switch (plan) {
    case "free-tier":
      return PROVISIONING_OPSLY_FEE_USD.FREE_TIER_DEFAULT;
    case "serverless-starter":
      return PROVISIONING_OPSLY_FEE_USD.SERVERLESS_STARTER_DEFAULT;
    default: {
      const _exhaustive: never = plan;
      return _exhaustive;
    }
  }
}
