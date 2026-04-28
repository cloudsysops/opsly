interface StrategicGoal {
  name: string;
  description: string;
  rationale: string;
  keyResults: Array<{
    metric: string;
    currentValue: string;
    targetValue: string;
    deadline: string;
  }>;
  dependencies: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

interface GoalGeneratorContext {
  activeUsers: number;
  mrrUsd: number;
  techHealth: string;
  marketSignals: string[];
}

export class GoalGenerator {
  private readonly gatewayUrl = process.env.ORCHESTRATOR_LLM_GATEWAY_URL ?? 'http://llm-gateway:3010';

  async generateQuarterlyGoals(context: GoalGeneratorContext): Promise<StrategicGoal[]> {
    const prompt = [
      'Actua como estratega de Opsly y devuelve JSON estricto.',
      'Formato: {"goals":[{"name":"","description":"","rationale":"","keyResults":[{"metric":"","currentValue":"","targetValue":"","deadline":""}],"dependencies":[],"riskLevel":"low|medium|high"}]}',
      'Genera 3 objetivos maximos, con foco en estabilidad, crecimiento y eficiencia.',
      `Contexto: ${JSON.stringify(context)}`,
    ].join('\n\n');

    try {
      const response = await fetch(`${this.gatewayUrl}/v1/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_slug: 'platform',
          plan: 'startup',
          model: process.env.OPSLY_GOAL_GENERATOR_MODEL ?? 'claude-sonnet-4-20250514',
          prompt,
        }),
      });
      if (!response.ok) {
        throw new Error(`gateway ${response.status}`);
      }
      const payload = (await response.json()) as { text?: string };
      const parsed = this.parseGoals(payload.text ?? '');
      if (parsed.length > 0) {
        return parsed;
      }
    } catch (error) {
      console.warn('[orchestrator] goal-generator fallback', error);
    }
    return this.fallbackGoals(context);
  }

  private parseGoals(text: string): StrategicGoal[] {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) {
      return [];
    }
    try {
      const parsed = JSON.parse(text.slice(start, end + 1)) as { goals?: Array<Record<string, unknown>> };
      if (!Array.isArray(parsed.goals)) {
        return [];
      }
      return parsed.goals
        .map((goal) => this.parseSingleGoal(goal))
        .filter((goal): goal is StrategicGoal => goal !== null)
        .slice(0, 3);
    } catch {
      return [];
    }
  }

  private parseSingleGoal(goal: Record<string, unknown>): StrategicGoal | null {
    const name = typeof goal.name === 'string' ? goal.name.trim() : '';
    const description = typeof goal.description === 'string' ? goal.description.trim() : '';
    const rationale = typeof goal.rationale === 'string' ? goal.rationale.trim() : '';
    const riskLevel = goal.riskLevel;
    if (!name || !description || !rationale) {
      return null;
    }
    if (riskLevel !== 'low' && riskLevel !== 'medium' && riskLevel !== 'high') {
      return null;
    }
    const keyResultsRaw = Array.isArray(goal.keyResults) ? goal.keyResults : [];
    const keyResults = keyResultsRaw
      .map((kr) => {
        if (!kr || typeof kr !== 'object') {
          return null;
        }
        const record = kr as Record<string, unknown>;
        if (
          typeof record.metric !== 'string' ||
          typeof record.currentValue !== 'string' ||
          typeof record.targetValue !== 'string' ||
          typeof record.deadline !== 'string'
        ) {
          return null;
        }
        return {
          metric: record.metric,
          currentValue: record.currentValue,
          targetValue: record.targetValue,
          deadline: record.deadline,
        };
      })
      .filter(
        (
          kr
        ): kr is { metric: string; currentValue: string; targetValue: string; deadline: string } =>
          kr !== null
      );
    return {
      name,
      description,
      rationale,
      keyResults,
      dependencies: Array.isArray(goal.dependencies)
        ? goal.dependencies.filter((dep): dep is string => typeof dep === 'string')
        : [],
      riskLevel,
    };
  }

  private fallbackGoals(context: GoalGeneratorContext): StrategicGoal[] {
    return [
      {
        name: 'Mejorar confiabilidad del runtime autonomo',
        description: 'Reducir fallos por indisponibilidad de servicios core y mejorar señales de observabilidad.',
        rationale: `La salud tecnica actual (${context.techHealth}) requiere baseline mas robusta.`,
        keyResults: [
          {
            metric: 'Disponibilidad llm-gateway local',
            currentValue: 'intermitente',
            targetValue: '>= 99.5%',
            deadline: '90d',
          },
        ],
        dependencies: ['llm-gateway', 'orchestrator'],
        riskLevel: 'medium',
      },
      {
        name: 'Aumentar evidencia de valor comercial',
        description: 'Crear y medir activos de crecimiento de bajo costo para nichos prioritarios.',
        rationale: 'Necesitamos traccion medible sin elevar burn-rate.',
        keyResults: [
          {
            metric: 'Nuevos leads/semana',
            currentValue: String(Math.max(0, context.activeUsers)),
            targetValue: '>= 5',
            deadline: '90d',
          },
        ],
        dependencies: ['portal', 'docs/reports', 'skills growth'],
        riskLevel: 'medium',
      },
    ];
  }
}
