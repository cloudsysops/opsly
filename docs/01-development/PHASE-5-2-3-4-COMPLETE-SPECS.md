---
title: "Phase 5.2-5.4 Complete Specifications — Billy, Lili & Marketplace"
date: 2026-05-08
status: ready-for-implementation
---

# Phase 5.2-5.4: Implementation Specifications

## Phase 5.2: Advanced Rendering (Billy's First Major Task)

### Architecture

```
┌─────────────────────────────────────┐
│    Rendering Engine (Port 3005)     │
├─────────────────────────────────────┤
│                                     │
│  ┌──────────────────────────────┐   │
│  │ Stable Diffusion Adapter     │   │
│  │ • text-to-image              │   │
│  │ • image-to-image (inpaint)   │   │
│  │ • upscaling                  │   │
│  └──────────────────────────────┘   │
│                                     │
│  ┌──────────────────────────────┐   │
│  │ Elevenlabs TTS Adapter       │   │
│  │ • text-to-speech             │   │
│  │ • voice cloning              │   │
│  │ • multi-language             │   │
│  └──────────────────────────────┘   │
│                                     │
│  ┌──────────────────────────────┐   │
│  │ Batch Processor (Bull)       │   │
│  │ • queue management           │   │
│  │ • concurrency control        │   │
│  │ • retry logic                │   │
│  │ • progress tracking          │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
         ↓              ↓              ↓
    ┌────────┐     ┌────────┐     ┌────────┐
    │ Redis  │     │ Storage│     │Billing │
    │ (Bull) │     │ (S3)   │     │Service │
    └────────┘     └────────┘     └────────┘
```

### API Endpoints

```typescript
// Stable Diffusion
POST /api/v1/render/text-to-image
  Request: {
    prompt: string
    negative_prompt?: string
    num_images: number (1-4)
    steps: number (20-50)
    guidance_scale: number (7.5-15)
    seed?: number
  }
  Response: {
    job_id: string
    status: "queued" | "processing" | "complete" | "failed"
    estimated_time_ms: number
  }

POST /api/v1/render/image-to-image
  Request: {
    image_base64: string
    prompt: string
    strength: number (0-1)  // How much to change
    steps: number
  }
  Response: { job_id, status, ... }

POST /api/v1/render/upscale
  Request: {
    image_base64: string
    scale: number (2 | 4)  // 2x or 4x upscaling
  }
  Response: { job_id, status, ... }

// Elevenlabs TTS
POST /api/v1/render/text-to-speech
  Request: {
    text: string
    voice_id: string
    stability: number (0-1)
    similarity_boost?: number
    language_code?: string  // "en", "es", "fr", etc.
  }
  Response: {
    job_id: string
    audio_url: string
    duration_seconds: number
  }

GET /api/v1/render/voices
  Response: {
    voices: [
      { id: "voice-001", name: "Aria", language: "en" },
      { id: "voice-002", name: "Elena", language: "es" },
      ...
    ]
  }

// Batch Processing
POST /api/v1/batch/submit
  Request: {
    jobs: Array<{
      type: "image" | "audio" | "video"
      payload: any
    }>
    priority?: "low" | "normal" | "high"
  }
  Response: {
    batch_id: string
    total_jobs: number
    estimated_completion_time_ms: number
  }

GET /api/v1/batch/{batch_id}/progress
  Response: {
    batch_id: string
    status: "queued" | "processing" | "complete"
    progress: {
      completed: number
      failed: number
      total: number
      percentage: number
    }
    estimated_remaining_ms: number
  }

GET /api/v1/batch/{batch_id}/results
  Response: {
    jobs: [
      { job_id, type, result, status, error?, duration_ms }
    ]
  }

// Queue Stats
GET /api/v1/render/stats
  Response: {
    queue: {
      pending: number
      active: number
      completed: number
      failed: number
    }
    recent_jobs: [
      { job_id, type, status, duration_ms, cost_usd }
    ]
    daily_cost: number
  }

GET /api/v1/render/{job_id}
  Response: {
    job_id: string
    type: string
    status: string
    created_at: ISO8601
    started_at?: ISO8601
    completed_at?: ISO8601
    result?: { images: [], urls: [] }
    error?: string
  }
```

