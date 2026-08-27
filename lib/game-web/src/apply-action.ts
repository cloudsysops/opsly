import {
  FIRST_BIT_ID,
  FIRST_PORTAL_ID,
  FIRST_PORTAL_MISSION_ID,
  WILD_MISSION_ID,
  WILD_PORTAL_ID,
  createGameRuntime,
} from '@intcloudsysops/game-core';
import { PLAY_SCHEMA_VERSION, PLAY_TENANT_SLUG } from './constants.js';
import {
  PlayActionSchema,
  PlaySaveSchema,
  assertNoForbiddenExplorerFields,
  type PlayAction,
  type PlaySave,
} from './schemas.js';
import { emptySave } from './types.js';
import type { PlayResult } from './types.js';
import { buildPlayView, dialogueLength } from './view-model.js';

const RETRY_COPY = 'Not yet. Let us understand what each part does.';
const WILD_RETRY_COPY = 'Dewthread hid deeper. Looking, or asking Maya, is still open.';

function hydrateRuntime(save: PlaySave) {
  const game = createGameRuntime();
  if (save.runtime) {
    game.restoreSnapshot(save.runtime);
  }
  return game;
}

function snapshot(game: ReturnType<typeof createGameRuntime>, save: PlaySave): PlaySave {
  const sessionId = save.runtime?.session.id;
  return {
    ...save,
    schemaVersion: PLAY_SCHEMA_VERSION,
    runtime: sessionId ? game.exportSnapshot(sessionId) : save.runtime,
  };
}

function begin(): PlaySave {
  const game = createGameRuntime();
  const session = game.startSession({ tenantSlug: PLAY_TENANT_SLUG });
  return {
    schemaVersion: PLAY_SCHEMA_VERSION,
    screen: 'explorer',
    dialogueIndex: 0,
    runtime: game.exportSnapshot(session.id),
  };
}

function createExplorer(save: PlaySave, action: Extract<PlayAction, { type: 'create-explorer' }>): PlaySave {
  assertNoForbiddenExplorerFields(action.explorer);
  if (!save.runtime) {
    throw new Error('Start a session before creating an explorer');
  }
  const game = hydrateRuntime(save);
  game.chooseExplorer(save.runtime.session.id, {
    displayName: action.explorer.displayName,
    palette: action.explorer.palette,
  });
  return snapshot(game, {
    ...save,
    screen: 'nexus',
    dialogueIndex: 0,
    avatarVariant: action.explorer.avatarVariant,
    retryMessage: undefined,
  });
}

function advanceDialogue(save: PlaySave): PlaySave {
  const next = save.dialogueIndex + 1;
  if (next >= dialogueLength()) {
    return { ...save, screen: 'nexus', dialogueIndex: dialogueLength() };
  }
  return { ...save, screen: 'dialogue', dialogueIndex: next };
}

function enterPortal(save: PlaySave): PlaySave {
  if (!save.runtime) {
    throw new Error('Create an explorer before entering a portal');
  }
  const game = hydrateRuntime(save);
  const sessionId = save.runtime.session.id;
  let state = game.getState(sessionId);
  if (!state.world || state.world.portalId !== FIRST_PORTAL_ID) {
    game.enterPortal(sessionId, FIRST_PORTAL_ID);
    state = game.getState(sessionId);
  }
  if (state.mission?.status === 'completed' && state.mission.missionId === FIRST_PORTAL_MISSION_ID) {
    return snapshot(game, { ...save, screen: 'complete', retryMessage: undefined });
  }
  if (!state.mission || state.mission.missionId !== FIRST_PORTAL_MISSION_ID) {
    game.startMission(sessionId, FIRST_PORTAL_MISSION_ID);
  }
  return snapshot(game, { ...save, screen: 'portal', retryMessage: undefined });
}

