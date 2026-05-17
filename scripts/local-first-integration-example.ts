#!/usr/bin/env npx tsx
/**
 * Ejemplo: Integración Local-First con Orchestrator
 */
import { selectWorker, selectWorkerWithFallback } from '../lib/runtime/worker-selector';
import { executeLocalAgent } from '../lib/runtime/local-executor';
import { getLocalFirstStatus, processOrchestratorJob } from '../lib/runtime/orchestrator-integration';

async function main() {
  console.log('=== Local-First Integration Demo ===\n');

  // 1. Ver estado
  console.log('1. Estado del sistema:');
  const status = await getLocalFirstStatus();
  console.log(JSON.stringify(status, null, 2));

  // 2. Seleccionar worker
  console.log('\n2. Selección de worker (budget=low):');
  const selection = await selectWorker({ budget: 'low' });
  console.log('Worker:', selection.worker.type);
  console.log('Reason:', selection.reason);
  console.log('Fallbacks:', selection.fallbackWorkers.map(w => w.type).join(', '));

  // 3. Ejecutar tarea simple (solo si hay agent disponible)
  if (status.available && status.localAgents.length > 0) {
    console.log('\n3. Ejecutar tarea de prueba:');
    const result = await executeLocalAgent({
      prompt: 'Say hello in one sentence',
      agent: 'ollama',
      timeout: 30000,
      budget: 'low',
    });
    console.log('Success:', result.success);
    console.log('Output:', result.output?.substring(0, 200) || 'N/A');
    console.log('Duration:', result.duration, 'ms');
  } else {
    console.log('\n3. [SKIP] No hay agents disponibles para ejecutar');
  }

  // 4. Simular job del orchestrator
  console.log('\n4. Simular job del orchestrator:');
  const jobResult = await processOrchestratorJob({
    jobId: 'test-job-001',
    tenantId: 'test-tenant',
    task: 'Count to 3',
    budget: 'low',
    timeout: 30000,
  });
  console.log('Job Result:', JSON.stringify(jobResult, null, 2));

  console.log('\n✅ Demo complete!');
}

main().catch(console.error);