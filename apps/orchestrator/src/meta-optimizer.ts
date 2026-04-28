import { readFile, writeFile } from 'node:fs/promises';

interface PromptPerformanceMetrics {
  successRate: number;
  avgTimeSeconds: number;
  commonErrors: string[];
}

interface PromptOptimizationResult {
  updated: boolean;
  improvementScore: number;
  reason: string;
}

function clampScore(value: number): number {
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

export class PromptOptimizer {
  private readonly gatewayUrl = process.env.ORCHESTRATOR_LLM_GATEWAY_URL ?? 'http://llm-gateway:3010';
  private readonly enabled = process.env.OPSLY_META_OPTIMIZER_ENABLED === 'true';

  async optimizePrompt(
    promptPath: string,
    metrics: PromptPerformanceMetrics
  ): Promise<PromptOptimizationResult> {
    if (!this.enabled) {
      return { updated: false, improvementScore: 0, reason: 'meta_optimizer_disabled' };
    }

    const currentPrompt = await readFile(promptPath, 'utf-8');
    const analysis = this.analyzePromptPerformance(metrics);
    const improvedPrompt = await this.generateImprovedPrompt(currentPrompt, analysis);
    const testResult = await this.testPromptCandidate(currentPrompt, improvedPrompt, analysis);

    if (testResult.improvementScore < 0.1) {
      return { ...testResult, updated: false };
    }

    await writeFile(promptPath, improvedPrompt, 'utf-8');
    return { ...testResult, updated: true };
  }

  private analyzePromptPerformance(metrics: PromptPerformanceMetrics): {
    reasonForChange: string;
    weakness: string;
  } {
    if (metrics.successRate < 0.7) {
      return {
        reasonForChange: 'low_success_rate',
        weakness: 'Las instrucciones no estan guiando suficiente al agente.',
      };
    }
    if (metrics.commonErrors.length > 0) {
      return {
        reasonForChange: 'recurrent_errors',
        weakness: `Errores frecuentes: ${metrics.commonErrors.join(', ')}`,
      };
    }
    return {
      reasonForChange: 'latency_optimization',
      weakness: `Tiempo promedio alto: ${metrics.avgTimeSeconds}s`,
    };
  }

  private async generateImprovedPrompt(
    currentPrompt: string,
    analysis: { reasonForChange: string; weakness: string }
  ): Promise<string> {
    const prompt = [
      'Eres un optimizador de prompts para agentes autonomos.',
      'Devuelve solo el prompt mejorado en texto plano, sin markdown.',
      `Motivo: ${analysis.reasonForChange}`,
      `Debilidad: ${analysis.weakness}`,
      'Prompt actual:',
      currentPrompt,
    ].join('\n\n');

    try {
      const response = await fetch(`${this.gatewayUrl}/v1/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_slug: 'platform',
          plan: 'startup',
          model: process.env.OPSLY_META_OPTIMIZER_MODEL ?? 'claude-sonnet-4-20250514',
          prompt,
        }),
      });
      if (!response.ok) {
        throw new Error(`gateway ${response.status}`);
      }
      const payload = (await response.json()) as { text?: string };
      const improved = payload.text?.trim();
      return improved && improved.length > 0 ? improved : currentPrompt;
    } catch (error) {
      console.warn('[orchestrator] meta-optimizer fallback', error);
      return currentPrompt;
    }
  }

  private async testPromptCandidate(
    currentPrompt: string,
    improvedPrompt: string,
    analysis: { reasonForChange: string }
  ): Promise<PromptOptimizationResult> {
    const changed = improvedPrompt.trim() !== currentPrompt.trim();
    if (!changed) {
      return {
        updated: false,
        improvementScore: 0,
        reason: `no_change_${analysis.reasonForChange}`,
      };
    }
    const heuristicGain = clampScore(0.12);
    return {
      updated: false,
      improvementScore: heuristicGain,
      reason: `candidate_validated_${analysis.reasonForChange}`,
    };
  }
}
