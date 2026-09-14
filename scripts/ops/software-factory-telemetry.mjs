#!/usr/bin/env node
import fs from 'node:fs/promises';
import { buildFactoryTelemetry } from './lib/software-factory-telemetry.mjs';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const workstreamsPath = arg('--workstreams');
const reconciliationPath = arg('--reconciliation');
const policyPath = arg('--policy', 'config/software-factory-telemetry-policy.json');
const output = arg('--out', 'software-factory-telemetry.json');

if (!reconciliationPath) {
  throw new Error('usage: software-factory-telemetry.mjs [--workstreams <json>] --reconciliation <json> [--out file]');
}

const [workstreams, reconciliation, policy] = await Promise.all([
  workstreamsPath
    ? fs.readFile(workstreamsPath, 'utf8').then(JSON.parse)
    : Promise.resolve({
        claims_observed: false,
        runtime_sessions_observed: false,
        github_observed: false,
        github_evidence_complete: false,
      }),
  fs.readFile(reconciliationPath, 'utf8').then(JSON.parse),
  fs.readFile(policyPath, 'utf8').then(JSON.parse),
]);

const snapshot = buildFactoryTelemetry({ workstreams, reconciliation, policy });
await fs.writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
console.log(
  JSON.stringify(
    {
      output,
      metrics: snapshot.metrics,
      recommendations: snapshot.recommendations.map((item) => item.id),
    },
    null,
    2,
  ),
);
