import 'dotenv/config';
import express from 'express';
import { handleAddStandup } from './handlers/add-standup.js';
import { handleCreateTask } from './handlers/create-task.js';
import { handleListTasks } from './handlers/list-tasks.js';
import { handleQualityGate } from './handlers/quality-gate.js';
import { handleUpdateTask } from './handlers/update-task.js';
import { NotionClient } from './notion-client.js';
import type { Task } from './types.js';

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

const app = express();
app.use(express.json());

const portRaw = process.env.MCP_PORT ?? '3013';
const PORT = Number.parseInt(portRaw, 10);
if (Number.isNaN(PORT) || PORT < 1) {
  throw new Error('MCP_PORT inválido');
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'notion-mcp' });
});

/** Token Notion + IDs de bases (Doppler). Falla si la integración no tiene acceso. */
app.get('/ready', async (_req, res) => {
  try {
    const notion = new NotionClient();
    const databases = await notion.verifyDatabases();
    res.json({ status: 'ok', service: 'notion-mcp', notion: { databases } });
  } catch (err: unknown) {
    res.status(503).json({
      status: 'degraded',
      service: 'notion-mcp',
      error: errMessage(err),
    });
  }
});

app.post('/mcp/tasks/list', async (req, res) => {
  try {
    const body = req.body as { sprint?: string; status?: string };
    const result = await handleListTasks({
      sprint: body.sprint,
      status: body.status,
    });
    res.json(result);
  } catch (err: unknown) {
    res.status(400).json({ error: errMessage(err) });
  }
});

app.post('/mcp/tasks/create', async (req, res) => {
  try {
    const result = await handleCreateTask(req.body as Parameters<typeof handleCreateTask>[0]);
    res.json(result);
  } catch (err: unknown) {
    res.status(400).json({ error: errMessage(err) });
  }
});

app.post('/mcp/tasks/update', async (req, res) => {
  try {
    const body = req.body as { taskId: string; updates: Partial<Task> };
    const result = await handleUpdateTask({
      taskId: body.taskId,
      updates: body.updates,
    });
    res.json(result);
  } catch (err: unknown) {
    res.status(400).json({ error: errMessage(err) });
  }
});

app.post('/mcp/standup/add', async (req, res) => {
  try {
    const result = await handleAddStandup(req.body as Parameters<typeof handleAddStandup>[0]);
    res.json(result);
  } catch (err: unknown) {
    res.status(400).json({ error: errMessage(err) });
  }
});

app.post('/mcp/quality-gate/record', async (req, res) => {
  try {
    const result = await handleQualityGate(req.body as Parameters<typeof handleQualityGate>[0]);
    res.json(result);
  } catch (err: unknown) {
    res.status(400).json({ error: errMessage(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Notion MCP HTTP: http://localhost:${String(PORT)}`);
  console.log(`Health: http://localhost:${String(PORT)}/health`);
});
