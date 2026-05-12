import { promises as fsp } from 'fs';
import * as path from 'path';

export interface ExecutionRecord {
  job_id: string;
  timestamp: string;
  agent_role: 'cursor' | 'claude' | 'copilot' | 'opencode';
  prompt: string;
  result: string;
  duration_ms: number;
  success: boolean;
  error?: string;
  iterations: number;
  task_category?: string;
}

export interface AgentPattern {
  agent_role: string;
  task_pattern: string;
  success_rate: number;
  avg_iterations: number;
  avg_duration_ms: number;
  common_errors: string[];
  typical_sequence: string[];
  confidence: number;
}

export interface TrainerReport {
  generated_at: string;
  total_executions: number;
  patterns: AgentPattern[];
  improvements: {
    [key: string]: {
      success_rate_trend: string;
      speed_improvement: string;
      quality_score: number;
    };
  };
}

export class AgentTrainer {
  private dataDir: string;
  private recordsFile: string;
  private reportFile: string;

  constructor(dataDir: string = '.cursor/training') {
    this.dataDir = dataDir;
    this.recordsFile = path.join(dataDir, 'execution-records.json');
    this.reportFile = path.join(dataDir, 'trainer-report.json');
  }

  /**
   * Record an execution for training purposes
   */
  async recordExecution(record: ExecutionRecord): Promise<void> {
    await fsp.mkdir(this.dataDir, { recursive: true });

    let records: ExecutionRecord[] = [];
    try {
      const existing = await fsp.readFile(this.recordsFile, 'utf-8');
      records = JSON.parse(existing);
    } catch {
      records = [];
    }

    records.push(record);
    await fsp.writeFile(this.recordsFile, JSON.stringify(records, null, 2));
  }

  /**
   * Analyze execution patterns and generate training report
   */
  async generatePatterns(): Promise<TrainerReport> {
    let records: ExecutionRecord[] = [];
    try {
      const existing = await fsp.readFile(this.recordsFile, 'utf-8');
      records = JSON.parse(existing);
    } catch {
      return {
        generated_at: new Date().toISOString(),
        total_executions: 0,
        patterns: [],
        improvements: {},
      };
    }

    if (records.length === 0) {
      return {
        generated_at: new Date().toISOString(),
        total_executions: 0,
        patterns: [],
        improvements: {},
      };
    }

    // Group by agent + task pattern
    const grouped = new Map<string, ExecutionRecord[]>();
    records.forEach((r) => {
      const pattern = this.extractTaskPattern(r.prompt);
      const key = `${r.agent_role}:${pattern}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(r);
    });

    // Extract patterns
    const patterns: AgentPattern[] = [];
    grouped.forEach((recs, key) => {
      const [agent_role, task_pattern] = key.split(':');
      const successful = recs.filter((r) => r.success).length;
      const success_rate = successful / recs.length;

      const avg_iterations = recs.reduce((sum, r) => sum + r.iterations, 0) / recs.length;
      const avg_duration_ms = recs.reduce((sum, r) => sum + r.duration_ms, 0) / recs.length;

      // Extract common errors
      const errors = recs.filter((r) => r.error).map((r) => r.error!);
      const errorCounts = new Map<string, number>();
      errors.forEach((e) => {
        const type = e.split(':')[0];
        errorCounts.set(type, (errorCounts.get(type) || 0) + 1);
      });
      const common_errors = Array.from(errorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([type]) => type);

      patterns.push({
        agent_role,
        task_pattern,
        success_rate,
        avg_iterations,
        avg_duration_ms,
        common_errors,
        typical_sequence: this.inferSequence(recs),
        confidence: recs.length >= 5 ? 0.9 : recs.length >= 2 ? 0.6 : 0.3,
      });
    });

    // Calculate improvements trend
    const improvements: { [key: string]: any } = {};
    const agentRoles = new Set(records.map((r) => r.agent_role));
    agentRoles.forEach((role) => {
      const roleRecords = records.filter((r) => r.agent_role === role);
      if (roleRecords.length >= 2) {
        const first = roleRecords.slice(0, Math.ceil(roleRecords.length / 2));
        const second = roleRecords.slice(Math.ceil(roleRecords.length / 2));

        const successRate1 = first.filter((r) => r.success).length / first.length;
        const successRate2 = second.filter((r) => r.success).length / second.length;
        const rateTrend = ((successRate2 - successRate1) / successRate1) * 100;

        const speed1 = first.reduce((sum, r) => sum + r.duration_ms, 0) / first.length;
        const speed2 = second.reduce((sum, r) => sum + r.duration_ms, 0) / second.length;
        const speedImprovement = speed1 / speed2;

        improvements[role] = {
          success_rate_trend: `${rateTrend > 0 ? '+' : ''}${rateTrend.toFixed(1)}%`,
          speed_improvement: `${speedImprovement.toFixed(1)}x`,
          quality_score: successRate2 * 0.7 + (speedImprovement > 1 ? 0.3 : 0.3 / speedImprovement),
        };
      }
    });

    const report: TrainerReport = {
      generated_at: new Date().toISOString(),
      total_executions: records.length,
      patterns: patterns.sort((a, b) => b.success_rate - a.success_rate),
      improvements,
    };

    await fsp.writeFile(this.reportFile, JSON.stringify(report, null, 2));
    return report;
  }

  /**
   * Get patterns for a specific task
   */
  async getPatternsFor(taskKeyword: string): Promise<AgentPattern[]> {
    const report = await this.generatePatterns();
    return report.patterns.filter(
      (p) =>
        p.task_pattern.includes(taskKeyword.toLowerCase()) ||
        p.task_pattern.split(/\W+/).some((word) => taskKeyword.toLowerCase().includes(word)),
    );
  }

  private extractTaskPattern(prompt: string): string {
    // Extract first few significant words as pattern
    const words = prompt
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 3);
    return words.join('.*') || 'general';
  }

  private inferSequence(records: ExecutionRecord[]): string[] {
    // Look for common prefixes in successful executions
    const successful = records.filter((r) => r.success);
    if (successful.length === 0) return [];

    // Simple heuristic: if most successful ones mention certain steps, include them
    const steps = new Set<string>();
    successful.forEach((r) => {
      if (r.result.toLowerCase().includes('create')) steps.add('create_structure');
      if (r.result.toLowerCase().includes('type')) steps.add('add_types');
      if (r.result.toLowerCase().includes('test')) steps.add('add_tests');
      if (r.result.toLowerCase().includes('error') || r.result.toLowerCase().includes('handling'))
        steps.add('add_error_handling');
    });
    return Array.from(steps);
  }

  /**
   * Get execution records for analysis
   */
  async getRecords(limit?: number): Promise<ExecutionRecord[]> {
    try {
      const data = await fsp.readFile(this.recordsFile, 'utf-8');
      let records = JSON.parse(data);
      if (limit) records = records.slice(-limit);
      return records;
    } catch {
      return [];
    }
  }
}
