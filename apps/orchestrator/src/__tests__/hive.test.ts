/**
 * SwarmOps — Tests del sistema Colmena de Bots (Hive).
 *
 * Cubre:
 *  - Tipos y validaciones básicas (hive/types.ts)
 *  - HiveState: setHiveTask / getHiveTask / updateSubtaskStatus (hive/hive-state.ts)
 *  - QueenBee.dispatch: descomposición de objetivos y encolado (hive/queen-bee.ts)
 *  - Pheromone channel: publicar / leer mensajes ferumonales (hive/pheromone-channel.ts)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HiveTask, Subtask, Bot, PheromoneMessage } from '../hive/types.js';

// ---------------------------------------------------------------------------
// Mocks hoisted — deben declararse antes de cualquier vi.mock factory
// ---------------------------------------------------------------------------

const redisMocks = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockSetEx = vi.fn();
  const mockConnect = vi.fn();
  const mockQuit = vi.fn();
  const mockPublish = vi.fn();
  const mockLPush = vi.fn();
  const mockExpire = vi.fn();
  const mockSubscribe = vi.fn();
  const mockUnsubscribe = vi.fn();
  return {
    mockGet,
    mockSetEx,
    mockConnect,
    mockQuit,
    mockPublish,
    mockLPush,
    mockExpire,
    mockSubscribe,
    mockUnsubscribe,
  };
});

const queueMocks = vi.hoisted(() => ({ mockAdd: vi.fn() }));

vi.mock('redis', () => ({
  createClient: () => ({
    connect: redisMocks.mockConnect,
    get: redisMocks.mockGet,
    setEx: redisMocks.mockSetEx,
    quit: redisMocks.mockQuit,
    publish: redisMocks.mockPublish,
    lPush: redisMocks.mockLPush,
    expire: redisMocks.mockExpire,
    subscribe: redisMocks.mockSubscribe,
    unsubscribe: redisMocks.mockUnsubscribe,
    isOpen: true,
  }),
}));

// ---------------------------------------------------------------------------
// Helpers de fábrica para tests
// ---------------------------------------------------------------------------

function makeBot(overrides: Partial<Bot> = {}): Bot {
  return {
    id: 'bot-test-01',
    role: 'coder',
    status: 'idle',
    skills: ['code_generation'],
    capacity: 2,
    ...overrides,
  };
}

function makeSubtask(overrides: Partial<Subtask> = {}): Subtask {
  return {
    id: 'subtask-01',
    parentTaskId: 'task-01',
    description: '[coder] Implement feature X',
    assignedBotRole: 'coder',
    status: 'pending',
    dependencies: [],
    ...overrides,
  };
}

function makeHiveTask(overrides: Partial<HiveTask> = {}): HiveTask {
  const now = new Date().toISOString();
  return {
    id: 'task-01',
    tenantSlug: 'acme',
    requestId: 'req-01',
    objective: 'Implement feature X',
    subtasks: [],
    status: 'planned',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Bloque 1: Tipos básicos
// ---------------------------------------------------------------------------

describe('hive/types — shapes', () => {
  it('creates a valid Bot', () => {
    const bot = makeBot();
    expect(bot.role).toBe('coder');
    expect(bot.status).toBe('idle');
    expect(Array.isArray(bot.skills)).toBe(true);
    expect(bot.capacity).toBeGreaterThan(0);
  });

  it('creates a valid Subtask', () => {
    const sub = makeSubtask();
    expect(sub.parentTaskId).toBe('task-01');
    expect(sub.status).toBe('pending');
    expect(Array.isArray(sub.dependencies)).toBe(true);
  });

  it('creates a valid HiveTask', () => {
    const task = makeHiveTask({ subtasks: [makeSubtask()] });
    expect(task.status).toBe('planned');
    expect(task.subtasks).toHaveLength(1);
  });

  it('PheromoneMessage has required fields', () => {
    const msg: PheromoneMessage = {
      id: 'msg-01',
      from: 'queen-abc',
      type: 'finding',
      content: 'Investigación completada',
      timestamp: new Date().toISOString(),
      ttl: 300,
    };
    expect(msg.type).toBe('finding');
    expect(msg.ttl).toBe(300);
  });

  it('all BotRole values are strings', () => {
    const roles = ['queen', 'coder', 'researcher', 'tester', 'deployer', 'doc-writer', 'security'];
    for (const role of roles) {
      expect(typeof role).toBe('string');
    }
  });

  it('Subtask dependencies is always an array', () => {
    const sub = makeSubtask({ dependencies: ['dep-01', 'dep-02'] });
    expect(sub.dependencies).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Bloque 2: HiveState (con Redis mockeado)
// ---------------------------------------------------------------------------

describe('hive/hive-state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMocks.mockConnect.mockResolvedValue(undefined);
    redisMocks.mockSetEx.mockResolvedValue('OK');
    redisMocks.mockQuit.mockResolvedValue(undefined);
    redisMocks.mockGet.mockResolvedValue(null);
  });

  it('setHiveTask persists the task as JSON', async () => {
    const { setHiveTask } = await import('../hive/hive-state.js');
    const task = makeHiveTask();
    await setHiveTask(task);
    expect(redisMocks.mockSetEx).toHaveBeenCalled();
    const [key, , value] = redisMocks.mockSetEx.mock.calls[0] as [string, number, string];
    expect(key).toBe('opsly:hive:task:task-01');
    const parsed = JSON.parse(value) as HiveTask;
    expect(parsed.id).toBe('task-01');
    expect(parsed.tenantSlug).toBe('acme');
  });

  it('getHiveTask returns null when key missing', async () => {
    redisMocks.mockGet.mockResolvedValue(null);
    const { getHiveTask } = await import('../hive/hive-state.js');
    const result = await getHiveTask('nonexistent');
    expect(result).toBeNull();
  });

  it('getHiveTask parses stored JSON correctly', async () => {
    const task = makeHiveTask({ subtasks: [makeSubtask()] });
    redisMocks.mockGet.mockResolvedValue(JSON.stringify(task));
    const { getHiveTask } = await import('../hive/hive-state.js');
    const result = await getHiveTask('task-01');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('task-01');
    expect(result?.subtasks).toHaveLength(1);
  });

  it('updateSubtaskStatus is a no-op when task not found', async () => {
    redisMocks.mockGet.mockResolvedValue(null);
    const { updateSubtaskStatus } = await import('../hive/hive-state.js');
    await expect(
      updateSubtaskStatus('nonexistent', 'subtask-01', 'completed')
    ).resolves.toBeUndefined();
    expect(redisMocks.mockSetEx).not.toHaveBeenCalled();
  });

  it('updateSubtaskStatus updates status and calls setEx', async () => {
    const task = makeHiveTask({ subtasks: [makeSubtask()] });
    redisMocks.mockGet.mockResolvedValue(JSON.stringify(task));
    const { updateSubtaskStatus } = await import('../hive/hive-state.js');
    await updateSubtaskStatus('task-01', 'subtask-01', 'completed', { result: 'ok' });
    expect(redisMocks.mockSetEx).toHaveBeenCalled();
    const stored = JSON.parse(redisMocks.mockSetEx.mock.calls[0][2] as string) as HiveTask;
    expect(stored.subtasks[0]?.status).toBe('completed');
    expect(stored.subtasks[0]?.result).toEqual({ result: 'ok' });
  });

  it('updateHiveTaskStatus is a no-op when task not found', async () => {
    redisMocks.mockGet.mockResolvedValue(null);
    const { updateHiveTaskStatus } = await import('../hive/hive-state.js');
    await expect(updateHiveTaskStatus('nonexistent', 'completed')).resolves.toBeUndefined();
    expect(redisMocks.mockSetEx).not.toHaveBeenCalled();
  });

  it('updateHiveTaskStatus changes task status', async () => {
    const task = makeHiveTask();
    redisMocks.mockGet.mockResolvedValue(JSON.stringify(task));
    const { updateHiveTaskStatus } = await import('../hive/hive-state.js');
    await updateHiveTaskStatus('task-01', 'completed', { done: true });
    const stored = JSON.parse(redisMocks.mockSetEx.mock.calls[0][2] as string) as HiveTask;
    expect(stored.status).toBe('completed');
    expect(stored.result).toEqual({ done: true });
  });
});

// ---------------------------------------------------------------------------
// Bloque 3: Pheromone Channel
// ---------------------------------------------------------------------------

describe('hive/pheromone-channel — publishPheromone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMocks.mockPublish.mockResolvedValue(1);
    redisMocks.mockLPush.mockResolvedValue(1);
    redisMocks.mockExpire.mockResolvedValue(1);
  });

  it('publishes to the correct channel', async () => {
    const { publishPheromone } = await import('../hive/pheromone-channel.js');
    const fakeClient = {
      publish: redisMocks.mockPublish,
      lPush: redisMocks.mockLPush,
      expire: redisMocks.mockExpire,
    } as unknown as import('redis').RedisClientType;

    const msg = await publishPheromone(fakeClient, 'task-abc', {
      from: 'queen-01',
      type: 'finding',
      content: 'Found relevant data',
    });

    expect(msg.id).toBeTruthy();
    expect(msg.from).toBe('queen-01');
    expect(msg.type).toBe('finding');
    expect(redisMocks.mockPublish).toHaveBeenCalledWith(
      'opsly:hive:pheromone:task-abc',
      expect.stringContaining('finding')
    );
    expect(redisMocks.mockLPush).toHaveBeenCalledWith(
      'opsly:hive:pheromone:task-abc:history',
      expect.any(String)
    );
  });

  it('sets a default TTL on the history list', async () => {
    const { publishPheromone } = await import('../hive/pheromone-channel.js');
    const fakeClient = {
      publish: redisMocks.mockPublish,
      lPush: redisMocks.mockLPush,
      expire: redisMocks.mockExpire,
    } as unknown as import('redis').RedisClientType;

    const msg = await publishPheromone(fakeClient, 'task-xyz', {
      from: 'worker-coder',
      type: 'task_complete',
      content: 'Done',
    });

    expect(msg.ttl).toBeDefined();
    expect(typeof msg.ttl).toBe('number');
    expect(redisMocks.mockExpire).toHaveBeenCalledWith(
      'opsly:hive:pheromone:task-xyz:history',
      msg.ttl
    );
  });

  it('uses explicit TTL when provided', async () => {
    const { publishPheromone } = await import('../hive/pheromone-channel.js');
    const fakeClient = {
      publish: redisMocks.mockPublish,
      lPush: redisMocks.mockLPush,
      expire: redisMocks.mockExpire,
    } as unknown as import('redis').RedisClientType;

    const msg = await publishPheromone(fakeClient, 'task-ttl', {
      from: 'bot-01',
      type: 'error',
      content: 'Error occurred',
      ttl: 60,
    });

    expect(msg.ttl).toBe(60);
    expect(redisMocks.mockExpire).toHaveBeenCalledWith('opsly:hive:pheromone:task-ttl:history', 60);
  });

  it('includes optional metadata in the message', async () => {
    const { publishPheromone } = await import('../hive/pheromone-channel.js');
    const fakeClient = {
      publish: redisMocks.mockPublish,
      lPush: redisMocks.mockLPush,
      expire: redisMocks.mockExpire,
    } as unknown as import('redis').RedisClientType;

    const msg = await publishPheromone(fakeClient, 'task-meta', {
      from: 'queen-01',
      to: 'bot-researcher-01',
      type: 'request_help',
      content: 'Need research on X',
      metadata: { urgency: 'high' },
    });

    expect(msg.to).toBe('bot-researcher-01');
    expect(msg.metadata).toEqual({ urgency: 'high' });
  });
});

// ---------------------------------------------------------------------------
// Bloque 4: QueenBee.dispatch (con Redis y BullMQ mockeados)
// ---------------------------------------------------------------------------

describe('QueenBee.dispatch', () => {
  const fakeQueue = {
    add: queueMocks.mockAdd,
  } as unknown as import('bullmq').Queue;

  beforeEach(() => {
    vi.clearAllMocks();
    redisMocks.mockConnect.mockResolvedValue(undefined);
    redisMocks.mockQuit.mockResolvedValue(undefined);
    redisMocks.mockPublish.mockResolvedValue(1);
    redisMocks.mockLPush.mockResolvedValue(1);
    redisMocks.mockExpire.mockResolvedValue(1);
    redisMocks.mockSetEx.mockResolvedValue('OK');
    redisMocks.mockGet.mockResolvedValue(null);
    queueMocks.mockAdd.mockResolvedValue({ id: 'bullmq-job-id' });
  });

  it('returns in_progress status with a valid hive_task_id', async () => {
    const { QueenBee } = await import('../hive/queen-bee.js');
    const queen = new QueenBee({ queue: fakeQueue });

    const result = await queen.dispatch({
      objective: 'Investigate and implement a new API endpoint',
      tenant_slug: 'acme',
      request_id: 'req-001',
    });

    expect(result.status).toBe('in_progress');
    expect(result.hive_task_id).toBeTruthy();
    expect(result.subtasks_count).toBeGreaterThanOrEqual(1);
  });

  it('enqueues one BullMQ job per subtask', async () => {
    const { QueenBee } = await import('../hive/queen-bee.js');
    const queen = new QueenBee({ queue: fakeQueue });

    const result = await queen.dispatch({
      objective: 'Research and develop a new feature',
      tenant_slug: 'acme',
      request_id: 'req-002',
    });

    expect(queueMocks.mockAdd).toHaveBeenCalledTimes(result.subtasks_count);
    for (const call of queueMocks.mockAdd.mock.calls) {
      expect(call[0]).toBe('hive_worker_bee');
    }
  });

  it('respects explicit required_roles', async () => {
    const { QueenBee } = await import('../hive/queen-bee.js');
    const queen = new QueenBee({ queue: fakeQueue });

    const result = await queen.dispatch({
      objective: 'Just test the system',
      tenant_slug: 'acme',
      request_id: 'req-003',
      required_roles: ['tester', 'security'],
    });

    expect(result.subtasks_count).toBe(2);
    const roleCalls = queueMocks.mockAdd.mock.calls.map(
      (c) => (c[1] as { payload: { bot_role: string } }).payload.bot_role
    );
    expect(roleCalls).toContain('tester');
    expect(roleCalls).toContain('security');
  });

  it('falls back to researcher + coder for vague objective', async () => {
    const { QueenBee } = await import('../hive/queen-bee.js');
    const queen = new QueenBee({ queue: fakeQueue });

    const result = await queen.dispatch({
      objective: 'Do something',
      tenant_slug: 'acme',
      request_id: 'req-004',
    });

    expect(result.subtasks_count).toBe(2);
    const roles = queueMocks.mockAdd.mock.calls.map(
      (c) => (c[1] as { payload: { bot_role: string } }).payload.bot_role
    );
    expect(roles).toContain('researcher');
    expect(roles).toContain('coder');
  });

  it('publishes at least one pheromone on dispatch', async () => {
    const { QueenBee } = await import('../hive/queen-bee.js');
    const queen = new QueenBee({ queue: fakeQueue });

    await queen.dispatch({
      objective: 'Research security vulnerabilities',
      tenant_slug: 'acme',
      request_id: 'req-005',
    });

    expect(redisMocks.mockPublish).toHaveBeenCalled();
  });

  it('includes tenant_slug in each enqueued job', async () => {
    const { QueenBee } = await import('../hive/queen-bee.js');
    const queen = new QueenBee({ queue: fakeQueue });

    await queen.dispatch({
      objective: 'Code a new module',
      tenant_slug: 'my-tenant',
      request_id: 'req-006',
    });

    for (const call of queueMocks.mockAdd.mock.calls) {
      const jobData = call[1] as { tenant_slug: string };
      expect(jobData.tenant_slug).toBe('my-tenant');
    }
  });

  it('assigns unique BullMQ jobIds to prevent duplicates', async () => {
    const { QueenBee } = await import('../hive/queen-bee.js');
    const queen = new QueenBee({ queue: fakeQueue });

    await queen.dispatch({
      objective: 'Implement and test a new feature',
      tenant_slug: 'acme',
      request_id: 'req-007',
      required_roles: ['coder', 'tester'],
    });

    const jobIds = queueMocks.mockAdd.mock.calls.map((c) => (c[2] as { jobId?: string })?.jobId);
    const uniqueIds = new Set(jobIds);
    expect(uniqueIds.size).toBe(jobIds.length);
  });

  it('infers deployer role from objective containing "deploy"', async () => {
    const { QueenBee } = await import('../hive/queen-bee.js');
    const queen = new QueenBee({ queue: fakeQueue });

    const result = await queen.dispatch({
      objective: 'Deploy the new service to production',
      tenant_slug: 'acme',
      request_id: 'req-008',
    });

    const roles = queueMocks.mockAdd.mock.calls.map(
      (c) => (c[1] as { payload: { bot_role: string } }).payload.bot_role
    );
    expect(roles).toContain('deployer');
    expect(result.subtasks_count).toBeGreaterThanOrEqual(1);
  });
});