### Implementation Steps (Billy's Task)

**File Structure:**
```
apps/rendering-service/
├── src/
│   ├── adapters/
│   │   ├── StableDiffusionAdapter.ts
│   │   ├── ElevenlabsAdapter.ts
│   │   └── BaseAdapter.ts
│   ├── services/
│   │   ├── BatchProcessor.ts
│   │   ├── JobQueue.ts
│   │   └── CostTracker.ts
│   ├── api/
│   │   ├── routes/
│   │   │   ├── render.ts
│   │   │   ├── batch.ts
│   │   │   └── stats.ts
│   │   └── index.ts
│   ├── types/
│   │   ├── RenderJob.ts
│   │   ├── RenderResult.ts
│   │   └── BatchJob.ts
│   └── config.ts
├── package.json
└── Dockerfile
```

**Step 1: Create adapters**
```typescript
// apps/rendering-service/src/adapters/BaseAdapter.ts
abstract class BaseAdapter {
  abstract render(job: RenderJob): Promise<RenderResult>
  abstract getStatus(jobId: string): Promise<JobStatus>
  abstract cancel(jobId: string): Promise<void>
}

// apps/rendering-service/src/adapters/StableDiffusionAdapter.ts
class StableDiffusionAdapter extends BaseAdapter {
  constructor(private apiUrl: string = process.env.SD_API_URL) {}
  
  async render(job: TextToImageJob): Promise<RenderResult> {
    // Call SD API (HTTP POST to localhost:7860)
    // Return: { images: [base64, ...], metadata: {} }
  }
  
  async upscale(job: UpscaleJob): Promise<RenderResult> {
    // Call SD upscale API
  }
}

// apps/rendering-service/src/adapters/ElevenlabsAdapter.ts
class ElevenlabsAdapter extends BaseAdapter {
  constructor(private apiKey: string = process.env.ELEVENLABS_API_KEY) {}
  
  async render(job: TextToSpeechJob): Promise<RenderResult> {
    // Call Elevenlabs API (HTTPS)
    // Return: { audio_url, duration_seconds }
  }
  
  async getVoices(): Promise<Voice[]> {
    // GET /v1/voices
  }
}
```

**Step 2: Create batch processor**
```typescript
// apps/rendering-service/src/services/BatchProcessor.ts
class BatchProcessor {
  constructor(
    private redisUrl: string,
    private adapters: Map<string, BaseAdapter>,
    private billingService: BillingService
  ) {
    this.queue = new Bull('rendering', { redis: redisUrl })
  }
  
  async submitBatch(batch: BatchSubmission): Promise<string> {
    const batchId = generateId()
    
    for (const job of batch.jobs) {
      await this.queue.add(
        'render',
        { ...job, batchId },
        { 
          priority: batch.priority || 'normal',
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000  // Start at 2s, exponential growth
          }
        }
      )
    }
    
    return batchId
  }
  
  async processJob(job: Job) {
    try {
      const adapter = this.adapters.get(job.data.type)
      const result = await adapter.render(job.data)
      
      // Track cost
      const cost = this.calculateCost(job.data.type, result)
      await this.billingService.logRenderCost(
        job.data.tenantId,
        job.data.type,
        cost
      )
      
      return result
    } catch (error) {
      // Log + retry automatically (Bull handles this)
      throw error
    }
  }
  
  private calculateCost(type: string, result: any): number {
    switch (type) {
      case 'image':
        return 0.001  // $0.001 per image
      case 'audio':
        return 0.005 * (result.duration_seconds / 60)  // $0.005/min
      default:
        return 0
    }
  }
}
```

