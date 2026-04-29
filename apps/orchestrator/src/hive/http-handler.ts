import type { IncomingMessage, ServerResponse } from 'node:http';
import { HiveOrchestrator, type ObjectiveRequest } from './hive-orchestrator.js';

let orchestrator: HiveOrchestrator | null = null;

async function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => {
      data += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

export async function initializeHiveHandler(): Promise<HiveOrchestrator> {
  if (!orchestrator) {
    orchestrator = new HiveOrchestrator();
    await orchestrator.initialize();
  }
  return orchestrator;
}

export async function handleSubmitObjective(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!orchestrator) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Hive orchestrator no inicializado' }));
    return;
  }

  try {
    const body = await readBody(req);

    if (typeof body !== 'object' || body === null) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid body' }));
      return;
    }

    const request = body as ObjectiveRequest;

    if (!request.objective || typeof request.objective !== 'string') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Campo requerido: objective (string)' }));
      return;
    }

    const result = await orchestrator.submitObjective(request);
    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[HiveHandler] Error submitting objective:', msg);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: msg }));
  }
}

export async function handleGetObjectiveStatus(
  req: IncomingMessage,
  res: ServerResponse,
  taskId: string
): Promise<void> {
  if (!orchestrator) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Hive orchestrator no inicializado' }));
    return;
  }

  try {
    const result = await orchestrator.getObjectiveStatus(taskId);

    if (!result) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Objetivo no encontrado: ${taskId}` }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[HiveHandler] Error getting status:', msg);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: msg }));
  }
}

export async function handleListActiveBots(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!orchestrator) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Hive orchestrator no inicializado' }));
    return;
  }

  try {
    const bots = await orchestrator.listActiveBots();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ bots }));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[HiveHandler] Error listing bots:', msg);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: msg }));
  }
}

export async function handleGetHiveStats(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!orchestrator) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Hive orchestrator no inicializado' }));
    return;
  }

  try {
    const stats = await orchestrator.getHiveStats();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(stats));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[HiveHandler] Error getting stats:', msg);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: msg }));
  }
}

export async function handleShutdownHive(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!orchestrator) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Hive orchestrator no inicializado' }));
    return;
  }

  try {
    await orchestrator.shutdown();
    orchestrator = null;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'hive shutdown complete' }));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[HiveHandler] Error shutting down hive:', msg);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: msg }));
  }
}
