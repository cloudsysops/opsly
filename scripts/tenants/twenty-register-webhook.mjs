#!/usr/bin/env node
/**
 * Registers a Twenty CRM webhook subscription pointing at this tenant's
 * /api/webhooks/twenty endpoint, so opportunity/task changes made directly
 * in Twenty sync back into Opsly (reverse of the existing Opsly->Twenty
 * sync in twenty-stage-sync.ts / twenty-followup-sync.ts).
 *
 * Generates a random webhook secret locally (never accepted via argv, to
 * avoid shell-history/process-list exposure — same convention as
 * twenty-apply-api-key.sh) and prints it once so the operator can put it in
 * Doppler as TWENTY_<TENANT>_WEBHOOK_SECRET. Requires TWENTY_API_KEY and
 * TWENTY_API_URL (or the tenant-specific variants) in the environment.
 *
 * Dry-run by default; --write actually calls the Twenty API.
 *
 * Usage:
 *   node scripts/tenants/twenty-register-webhook.mjs \
 *     --tenant peskids --target-url https://www.peskids.com/api/webhooks/twenty \
 *     [--operations '*.opportunities,*.tasks'] [--write]
 */
import { randomBytes } from 'node:crypto';
import process from 'node:process';

function nextValue(argv, i, flag) {
  const value = argv[i + 1];
  if (value === undefined || value.startsWith('--')) {
    console.error(`twenty-register-webhook: ${flag} requires a value`);
    process.exit(1);
  }
  return value;
}

function parseArgs(argv) {
  const args = { tenant: 'peskids', operations: '*.opportunities,*.tasks', write: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--tenant':
        args.tenant = nextValue(argv, i, arg);
        i += 1;
        break;
      case '--target-url':
        args.targetUrl = nextValue(argv, i, arg);
        i += 1;
        break;
      case '--operations':
        args.operations = nextValue(argv, i, arg);
        i += 1;
        break;
      case '--write':
        args.write = true;
        break;
      default:
        console.error(`twenty-register-webhook: unknown argument: ${arg}`);
        process.exit(1);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.targetUrl) {
    console.error('twenty-register-webhook: --target-url is required');
    process.exit(1);
  }
  if (args.tenant !== 'peskids' && args.tenant !== 'icso') {
    console.error('twenty-register-webhook: --tenant must be "peskids" or "icso"');
    process.exit(1);
  }

  const { TwentyClient, resolveTwentyEnv, resolveTwentyEnvForIntcloudsysops } = await import(
    '@intcloudsysops/services/twenty'
  );

  const env =
    args.tenant === 'peskids' ? resolveTwentyEnv() : resolveTwentyEnvForIntcloudsysops();
  if (!env.enabled) {
    console.error(`twenty-register-webhook: Twenty not configured/enabled for "${args.tenant}"`);
    process.exit(1);
  }

  const operations = args.operations.split(',').map((op) => op.trim()).filter(Boolean);
  const secret = randomBytes(32).toString('hex');
  const envVarName =
    args.tenant === 'peskids' ? 'TWENTY_PESKIDS_WEBHOOK_SECRET' : 'TWENTY_INTCLOUDSYSOPS_WEBHOOK_SECRET';

  console.log(`\nTwenty webhook registration for "${args.tenant}" — ${args.write ? 'WRITING' : 'DRY RUN (pass --write to actually create)'}\n`);
  console.log(`  targetUrl:  ${args.targetUrl}`);
  console.log(`  operations: ${operations.join(', ')}`);
  console.log(`  secret:     ${secret}`);
  console.log(`\n  After running with --write, set ${envVarName}=<the secret above> in Doppler`);
  console.log(`  (the route can't verify deliveries without it).\n`);

  if (!args.write) {
    console.log('Nothing was created. Re-run with --write to register the webhook.\n');
    return;
  }

  const client = new TwentyClient(env.apiKey, env.baseUrl);
  const webhook = await client.createWebhookSubscription({
    targetUrl: args.targetUrl,
    operations,
    description: `Opsly reverse sync (${args.tenant})`,
    secret,
  });

  console.log(`Created webhook subscription: ${webhook.id}\n`);
}

main().catch((err) => {
  console.error('twenty-register-webhook: failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