**Step 3: Create API endpoints**
```typescript
// apps/rendering-service/src/api/routes/render.ts
export default async function renderRoutes(app: FastifyInstance) {
  app.post('/api/v1/render/text-to-image', async (req, reply) => {
    const job = await processor.submitBatch({
      jobs: [{ type: 'image', payload: req.body }]
    })
    return { job_id: job[0], status: 'queued' }
  })
  
  app.post('/api/v1/render/text-to-speech', async (req, reply) => {
    const result = await elevenlabsAdapter.render(req.body)
    return { job_id: result.jobId, audio_url: result.url }
  })
  
  app.get('/api/v1/render/:jobId', async (req, reply) => {
    const result = await jobQueue.get(req.params.jobId)
    return result
  })
  
  app.post('/api/v1/batch/submit', async (req, reply) => {
    const batchId = await processor.submitBatch(req.body)
    return { batch_id: batchId, status: 'queued' }
  })
  
  app.get('/api/v1/batch/:batchId/progress', async (req, reply) => {
    const progress = await processor.getProgress(req.params.batchId)
    return progress
  })
  
  app.get('/api/v1/render/stats', async (req, reply) => {
    const stats = await processor.getStats()
    return stats
  })
}
```

**Step 4: Configuration**
```env
# .env.mcp
RENDERING_SERVICE_PORT=3005
RENDERING_SERVICE_HOST=0.0.0.0

# Stable Diffusion
SD_API_URL=http://localhost:7860
SD_TIMEOUT_MS=120000

# Elevenlabs
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_API_URL=https://api.elevenlabs.io/v1
ELEVENLABS_TIMEOUT_MS=30000

# Redis (Bull)
REDIS_URL=redis://localhost:6379
BATCH_MAX_CONCURRENT=3
BATCH_RETRY_MAX=3

# Cost tracking
BILLING_SERVICE_URL=http://localhost:3009
```

---

## Phase 5.3: E2E Testing (Lili's Task)

### Test Suite Structure

```
e2e/
├── fixtures/
│   ├── test-data.ts
│   ├── api-helpers.ts
│   └── db-helpers.ts
├── tests/
│   ├── 01-rendering-workflow.spec.ts
│   ├── 02-batch-processing.spec.ts
│   ├── 03-multi-tenant-isolation.spec.ts
│   ├── 04-cost-tracking.spec.ts
│   ├── 05-error-recovery.spec.ts
│   ├── 06-performance.spec.ts
│   ├── 07-concurrent-jobs.spec.ts
│   ├── 08-deployment-health.spec.ts
│   └── load-test.spec.ts
├── playwright.config.ts
└── ci-config.yml
```

### Test Cases (Lili Runs These)

**Test 1: Rendering Workflow**
```typescript
test('Text-to-Image rendering completes successfully', async ({ api }) => {
  // 1. Submit job
  const { job_id } = await api.post('/render/text-to-image', {
    prompt: 'a blue cat',
    num_images: 1
  })
  
  // 2. Poll until complete
  let result
  for (let i = 0; i < 60; i++) {  // 60s timeout
    result = await api.get(`/render/${job_id}`)
    if (result.status === 'complete') break
    await page.waitForTimeout(1000)
  }
  
  // 3. Verify result
  expect(result.status).toBe('complete')
  expect(result.result.images.length).toBe(1)
  expect(result.cost_usd).toBeLessThan(0.01)
})

test('Text-to-Speech generates audio with correct duration', async ({ api }) => {
  const { audio_url, duration_seconds } = await api.post(
    '/render/text-to-speech',
    { text: 'Hello world', voice_id: 'voice-001' }
  )
  
  expect(duration_seconds).toBeGreaterThan(0)
  expect(audio_url).toMatch(/^https?:\/\//)
  
  // Verify audio file exists and is playable
  const resp = await fetch(audio_url)
  expect(resp.ok).toBe(true)
})
```

