#!/usr/bin/env npx tsx
/**
 * Test script for environment-detector
 */
import { detectEnvironment, healthCheck } from '../lib/runtime/environment-detector';

async function main() {
  console.log('🧪 Testing Environment Detector...\n');

  const env = await detectEnvironment();

  console.log('=== Environment Detection ===');
  console.log('OS:', env.os, '-', env.osVersion);
  console.log('Arch:', env.arch);
  console.log('Hostname:', env.hostname);

  console.log('\n=== Agents ===');
  const agents = Object.entries(env.agents)
    .filter(([, v]) => (v as any).installed)
    .map(([k]) => k);
  console.log('Installed:', agents.length > 0 ? agents.join(', ') : 'None');

  console.log('\n=== Ollama ===');
  console.log('Installed:', env.ollama.installed);
  console.log('Running:', env.ollama.running);
  console.log('Models:', env.ollama.models.length > 0 ? env.ollama.models.join(', ') : 'None');

  console.log('\n=== Tools ===');
  console.log('Node:', env.tools.nodeVersion || 'N/A');
  console.log('Docker:', env.tools.dockerRunning ? env.tools.dockerVersion : 'not running');
  console.log('Git:', env.tools.gitVersion || 'N/A');

  console.log('\n=== Resources ===');
  console.log('CPU:', env.resources.cpuCores, 'cores');
  console.log('Memory:', env.resources.memoryUsedGB, '/', env.resources.memoryGB, 'GB');
  console.log('Disk:', env.resources.diskFreeGB, '/', env.resources.diskGB, 'GB free');
  console.log('Load:', env.resources.loadAverage.join(', '));

  console.log('\n=== Recommendation ===');
  console.log('Recommended agent:', env.recommendedAgent);
  console.log('Confidence:', (env.confidence * 100).toFixed(0) + '%');

  console.log('\n=== Health Check ===');
  const health = await healthCheck();
  console.log('Healthy:', health.healthy ? '✅' : '❌');
  if (health.warnings.length) console.log('Warnings:', health.warnings.join(', '));
  if (health.errors.length) console.log('Errors:', health.errors.join(', '));

  console.log('\n✅ Test complete!');
}

main().catch(console.error);