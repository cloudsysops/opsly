import {
  FIRST_PORTAL_MISSION_ID,
  GAME_SCHEMA_VERSION,
  IPO_INPUT_NODE,
  IPO_OUTPUT_NODE,
  IPO_PROCESS_NODE,
  WILD_MISSION_ID,
  WILD_WORLD_ID,
} from './constants.js';
import { recordEvent } from './events.js';
import { FIRST_PORTAL_COLLECTIBLES, getFirstPortalMission } from './first-portal.js';
import { grantCollectibles } from './inventory.js';
import { GraphEdgeSchema, MissionResultSchema } from './schemas.js';
import { getWildMission } from './wild.js';
import type { GameStore } from './store.js';
import type { Collectible, GraphEdge, Mission, MissionResult } from './types.js';

export function isIpoSolved(edges: GraphEdge[]): boolean {
  const has = (from: string, to: string): boolean =>
    edges.some((edge) => edge.from === from && edge.to === to);
  return has(IPO_INPUT_NODE, IPO_PROCESS_NODE) && has(IPO_PROCESS_NODE, IPO_OUTPUT_NODE);
}

export function isLegalIpoEdge(from: string, to: string): boolean {
  return (
    (from === IPO_INPUT_NODE && to === IPO_PROCESS_NODE) ||
    (from === IPO_PROCESS_NODE && to === IPO_OUTPUT_NODE)
  );
}

function resolveMission(missionId: string): Mission {
  if (missionId === FIRST_PORTAL_MISSION_ID) return getFirstPortalMission();
  if (missionId === WILD_MISSION_ID) return getWildMission();
  throw new Error(`Unknown mission: ${missionId}`);
}

function missionStartedEvidence(missionId: string): string {
  if (missionId === WILD_MISSION_ID) {
    return 'Explorer received the WILD canopy mission';
  }
  return 'Explorer received the First Portal systems mission';
}

export function startMission(
  store: GameStore,
  sessionId: string,
  missionId: string,
  now: () => Date,
): Mission {
  const mission = resolveMission(missionId);
  const state = store.get(sessionId);
  if (state.session.portalId !== mission.portalId) {
    throw new Error('Enter the matching portal before starting this mission');
  }
  state.mission = MissionResultSchema.parse({
    schemaVersion: GAME_SCHEMA_VERSION,
    missionId,
    status: 'in-progress',
    attempts: 0,
  });
  state.session = { ...state.session, missionId };
  state.edges = [];
  if (missionId === WILD_MISSION_ID) {
    state.wild = { observed: false, askedMaya: false };
  }
  store.put(state);
  recordEvent(store, {
    sessionId,
    type: 'mission.started',
    missionId,
    evidence: missionStartedEvidence(missionId),
    now,
  });
  return mission;
}

export function connectNodes(
  store: GameStore,
  sessionId: string,
  from: string,
  to: string,
  now: () => Date,
): MissionResult {
  const edge = GraphEdgeSchema.parse({ from, to });
  const state = store.get(sessionId);
  if (!state.mission || state.mission.status !== 'in-progress') {
    throw new Error('No active mission to connect');
  }
  state.edges.push(edge);
  if (!isLegalIpoEdge(from, to)) {
    state.mission = { ...state.mission, attempts: state.mission.attempts + 1 };
    recordEvent(store, {
      sessionId,
      type: 'mission.retried',
      missionId: state.mission.missionId,
      evidence: 'Explorer connected components in an order that did not restore the system',
      context: { from, to },
      now,
    });
    store.put(state);
    return state.mission;
  }
  if (isIpoSolved(state.edges)) {
    return completeMission(store, sessionId, now, {
      evidence: 'Explorer restored INPUT → PROCESS → OUTPUT',
      items: FIRST_PORTAL_COLLECTIBLES,
      unlockWorldId: WILD_WORLD_ID,
    });
  }
  store.put(state);
  return state.mission;
}

export function completeMission(
  store: GameStore,
  sessionId: string,
  now: () => Date,
  input: { evidence: string; items: Collectible[]; unlockWorldId?: string },
): MissionResult {
  const state = store.get(sessionId);
  if (!state.mission) {
    throw new Error('No mission to complete');
  }
  const completed: MissionResult = {
    ...state.mission,
    status: 'completed',
    completedAt: now().toISOString(),
  };
  state.mission = completed;
  if (state.world) {
    state.world = { ...state.world, status: 'cleared' };
  }
  if (input.unlockWorldId && !state.unlockedWorlds.includes(input.unlockWorldId)) {
    state.unlockedWorlds = [...state.unlockedWorlds, input.unlockWorldId];
  }
  store.put(state);
  recordEvent(store, {
    sessionId,
    type: 'mission.completed',
    missionId: completed.missionId,
    evidence: input.evidence,
    now,
  });
  grantCollectibles(store, sessionId, now, input.items);
  return completed;
}
