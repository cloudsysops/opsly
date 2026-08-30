import { GAME_SCHEMA_VERSION, OBSERVATION_EVENT_TYPES } from './constants.js';
import { newId } from './ids.js';
import { GameEventSchema } from './schemas.js';
import { assertEventHasEvidence, assertObservationEvent } from './safety.js';
import type { GameStore } from './store.js';
import type { GameEvent } from './types.js';

type ObservationType = (typeof OBSERVATION_EVENT_TYPES)[number];

export function recordEvent(
  store: GameStore,
  input: {
    sessionId: string;
    type: ObservationType;
    evidence: string;
    missionId?: string;
    context?: Record<string, unknown>;
    now: () => Date;
  },
): GameEvent {
  assertObservationEvent(input.type);
  const state = store.get(input.sessionId);
  const event = GameEventSchema.parse({
    schemaVersion: GAME_SCHEMA_VERSION,
    eventId: newId('evt'),
    type: input.type,
    playerId: state.player.playerId,
    sessionId: input.sessionId,
    missionId: input.missionId,
    timestamp: input.now().toISOString(),
    context: input.context ?? {},
    evidence: input.evidence,
  });
  assertEventHasEvidence(event);
  state.events.push(event);
  store.put(state);
  return event;
}
