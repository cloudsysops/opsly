import Fastify from 'fastify';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';

const fastify = Fastify({ logger: true });
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379/0');
const prisma = new PrismaClient();

interface Task {
  id: string;
  agent_id: string;
  type: 'implement' | 'test' | 'review' | 'document' | 'audit';
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: Date;
  assigned_at?: Date;
  completed_at?: Date;
  result?: any;
  error?: string;
}

// Health check
fastify.get('/health', async (request, reply) => {
  const redisOk = await redis.ping().then(() => true).catch(() => false);
  const dbOk = await prisma.auditLog.findFirst().then(() => true).catch(() => false);
  
  return {
    status: redisOk && dbOk ? 'OK' : 'DEGRADED',
    redis: redisOk ? 'connected' : 'disconnected',
    database: dbOk ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  };
});

// Queue a task for an agent
fastify.post<{ Body: Task }>('/tasks/queue', async (request, reply) => {
  const task: Task = {
    ...request.body,
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    created_at: new Date(),
    status: 'pending',
  };

  // Store in Redis queue
  const queueKey = `agent:${task.agent_id}:queue`;
  await redis.lpush(queueKey, JSON.stringify(task));

  // Store metadata in database
  await prisma.auditLog.create({
    data: {
      agent_id: task.agent_id,
      tool_name: 'agent.queue_task',
      tool_tier: 'WRITE',
      operation_type: 'TASK_QUEUED',
      status: 'SUCCESS',
      params: { task_id: task.id, task_type: task.type },
      context: task.description,
    },
  });

  return reply.send({
    status: 'QUEUED',
    task_id: task.id,
    queue_position: await redis.llen(queueKey),
  });
});

// Get next task for agent
fastify.get<{ Params: { agent_id: string } }>('/tasks/next/:agent_id', async (request, reply) => {
  const { agent_id } = request.params;

  const queueKey = `agent:${agent_id}:queue`;
  const taskJson = await redis.rpop(queueKey);

  if (!taskJson) {
    return reply.send({ status: 'NO_TASKS' });
  }

  const task: Task = JSON.parse(taskJson);
  task.status = 'in_progress';
  task.assigned_at = new Date();

  // Store task in progress
  const inProgressKey = `agent:${agent_id}:in_progress:${task.id}`;
  await redis.setex(inProgressKey, 3600, JSON.stringify(task)); // 1 hour timeout

  return reply.send({ status: 'OK', task });
});

// Mark task as completed
fastify.post<{ Body: { agent_id: string; task_id: string; result: any } }>(
  '/tasks/complete',
  async (request, reply) => {
    const { agent_id, task_id, result } = request.body;

    const inProgressKey = `agent:${agent_id}:in_progress:${task_id}`;
    const taskJson = await redis.getdel(inProgressKey);

    if (!taskJson) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    const task: Task = JSON.parse(taskJson);
    task.status = 'completed';
    task.completed_at = new Date();
    task.result = result;

    // Store completed task
    const completedKey = `agent:${agent_id}:completed:${task_id}`;
    await redis.setex(completedKey, 86400 * 30, JSON.stringify(task)); // 30 days

    // Log completion
    await prisma.auditLog.create({
      data: {
        agent_id,
        tool_name: 'agent.complete_task',
        tool_tier: 'WRITE',
        operation_type: 'TASK_COMPLETED',
        status: 'SUCCESS',
        params: { task_id, task_type: task.type },
        result: { completed_at: task.completed_at, result },
      },
    });

    return reply.send({
      status: 'OK',
      task_id,
      completed_at: task.completed_at,
    });
  }
);

// Get agent stats
fastify.get<{ Params: { agent_id: string } }>('/agents/:agent_id/stats', async (request, reply) => {
  const { agent_id } = request.params;

  const queueKey = `agent:${agent_id}:queue`;
  const queueSize = await redis.llen(queueKey);

  const logs = await prisma.auditLog.findMany({
    where: { agent_id },
    orderBy: { timestamp: 'desc' },
    take: 100,
  });

  const completed = logs.filter(l => l.operation_type === 'TASK_COMPLETED').length;
  const failed = logs.filter(l => l.operation_type === 'TASK_FAILED').length;

  return reply.send({
    agent_id,
    queue_size: queueSize,
    tasks_completed: completed,
    tasks_failed: failed,
    success_rate: completed / (completed + failed) || 0,
    recent_operations: logs.slice(0, 10),
  });
});

// List all tasks
fastify.get('/tasks', async (request, reply) => {
  const logs = await prisma.auditLog.findMany({
    where: {
      operation_type: {
        in: ['TASK_QUEUED', 'TASK_COMPLETED', 'TASK_FAILED'],
      },
    },
    orderBy: { timestamp: 'desc' },
    take: 100,
  });

  return reply.send({ tasks: logs });
});

// Start server
fastify.listen({ port: 3002, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`✅ Agent Manager listening on ${address}`);
});
