#!/usr/bin/env node

/**
 * Health check script for agent pool connectivity
 * Tests connectivity to all 4 agent ports:
 * - Cursor (5001)
 * - Claude (5002)
 * - Copilot (5003)
 * - OpenCode (5004)
 */

import * as http from 'http';

interface HealthCheckResult {
  agent: string;
  port: number;
  status: 'connected' | 'failed' | 'timeout';
  responseTime?: number;
  error?: string;
}

const AGENT_ENDPOINTS = [
  { name: 'Cursor', port: 5001 },
  { name: 'Claude', port: 5002 },
  { name: 'Copilot', port: 5003 },
  { name: 'OpenCode', port: 5004 },
];

const TIMEOUT_MS = 5000;

async function checkAgent(name: string, port: number): Promise<HealthCheckResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const timeout = setTimeout(() => {
      resolve({
        agent: name,
        port,
        status: 'timeout',
        error: `Connection timeout after ${TIMEOUT_MS}ms`,
      });
    }, TIMEOUT_MS);

    const req = http.get(`http://localhost:${port}/health`, (res) => {
      clearTimeout(timeout);
      const responseTime = Date.now() - startTime;

      if (res.statusCode === 200 || res.statusCode === 404) {
        resolve({
          agent: name,
          port,
          status: 'connected',
          responseTime,
        });
      } else {
        resolve({
          agent: name,
          port,
          status: 'failed',
          error: `HTTP ${res.statusCode}`,
          responseTime,
        });
      }
    });

    req.on('error', (err) => {
      clearTimeout(timeout);
      resolve({
        agent: name,
        port,
        status: 'failed',
        error: err.message,
      });
    });
  });
}

async function runHealthCheck(): Promise<void> {
  console.log('🏥 Starting Agent Pool Health Check...\n');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Timeout: ${TIMEOUT_MS}ms per agent\n`);

  const results: HealthCheckResult[] = [];

  // Check all agents in parallel
  for (const agent of AGENT_ENDPOINTS) {
    const result = await checkAgent(agent.name, agent.port);
    results.push(result);
  }

  // Display results
  console.log('═══════════════════════════════════════════════════════════\n');

  let connectedCount = 0;
  for (const result of results) {
    const statusEmoji = result.status === 'connected' ? '✅' : '❌';
    const responseInfo = result.responseTime ? ` (${result.responseTime}ms)` : '';
    const errorMsg = result.error ? ` - ${result.error}` : '';

    console.log(
      `${statusEmoji} ${result.agent.padEnd(10)} [${result.port}]: ${result.status}${responseInfo}${errorMsg}`
    );

    if (result.status === 'connected') {
      connectedCount++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');

  // Summary
  const totalAgents = results.length;
  const failedCount = totalAgents - connectedCount;
  const successRate = ((connectedCount / totalAgents) * 100).toFixed(0);

  console.log(`Summary:`);
  console.log(`  Connected: ${connectedCount}/${totalAgents} (${successRate}%)`);
  console.log(`  Failed: ${failedCount}/${totalAgents}`);

  // Overall status
  if (connectedCount === totalAgents) {
    console.log(`\n🟢 Agent Pool: HEALTHY - All agents responsive\n`);
    process.exit(0);
  } else if (connectedCount > 0) {
    console.log(`\n🟡 Agent Pool: DEGRADED - ${failedCount} agent(s) unreachable\n`);
    process.exit(1);
  } else {
    console.log(`\n🔴 Agent Pool: CRITICAL - No agents reachable\n`);
    process.exit(2);
  }
}

// Main execution
runHealthCheck().catch((err) => {
  console.error('❌ Health check error:', err.message);
  process.exit(3);
});
