import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';

export interface ValidationMetric {
  job_id: string;
  intent: string;
  agent_role: string;
  action: 'commit' | 'iterate' | 'escalate';
  iteration_count: number;
  validation_time_ms: number;
  failed_checks?: string[];
  model_tier?: string;
  cost_usd?: number;
  created_at?: string;
}

export interface AgentPerformanceStats {
  agent_role: string;
  total_attempts: number;
  commit_rate: number;
  iterate_rate: number;
  escalate_rate: number;
  avg_iterations: number;
  avg_validation_time_ms: number;
}

export interface IntentValidationHistory {
  intent: string;
  total_validations: number;
  commit_count: number;
  iterate_count: number;
  escalate_count: number;
  success_rate: number;
  common_errors: string[];
  last_validation_at: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * ValidationMetricsStore: Persists validation outcomes to Supabase
 * Enables feedback loop for adaptive agent selection in OpenClaw
 */
export class ValidationMetricsStore {
  private supabase: SupabaseClient | null;
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private cacheTtlMs: number = 5 * 60 * 1000; // 5 minute default TTL

  constructor(cacheTtlMs: number = 5 * 60 * 1000) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';

    this.cacheTtlMs = cacheTtlMs;

    if (!url || !key) {
      console.warn('[ValidationMetricsStore] Supabase credentials not configured, metrics disabled');
      this.supabase = null;
    } else {
      this.supabase = createClient(url, key, {
        auth: { persistSession: false },
        global: {
          fetch: (...args) => fetch(...args),
        },
        realtime: {
          transport: ws,
        },
      });
    }
  }