function enterWild(save: PlaySave): PlaySave {
  if (!save.runtime) {
    throw new Error('Create an explorer before entering WILD');
  }
  const game = hydrateRuntime(save);
  const sessionId = save.runtime.session.id;
  const state = game.getState(sessionId);
  if (state.bits.includes(FIRST_BIT_ID)) {
    return snapshot(game, { ...save, screen: 'bit-card', retryMessage: undefined });
  }
  if (!state.world || state.world.portalId !== WILD_PORTAL_ID) {
    game.enterPortal(sessionId, WILD_PORTAL_ID);
  }
  const afterEnter = game.getState(sessionId);
  if (!afterEnter.mission || afterEnter.mission.missionId !== WILD_MISSION_ID) {
    game.startMission(sessionId, WILD_MISSION_ID);
  }
  return snapshot(game, { ...save, screen: 'wild', retryMessage: undefined });
}

function continueWild(save: PlaySave): PlaySave {
  if (save.screen === 'wild' || save.screen === 'maya') {
    return { ...save, screen: 'first-bit', retryMessage: undefined };
  }
  if (save.screen === 'connection') {
    return { ...save, screen: 'bit-card', retryMessage: undefined };
  }
  if (save.screen === 'bit-card') {
    return { ...save, screen: 'nexus', retryMessage: undefined };
  }
  return save;
}

function applyWildChoiceAction(
  save: PlaySave,
  action: Extract<PlayAction, { type: 'apply-wild-choice' }>,
): PlaySave {
  if (!save.runtime) {
    throw new Error('No active session for a WILD choice');
  }
  const game = hydrateRuntime(save);
  const beforeAttempts = save.runtime.mission?.attempts ?? 0;
  const result = game.applyWildChoice(save.runtime.session.id, action.choice);
  const next = snapshot(game, save);
  if (result.status === 'completed') {
    return { ...next, screen: 'connection', retryMessage: undefined };
  }
  const retried = result.attempts > beforeAttempts;
  if (action.choice === 'ask-maya') {
    return { ...next, screen: 'maya', retryMessage: retried ? WILD_RETRY_COPY : undefined };
  }
  return {
    ...next,
    screen: 'first-bit',
    retryMessage: retried ? WILD_RETRY_COPY : undefined,
  };
}

function connect(save: PlaySave, from: string, to: string): PlaySave {
  if (!save.runtime) {
    throw new Error('No active session to connect');
  }
  const game = hydrateRuntime(save);
  const result = game.connectNodes(save.runtime.session.id, from, to);
  const next = snapshot(game, save);
  if (result.status === 'completed') {
    return { ...next, screen: 'complete', retryMessage: undefined };
  }
  const retried = result.attempts > (save.runtime.mission?.attempts ?? 0);
  return {
    ...next,
    screen: 'portal',
    retryMessage: retried ? RETRY_COPY : undefined,
  };
}

function applyKnown(save: PlaySave, action: PlayAction): PlaySave {
  switch (action.type) {
    case 'begin':
      return begin();
    case 'create-explorer':
      return createExplorer(save, action);
    case 'advance-dialogue':
      return save.screen === 'nexus' && save.dialogueIndex < dialogueLength()
        ? { ...save, screen: 'dialogue', dialogueIndex: save.dialogueIndex }
        : advanceDialogue(save);
    case 'enter-first-portal':
      return enterPortal(save);
    case 'enter-wild':
      return enterWild(save);
    case 'continue-wild':
      return continueWild(save);
    case 'apply-wild-choice':
      return applyWildChoiceAction(save, action);
    case 'connect':
      return connect(save, action.from, action.to);
    case 'return-to-nexus':
      return { ...save, screen: 'nexus', retryMessage: undefined };
    case 'hydrate':
      return save.runtime ? save : emptySave();
    default: {
      const neverAction: never = action;
      throw new Error(`Unknown play action: ${JSON.stringify(neverAction)}`);
    }
  }
}

export function applyPlayAction(saveInput: unknown, actionInput: unknown): PlayResult {
  const save = PlaySaveSchema.parse(saveInput ?? emptySave());
  const action = PlayActionSchema.parse(actionInput);
  const next = applyKnown(save, action);
  const parsed = PlaySaveSchema.parse(next);
  return { save: parsed, view: buildPlayView(parsed) };
}

export function viewFromSave(saveInput: unknown): PlayResult {
  const save = PlaySaveSchema.parse(saveInput ?? emptySave());
  return { save, view: buildPlayView(save) };
}
