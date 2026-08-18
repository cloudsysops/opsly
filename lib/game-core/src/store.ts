import type {
  GameEvent,
  GameSession,
  GraphEdge,
  Inventory,
  MissionResult,
  PlayerProfile,
  WorldInstance,
} from './types.js';

export interface SessionState {
  session: GameSession;
  player: PlayerProfile;
  world?: WorldInstance;
  mission?: MissionResult;
  edges: GraphEdge[];
  inventory: Inventory;
  events: GameEvent[];
}

export class GameStore {
  private readonly sessions = new Map<string, SessionState>();

  put(state: SessionState): void {
    this.sessions.set(state.session.id, state);
  }

  get(sessionId: string): SessionState {
    const state = this.sessions.get(sessionId);
    if (!state) {
      throw new Error(`Unknown game session: ${sessionId}`);
    }
    return state;
  }
}
