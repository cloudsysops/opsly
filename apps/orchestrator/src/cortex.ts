import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { enqueueJob } from './queue.js';
import type { OrchestratorJob } from './types.js';

type CortexUrgency = 'low' | 'medium' | 'high';
type CortexHealth = 'optimal' | 'degraded' | 'critical';
type EmotionalState = 'neutral' | 'cautious' | 'ambitious';

interface SituationAnalysis {
  systemHealth: CortexHealth;
  opportunityScore: number;
  threats: string[];
  opportunities: string[];
  recommendedFocus: string;
  urgency: CortexUrgency;
  emotionalAdjustment?: EmotionalState;
}

interface CognitiveState {
  coreGoals: string[];
  currentStrategy: string | null;
  recentExperiences: Array<Record<string, unknown>>;
  beliefs: Record<string, unknown>;
  emotionalState: EmotionalState;
}

interface CortexRuntimeState {
  lastStrategicDate?: string;
  lastReflectionWeek?: string;
}

function parsePositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

export class OpslyCortex {
  private readonly statePath = resolve(process.cwd(), 'runtime/context/system_state.json');
  private readonly intervalMs = parsePositiveIntEnv('OPSLY_CORTEX_INTERVAL_MINUTES', 15) * 60 * 1000;
  private readonly strategicHourUtc = parsePositiveIntEnv('OPSLY_CORTEX_STRATEGIC_HOUR_UTC', 5);
  private readonly reflectionHourUtc = parsePositiveIntEnv('OPSLY_CORTEX_REFLECTION_HOUR_UTC', 20);
  private readonly gatewayUrl = process.env.ORCHESTRATOR_LLM_GATEWAY_URL ?? 'http://llm-gateway:3010';
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private runtimeState: CortexRuntimeState = {};
  private cognitiveState: CognitiveState = {
    coreGoals: [
      'Maximizar la estabilidad del sistema (uptime > 99.9%)',
      'Maximizar valor entregado a usuarios',
      'Minimizar costos operativos',
      'Maximizar la autonomia real',
    ],
    currentStrategy: null,
    recentExperiences: [],
    beliefs: {
      self_competence: 0.7,
      market_fit: 'unknown',
      technical_debt_level: 'medium',
    },
    emotionalState: 'neutral',
  };

