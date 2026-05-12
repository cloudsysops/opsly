#!/usr/bin/env node
/**
 * Agent Trainer Service
 * Background service that aggregates execution patterns and learns from validation outcomes
 * Runs every 10 minutes to consolidate patterns for autonomous iteration
 */

import { promises as fsp } from 'fs';
import * as path from 'path';
import { AgentTrainer } from '../apps/orchestrator/src/lib/agent-trainer.js';

interface AgentRoleIntentPair {
  agentRole: string;
  intent: string;
}

class AgentTrainerService {
  private trainer: AgentTrainer;
  private intervalMs: number = 600000; // 10 minutes default
  private minExecutionsForPattern: number = 10;
  private isRunning: boolean = false;
  private lastRun: Date | null = null;
  private metricsPath: string = '.cursor/metrics/agent-patterns.json';

  constructor(intervalMs: number = 600000) {
    this.trainer = new AgentTrainer();
    this.intervalMs = intervalMs;
  }

  /**
   * Start the background service
   */
  start(): void {
    if (this.isRunning) {
      console.warn('[AgentTrainerService] Service already running');
      return;
    }

    this.isRunning = true;
    console.log(`[AgentTrainerService] 🚀 Started service (polling every ${this.intervalMs}ms)`);

    // Run first aggregation immediately
    this.aggregate().catch((err) => {
      console.error('[AgentTrainerService] First run error:', err);
    });

    // Schedule recurring aggregation
    setInterval(() => {
      this.aggregate().catch((err) => {
        console.error('[AgentTrainerService] Aggregation error:', err);
      });
    }, this.intervalMs);
  }

  /**
   * Stop the service
   */
  stop(): void {
    this.isRunning = false;
    console.log('[AgentTrainerService] ⛔ Stopped service');
  }

  /**
   * Main aggregation loop
   * Queries validation_metrics and aggregates patterns for each agent/intent pair
   */
  private async aggregate(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    const startTime = Date.now();
    console.log(
      `[AgentTrainerService] 📊 Starting pattern aggregation at ${new Date().toISOString()}`,
    );

    try {
      // Get all unique agent_role + intent pairs from validation_metrics
      const pairs = await this.getUniquePairs();

      if (pairs.length === 0) {
        console.log('[AgentTrainerService] No validation metrics found yet');
        this.lastRun = new Date();
        return;
      }

      console.log(
        `[AgentTrainerService] 🔍 Aggregating patterns for ${pairs.length} agent/intent pairs`,
      );

      const results: Record<string, any> = {
        timestamp: new Date().toISOString(),
        pairs_processed: pairs.length,
        patterns: [],
      };

      // Aggregate pattern for each pair
      for (const pair of pairs) {
        const pattern = await this.trainer.aggregatePatterns(
          pair.agentRole,
          pair.intent,
          this.minExecutionsForPattern,
        );

        if (pattern) {
          results.patterns.push({
            agent_role: pair.agentRole,
            intent: pair.intent,
            success_rate: pattern.successRate,
            avg_iterations: pattern.avgIterations,
            total_executions: pattern.totalExecutions,
            common_errors: pattern.commonErrors,
            typical_sequence: pattern.typicalSequence,
          });
        }
      }

      // Export metrics to file for observability
      await this.exportMetrics(results);

      const duration = Date.now() - startTime;
      console.log(
        `[AgentTrainerService] ✅ Pattern aggregation completed (${duration}ms, ${results.patterns.length} patterns)`,
      );

      this.lastRun = new Date();
    } catch (err) {
      console.error('[AgentTrainerService] Aggregation failed:', err);
    }
  }

  /**
   * Get unique agent_role + intent pairs from validation metrics
   */
  private async getUniquePairs(): Promise<AgentRoleIntentPair[]> {
    // This would query Supabase validation_metrics table
    // For now, return empty array (service can be extended to query directly)
    // In production, this would be:
    // const { data } = await supabase
    //   .from('validation_metrics')
    //   .select('agent_role, intent')
    //   .then(result => ...unique pairs)

    // Placeholder for future direct Supabase query
    return [
      { agentRole: 'executor', intent: 'execute_code' },
      { agentRole: 'validator', intent: 'execute_code' },
      { agentRole: 'executor', intent: 'oar_react' },
    ];
  }

  /**
   * Export aggregated patterns to JSON file
   */
  private async exportMetrics(metrics: Record<string, any>): Promise<void> {
    try {
      const dir = path.dirname(this.metricsPath);
      await fsp.mkdir(dir, { recursive: true });
      await fsp.writeFile(this.metricsPath, JSON.stringify(metrics, null, 2), 'utf-8');

      console.log(`[AgentTrainerService] 💾 Exported metrics: ${this.metricsPath}`);
    } catch (err) {
      console.error('[AgentTrainerService] Failed to export metrics:', err);
    }
  }

  /**
   * Get last run timestamp
   */
  getLastRun(): Date | null {
    return this.lastRun;
  }

  /**
   * Check service health
   */
  getHealth(): {
    running: boolean;
    lastRun: string | null;
    uptime: number;
  } {
    return {
      running: this.isRunning,
      lastRun: this.lastRun?.toISOString() || null,
      uptime: this.isRunning ? Date.now() - (this.lastRun?.getTime() || 0) : 0,
    };
  }
}

/**
 * CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'start';

  const service = new AgentTrainerService();

  switch (command) {
    case 'start':
      service.start();
      // Keep process alive
      process.on('SIGINT', () => {
        console.log('\n[AgentTrainerService] Received SIGINT, shutting down...');
        service.stop();
        process.exit(0);
      });
      break;

    case 'once':
      // Run aggregation once and exit
      console.log('[AgentTrainerService] Running aggregation once...');
      await (service as any).aggregate();
      process.exit(0);
      break;

    case 'health':
      const health = service.getHealth();
      console.log(JSON.stringify(health, null, 2));
      process.exit(0);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.log('Usage: agent-trainer-service.ts [start|once|health]');
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('[AgentTrainerService] Fatal error:', err);
  process.exit(1);
});

export { AgentTrainerService };