  private getCacheKey(prefix: string, param: string): string {
    return `${prefix}:${param}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > this.cacheTtlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setInCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Record a validation metric to enable feedback loop
   * Called after each ValidationOrchestrator.validateAndDecide()
   */
  async recordValidationMetric(metric: ValidationMetric): Promise<boolean> {
    // Invalidate relevant caches first (before Supabase operation)
    // This ensures cache consistency even if Supabase is not available
    this.cache.delete(this.getCacheKey('agent-perf', metric.agent_role));
    this.cache.delete(this.getCacheKey('intent-history', metric.intent));
    this.cache.delete(this.getCacheKey('model-tier', `${metric.agent_role}:${metric.intent}`));

    if (!this.supabase) {
      console.warn('[ValidationMetricsStore] Cannot record metric: Supabase not configured');
      return false;
    }

    try {
      const { error } = await this.supabase
        .from('validation_metrics')
        .insert([{
          job_id: metric.job_id,
          intent: metric.intent,
          agent_role: metric.agent_role,
          action: metric.action,
          iteration_count: metric.iteration_count,
          validation_time_ms: metric.validation_time_ms,
          failed_checks: metric.failed_checks || [],
          model_tier: metric.model_tier || 'balanced',
          cost_usd: metric.cost_usd || 0,
          created_at: metric.created_at || new Date().toISOString(),
        }]);

      if (error) {
        console.error('[ValidationMetricsStore] Error recording metric:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[ValidationMetricsStore] Exception recording metric:', err);
      return false;
    }
  }

  /**
   * Get validation history for a specific intent
   * Used by ValidationFeedbackLayer to adapt routing
   */
  async getValidationHistoryForIntent(intent: string, limit: number = 50): Promise<ValidationMetric[]> {
    if (!this.supabase) {
      return [];
    }

    try {
      const { data, error } = await this.supabase
        .from('validation_metrics')
        .select('*')
        .eq('intent', intent)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[ValidationMetricsStore] Error fetching history:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[ValidationMetricsStore] Exception fetching history:', err);
      return [];
    }
  }

  /**
   * Get performance statistics for an agent role
   * Returns success rates, iteration patterns, escalation rates (cached)
   */
  async getAgentPerformance(agentRole: string): Promise<AgentPerformanceStats | null> {
    if (!this.supabase) {
      return null;
    }

    const cacheKey = this.getCacheKey('agent-perf', agentRole);
    const cached = this.getFromCache<AgentPerformanceStats>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await this.supabase
        .from('validation_metrics')
        .select('*')
        .eq('agent_role', agentRole)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error || !data || data.length === 0) {
        return null;
      }

      const total = data.length;
      const commits = data.filter(m => m.action === 'commit').length;
      const iterates = data.filter(m => m.action === 'iterate').length;
      const escalates = data.filter(m => m.action === 'escalate').length;

      const avgIterations = data.reduce((sum, m) => sum + (m.iteration_count || 1), 0) / total;
      const avgValidationTime = data.reduce((sum, m) => sum + (m.validation_time_ms || 0), 0) / total;

      const result: AgentPerformanceStats = {
        agent_role: agentRole,
        total_attempts: total,
        commit_rate: commits / total,
        iterate_rate: iterates / total,
        escalate_rate: escalates / total,
        avg_iterations: avgIterations,
        avg_validation_time_ms: avgValidationTime,
      };

      this.setInCache(cacheKey, result);
      return result;
    } catch (err) {
      console.error('[ValidationMetricsStore] Exception fetching performance:', err);
      return null;
    }
  }

  /**
   * Suggest model tier upgrade/downgrade based on agent performance
   * Used by ValidationFeedbackLayer to adapt routing decisions
   */
  async suggestModelTierForAgent(agentRole: string, intent: string): Promise<string> {
    const performance = await this.getAgentPerformance(agentRole);
    if (!performance) {
      return 'balanced'; // Default if no history
    }

    // Escalation rate > 20% → suggest premium model
    if (performance.escalate_rate > 0.2) {
      return 'premium';
    }

    // Iterate rate > 0.3 (30%) → suggest premium model
    if (performance.iterate_rate > 0.3) {
      return 'premium';
    }

    // Commit rate > 0.8 and low iterations → suggest economy model
    if (performance.commit_rate > 0.8 && performance.avg_iterations < 1.5) {
      return 'economy';
    }

    // Default: balanced
    return 'balanced';
  }

  /**
   * Get validation summary for a specific intent
   * Used by dashboards and analysis
   */
  async getIntentValidationHistory(intent: string): Promise<IntentValidationHistory | null> {
    if (!this.supabase) {
      return null;
    }

    try {
      const { data, error } = await this.supabase
        .from('validation_metrics')
        .select('*')
        .eq('intent', intent)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error || !data || data.length === 0) {
        return null;
      }

      const commits = data.filter(m => m.action === 'commit').length;
      const iterates = data.filter(m => m.action === 'iterate').length;
      const escalates = data.filter(m => m.action === 'escalate').length;
      const total = data.length;

      // Extract common error patterns from failed_checks
      const errorMap = new Map<string, number>();
      data.forEach(m => {
        if (m.failed_checks && Array.isArray(m.failed_checks)) {
          m.failed_checks.forEach((err: string) => {
            errorMap.set(err, (errorMap.get(err) || 0) + 1);
          });
        }
      });

      const commonErrors = Array.from(errorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([err]) => err);

      return {
        intent,
        total_validations: total,
        commit_count: commits,
        iterate_count: iterates,
        escalate_count: escalates,
        success_rate: commits / total,
        common_errors: commonErrors,
        last_validation_at: data[0]?.created_at || new Date().toISOString(),
      };
    } catch (err: unknown) {
      console.error('[ValidationMetricsStore] Exception fetching intent history:', err);
      return null;
    }
  }

  /**
   * Get agent escalation recommendations
   * Routes escalations to validator/skeptic agents
   */
  async getEscalationRoute(intent: string, lastFailure: string): Promise<{ agent_role: string; confidence: number }> {
    // High escalation rate for this intent → route to validator
    const history = await this.getIntentValidationHistory(intent);
    if (history) {
      const escalationRate = history.total_validations > 0
        ? history.escalate_count / history.total_validations
        : 0;

      if (escalationRate > 0.1) {
        return {
          agent_role: 'validator',
          confidence: Math.min(escalationRate, 1),
        };
      }
    }

    // Specific error pattern → route to skeptic for review
    const performance = await this.getAgentPerformance('executor');
    if (performance && performance.escalate_rate > 0.15) {
      return {
        agent_role: 'skeptic',
        confidence: 0.7,
      };
    }

    // Default: maintain current role
    return {
      agent_role: 'executor',
      confidence: 0.5,
    };
  }
}