**Test 2: Batch Processing**
```typescript
test('Batch of 10 jobs processes in parallel', async ({ api }) => {
  const startTime = Date.now()
  
  const { batch_id } = await api.post('/batch/submit', {
    jobs: Array(10).fill({
      type: 'image',
      payload: { prompt: 'a cat', num_images: 1 }
    })
  })
  
  // Poll for completion
  let progress
  while (true) {
    progress = await api.get(`/batch/${batch_id}/progress`)
    if (progress.status === 'complete') break
    await page.waitForTimeout(5000)
  }
  
  const duration = Date.now() - startTime
  
  // Should take ~parallel time, not serial
  expect(progress.progress.completed).toBe(10)
  expect(duration).toBeLessThan(180000)  // Less than 3 min for 10 parallel
})

test('Batch with failed jobs retries automatically', async ({ api }) => {
  const { batch_id } = await api.post('/batch/submit', {
    jobs: [
      { type: 'image', payload: { prompt: 'cat' } },
      { type: 'image', payload: { prompt: '' } }  // Invalid
    ]
  })
  
  let progress
  while (true) {
    progress = await api.get(`/batch/${batch_id}/progress`)
    if (progress.status === 'complete') break
    await page.waitForTimeout(2000)
  }
  
  const results = await api.get(`/batch/${batch_id}/results`)
  expect(results.jobs[0].status).toBe('complete')
  expect(results.jobs[1].status).toBe('failed')
  expect(results.jobs[1].error).toMatch(/invalid/)
})
```

**Test 3: Multi-tenant Isolation**
```typescript
test('Tenant A cannot access Tenant B rendering jobs', async ({ api }) => {
  const tenantA = await api.login('tenant-a')
  const tenantB = await api.login('tenant-b')
  
  // Tenant A submits job
  const { job_id } = await tenantA.post('/render/text-to-image', {
    prompt: 'secret'
  })
  
  // Tenant B tries to access
  const result = tenantB.get(`/render/${job_id}`)
  expect(result).rejects.toThrow('403')  // Forbidden
})

test('Costs are tracked per tenant separately', async ({ api, db }) => {
  const tenantA = await api.login('tenant-a')
  const tenantB = await api.login('tenant-b')
  
  // Both submit jobs
  await tenantA.post('/render/text-to-image', { prompt: 'a' })
  await tenantB.post('/render/text-to-image', { prompt: 'b' })
  
  // Check costs in database
  const costA = await db.query(
    `SELECT SUM(cost_usd) FROM render_costs WHERE tenant_id = $1`,
    [tenantA.id]
  )
  const costB = await db.query(
    `SELECT SUM(cost_usd) FROM render_costs WHERE tenant_id = $1`,
    [tenantB.id]
  )
  
  // Both should have roughly equal costs (same job type)
  expect(Math.abs(costA - costB)).toBeLessThan(0.001)
})
```

**Test 4: Performance**
```typescript
test('Rendering endpoint responds within 500ms (queued)', async ({ api }) => {
  const start = Date.now()
  await api.post('/render/text-to-image', { prompt: 'cat' })
  const duration = Date.now() - start
  
  expect(duration).toBeLessThan(500)
})

test('Status polling endpoint responds within 100ms', async ({ api }) => {
  const { job_id } = await api.post('/render/text-to-image', { prompt: 'cat' })
  
  const start = Date.now()
  await api.get(`/render/${job_id}`)
  const duration = Date.now() - start
  
  expect(duration).toBeLessThan(100)
})
```

