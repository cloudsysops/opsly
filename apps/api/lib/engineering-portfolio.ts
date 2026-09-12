import portfolio from '../../../config/engineering-workstreams.json';

export type PortfolioWorkstream = {
  id: string;
  name: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  owner: string;
  reviewer: string;
  status: 'backlog' | 'ready' | 'building' | 'review' | 'blocked' | 'ready_for_decision' | 'done';
  risk: 'low' | 'medium' | 'high';
  production_touching: boolean;
  depends_on: string[];
  pr: number | null;
  next_action: string;
};

export type EngineeringPortfolioSnapshot = {
  generated_at: string;
  operating_model: string;
  sprint: {
    cadence_days: number;
    goal: string;
    planning_owner: string;
    execution_model: string;
  };
  policies: typeof portfolio.policies;
  definition_of_ready: string[];
  definition_of_done: string[];
  summary: {
    active: number;
    blocked: number;
    ready_for_decision: number;
    high_risk_active: number;
    production_touching_active: number;
    wip_limit: number;
    wip_exceeded: boolean;
  };
  workstreams: PortfolioWorkstream[];
};

const ACTIVE = new Set(['building', 'review', 'ready_for_decision']);

export function getEngineeringPortfolioSnapshot(): EngineeringPortfolioSnapshot {
  const workstreams = portfolio.workstreams as PortfolioWorkstream[];
  const active = workstreams.filter((w) => ACTIVE.has(w.status));
  const highRiskActive = active.filter((w) => w.risk === 'high').length;
  const productionTouchingActive = active.filter((w) => w.production_touching).length;
  const wipLimit = portfolio.policies.wip_limits.max_active_build_workstreams;

  return {
    generated_at: new Date().toISOString(),
    operating_model: portfolio.operating_model,
    sprint: portfolio.sprint,
    policies: portfolio.policies,
    definition_of_ready: portfolio.definition_of_ready,
    definition_of_done: portfolio.definition_of_done,
    summary: {
      active: active.length,
      blocked: workstreams.filter((w) => w.status === 'blocked').length,
      ready_for_decision: workstreams.filter((w) => w.status === 'ready_for_decision').length,
      high_risk_active: highRiskActive,
      production_touching_active: productionTouchingActive,
      wip_limit: wipLimit,
      wip_exceeded: active.length > wipLimit,
    },
    workstreams,
  };
}
