/**
 * Worker: Redis `usage:*` → `platform.billing_usage`, luego DEL si insert OK.
 * Requiere: REDIS_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL (u vars del cliente service).
 *
 * Ejecutar: `npm run flush-billing --workspace=@intcloudsysops/api`
 */
import { runFlushBillingUsage } from "../lib/billing/flush-billing-usage";

async function main(): Promise<void> {
  const result = await runFlushBillingUsage();

  console.log(JSON.stringify(result, null, 2));
  if (result.errors.length > 0) {
    process.exitCode = 1;
  }
}

void main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