**Test 5: Load Test (10 concurrent users)**
```typescript
test('System handles 10 concurrent users with <2s response time', async ({ api }) => {
  const users = Array(10).fill(null).map((_, i) => 
    api.login(`user-${i}`)
  )
  
  const results = await Promise.all(
    users.map(user =>
      user.post('/render/text-to-image', { prompt: 'cat' })
    )
  )
  
  // All should succeed
  expect(results.every(r => r.job_id)).toBe(true)
  
  // Each should have taken <2s
  results.forEach(r => {
    expect(r.response_time_ms).toBeLessThan(2000)
  })
})
```

### GitHub Actions CI/CD

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  e2e:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
      redis:
        image: redis:7
      stable-diffusion:
        image: automatic1111/stable-diffusion-webui
        ports:
          - 7860:7860
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - run: npm ci
      - run: npm run build
      
      - name: Start services
        run: docker-compose -f infra/docker-compose.test.yml up -d
      
      - name: Wait for services
        run: npm run wait-for-services
      
      - name: Run E2E tests
        run: npx playwright test
        env:
          API_URL: http://localhost:3001
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/opsly_test
          REDIS_URL: redis://localhost:6379
      
      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## Phase 5.4: Agent Marketplace (Frontend + API)

### UI Components (React)

**Step 1: Marketplace Wizard**
```typescript
// apps/portal/src/components/AgentMarketplace.tsx
export const AgentMarketplace: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    instructions: '',
    model: 'claude-3-sonnet',
    tools: [] as string[]
  })
  
  const handleNext = async () => {
    if (step === 4) {
      // Deploy
      await deployAgent(formData)
      setStep(1)
      setFormData({})
    } else {
      setStep((s) => (s + 1) as any)
    }
  }
  
  return (
    <div className="marketplace-wizard">
      {step === 1 && <TemplateSelector templates={TEMPLATES} onSelect={setSelectedTemplate} />}
      {step === 2 && <AgentConfigurator template={selectedTemplate} onChange={setFormData} />}
      {step === 3 && <AgentPreview data={formData} />}
      {step === 4 && <DeploymentStatus agentId={formData.id} />}
      
      <WizardNav step={step} onNext={handleNext} />
    </div>
  )
}
```

**Step 2: Template Library**
```typescript
// apps/portal/src/components/TemplateSelector.tsx
const TEMPLATES = [
  {
    id: 'code-reviewer',
    name: 'Code Reviewer',
    category: 'Development',
    description: 'Reviews PRs, suggests improvements',
    icon: '📝',
    tools: ['github', 'slack'],
    instructions: `You are a code reviewer. For each PR:...`
  },
  {
    id: 'api-builder',
    name: 'API Builder',
    category: 'Development',
    description: 'Generates REST APIs from specs',
    icon: '🔧',
    tools: ['github', 'supabase'],
    instructions: `You are an API architect...`
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    category: 'Analytics',
    description: 'Analyzes data, generates reports',
    icon: '📊',
    tools: ['supabase', 'slack'],
    instructions: `You are a data analyst...`
  },
  // ... 3 more templates
]
```

**Step 3: Configuration Form**
```typescript
// apps/portal/src/components/AgentConfigurator.tsx
export const AgentConfigurator: React.FC<Props> = ({ template, onChange }) => {
  return (
    <form>
      <TextField
        label="Agent Name"
        placeholder="My Code Reviewer"
        onChange={(name) => onChange({ ...formData, name })}
      />
      
      <TextArea
        label="Instructions"
        defaultValue={template?.instructions}
        onChange={(instructions) => onChange({ ...formData, instructions })}
      />
      
      <Select
        label="LLM Model"
        options={['claude-3-sonnet', 'gpt-4-turbo', 'llama-2']}
        onChange={(model) => onChange({ ...formData, model })}
      />
      
      <MultiSelect
        label="Tools"
        options={['github', 'slack', 'supabase', 'stripe']}
        onChange={(tools) => onChange({ ...formData, tools })}
      />
      
      <TextField
        label="Max Concurrent Tasks"
        type="number"
        defaultValue="5"
      />
    </form>
  )
}
```

### API Endpoints

