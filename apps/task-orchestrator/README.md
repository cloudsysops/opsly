# Task Orchestrator — Opsly Autonomous Execution

Central task queue and worker coordination system for Opsly.

## Architecture

- **Task Queue**: Redis + BullMQ (pending, executing, completed)
- **Workers**: Cursor (MacBook), CI runners, Claude research agents
- **API**: Express endpoints for task management
- **Persistence**: Supabase for long-term storage

## Quick Start

```bash
# Install dependencies
npm install

# Create .env from .env.example
cp .env.example .env

# Start development
npm run dev

# Access API
curl http://localhost:3015/api/health
```

## API Endpoints

### Tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks` - List tasks
- `GET /api/tasks/:id` - Get task details
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Cancel task

### Workers
- `POST /api/workers/register` - Register worker
- `GET /api/workers/:id/next-task` - Get next task
- `POST /api/workers/:id/heartbeat` - Worker heartbeat
- `POST /api/tasks/:id/log` - Add task log

## Database Schema

See `src/db/schema.sql` for Supabase migrations.

## Environment Setup

1. Create Supabase tables from `src/db/schema.sql`
2. Add Redis connection info to `.env`
3. Start server: `npm run dev`
