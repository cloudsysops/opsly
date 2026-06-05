/**
 * Provision GoHighLevel resources from a tenant manifest (tags, custom fields, calendars, …).
 *
 * Default is dry-run. Pass --execute to apply changes (requires Doppler / env vars).
 *
 * Examples:
 *   doppler run --project ops-intcloudsysops --config prd -- \
 *     npm run ghl-provision -- --manifest docs/examples/intake/peskids.json --tenant peskids
 *
 *   ./scripts/ghl-provision-peskids.sh --execute
 *   ./scripts/ghl-provision-intcloudsysops.sh --dry-run
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import {
  GoHighLevelClient,
  resolveGoHighLevelEnv,
  resolveGoHighLevelPeskidsEnv,
} from '../lib/services/gohighlevel/index.ts';
import {
  GhlProvisioningAgent,
  validateManifest,
  writeProvisioningReports,
} from '../packages/provisioning/src/index.ts';

loadEnv({ path: resolve(process.cwd(), '.env') });

type GhlProvisionTenant = 'peskids' | 'agency' | 'intcloudsysops';

interface CliOptions {
  manifestPath: string;
  tenant: GhlProvisionTenant;
  locationId?: string;
  dryRun: boolean;
  outputDir: string;
}

function printUsage(): void {
  console.error(`Usage: npm run ghl-provision -- [options]

Options:
  --manifest <path>     JSON manifest (required)
  --tenant <slug>       peskids | intcloudsysops | agency (default: peskids)
  --location <id>         Override GHL location id
  --output-dir <path>     Report directory (default: docs/artifacts/provisioning)
  --dry-run               Plan only (default)
  --execute               Apply creates (tags, fields, calendars)
  -h, --help              Show help
`);
}

function parseTenant(value: string): GhlProvisionTenant {
  if (value === 'peskids' || value === 'agency' || value === 'intcloudsysops') {
    return value;
  }
  throw new Error('--tenant must be peskids, intcloudsysops, or agency');
}

function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);
  let manifestPath = '';
  let tenant: GhlProvisionTenant = 'peskids';
  let locationId: string | undefined;
  let dryRun = true;
  let outputDir = 'docs/artifacts/provisioning';

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
    if (arg === '--manifest') {
      manifestPath = args[i + 1] ?? '';
      i += 1;
      continue;
    }
    if (arg === '--tenant') {
      tenant = parseTenant(args[i + 1] ?? '');
      i += 1;
      continue;
    }
    if (arg === '--location') {
      locationId = args[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--output-dir') {
      outputDir = args[i + 1] ?? outputDir;
      i += 1;
      continue;
    }
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--execute') {
      dryRun = false;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!manifestPath) {
    printUsage();
    throw new Error('--manifest is required');
  }

  return {
    manifestPath,
    tenant,
    locationId,
    dryRun,
    outputDir,
  };
}

function resolveTenantEnv(tenant: GhlProvisionTenant): {
  apiKey: string;
  baseUrl: string;
  apiVersion: string;
  locationId: string;
} {
  const env =
    tenant === 'peskids' ? resolveGoHighLevelPeskidsEnv() : resolveGoHighLevelEnv();
  if (!env.apiKey) {
    throw new Error(
      tenant === 'peskids'
        ? 'GOHIGHLEVEL_PESKIDS_API_KEY is required (Doppler prd)'
        : 'GOHIGHLEVEL_API_KEY is required (Doppler prd)'
    );
  }
  return env;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv);
  const raw = await readFile(resolve(process.cwd(), options.manifestPath), 'utf8');
  const manifest = validateManifest(JSON.parse(raw) as unknown);

  const env = resolveTenantEnv(options.tenant);
  const locationId = options.locationId?.trim() || env.locationId;
  if (!locationId) {
    throw new Error('Location id missing — set GOHIGHLEVEL_*_LOCATION_ID or pass --location');
  }

  const client = new GoHighLevelClient(env.apiKey, env.baseUrl, {
    locationId,
    apiVersion: env.apiVersion,
  });

  const agent = new GhlProvisioningAgent(client, manifest, {
    dryRun: options.dryRun,
    locationId,
  });

  const report = await agent.run();
  const { jsonPath, mdPath } = await writeProvisioningReports(report, options.outputDir);

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: report.dryRun ? 'dry_run' : 'execute',
        tenant: options.tenant,
        locationId,
        summary: report.summary,
        reports: { jsonPath, mdPath },
      },
      null,
      2
    )
  );

  if (report.summary.blocked > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ghl-provision: ${message}`);
  process.exit(1);
});