```typescript
// apps/api/src/routes/agents.ts
export default async function agentRoutes(app: FastifyInstance) {
  // Create agent
  app.post<{ Body: CreateAgentRequest }>(
    '/api/v1/agents',
    async (req, reply) => {
      const agent = await db.agents.create({
        tenant_id: req.user.tenant_id,
        name: req.body.name,
        description: req.body.description,
        instructions: req.body.instructions,
        model: req.body.model,
        tools: req.body.tools,
        template_id: req.body.template_id,
        config: {
          max_concurrent: req.body.max_concurrent || 5,
          timeout_ms: req.body.timeout_ms || 300000
        },
        status: 'deployed'
      })
      
      // Log deployment
      await logger.info(`Agent deployed: ${agent.id}`)
      
      return reply.send({ id: agent.id, status: 'deployed' })
    }
  )
  
  // Get agent
  app.get<{ Params: { agentId: string } }>(
    '/api/v1/agents/:agentId',
    async (req, reply) => {
      const agent = await db.agents.findById(req.params.agentId)
      
      if (agent.tenant_id !== req.user.tenant_id) {
        return reply.forbidden()
      }
      
      return { ...agent }
    }
  )
  
  // List agents
  app.get('/api/v1/agents', async (req, reply) => {
    const agents = await db.agents.findByTenant(req.user.tenant_id)
    return { agents }
  })
  
  // Execute agent
  app.post<{ Params: { agentId: string }; Body: ExecuteRequest }>(
    '/api/v1/agents/:agentId/execute',
    async (req, reply) => {
      const agent = await db.agents.findById(req.params.agentId)
      
      // Queue execution
      const execution = await orchestrator.enqueue({
        agent_id: agent.id,
        task: req.body.task,
        context: req.body.context,
        tenant_id: req.user.tenant_id
      })
      
      return {
        execution_id: execution.id,
        status: 'queued',
        estimated_duration_ms: 30000
      }
    }
  )
  
  // Get execution results
  app.get<{ Params: { executionId: string } }>(
    '/api/v1/executions/:executionId',
    async (req, reply) => {
      const execution = await db.executions.findById(req.params.executionId)
      
      // Check tenant access
      if (execution.tenant_id !== req.user.tenant_id) {
        return reply.forbidden()
      }
      
      return {
        id: execution.id,
        agent_id: execution.agent_id,
        status: execution.status,
        result: execution.result,
        error: execution.error,
        duration_ms: execution.duration_ms,
        cost_usd: execution.cost_usd
      }
    }
  )
  
  // Get agent templates
  app.get('/api/v1/agents/templates', async (req, reply) => {
    return {
      templates: [
        { id: 'code-reviewer', name: 'Code Reviewer', ... },
        { id: 'api-builder', name: 'API Builder', ... },
        // ...
      ]
    }
  })
  
  // Delete agent
  app.delete<{ Params: { agentId: string } }>(
    '/api/v1/agents/:agentId',
    async (req, reply) => {
      const agent = await db.agents.findById(req.params.agentId)
      
      if (agent.tenant_id !== req.user.tenant_id) {
        return reply.forbidden()
      }
      
      await db.agents.delete(agent.id)
      return reply.send({ success: true })
    }
  )
}
```

### Database Schema

