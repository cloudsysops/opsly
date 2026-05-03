import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { ZodError } from 'zod';
import { taskQueue } from './services/queue';
import { supabaseService } from './services/supabase';
import { workerManager } from './services/workers';
import { Task } from './types/task';
import { v4 as uuidv4 } from 'uuid';
import {
  createTaskSchema,
  updateTaskSchema,
  registerWorkerSchema,
  workerHeartbeatSchema,
  taskLogSchema,
} from './validation/schemas';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

const app: Express = express();
app.use(cors());
app.use(express.json());

// Error handling middleware
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: err.issues });
  }
  res.status(500).json({ error: errorMessage(err) });
});

// GET /api/health
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// POST /api/tasks - Create a new task
app.post('/api/tasks', async (req: Request, res: Response) => {
  try {
    const validated = createTaskSchema.parse(req.body);

    const task: Task = {
      id: uuidv4(),
      type: validated.type,
      title: validated.title,
      description: validated.description ?? '',
      prompt: validated.prompt,
      priority: validated.priority,
      status: 'pending',
      created_by: validated.created_by,
      created_at: new Date().toISOString(),
      estimated_days: validated.estimated_days,
      dependencies: validated.dependencies,
      logs: [],
      branch: validated.branch,
      metadata: validated.metadata,
    };

    await taskQueue.addTask(task);
    await supabaseService.saveTask(task);

    res.status(201).json(task);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    res.status(400).json({ error: errorMessage(error) });
  }
});

// GET /api/tasks
app.get('/api/tasks', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    let tasks: Task[] = [];

    if (status) {
      // Get from database for more comprehensive results
      tasks = await supabaseService.getTasks(String(status));
    } else {
      // Get all from queue
      tasks = [
        ...(await taskQueue.getPendingTasks()),
        ...(await taskQueue.getExecutingTasks()),
        ...(await taskQueue.getCompletedTasks()),
      ];
    }

    res.json(tasks);
  } catch (error: unknown) {
    res.status(500).json({ error: errorMessage(error) });
  }
});

// GET /api/tasks/:id
app.get('/api/tasks/:id', async (req: Request, res: Response) => {
  try {
    // Try queue first (faster), then database
    let task = await taskQueue.getTask(req.params.id);
    if (!task) {
      task = await supabaseService.getTask(req.params.id);
    }

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Fetch logs from database if available
    if (task) {
      task.logs = await supabaseService.getLogs(task.id);
    }

    res.json(task);
  } catch (error: unknown) {
    res.status(500).json({ error: errorMessage(error) });
  }
});

// PATCH /api/tasks/:id
app.patch('/api/tasks/:id', async (req: Request, res: Response) => {
  try {
    const validated = updateTaskSchema.parse(req.body);
    const taskId = req.params.id;

    let task = await taskQueue.getTask(taskId);
    if (!task) {
      task = await supabaseService.getTask(taskId);
    }

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (validated.status === 'completed' && validated.result) {
      await workerManager.completeTask(taskId, validated.worker_id || task.worker_id || 'unknown', validated.result);
    } else if (validated.status === 'failed' && validated.result?.error) {
      await workerManager.failTask(taskId, validated.worker_id || task.worker_id || 'unknown', validated.result.error);
    } else if (validated.status === 'assigned' && validated.worker_id) {
      task.status = 'assigned';
      task.worker_id = validated.worker_id;
      await taskQueue.assignTask(taskId, validated.worker_id);
      await supabaseService.saveTask(task);
    }

    const updated = await taskQueue.getTask(taskId);
    res.json(updated);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    res.status(400).json({ error: errorMessage(error) });
  }
});

// DELETE /api/tasks/:id
app.delete('/api/tasks/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    let task = await taskQueue.getTask(id);
    if (!task) {
      task = await supabaseService.getTask(id);
    }
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    await taskQueue.cancelTask(id);
    await supabaseService.saveTask({ ...task, status: 'cancelled' });
    res.json({ status: 'cancelled' });
  } catch (error: unknown) {
    res.status(400).json({ error: errorMessage(error) });
  }
});

// POST /api/workers/register
app.post('/api/workers/register', async (req: Request, res: Response) => {
  try {
    const validated = registerWorkerSchema.parse(req.body);
    const worker = await workerManager.registerWorker(
      validated.id,
      validated.type,
      validated.capacity,
      validated.metadata
    );
    res.status(201).json(worker);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    res.status(400).json({ error: errorMessage(error) });
  }
});

// GET /api/workers/:id/next-task
app.get('/api/workers/:id/next-task', async (req: Request, res: Response) => {
  try {
    const workerId = req.params.id;

    // Verify worker exists
    const worker = await workerManager.getWorker(workerId);
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    // Get next pending task
    const pending = await taskQueue.getPendingTasks();
    if (pending.length === 0) {
      return res.json(null);
    }

    const nextTask = pending[0];
    await workerManager.assignTaskToWorker(nextTask, workerId);

    res.json(nextTask);
  } catch (error: unknown) {
    res.status(500).json({ error: errorMessage(error) });
  }
});

// POST /api/workers/:id/heartbeat
app.post('/api/workers/:id/heartbeat', async (req: Request, res: Response) => {
  try {
    const validated = workerHeartbeatSchema.parse(req.body);
    const worker = await workerManager.heartbeat(
      req.params.id,
      validated.status,
      validated.current_task_id
    );
    res.json(worker);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    res.status(400).json({ error: errorMessage(error) });
  }
});

// GET /api/workers
app.get('/api/workers', (req: Request, res: Response) => {
  try {
    const workers = workerManager.getAllWorkers();
    const stats = workerManager.getWorkerStats();
    res.json({ workers, stats });
  } catch (error: unknown) {
    res.status(500).json({ error: errorMessage(error) });
  }
});

// POST /api/tasks/:id/log
app.post('/api/tasks/:id/log', async (req: Request, res: Response) => {
  try {
    const validated = taskLogSchema.parse(req.body);
    const task = await taskQueue.getTask(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const log = {
      timestamp: new Date().toISOString(),
      level: validated.level,
      message: validated.message,
      context: validated.context,
    };

    task.logs.push(log);
    await supabaseService.addLog(req.params.id, log);
    await taskQueue.updateTaskStatus(req.params.id, task.status);

    res.json({ status: 'logged' });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    res.status(400).json({ error: errorMessage(error) });
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
