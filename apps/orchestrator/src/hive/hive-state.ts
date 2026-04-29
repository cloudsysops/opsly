import { Redis } from 'ioredis';
import { createHiveRedisClient } from './redis.js';
import type { Bot, HiveTask, HiveState } from './types.js';

const HIVE_STATE_KEY = 'hive:state';

export class HiveStateStore {
  private redis: Redis;

  constructor() {
    this.redis = createHiveRedisClient();
  }

  async getState(): Promise<HiveState> {
    const state = await this.redis.get(HIVE_STATE_KEY);
    if (!state) {
      return {
        tasks: [],
        bots: {},
        lastUpdated: Date.now(),
        pheromoneLog: [],
      };
    }
    try {
      return JSON.parse(state) as HiveState;
    } catch {
      return {
        tasks: [],
        bots: {},
        lastUpdated: Date.now(),
        pheromoneLog: [],
      };
    }
  }

  async updateState(update: Partial<HiveState>): Promise<HiveState> {
    const current = await this.getState();
    const merged: HiveState = {
      tasks: update.tasks ?? current.tasks,
      bots: { ...current.bots, ...( update.bots ?? {}) },
      lastUpdated: Date.now(),
      pheromoneLog: update.pheromoneLog ?? current.pheromoneLog,
    };
    await this.redis.set(HIVE_STATE_KEY, JSON.stringify(merged));
    await this.redis.publish('hive:state_update', JSON.stringify(merged));
    return merged;
  }

  async registerBot(bot: Bot): Promise<void> {
    const current = await this.getState();
    const bots = { ...current.bots, [bot.id]: bot };
    await this.updateState({ bots });
  }

  async updateBotStatus(botId: string, status: Bot['status']): Promise<void> {
    const current = await this.getState();
    const bot = current.bots[botId];
    if (bot) {
      const bots = {
        ...current.bots,
        [botId]: { ...bot, status, lastHeartbeat: new Date() },
      };
      await this.updateState({ bots });
    }
  }

  async addTask(task: HiveTask): Promise<void> {
    const current = await this.getState();
    await this.updateState({
      tasks: [...current.tasks, task],
    });
  }

  async updateTask(taskId: string, update: Partial<HiveTask>): Promise<void> {
    const current = await this.getState();
    const idx = current.tasks.findIndex((t) => t.id === taskId);
    if (idx >= 0) {
      const updated = { ...current.tasks[idx], ...update };
      const tasks = [...current.tasks];
      tasks[idx] = updated;
      await this.updateState({ tasks });
    }
  }

  async getTask(taskId: string): Promise<HiveTask | null> {
    const state = await this.getState();
    return state.tasks.find((t) => t.id === taskId) ?? null;
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
