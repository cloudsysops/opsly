# Task Orchestrator

Autonomous task execution and coordination system for Opsly. Manages task queues, worker assignment, and execution tracking for distributed autonomous operations.

## Architecture

### Components

1. **Task Queue Service** — Redis/BullMQ-based queue for task management
2. **Worker Manager** — Worker registration, heartbeat, and task assignment
3. **Supabase Integration** — Persistent data storage for long-term task history
4. **Express API** — REST endpoints for task and worker management
5. **Validation** — Zod-powered input validation for all API routes

### Data Flow

```
Claude/User → POST /api/tasks → TaskQueue (Redis) + Supabase (DB)
                                     ↓
                    Worker polls → GET /api/workers/:id/next-task
                                     ↓
                    Worker executes task
                                     ↓
                    PATCH /api/tasks/:id (completion/failure)
                                     ↓
                    TaskQueue + Supabase updated
```

## Quick Start

### Installation

```bash
npm install
```

### Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure:
- `REDIS_HOST` — Redis connection host (default: localhost)
- `REDIS_PORT` — Redis connection port (default: 6379)
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_KEY` — Service role key (for persistence, optional)
- `PORT` — Server port (default: 3015)

### Start Server

```bash
npm run dev          # Development with hot reload
npm run build        # Build TypeScript
npm start            # Production
npm run test         # Run tests
```

## API Documentation

### Task Management

#### Create Task
```http
POST /api/tasks
Content-Type: application/json

{
  "type": "implementation",
  "title": "Implement Guardian Shield DNS bot",
  "description": "Add DNS security monitoring",
  "prompt": "Create a DNS shield bot that monitors...",
  "priority": "high",
  "created_by": "claude",
  "estimated_days": 3,
  "dependencies": [],
  "branch": "guardian/dns-shield"
}
```

Response: `201 Created` with task object

#### Get Tasks
```http
GET /api/tasks?status=pending
```

Query Parameters:
- `status` — Filter by status (pending, assigned, executing, completed, failed, cancelled)

Returns: `200 OK` with array of tasks

#### Get Task Details
```http
GET /api/tasks/:id
```

Returns: `200 OK` with full task including execution logs

#### Update Task
```http
PATCH /api/tasks/:id
Content-Type: application/json

{
  "status": "completed",
  "worker_id": "cursor-macbook-1",
  "result": {
    "success": true,
    "output": "Feature implemented successfully",
    "commits": ["abc123"],
    "files_changed": ["src/feature.ts"],
    "pr_url": "https://github.com/cloudsysops/opsly/pull/999",
    "duration_ms": 3600000
  }
}
```

#### Cancel Task
```http
DELETE /api/tasks/:id
```

### Worker Management

#### Register Worker
```http
POST /api/workers/register
Content-Type: application/json

{
  "id": "cursor-macbook-prod",
  "type": "cursor",
  "capacity": 2,
  "metadata": {
    "os": "macOS",
    "version": "1.0.0",
    "branch": "main"
  }
}
```

Supported worker types: `cursor`, `ci-runner`, `claude-research`

#### Get Next Task (Worker Polling)
```http
GET /api/workers/:id/next-task
```

Returns: `200 OK` with next task object or `null` if no tasks available.

**Worker should poll this endpoint every 5-30 seconds.**

#### Worker Heartbeat
```http
POST /api/workers/:id/heartbeat
Content-Type: application/json

{
  "status": "working",
  "current_task_id": "task-uuid"
}
```

Status values: `idle`, `working`, `offline`

#### Get Worker Status
```http
GET /api/workers
```

Returns: `200 OK`
```json
{
  "workers": [
    {
      "id": "cursor-macbook-prod",
      "type": "cursor",
      "status": "working",
      "current_task_id": "abc-123",
      "last_heartbeat": "2026-05-02T15:00:00Z",
      "capacity": 2
    }
  ],
  "stats": {
    "total": 5,
    "idle": 2,
    "working": 2,
    "offline": 1
  }
}
```

### Task Logging

#### Add Log Entry
```http
POST /api/tasks/:id/log
Content-Type: application/json

{
  "level": "info",
  "message": "Started implementing feature",
  "context": {
    "component": "dns-shield",
    "phase": "setup"
  }
}
```

Log Levels: `info`, `warn`, `error`, `debug`

## Task Status Flow

```
pending
   ↓
assigned (worker picked up)
   ↓
executing (worker working)
   ├→ completed (success)
   └→ failed (error)
   
Any → cancelled (manual cancel)
```

## Implementation Examples

### Worker (Cursor/Node.js)

```typescript
import axios from 'axios';

