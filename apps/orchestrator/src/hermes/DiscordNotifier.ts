import { notifyDiscord } from "../workers/NotifyWorker.js";
import type { HermesTask } from "@intcloudsysops/types";
import type { TaskResultStub } from "./MetricsCollector.js";

export class DiscordNotifier {
  async notifyTaskStart(task: HermesTask): Promise<void> {
    await notifyDiscord(
      `Hermes · ${task.id}`,
      `Estado=${task.state} · tipo=${task.type}`,
      "info",
    );
  }

  async notifyTaskComplete(task: HermesTask, result: TaskResultStub): Promise<void> {
    await notifyDiscord(
      `Hermes · completado ${task.id}`,
      `agent=${result.agent} · ${result.duration_ms}ms`,
      "success",
    );
  }

  async notifyTaskFailed(task: HermesTask, message: string): Promise<void> {
    await notifyDiscord(`Hermes · fallo ${task.id}`, message, "error");
  }

  async notifyDailyMetrics(summary: string): Promise<void> {
    await notifyDiscord("Hermes · métricas", summary, "info");
  }
}
