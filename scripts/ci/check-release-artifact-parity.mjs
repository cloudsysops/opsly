#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const TARGETS = [
  { service: 'api', dockerfile: 'apps/api/Dockerfile' },
  { service: 'admin', dockerfile: 'apps/admin/Dockerfile' },
  { service: 'portal', dockerfile: 'apps/portal/Dockerfile' },
];

const ENV_COUPLED_BUILD_ARG = /^(?:NEXT_PUBLIC_.+|PLATFORM_DOMAIN)$/;

export function builderStage(text) {
  const stages = String(text).split(/(?=^FROM\s+)/m);
  return stages.find((stage) => /^FROM\s+.+\s+AS\s+builder\b/im.test(stage)) ?? '';
}

export function auditDockerfileText(service, dockerfile, text) {
  const builder = builderStage(text);
  if (!builder) {
    return {
      service,
      dockerfile,
      same_digest_ready: false,
      environment_coupled_build_args: [],
      blockers: [`missing_builder_stage:${service}`],
    };
  }

  const args = [...builder.matchAll(/^ARG\s+([A-Za-z_][A-Za-z0-9_]*)(?:=.*)?$/gm)]
    .map((match) => match[1])
    .filter((name) => ENV_COUPLED_BUILD_ARG.test(name));

  const uniqueArgs = [...new Set(args)].sort();
  return {
    service,
    dockerfile,
    same_digest_ready: uniqueArgs.length === 0,
    environment_coupled_build_args: uniqueArgs,
    blockers: uniqueArgs.map((name) => `build_time_environment_coupling:${service}:${name}`),
  };
}

export function buildReleaseArtifactParityAudit(readFile = readFileSync) {
  const services = TARGETS.map(({ service, dockerfile }) =>
    auditDockerfileText(service, dockerfile, readFile(dockerfile, 'utf8')),
  );
  const blockers = services.flatMap((entry) => entry.blockers);
  return {
    schema_version: 'ReleaseArtifactParityAuditV1',
    scope: 'opsly-platform',
    same_digest_ready: blockers.length === 0,
    services,
    blockers,
  };
}

function parseArgs(argv) {
  return {
    json: argv.includes('--json'),
    enforce: argv.includes('--enforce'),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const audit = buildReleaseArtifactParityAudit();

  if (args.json) {
    process.stdout.write(`${JSON.stringify(audit, null, 2)}\n`);
  } else {
    console.log(`Release artifact parity: ${audit.same_digest_ready ? 'READY' : 'BLOCKED'}`);
    for (const service of audit.services) {
      const detail = service.environment_coupled_build_args.length
        ? service.environment_coupled_build_args.join(', ')
        : 'none';
      console.log(`- ${service.service}: ${service.same_digest_ready ? 'READY' : 'BLOCKED'} build_args=${detail}`);
    }
    if (audit.blockers.length > 0) {
      console.log('Blockers:');
      for (const blocker of audit.blockers) console.log(`  - ${blocker}`);
    }
  }

  if (args.enforce && !audit.same_digest_ready) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
