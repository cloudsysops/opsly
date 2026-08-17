import { chooseExplorer } from './explorer.js';
import { recordEvent } from './events.js';
import { enterPortal } from './portal.js';
import { connectNodes, startMission } from './mission.js';
import { startSession } from './session.js';
import { GameStore } from './store.js';
import type {
  ChooseExplorerInput,
  GameEvent,
  GameSession,
  Mission,
  MissionResult,
  StartSessionInput,
  WorldInstance,
} from './types.js';

export interface GameRuntime {
  startSession(input: StartSessionInput): GameSession;
  chooseExplorer(sessionId: string, input: ChooseExplorerInput): ReturnType<typeof chooseExplorer>;
  enterPortal(sessionId: string, portalId: string): WorldInstance;
  startMission(sessionId: string, missionId: string): Mission;
  connectNodes(sessionId: string, from: string, to: string): MissionResult;
  getEvents(sessionId: string): GameEvent[];
  getInventory(sessionId: string): ReturnType<GameStore['get']>['inventory'];
}

export function createGameRuntime(options?: { now?: () => Date }): GameRuntime {
  const store = new GameStore();
  const now = options?.now ?? ((): Date => new Date());
  return {
    startSession: (input) => startSession(store, input, now),
    chooseExplorer: (sessionId, input) => chooseExplorer(store, sessionId, input, now),
    enterPortal: (sessionId, portalId) => enterPortal(store, sessionId, portalId, now),
    startMission: (sessionId, missionId) => startMission(store, sessionId, missionId, now),
    connectNodes: (sessionId, from, to) => connectNodes(store, sessionId, from, to, now),
    getEvents: (sessionId) => [...store.get(sessionId).events],
    getInventory: (sessionId) => store.get(sessionId).inventory,
  };
}

export { recordEvent };
