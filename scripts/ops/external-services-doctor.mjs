#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function expandHome(value, homeDir = os.homedir()) {
  return String(value ?? '').replace(/^~(?=\/|$)/, homeDir);
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

async function git(args, cwd, execFn = execFileAsync) {
  try {
    const { stdout } = await execFn('git', args, { cwd });
    return String(stdout).trim();
  } catch {
    return null;
  }
}

export async function inspectExternalService(key, config, options = {}) {
  const homeDir = options.homeDir ?? os.homedir();
  const execFn = options.execFn ?? execFileAsync;
  const installPath = expandHome(config.installPath, homeDir);
  const result = {
    id: key,
    display_name: config.displayName ?? key,
    role: config.role ?? null,
    reviewed_ref: config.reviewedRef ?? null,
    install_path: installPath,
    state: 'missing',
    blockers: [],
    warnings: [],
    current_sha: null,
    current_tag: null,
    pinned_sha: null,
    pinned_tag: null,
  };

  try {
    const stat = await fs.stat(path.join(installPath, '.git'));
    if (!stat) return result;
  } catch {
    result.warnings.push('service not cloned');
    return result;
  }

  const [sha, tag, branch] = await Promise.all([
    git(['rev-parse', 'HEAD'], installPath, execFn),
    git(['describe', '--tags', '--exact-match'], installPath, execFn),
    git(['rev-parse', '--abbrev-ref', 'HEAD'], installPath, execFn),
  ]);
  result.current_sha = sha;
  result.current_tag = tag;

  if (!sha) result.blockers.push('cannot resolve git HEAD');
  if (!tag) result.blockers.push('checkout is not an exact tag');
  if (branch && branch !== 'HEAD') {
    result.blockers.push(`checkout follows branch '${branch}' instead of detached reviewed tag`);
  }

  const pin = await readJson(path.join(installPath, '.opsly-pin.json'));
  if (!pin) {
    result.blockers.push('missing .opsly-pin.json');
  } else {
    result.pinned_sha = pin.resolved_sha ?? null;
    result.pinned_tag = pin.resolved_tag ?? null;
    if (pin.repository && pin.repository !== config.repository) {
      result.blockers.push('pin repository differs from registry');
    }
    if (pin.reviewed_ref && pin.reviewed_ref !== config.reviewedRef) {
      result.blockers.push('pin reviewed_ref differs from registry');
    }
    if (sha && pin.resolved_sha && sha !== pin.resolved_sha) {
      result.blockers.push('current SHA differs from pinned SHA');
    }
    if (tag && pin.resolved_tag && tag !== pin.resolved_tag) {
      result.blockers.push('current tag differs from pinned tag');
    }
  }

  if (tag && config.reviewedRef && tag !== config.reviewedRef) {
    result.blockers.push(`current tag '${tag}' != reviewedRef '${config.reviewedRef}'`);
  }

  result.state = result.blockers.length > 0 ? 'drifted' : 'ready';
  return result;
}

export async function inspectExternalServices(options = {}) {
  const registryPath =
    options.registryPath ??
    process.env.OPSLY_EXTERNAL_SERVICES_REGISTRY ??
    path.resolve('config/external-services.json');
  const registry = await readJson(registryPath);
  if (!registry?.services) {
    throw new Error(`invalid external services registry: ${registryPath}`);
  }

  const services = [];
  for (const [key, config] of Object.entries(registry.services)) {
    services.push(await inspectExternalService(key, config, options));
  }

  const counts = services.reduce(
    (acc, row) => {
      acc[row.state] = (acc[row.state] ?? 0) + 1;
      return acc;
    },
    { ready: 0, missing: 0, drifted: 0 },
  );

  return {
    generated_at: new Date().toISOString(),
    registry: registryPath,
    policy: registry.policy ?? {},
    counts,
    services,
  };
}

function printHuman(report, strict) {
  console.log('OPSLY EXTERNAL SERVICES');
  console.log(
    `ready=${report.counts.ready} missing=${report.counts.missing} drifted=${report.counts.drifted}`,
  );
  for (const row of report.services) {
    const marker = row.state === 'ready' ? 'PASS' : row.state === 'missing' ? 'WARN' : 'FAIL';
    console.log(
      `[${marker}] ${row.id} — ${row.state} — expected ${row.reviewed_ref} — ${row.install_path}`,
    );
    if (row.current_sha) console.log(`  sha=${row.current_sha}`);
    for (const warning of row.warnings) console.log(`  WARN: ${warning}`);
    for (const blocker of row.blockers) console.log(`  BLOCKER: ${blocker}`);
  }
  const blocked = report.counts.drifted > 0 || (strict && report.counts.missing > 0);
  console.log(blocked ? 'OPSLY EXTERNAL SERVICES: NOT READY' : 'OPSLY EXTERNAL SERVICES: READY');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const json = process.argv.includes('--json');
  const strict = process.argv.includes('--strict');
  try {
    const report = await inspectExternalServices();
    if (json) console.log(JSON.stringify(report, null, 2));
    else printHuman(report, strict);

    if (report.counts.drifted > 0 || (strict && report.counts.missing > 0)) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
