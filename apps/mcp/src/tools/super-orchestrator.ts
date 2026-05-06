/**
 * Super Orchestrator MCP Tool
 * Integra las capacidades del Super Orchestrator v2 como herramienta MCP
 */
import { z } from 'zod';
import type { ToolDefinition } from '../types/index.js';
import { randomUUID } from 'node:crypto';

// Schema types
const ProviderSelectInput = z.object({
  prompt: z.string().min(1).describe('Prompt para seleccionar provider'),
  task_type: z.string().optional().describe('Tipo de tarea'),
});

const SuperOrchestratorJobInput = z.object({
  prompt: z.string().min(1).describe('Prompt de la tarea'),
  task_type: z.enum(['code_generation', 'code_review', 'reasoning', 'planning', 'analysis', 'monitoring', 'general']).default('general'),
  tenant_slug: z.string().default('opsly').describe('Tenant que ejecuta la tarea'),
  context: z.object({
    complexity: z.enum(['simple', 'medium', 'complex']).optional(),
    urgency: z.enum(['low', 'medium', 'high']).optional(),
    should_commit: z.boolean().optional(),
    should_trigger_n8n: z.boolean().optional(),
  }).optional(),
  capabilities: z.array(z.string()).optional(),
});

const TenantBudgetInput = z.object({
  tenant_slug: z.string(),
  monthly_budget_usd: z.number().positive(),
  alert_threshold_percent: z.number().min(0).max(100).default(80),
});

const CircuitBreakerInput = z.object({
  provider: z.string(),
  action: z.enum(['check', 'reset']),
});

// Simulated in-memory state (in production would use Redis)
const jobState = new Map<string, any>();
const metricsState = {
  providers: {} as Record<string, any>,
  tasks: {} as Record<string, any>,
};
const budgetState = new Map<string, any>();
const circuitBreakers = new Map<string, any>();

// Provider selection logic (simplified from Python)
function selectProvider(prompt: string, taskType?: string): string {
  const promptLower = prompt.toLowerCase();
  
  if (promptLower.includes('genera') || promptLower.includes('create') || promptLower.includes('code')) {
    return taskType === 'code_review' ? 'ollama-qwen' : 'ollama-codellama';
  }
  if (promptLower.includes('review') || promptLower.includes('analiza') || promptLower.includes('revis')) {
    return 'ollama-qwen';
  }
  if (promptLower.includes('plan') || promptLower.includes('diseña')) {
    return 'anthropic';
  }
  if (promptLower.includes('test') || promptLower.includes('prueba')) {
    return 'cursor-local';
  }
  
  return 'ollama-qwen';
}

// Tool 1: Provider Selection
export const superOrchestratorProviderTool: ToolDefinition<z.infer<typeof ProviderSelectInput>, any> = {
  name: 'super_orchestrator_provider',
  description: 'Selecciona el mejor provider para una tarea basado en costo, latencia y éxito',
  inputSchema: ProviderSelectInput,
  handler: async (input) => {
    const provider = selectProvider(input.prompt, input.task_type);
    
    return {
      success: true,
      provider,
      prompt: input.prompt,
      task_type: input.task_type,
      timestamp: new Date().toISOString(),
    };
  },
};

// Tool 2: Execute Super Orchestrator Job
export const superOrchestratorJobTool: ToolDefinition<z.infer<typeof SuperOrchestratorJobInput>, any> = {
  name: 'super_orchestrator_execute',
  description: 'Ejecuta una tarea usando el Super Orchestrator con selección automática de provider, routing y tracking',
  inputSchema: SuperOrchestratorJobInput,
  handler: async (input) => {
    const jobId = randomUUID().substring(0, 8);
    const tenantSlug = input.tenant_slug;
    
    // 1. Select provider
    const provider = selectProvider(input.prompt, input.task_type);
    
    // 2. Check budget (simulated)
    const budget = budgetState.get(tenantSlug) || { monthly_budget_usd: 100, spent: 0 };
    const canSpend = budget.spent < budget.monthly_budget_usd;
    
    if (!canSpend) {
      return {
        success: false,
        error: `Budget exceeded for tenant: ${tenantSlug}`,
        job_id: jobId,
      };
    }
    
    // 3. Check circuit breaker
    const cb = circuitBreakers.get(provider);
    if (cb && cb.state === 'open') {
      return {
        success: false,
        error: `Circuit breaker open for provider: ${provider}`,
        job_id: jobId,
      };
    }
    
    // 4. Simulate execution
    const result = {
      output: `Executed via ${provider}: ${input.prompt.substring(0, 50)}...`,
      latency_ms: Math.floor(Math.random() * 3000) + 500,
    };
    
    // 5. Record metrics
    if (!metricsState.providers[provider]) {
      metricsState.providers[provider] = { requests: 0, success: 0, failure: 0 };
    }
    metricsState.providers[provider].requests++;
    metricsState.providers[provider].success++;
    
    const taskKey = input.task_type;
    if (!metricsState.tasks[taskKey]) {
      metricsState.tasks[taskKey] = {};
    }
    if (!metricsState.tasks[taskKey][provider]) {
      metricsState.tasks[taskKey][provider] = { count: 0, success: 0 };
    }
    metricsState.tasks[taskKey][provider].count++;
    metricsState.tasks[taskKey][provider].success++;
    
    // 6. Update budget
    budget.spent += 0.01; // Small cost
    budgetState.set(tenantSlug, budget);
    
    // Store job state
    jobState.set(jobId, {
      status: 'completed',
      provider,
      tenant_slug: tenantSlug,
      task_type: input.task_type,
      created_at: new Date().toISOString(),
    });
    
    return {
      success: true,
      job_id: jobId,
      provider,
      result: result.output,
      latency_ms: result.latency_ms,
      tenant: tenantSlug,
      timestamp: new Date().toISOString(),
    };
  },
};

