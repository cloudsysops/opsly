#!/usr/bin/env node
import fs from 'node:fs';

const [,, inputPath, policyPath = 'config/cloud-cost-policy.json'] = process.argv;
if (!inputPath) {
  console.error('usage: cloud-cost-policy-check.mjs <plan-metadata.json> [policy.json]');
  process.exit(2);
}

const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));

const blockers = [];
const warnings = [];
const costClass = input.cost_class || 'unknown';

if (!policy.allowedAutoApplyCostClasses.includes(costClass)) {
  blockers.push('APPROVAL_REQUIRED_NON_FREE_OR_UNKNOWN_COST');
}

for (const key of policy.requiredMetadata || []) {
  if (!input[key]) blockers.push(`MISSING_METADATA:${key}`);
}

if (input.ephemeral === true && policy.ephemeralRequiresTtl) {
  for (const key of policy.requiredEphemeralMetadata || []) {
    if (!input[key]) blockers.push(`MISSING_EPHEMERAL_METADATA:${key}`);
  }
  if (!input.destroy_command) blockers.push('MISSING_DESTROY_COMMAND');
}

for (const p of input.architecture_patterns || []) {
  if ((policy.prohibitedPatterns || []).includes(p)) {
    blockers.push(`PROHIBITED_ARCHITECTURE:${p}`);
  }
}

if (typeof input.estimated_cost_usd !== 'number') {
  warnings.push('ESTIMATED_COST_UNKNOWN');
  if (policy.unknownCostRequiresApproval) blockers.push('APPROVAL_REQUIRED_UNKNOWN_ESTIMATE');
} else if (input.estimated_cost_usd > 0 && policy.paidRequiresApproval) {
  blockers.push('APPROVAL_REQUIRED_NON_ZERO_ESTIMATE');
}

const result = {
  ok: blockers.length === 0,
  mode: policy.defaultMode,
  cost_class: costClass,
  estimated_cost_usd: input.estimated_cost_usd ?? null,
  blockers: [...new Set(blockers)],
  warnings: [...new Set(warnings)]
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 3);
