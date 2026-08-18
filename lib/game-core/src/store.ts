import { SessionStateSchema } from './schemas.js';
import type { SessionState } from './types.js';

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

  export(sessionId: string): SessionState {
    return SessionStateSchema.parse(structuredClone(this.get(sessionId)));
  }

  restore(state: SessionState): SessionState {
    const parsed = SessionStateSchema.parse(state);
    this.put(parsed);
    return parsed;
  }
}
