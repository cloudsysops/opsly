/**
 * Orquesta equipos paralelos de agentes (BullMQ) por especialización.
 * La ejecución efectiva puede delegarse en cursor-prompt-monitor u otros workers.
 */
import { Queue, Worker, type Job, type ConnectionOptions } from "bullmq";
import { publishEvent } from "../events/bus.js";

export interface AgentTeam {
  id: string;
  name: string;
  specialization: string;
  max_parallel: number;
  queue: Queue;
  workers: Worker[];
}

const TEAM_CONFIGS = [
  {
    name: "frontend-team",
    specialization: "frontend",
    max_parallel: 2,
    handles: ["ui_fix", "style_change", "component_update"],
  },
  {
    name: "backend-team",
    specialization: "backend",
    max_parallel: 3,
    handles: ["api_fix", "logic_change", "migration"],
  },
  {
    name: "ml-team",
    specialization: "ml",
    max_parallel: 2,
    handles: ["model_update", "prompt_optimization", "cache_warming"],
  },
  {
    name: "infra-team",
    specialization: "infra",
    max_parallel: 1,
    handles: ["deploy", "config_change", "scaling"],
  },
] as const;

export class TeamManager {
  private readonly teams: Map<string, AgentTeam> = new Map();
  private readonly connection: ConnectionOptions;

  constructor(connection: ConnectionOptions) {
    this.connection = connection;
    this.initializeTeams();
  }

  private initializeTeams(): void {
    for (const config of TEAM_CONFIGS) {
      const queue = new Queue(`team:${config.name}`, {
        connection: this.connection,
      });

      const workers = Array.from({ length: config.max_parallel }, () => {
        return new Worker(
          `team:${config.name}`,
          async (job: Job) => this.executeJob(job, config.specialization),
          {
            connection: this.connection,
            concurrency: 1,
          },
        );
      });

      this.teams.set(config.name, {
        id: config.name,
        name: config.name,
        specialization: config.specialization,
        max_parallel: config.max_parallel,
        queue,
        workers,
      });
    }
  }

  async assignToTeam(taskType: string, payload: Record<string, unknown>): Promise<string> {
    const teamConfig =
      TEAM_CONFIGS.find((t) => (t.handles as readonly string[]).includes(taskType)) ?? TEAM_CONFIGS[1];

    const team = this.teams.get(teamConfig.name);
    if (!team) {
      throw new Error(`Team not initialized: ${teamConfig.name}`);
    }

    const job = await team.queue.add(taskType, payload);

    await publishEvent("job.completed", {
      team: teamConfig.name,
      task_type: taskType,
      job_id: job.id ?? null,
    });

    return job.id != null ? String(job.id) : "";
  }

  private async executeJob(job: Job, specialization: string): Promise<void> {
    console.log(`[team:${specialization}] job ${job.id}: ${job.name}`);
  }

  async getTeamStatus(): Promise<Record<string, { waiting: number; active: number }>> {
    const status: Record<string, { waiting: number; active: number }> = {};

    for (const [name, team] of this.teams) {
      const [waiting, active] = await Promise.all([
        team.queue.getWaitingCount(),
        team.queue.getActiveCount(),
      ]);
      status[name] = { waiting, active };
    }

    return status;
  }

  async close(): Promise<void> {
    for (const team of this.teams.values()) {
      await Promise.all(team.workers.map((w) => w.close()));
      await team.queue.close();
    }
    this.teams.clear();
  }
}
