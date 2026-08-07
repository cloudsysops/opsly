/**
 * Multi-Agent Orchestrator Status API
 * GET /api/multi-agent/status
 *
 * Returns current status of orchestrator, agents, and metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { MultiAgentOrchestrator } from '@intcloudsysops/multi-agent-orchestrator';
import { TokenOptimizer } from '@intcloudsysops/multi-agent-orchestrator';

// Initialize orchestrator (in production, use singleton)
const orchestrator = new MultiAgentOrchestrator({
  maxConcurrentTasks: 10,
  enableTokenOptimization: true,
  logLevel: 'info',
});

const tokenOptimizer = new TokenOptimizer({
  monthlyBudgetUSD: 100,
  optimizationLevel: 'balanced',
});

export async function GET(request: NextRequest) {
  try {
    // Get orchestrator status
    const status = orchestrator.getStatus();
    const metrics = orchestrator.getAggregatedMetrics();

    // Get token optimizer summary
    const usageSummary = tokenOptimizer.getUsageSummary();
    const recommendations = tokenOptimizer.getOptimizationRecommendations();

    // Get registry status
    const registry = orchestrator.getRegistry();
    const registryStatus = registry.getStatus();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      orchestrator: {
        status,
        metrics,
      },
      tokens: {
        usage: usageSummary,
        recommendations,
      },
      agents: registryStatus,
    });
  } catch (error) {
    console.error('[MultiAgent] Status API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
