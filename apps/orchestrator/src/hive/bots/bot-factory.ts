import { CoderBot, startCoderBot } from './coder-bot.js';
import { ResearcherBot, startResearcherBot } from './researcher-bot.js';
import { TesterBot, startTesterBot } from './tester-bot.js';
import { DeployerBot, startDeployerBot } from './deployer-bot.js';
import { DocWriterBot, startDocWriterBot } from './doc-writer-bot.js';
import { SecurityBot, startSecurityBot } from './security-bot.js';
import type { BotRole, Bot } from '../types.js';

export type { BotRole };

export class BotFactory {
  private static instanceCache: Map<BotRole, Bot> = new Map();

  static async createBot(role: BotRole): Promise<Bot> {
    if (this.instanceCache.has(role)) {
      return this.instanceCache.get(role)!;
    }

    let bot: Bot;
    switch (role) {
      case 'coder':
        bot = startCoderBot();
        break;
      case 'researcher':
        bot = startResearcherBot();
        break;
      case 'tester':
        bot = startTesterBot();
        break;
      case 'deployer':
        bot = startDeployerBot();
        break;
      case 'doc-writer':
        bot = startDocWriterBot();
        break;
      case 'security':
        bot = startSecurityBot();
        break;
      default:
        throw new Error(`Rol de bot desconocido: ${role as string}`);
    }

    this.instanceCache.set(role, bot);
    return bot;
  }

  static async createBotTeam(roles: BotRole[]): Promise<Bot[]> {
    return Promise.all(roles.map((role) => this.createBot(role)));
  }

  static getBot(role: BotRole): Bot | undefined {
    return this.instanceCache.get(role);
  }

  static getAllBots(): Bot[] {
    return Array.from(this.instanceCache.values());
  }

  static async stopAllBots(): Promise<void> {
    const stopPromises = Array.from(this.instanceCache.values()).map((bot) => bot.stop?.());
    await Promise.all(stopPromises);
    this.instanceCache.clear();
    console.log('[BotFactory] Todos los bots detenidos');
  }
}

export async function ensureHiveBotTeam(roles: BotRole[]): Promise<Bot[]> {
  return BotFactory.createBotTeam(roles);
}