// Tool 3: Set Tenant Budget
export const superOrchestratorBudgetTool: ToolDefinition<z.infer<typeof TenantBudgetInput>, any> = {
  name: 'super_orchestrator_budget',
  description: 'Configura el presupuesto mensual para un tenant',
  inputSchema: TenantBudgetInput,
  handler: async (input) => {
    budgetState.set(input.tenant_slug, {
      monthly_budget_usd: input.monthly_budget_usd,
      alert_threshold_percent: input.alert_threshold_percent,
      spent: 0,
      created_at: new Date().toISOString(),
    });
    
    return {
      success: true,
      tenant_slug: input.tenant_slug,
      monthly_budget_usd: input.monthly_budget_usd,
      alert_threshold_percent: input.alert_threshold_percent,
      message: `Budget configured for ${input.tenant_slug}`,
    };
  },
};

// Tool 4: Circuit Breaker Control
export const superOrchestratorCircuitBreakerTool: ToolDefinition<z.infer<typeof CircuitBreakerInput>, any> = {
  name: 'super_orchestrator_circuit_breaker',
  description: 'Gestiona el circuit breaker de providers (check status o reset)',
  inputSchema: CircuitBreakerInput,
  handler: async (input) => {
    const provider = input.provider;
    
    if (input.action === 'reset') {
      circuitBreakers.set(provider, { state: 'closed', failures: 0 });
      return {
        success: true,
        provider,
        state: 'closed',
        message: `Circuit breaker reset for ${provider}`,
      };
    }
    
    // Check status
    const cb = circuitBreakers.get(provider) || { state: 'closed', failures: 0 };
    return {
      success: true,
      provider,
      state: cb.state,
      failures: cb.failures,
    };
  },
};

// Tool 5: Get Metrics Dashboard
export const superOrchestratorMetricsTool: ToolDefinition<{}, any> = {
  name: 'super_orchestrator_metrics',
  description: 'Obtiene el dashboard de métricas del Super Orchestrator',
  inputSchema: z.object({}),
  handler: async () => {
    const totalRequests = Object.values(metricsState.providers).reduce((sum: number, p: any) => sum + p.requests, 0);
    const totalSuccess = Object.values(metricsState.providers).reduce((sum: number, p: any) => sum + p.success, 0);
    
    const providersStats = Object.entries(metricsState.providers).map(([name, data]: [string, any]) => ({
      name,
      requests: data.requests,
      success_rate: data.requests > 0 ? (data.success / data.requests * 100).toFixed(1) + '%' : '0%',
    }));
    
    const tasksStats = Object.entries(metricsState.tasks).map(([taskType, providers]: [string, any]) => {
      const bestProvider = Object.entries(providers).sort((a: any, b: any) => b[1].success - a[1].success)[0];
      return {
        task_type: taskType,
        best_provider: bestProvider?.[0] || 'none',
        total_calls: Object.values(providers).reduce((sum: number, p: any) => sum + p.count, 0),
      };
    });
    
    return {
      success: true,
      summary: {
        total_requests: totalRequests,
        success_rate: totalRequests > 0 ? (totalSuccess / totalRequests * 100).toFixed(1) + '%' : '0%',
        active_jobs: jobState.size,
      },
      providers: providersStats,
      tasks: tasksStats,
      budgets: Object.fromEntries(budgetState),
      timestamp: new Date().toISOString(),
    };
  },
};

// Tool 6: Get Job Status
export const superOrchestratorJobStatusTool: ToolDefinition<{ job_id: string }, any> = {
  name: 'super_orchestrator_job_status',
  description: 'Obtiene el estado de un job del Super Orchestrator',
  inputSchema: z.object({
    job_id: z.string(),
  }),
  handler: async (input) => {
    const job = jobState.get(input.job_id);
    
    if (!job) {
      return {
        success: false,
        error: 'Job not found',
        job_id: input.job_id,
      };
    }
    
    return {
      success: true,
      job_id: input.job_id,
      ...job,
    };
  },
};

// Export all tools
export const superOrchestratorTools = [
  superOrchestratorProviderTool,
  superOrchestratorJobTool,
  superOrchestratorBudgetTool,
  superOrchestratorCircuitBreakerTool,
  superOrchestratorMetricsTool,
  superOrchestratorJobStatusTool,
];