const ORCHESTRATOR_URL = 'http://localhost:3015';
const WORKER_ID = 'cursor-macbook-prod';

async function pollTasks() {
  try {
    // Get next task
    const { data: task } = await axios.get(
      `${ORCHESTRATOR_URL}/api/workers/${WORKER_ID}/next-task`
    );

    if (!task) {
      console.log('No tasks available');
      return;
    }

    console.log(`Executing: ${task.title}`);

    // Send heartbeat
    await axios.post(
      `${ORCHESTRATOR_URL}/api/workers/${WORKER_ID}/heartbeat`,
      { status: 'working', current_task_id: task.id }
    );

    try {
      // Execute task (your implementation)
      const result = await executeTask(task);

      // Report success
      await axios.patch(
        `${ORCHESTRATOR_URL}/api/tasks/${task.id}`,
        {
          status: 'completed',
          worker_id: WORKER_ID,
          result: {
            success: true,
            output: result.output,
            commits: result.commits,
            duration_ms: Date.now() - task.created_at
          }
        }
      );
    } catch (error) {
      // Report failure
      await axios.patch(
        `${ORCHESTRATOR_URL}/api/tasks/${task.id}`,
        {
          status: 'failed',
          worker_id: WORKER_ID,
          result: {
            success: false,
            error: error.message
          }
        }
      );
    }
  } catch (error) {
    console.error('Poll error:', error.message);
  }

  // Poll again after delay
  setTimeout(pollTasks, 5000);
}

// Register worker and start polling
async function start() {
  try {
    await axios.post(
      `${ORCHESTRATOR_URL}/api/workers/register`,
      {
        id: WORKER_ID,
        type: 'cursor',
        capacity: 1
      }
    );
    console.log('Worker registered');
    pollTasks();
  } catch (error) {
    console.error('Registration failed:', error);
  }
}

start();
```

## Testing

```bash
npm run test              # Run all tests
npm run test -- --watch  # Watch mode
npm run test -- --coverage # With coverage
```

Tests cover:
- Input validation (Zod schemas)
- Task queue operations
- Worker management
- API routes

## Development

### Add New Validation Schema

Edit `src/validation/schemas.ts`:

```typescript
export const mySchema = z.object({
  field1: z.string(),
  field2: z.number().positive(),
});

export type MyInput = z.infer<typeof mySchema>;
```

### Add New API Route

Edit `src/server.ts`:

```typescript
app.post('/api/my-route', async (req: Request, res: Response) => {
  try {
    const validated = mySchema.parse(req.body);
    // Implementation
    res.json({ result: 'data' });
  } catch (error: any) {
    if (error.issues) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    res.status(500).json({ error: error.message });
  }
});
```

## Monitoring

### Health Check
```bash
curl http://localhost:3015/api/health
```

### Task Queue Status
```bash
redis-cli LLEN opsly-tasks:wait
redis-cli LLEN opsly-tasks:active
redis-cli LLEN opsly-tasks:completed
```

### Worker Status
```bash
curl http://localhost:3015/api/workers
```

## Production Deployment

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

ENV NODE_ENV=production
EXPOSE 3015

CMD ["node", "dist/index.js"]
```

### Environment Variables (Production)

```
REDIS_HOST=redis.production.internal
REDIS_PORT=6379
REDIS_PASSWORD=your-password
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
PORT=3015
NODE_ENV=production
LOG_LEVEL=warn
```

### Redis Configuration (Recommended)

```
maxmemory 2gb
maxmemory-policy allkeys-lru
appendonly yes
save 900 1 300 10 60 10000
```

## Troubleshooting

### Redis Connection Failed
- Verify Redis is running: `redis-cli ping`
- Check `REDIS_HOST` and `REDIS_PORT` in `.env`
- Fallback to in-memory mode if Supabase configured

### Supabase Connection Failed
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
- Task Orchestrator works in Redis-only mode without Supabase
- Check network connectivity to Supabase

### Worker Not Getting Tasks
- Verify worker is registered: `GET /api/workers`
- Check tasks exist: `GET /api/tasks?status=pending`
- Verify worker heartbeat responds
- Check worker polling interval

## Performance Characteristics

- **Task creation**: ~10ms (Redis)
- **Task retrieval**: ~5ms (Memory), ~50ms (Supabase)
- **Worker assignment**: ~15ms
- **Concurrent tasks**: Scales with Redis throughput
- **Memory**: ~50MB base + 1MB per 1000 tasks

## References

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Supabase Documentation](https://supabase.com/docs)
- [Redis Documentation](https://redis.io/docs/)
- [Zod Validation](https://zod.dev/)
- [Express.js](https://expressjs.com/)
