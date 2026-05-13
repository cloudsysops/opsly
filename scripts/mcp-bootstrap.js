#!/usr/bin/env node
/**
 * Pre-configura MCP tools para agent session
 * Verifica disponibilidad, pre-conecta brain:research y tools clave
 * Uso: node scripts/mcp-bootstrap.js [--no-health-check]
 */

import http from 'node:http';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// MCP Server locations
const MCP_SERVERS = {
  'mcp-server': { port: 3003, name: 'MCP Server (Obsidian)' },
  'llm-gateway': { port: 3010, name: 'LLM Gateway' },
  'orchestrator': { port: 3011, name: 'Orchestrator' },
  'context-builder': { port: 3012, name: 'Context Builder' },
};

// Brain:research MCP tools (core)
const BRAIN_TOOLS = ['brain:search', 'brain:semantic-search', 'brain:research', 'brain:graph', 'brain:get'];

function checkServerHealth(port, name) {
  return new Promise(resolve => {
    const req = http.get(`http://localhost:${port}/health`, (res) => {
      resolve(res.statusCode === 200);
      res.resume();
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000);
  });
}

async function bootstrapMCP(noHealthCheck = false) {
  console.log('🔌 MCP Tools Bootstrap');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  console.log('📡 Checking MCP Servers...');
  const serverStatus = {};
  let allHealthy = true;

  for (const [key, server] of Object.entries(MCP_SERVERS)) {
    if (noHealthCheck) {
      serverStatus[key] = { name: server.name, port: server.port, status: 'unchecked' };
      console.log(`   ⏭️  ${server.name} (port ${server.port}) - skipped`);
      continue;
    }

    const isHealthy = await checkServerHealth(server.port, server.name);
    serverStatus[key] = {
      name: server.name,
      port: server.port,
      status: isHealthy ? 'healthy' : 'unreachable',
    };

    const icon = isHealthy ? '✅' : '❌';
    console.log(`   ${icon} ${server.name} (port ${server.port})`);
    if (!isHealthy) {
      allHealthy = false;
    }
  }

  console.log('');

  // Brain:research tools
  console.log('🧠 Brain:Research Configuration');
  console.log('   Tools available:');
  for (const tool of BRAIN_TOOLS) {
    console.log(`     • ${tool}`);
  }

  console.log('');
  console.log('   Triggers:');
  const triggers = ['investigar', 'research', 'explain', 'explica', '¿cómo'];
  for (const trigger of triggers) {
    console.log(`     • "${trigger}..." → brain:research`);
  }

  console.log('');

  // Config summary
  const config = {
    mcp_servers: serverStatus,
    brain_tools: BRAIN_TOOLS,
    health_check_status: allHealthy ? 'all_healthy' : 'some_unreachable',
    timestamp: new Date().toISOString(),
  };

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  if (allHealthy || noHealthCheck) {
    console.log('✅ MCP ready for agent session');
  } else {
    console.log('⚠️  Some MCP servers unreachable');
    console.log('   Run locally: npm run dev');
    console.log('   Or on VPS: doppler run npm start');
  }

  console.log('');
  console.log('💡 Tips:');
  console.log('   • Use brain:research for investigative queries');
  console.log('   • brain:search for simple full-text queries');
  console.log('   • brain:semantic-search for similarity matching');
  console.log('');

  return config;
}

async function main() {
  const args = process.argv.slice(2);
  const noHealthCheck = args.includes('--no-health-check');

  await bootstrapMCP(noHealthCheck);
}

export { bootstrapMCP, checkServerHealth };
main().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
