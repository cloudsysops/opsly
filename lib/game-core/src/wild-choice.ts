import { FIRST_BIT_ID } from './constants.js';
import { recordEvent } from './events.js';
import { completeMission } from './mission.js';
import { WILD_CHOICE_IDS, WILD_COLLECTIBLES, type WildChoiceId } from './wild.js';
import type { GameStore } from './store.js';
import type { Bond, MissionResult } from './types.js';

const MAYA_HINT =
  'Maya: The vine snapped after a shortcut. Dewthread is stuck, not attacking. Looking first is already a kind of help.';

function currentBond(store: GameStore, sessionId: string): Bond {
  const state = store.get(sessionId);
  const existing = state.bonds.find((bond) => bond.bitId === FIRST_BIT_ID);
  if (existing) return existing;
  const created: Bond = { bitId: FIRST_BIT_ID, state: 'unknown', experiences: [] };
  state.bonds = [...state.bonds, created];
  store.put(state);
  return created;
}

function putBond(store: GameStore, sessionId: string, bond: Bond): void {
  const state = store.get(sessionId);
  state.bonds = [...state.bonds.filter((item) => item.bitId !== bond.bitId), bond];
  store.put(state);
}

function rememberExperience(store: GameStore, sessionId: string, experience: string): Bond {
  const bond = currentBond(store, sessionId);
  const next: Bond = {
    ...bond,
    state: bond.state === 'unknown' ? 'encountered' : bond.state,
    experiences: bond.experiences.includes(experience)
      ? bond.experiences
      : [...bond.experiences, experience],
  };
  putBond(store, sessionId, next);
  return next;
}

function ensureEncounter(store: GameStore, sessionId: string, now: () => Date): void {
  const state = store.get(sessionId);
  if (state.events.some((event) => event.type === 'bit.encountered')) return;
  rememberExperience(store, sessionId, 'encountered-dewthread');
  recordEvent(store, {
    sessionId,
    type: 'bit.encountered',
    missionId: state.mission?.missionId,
    evidence: 'Explorer noticed a small canopy weaver snagged in a snapped vine',
    context: { bitId: FIRST_BIT_ID },
    now,
  });
}

function retryChoice(
  store: GameStore,
  sessionId: string,
  choice: WildChoiceId,
  now: () => Date,
  evidence: string,
): MissionResult {
  const state = store.get(sessionId);
  if (!state.mission) throw new Error('No active WILD mission');
  state.mission = { ...state.mission, attempts: state.mission.attempts + 1 };
  store.put(state);
  recordEvent(store, {
    sessionId,
    type: 'mission.retried',
    missionId: state.mission.missionId,
    evidence,
    context: { choice },
    now,
  });
  const retried = store.get(sessionId).mission;
  if (!retried) throw new Error('No active WILD mission');
  return retried;
}

function formConnection(store: GameStore, sessionId: string, now: () => Date): MissionResult {
  const bond = rememberExperience(store, sessionId, 'eased-the-snag');
  putBond(store, sessionId, { ...bond, state: 'connected' });
  const state = store.get(sessionId);
  if (!state.bits.includes(FIRST_BIT_ID)) {
    state.bits = [...state.bits, FIRST_BIT_ID];
  }
  const alreadyCard = state.cards.some((card) => card.bitId === FIRST_BIT_ID);
  if (!alreadyCard) {
    state.cards = [...state.cards, { bitId: FIRST_BIT_ID, unlockedAt: now().toISOString() }];
  }
  store.put(state);
  recordEvent(store, {
    sessionId,
    type: 'bond.connected',
    missionId: state.mission?.missionId,
    evidence: 'Explorer eased the snag and Dewthread stayed nearby',
    context: { bitId: FIRST_BIT_ID },
    now,
  });
  if (!alreadyCard) {
    recordEvent(store, {
      sessionId,
      type: 'card.unlocked',
      missionId: state.mission?.missionId,
      evidence: 'Dewthread Bit Card derived from Universe canon',
      context: { bitId: FIRST_BIT_ID },
      now,
    });
  }
  return completeMission(store, sessionId, now, {
    evidence: 'Explorer helped without claiming Dewthread',
    items: WILD_COLLECTIBLES,
  });
}

export function applyWildChoice(
  store: GameStore,
  sessionId: string,
  choice: string,
  now: () => Date,
): MissionResult {
  if (!WILD_CHOICE_IDS.includes(choice as WildChoiceId)) {
    throw new Error(`Unknown WILD choice: ${choice}`);
  }
  const typed = choice as WildChoiceId;
  const state = store.get(sessionId);
  if (state.mission?.status === 'completed' && state.bits.includes(FIRST_BIT_ID)) {
    return state.mission;
  }
  if (!state.mission || state.mission.status !== 'in-progress') {
    throw new Error('No active WILD mission to choose');
  }
  ensureEncounter(store, sessionId, now);
  recordEvent(store, {
    sessionId,
    type: 'choice.made',
    missionId: state.mission.missionId,
    evidence: `Explorer chose ${typed} in the canopy`,
    context: { choice: typed },
    now,
  });
  const progress = store.get(sessionId).wild ?? { observed: false, askedMaya: false };
  if (typed === 'observe') {
    rememberExperience(store, sessionId, 'observed-before-acting');
    const next = store.get(sessionId);
    next.wild = {
      observed: true,
      askedMaya: next.wild?.askedMaya ?? false,
      mayaHint: next.wild?.mayaHint,
    };
    store.put(next);
    if (!next.mission) throw new Error('No active WILD mission');
    return next.mission;
  }
  if (typed === 'ask-maya') {
    rememberExperience(store, sessionId, 'requested-guide-information');
    const next = store.get(sessionId);
    next.wild = {
      observed: next.wild?.observed ?? false,
      askedMaya: true,
      mayaHint: MAYA_HINT,
    };
    store.put(next);
    if (!next.mission) throw new Error('No active WILD mission');
    return next.mission;
  }
  const ready = Boolean(progress.observed || progress.askedMaya);
  if (typed === 'approach' && !ready) {
    return retryChoice(
      store,
      sessionId,
      typed,
      now,
      'Explorer moved in before looking. Dewthread hid deeper in the vine',
    );
  }
  if (typed === 'build-help' && !ready) {
    return retryChoice(
      store,
      sessionId,
      typed,
      now,
      'Explorer tried to build a brace without seeing how the vine sat',
    );
  }
  if (typed === 'build-help') {
    rememberExperience(store, sessionId, 'chose-construction-solution');
  }
  if (typed === 'approach') {
    rememberExperience(store, sessionId, 'approached-after-looking');
  }
  const latest = store.get(sessionId);
  if (latest.mission?.status === 'completed') {
    return latest.mission;
  }
  return formConnection(store, sessionId, now);
}