```sql
-- Agents table
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR NOT NULL,
  description TEXT,
  template_id VARCHAR,
  instructions TEXT NOT NULL,
  model VARCHAR DEFAULT 'claude-3-sonnet',
  tools JSONB DEFAULT '[]',
  config JSONB,
  status VARCHAR DEFAULT 'deployed',  -- deployed | paused | error
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- Agent executions (audit trail)
CREATE TABLE agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  task_description TEXT,
  inputs JSONB,
  result JSONB,
  error TEXT,
  status VARCHAR,  -- queued | running | complete | failed
  duration_ms INT,
  cost_usd DECIMAL(10, 4),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Templates (pre-built)
CREATE TABLE templates (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  category VARCHAR,
  description TEXT,
  icon VARCHAR,
  tools JSONB,
  instructions TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Agent execution logs (for debugging)
CREATE TABLE agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES agent_executions(id),
  level VARCHAR,  -- debug | info | warn | error
  message TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_agents_tenant ON agents(tenant_id);
CREATE INDEX idx_executions_agent ON agent_executions(agent_id);
CREATE INDEX idx_executions_tenant ON agent_executions(tenant_id);
CREATE INDEX idx_logs_execution ON agent_logs(execution_id);
```

---

## Integration with Opsly 2.0

### Billy's Task Flow

```
Arena: "Implement Phase 5.2: Advanced Rendering"
  ↓
Billy receives task + Context Pack
  ↓
Billy creates branch: feat/phase-5.2-rendering
  ↓
Billy implements:
  • StableDiffusionAdapter
  • ElevenlabsAdapter
  • BatchProcessor
  • API routes
  ↓
Billy runs npm run type-check + npm run build
  ↓
Billy commits: "feat(phase5.2): advanced rendering engine"
  ↓
Billy opens PR (draft)

Lili receives PR notification
  ↓
Lili runs:
  • npm run type-check (verify types)
  • npm run test (unit tests)
  • npm run e2e (integration tests)
  • npm run load-test (10 concurrent)
  ↓
If tests fail: Lili suggests fix as PR comment
  ↓
Billy fixes + retries
  ↓
If tests pass: Lili approves PR

Security Agent scans:
  • No hardcoded secrets
  • No SQL injection risks
  • Dependency vulnerabilities
  ↓
Docs Agent updates:
  • AGENTS.md with task summary
  • API documentation
  • Runbooks for rendering service
  ↓
Arena/Lili merge gate checks:
  • All tests ✅
  • Security approved ✅
  • Documentation updated ✅
  ↓
MERGE to main
  ↓
Deploy to staging
  ↓
Monitor health (Prometheus)
  ↓
COMPLETE: task-002
```

---

## Success Criteria

### Phase 5.2
- ✅ Text-to-image working (SD API)
- ✅ Text-to-speech working (Elevenlabs)
- ✅ Batch queue processing (Bull + Redis, 3 concurrent)
- ✅ Cost tracking per render type
- ✅ Queue stats exposed via API
- ✅ No hardcoded secrets
- ✅ Error recovery + exponential backoff
- ✅ E2E tests passing

### Phase 5.3
- ✅ All 8+ E2E tests passing
- ✅ Load test (10 concurrent users)
- ✅ CI/CD pipeline running on GitHub Actions
- ✅ Coverage reports (>80%)
- ✅ Performance baselines documented

### Phase 5.4
- ✅ Marketplace UI loads + renders 6 templates
- ✅ 4-step wizard functional (all paths)
- ✅ Agent creation working (backend + frontend)
- ✅ One-click deployment functional
- ✅ Cost tracking per agent
- ✅ Multi-tenant isolation verified

---

## Timeline (Billy, Lili Coordination)

**Day 1: Billy implements 5.2**
- Create adapters (4 hours)
- Create API routes (2 hours)
- Test locally (1 hour)

**Day 2: Lili validates + Billy tweaks**
- Lili runs E2E tests (3 hours)
- Billy fixes failing tests (2 hours)
- Merge to main

**Day 3: Billy + Lili implement 5.4**
- Billy: API endpoints (3 hours)
- Lili: UI + tests (4 hours)

**Day 4: Integration + Security + Docs**
- Security scan (1 hour)
- Docs agent updates (1 hour)
- Final testing (1 hour)

**Total: 4 days with 2 agents running in parallel**

---

**Ready for:**
- Billy to start implementing
- Lili to set up test environment
- Security to prepare scanning rules
- Docs to prepare template updates

