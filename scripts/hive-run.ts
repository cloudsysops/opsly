#!/usr/bin/env node

import { spawn } from 'child_process';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
Hive Bot System - Autonomous Multi-Agent Orchestration

Uso: npx tsx scripts/hive-run.ts <comando>

Comandos disponibles:

  init              Inicializar el sistema hive
  objective <msg>   Enviar un objetivo al hive
  status <taskId>   Obtener estado de una tarea
  bots              Listar bots activos
  stats             Obtener estadísticas del hive
  shutdown          Apagar el hive

Ejemplos:

  npx tsx scripts/hive-run.ts init
  npx tsx scripts/hive-run.ts objective "Implementar endpoint POST /api/billing"
  npx tsx scripts/hive-run.ts status task-12345
  npx tsx scripts/hive-run.ts bots
  npx tsx scripts/hive-run.ts stats
`);
  process.exit(0);
}

const command = args[0];
const params = args.slice(1).join(' ');

const baseUrl = 'http://localhost:3011';

async function makeRequest(method: string, path: string, body?: unknown): Promise<void> {
  try {
    const url = new URL(baseUrl + path);
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    const response = await fetch(url.toString(), {
      ...options,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));

    if (!response.ok) {
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  switch (command) {
    case 'init':
      console.log('[Hive] Inicializando...');
      await makeRequest('POST', '/internal/hive/init');
      break;

    case 'objective':
      if (!params) {
        console.error('Error: objetivo requerido');
        process.exit(1);
      }
      console.log(`[Hive] Enviando objetivo: "${params}"`);
      await makeRequest('POST', '/internal/hive/objective', {
        objective: params,
        priority: 'medium',
      });
      break;

    case 'status':
      if (!params) {
        console.error('Error: taskId requerido');
        process.exit(1);
      }
      console.log(`[Hive] Obteniendo estado: ${params}`);
      await makeRequest('GET', `/internal/hive/objective/${params}`);
      break;

    case 'bots':
      console.log('[Hive] Listando bots activos...');
      await makeRequest('GET', '/internal/hive/bots');
      break;

    case 'stats':
      console.log('[Hive] Estadísticas del hive:');
      await makeRequest('GET', '/internal/hive/stats');
      break;

    case 'shutdown':
      console.log('[Hive] Apagando hive...');
      await makeRequest('POST', '/internal/hive/shutdown');
      break;

    default:
      console.error(`Error: comando desconocido "${command}"`);
      process.exit(1);
  }
}

void main();
