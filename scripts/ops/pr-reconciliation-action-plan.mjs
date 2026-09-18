#!/usr/bin/env node
import fs from 'node:fs/promises';
import { buildReconciliationPlan } from './lib/pr-reconciliation-action-plan.mjs';

const input = process.argv[2] || 'pr-reconciliation-inventory.json';
const output = process.argv[3] || 'pr-reconciliation-action-plan.json';
const inventory = JSON.parse(await fs.readFile(input, 'utf8'));
const plan = buildReconciliationPlan(inventory);
await fs.writeFile(output, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');

const counts = {};
for (const item of plan.actions) counts[item.action] = (counts[item.action] || 0) + 1;
console.log(JSON.stringify({ output, counts }, null, 2));
