#!/usr/bin/env node

import fs from 'node:fs/promises';

const inputPath = process.env.RECONCILIATION_WORKPACKS || 'pr-reconciliation-workpacks.json';
const outputPath = process.env.RECONCILIATION_AGENT_ENVELOPES || 'pr-reconciliation-agent-envelopes.json';
const source = JSON.parse(await fs.readFile(inputPath, 'utf8'));

const envelopes = source.workpacks.map((workpack) => ({
  envelopeVersion: 'AgentTaskEnvelopeV1',
  id: `reconcile-${workpack.id}`,
  source: 'pr-reconciliation',
  status: 'prepared',
  dispatchMode: 'SUPERVISED_ONLY',
  requiresApproval: true,
  productionDeploy: false,
  paidInfraRequired: false,
  estimatedCostUsd: 0,
  agent: 'local_opencode',
  agentRole: 'review',
  workstream: 'github-pr-reconciliation',
  conflictKey: workpack.lockKey,
  expectedHeadSha: workpack.expectedHeadSha,
  prNumber: workpack.prNumber,
  head: workpack.head,
  base: workpack.base,
  lane: workpack.lane,
  prompt: [
    `Reconcile PR #${workpack.prNumber} (${workpack.head} -> ${workpack.base}).`,
    `Expected head SHA: ${workpack.expectedHeadSha}.`,
    `Lane: ${workpack.lane}.`,
    ...workpack.instructions,
    'This task is write-capable GitHub work and MUST remain supervised.',
    'Do not submit this envelope through autonomous github-agent-queue while requiresApproval=true.',
  ].join('\n'),
}));

const payload = {
  generatedAt: new Date().toISOString(),
  repository: source.repository,
  mode: 'SUPERVISED_ONLY',
  dispatchAllowed: false,
  reason: 'GitHub reconciliation mutates branches/PR state and remains behind the typed approval gate.',
  count: envelopes.length,
  envelopes,
};

await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Prepared ${envelopes.length} supervised AgentTaskEnvelopeV1 reconciliation tasks`);
console.log('Autonomous dispatch is intentionally disabled');
console.log(`Wrote ${outputPath}`);
