/**
 * Worker: Redis `usage:*` → `platform.billing_usage`, luego DEL si insert OK.
 * Requiere: REDIS_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL (u vars del cliente service).
 *
 * Ejecutar: `npm run flush-billing --workspace=@intcloudsysops/api`
 */
import { runFlushBillingUsage } from '../lib/billing/flush-billing-usage';

async function main(): Promise<void> {
  const result = await runFlushBillingUsage();
  // eslint-disable-next-line no-console -- CLI
  console.log(JSON.stringify(result, null, 2));
  if (result.errors.length > 0) {
    process.exitCode = 1;
  }
}

void main().catch((e: unknown) => {
  // eslint-disable-next-line no-console -- CLI
  console.error(e);
  process.exit(1);
});