  start(): void {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => {
      void this.tick();
    }, this.intervalMs);
    this.timer.unref();
    void this.tick();
    console.log('[orchestrator] OpslyCortex enabled');
  }

  stop(): void {
    if (!this.timer) {
      return;
    }
    clearInterval(this.timer);
    this.timer = null;
  }

  private async tick(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      await this.oodaCycle();
      await this.runDailyStrategicSessionIfDue();
      await this.runWeeklyReflectionIfDue();
    } catch (error) {
      console.error('[orchestrator] cortex tick failed', error);
    } finally {
      this.running = false;
    }
  }

  private async oodaCycle(): Promise<void> {
    const [metrics, signals] = await Promise.all([this.gatherSystemMetrics(), this.getExternalSignals()]);
    const analysis = await this.analyzeSituation({ metrics, signals, state: this.cognitiveState });
    if (analysis.emotionalAdjustment) {
      this.cognitiveState.emotionalState = analysis.emotionalAdjustment;
    }
    if (analysis.urgency === 'high') {
      await this.generateEmergencyIntent(analysis);
      return;
    }
    await this.generateProactiveIntent(analysis);
  }

  private async gatherSystemMetrics(): Promise<Record<string, unknown>> {
    const state = await this.safeReadJson(this.statePath);
    const autonomousMetrics =
      state && typeof state.autonomous_metrics === 'object' && state.autonomous_metrics !== null
        ? state.autonomous_metrics
        : {};
    return {
      timestamp: new Date().toISOString(),
      autonomous_metrics: autonomousMetrics,
      next_action: state?.next_action ?? null,
    };
  }

  private async getExternalSignals(): Promise<Record<string, unknown>> {
    return {
      trend_signal: 'unknown',
      security_alerts: [],
      growth_window: this.cognitiveState.emotionalState === 'ambitious',
    };
  }

  private async analyzeSituation(context: Record<string, unknown>): Promise<SituationAnalysis> {
    const prompt = [
      'Actua como cortex autonomo de Opsly y devuelve JSON estricto.',
      'Formato: {"systemHealth":"optimal|degraded|critical","opportunityScore":0.0,"threats":[],"opportunities":[],"recommendedFocus":"","urgency":"low|medium|high","emotionalAdjustment":"neutral|cautious|ambitious"}',
      `Estado cognitivo: ${JSON.stringify(this.cognitiveState)}`,
      `Contexto observado: ${JSON.stringify(context)}`,
    ].join('\n\n');

    try {
      const response = await fetch(`${this.gatewayUrl}/v1/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_slug: 'platform',
          plan: 'startup',
          model: process.env.OPSLY_CORTEX_MODEL ?? 'claude-sonnet-4-20250514',
          prompt,
        }),
      });
      if (!response.ok) {
        throw new Error(`gateway ${response.status}`);
      }
      const payload = (await response.json()) as { text?: string };
      const parsed = this.parseAnalysis(payload.text ?? '');
      if (parsed) {
        return parsed;
      }
    } catch (error) {
      console.warn('[orchestrator] cortex analyze fallback', error);
    }

    return {
      systemHealth: 'degraded',
      opportunityScore: 0.4,
      threats: ['insufficient_runtime_signals'],
      opportunities: ['improve_observability'],
      recommendedFocus: 'Estabilizar señales base y verificar disponibilidad de llm-gateway.',
      urgency: 'medium',
      emotionalAdjustment: 'cautious',
    };
  }

  private parseAnalysis(text: string): SituationAnalysis | null {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) {
      return null;
    }
    try {
      const parsed = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
      const systemHealth = parsed.systemHealth;
      const urgency = parsed.urgency;
      if (
        (systemHealth !== 'optimal' && systemHealth !== 'degraded' && systemHealth !== 'critical') ||
        (urgency !== 'low' && urgency !== 'medium' && urgency !== 'high')
      ) {
        return null;
      }
      return {
        systemHealth,
        opportunityScore: clamp01(Number(parsed.opportunityScore ?? 0)),
        threats: Array.isArray(parsed.threats)
          ? parsed.threats.filter((x): x is string => typeof x === 'string')
          : [],
        opportunities: Array.isArray(parsed.opportunities)
          ? parsed.opportunities.filter((x): x is string => typeof x === 'string')
          : [],
        recommendedFocus:
          typeof parsed.recommendedFocus === 'string'
            ? parsed.recommendedFocus
            : 'Mantener estabilidad y ejecutar mejoras incrementales.',
        urgency,
        emotionalAdjustment:
          parsed.emotionalAdjustment === 'neutral' ||
          parsed.emotionalAdjustment === 'cautious' ||
          parsed.emotionalAdjustment === 'ambitious'
            ? parsed.emotionalAdjustment
            : undefined,
      };
    } catch {
      return null;
    }
  }

  private async generateEmergencyIntent(analysis: SituationAnalysis): Promise<void> {
    await this.enqueueCognitiveIntent('critical', analysis, 'cortex_emergency');
  }

  private async generateProactiveIntent(analysis: SituationAnalysis): Promise<void> {
    const priorityTag = analysis.opportunityScore > 0.7 ? 'high' : 'medium';
    await this.enqueueCognitiveIntent(priorityTag, analysis, 'cortex_proactive');
  }

  private async enqueueCognitiveIntent(
    priority: 'critical' | 'high' | 'medium',
    analysis: SituationAnalysis,
    source: string
  ): Promise<void> {
    const now = new Date().toISOString();
    const job: OrchestratorJob = {
      type: 'intent_dispatch',
      initiated_by: 'system',
      plan: 'startup',
      tenant_slug: 'platform',
      taskId: `cortex-${Date.now()}`,
      idempotency_key: `cortex:${source}:${now.slice(0, 13)}`,
      request_id: `cortex-${randomUUID()}`,
      agent_role: 'planner',
      payload: {
        intent_request: {
          intent: 'oar_react',
          initiated_by: 'system',
          tenant_slug: 'platform',
          plan: 'startup',
          context: {
            prompt: analysis.recommendedFocus,
            source,
            threats: analysis.threats,
            opportunities: analysis.opportunities,
          },
        },
      },
      metadata: {
        cognitive_source: source,
        cognitive_priority: priority,
        cognitive_urgency: analysis.urgency,
      },
    };
    await enqueueJob(job);
  }

  private async runDailyStrategicSessionIfDue(): Promise<void> {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    if (now.getUTCHours() !== this.strategicHourUtc || this.runtimeState.lastStrategicDate === today) {
      return;
    }
    this.runtimeState.lastStrategicDate = today;
    const strategy = await this.generateStrategicTheme();
    this.cognitiveState.currentStrategy = strategy;
    console.log(`[orchestrator] cortex strategic theme: ${strategy}`);
  }

  private async runWeeklyReflectionIfDue(): Promise<void> {
    const now = new Date();
    if (now.getUTCDay() !== 0 || now.getUTCHours() !== this.reflectionHourUtc) {
      return;
    }
    const weekToken = `${now.getUTCFullYear()}-W${this.getWeekOfYear(now)}`;
    if (this.runtimeState.lastReflectionWeek === weekToken) {
      return;
    }
    this.runtimeState.lastReflectionWeek = weekToken;
    const note = `weekly_reflection:${weekToken}:${this.cognitiveState.currentStrategy ?? 'n/a'}`;
    this.cognitiveState.recentExperiences = [...this.cognitiveState.recentExperiences.slice(-9), { note }];
    await this.persistCognitiveSnapshot();
  }

  private async generateStrategicTheme(): Promise<string> {
    const prompt = [
      'Define un tema estrategico semanal para Opsly en una sola frase.',
      `Estado actual: ${JSON.stringify(this.cognitiveState)}`,
    ].join('\n\n');
    try {
      const response = await fetch(`${this.gatewayUrl}/v1/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_slug: 'platform',
          plan: 'startup',
          model: process.env.OPSLY_CORTEX_MODEL ?? 'claude-sonnet-4-20250514',
          prompt,
        }),
      });
      if (!response.ok) {
        throw new Error(`gateway ${response.status}`);
      }
      const payload = (await response.json()) as { text?: string };
      const strategy = payload.text?.trim();
      return strategy && strategy.length > 0
        ? strategy
        : 'Consolidar estabilidad operativa y evidencia de crecimiento incremental.';
    } catch {
      return 'Consolidar estabilidad operativa y evidencia de crecimiento incremental.';
    }
  }

  private async persistCognitiveSnapshot(): Promise<void> {
    const state = await this.safeReadJson(this.statePath);
    const nextState = {
      ...(state ?? {}),
      cognitive_state: this.cognitiveState,
      cognitive_runtime: this.runtimeState,
      last_updated: new Date().toISOString(),
    };
    await writeFile(this.statePath, `${JSON.stringify(nextState, null, 2)}\n`, 'utf-8');
  }

  private async safeReadJson(path: string): Promise<Record<string, unknown> | null> {
    try {
      const raw = await readFile(path, 'utf-8');
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private getWeekOfYear(date: Date): number {
    const start = Date.UTC(date.getUTCFullYear(), 0, 1);
    const diff = date.getTime() - start;
    return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
  }
}
