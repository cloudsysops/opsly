import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { taskQueue } from './services/queue';
import { Task, Worker } from './types/task';
import { v4 as uuidv4 } from 'uuid';

const app: Express = express();
app.use(cors());
app.use(express.json());

// GET /api/health
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// POST /api/tasks - Create a new task
app.post('/api/tasks', async (req: Request, res: Response) => {
  try {
    const task: Task = {
      id: uuidv4(),
      type: req.body.type,
      title: req.body.title,
      description: req.body.description,
      prompt: req.body.prompt,
      priority: req.body.priority || 'medium',
      status: 'pending',
      created_by: req.body.created_by || 'system',
      created_at: new Date().toISOString(),
      estimated_days: req.body.estimated_days,
      dependencies: req.body.dependencies || [],
      logs: [],
    };
    await taskQueue.addTask(task);
    res.status(201).json(task);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/tasks
app.get('/api/tasks', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    let tasks: Task[] = [];
    if (status === 'pending') tasks = await taskQueue.getPendingTasks();
    else if (status === 'executing') tasks = await taskQueue.getExecutingTasks();
    else if (status === 'completed') tasks = await taskQueue.getCompletedTasks();
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tasks/:id
app.get('/api/tasks/:id', async (req: Request, res: Response) => {
  try {
    const task = await taskQueue.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/tasks/:id
app.patch('/api/tasks/:id', async (req: Request, res: Response) => {
  try {
    const { status, worker_id, result } = req.body;
    const taskId = req.params.id;
    const task = await taskQueue.getTask(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    if (status === 'completed' && result) await taskQueue.completeTask(taskId, result);
    else if (status === 'failed' && result?.error) await taskQueue.failTask(taskId, result.error);
    else if (status === 'assigned' && worker_id) await taskQueue.assignTask(taskId, worker_id);
    
    const updated = await taskQueue.getTask(taskId);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/tasks/:id
app.delete('/api/tasks/:id', async (req: Request, res: Response) => {
  try {
    await taskQueue.cancelTask(req.params.id);
    res.json({ status: 'cancelled' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/workers/register
app.post('/api/workers/register', (req: Request, res: Response) => {
  try {
    const worker: Worker = {
      id: req.body.id,
      type: req.body.type,
      status: 'idle',
      last_heartbeat: new Date().toISOString(),
      capacity: req.body.capacity || 1,
    };
    res.status(201).json(worker);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/workers/:id/next-task
app.get('/api/workers/:id/next-task', async (req: Request, res: Response) => {
  try {
    const pending = await taskQueue.getPendingTasks();
    if (pending.length === 0) return res.json(null);
    const nextTask = pending[0];
    await taskQueue.assignTask(nextTask.id, req.params.id);
    res.json(nextTask);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tasks/:id/log
app.post('/api/tasks/:id/log', async (req: Request, res: Response) => {
  try {
    const task = await taskQueue.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    task.logs.push({
      timestamp: new Date().toISOString(),
      level: req.body.level || 'info',
      message: req.body.message,
      context: req.body.context,
    });
    await taskQueue.updateTaskStatus(req.params.id, task.status);
    res.json({ status: 'logged' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3015;

export async function startServer() {
  await taskQueue.connect();
  return app.listen(PORT, () => {
    console.log(`✅ Task Orchestrator running on port ${PORT}`);
  });
}

export default app;
