import {
  ALLOWED_PALETTES,
  FIRST_PORTAL_ID,
  GAME_SCHEMA_VERSION,
  GUIDE_CHARACTER_ID,
  IPO_INPUT_NODE,
  IPO_OUTPUT_NODE,
  IPO_PROCESS_NODE,
  MAP_FRAGMENT_FIRST_PORTAL_ID,
  THRESHOLD_CHARACTER_ID,
  getFirstPortalMission,
} from '@intcloudsysops/game-core';
import { CANON_VERSION, getCharacter, getFoundation, getWorld } from '@intcloudsysops/universe';
import {
  AVATAR_VARIANTS,
  IPO_NODE_LABELS,
  LOCKED_PORTALS,
  PLAY_SCHEMA_VERSION,
  STORAGE_KEY,
} from './constants.js';
import type { PlaySave } from './schemas.js';
import type { DialogueLine, PlayView, PortalView } from './types.js';

const DIALOGUE_SCRIPT: Array<{ speakerId: string; text: string }> = [
  { speakerId: GUIDE_CHARACTER_ID, text: 'I found something.' },
  { speakerId: THRESHOLD_CHARACTER_ID, text: 'A broken system?' },
  { speakerId: GUIDE_CHARACTER_ID, text: 'No.' },
  { speakerId: GUIDE_CHARACTER_ID, text: 'A doorway.' },
];

export function dialogueLength(): number {
  return DIALOGUE_SCRIPT.length;
}

function characterView(id: string) {
  const character = getCharacter(id);
  return { id: character.id, name: character.name, tone: character.communication.tone };
}

function currentDialogue(save: PlaySave): DialogueLine | null {
  if (save.screen !== 'dialogue') {
    return null;
  }
  const line = DIALOGUE_SCRIPT[save.dialogueIndex];
  if (!line) {
    return null;
  }
  return {
    speakerId: line.speakerId,
    speakerName: getCharacter(line.speakerId).name,
    text: line.text,
  };
}

function portalViews(save: PlaySave): PortalView[] {
  const hasMap = Boolean(
    save.runtime?.inventory.items.some((item) => item.id === MAP_FRAGMENT_FIRST_PORTAL_ID),
  );
  const first: PortalView = {
    id: FIRST_PORTAL_ID,
    name: 'FIRST PORTAL',
    status: 'available',
  };
  const locked: PortalView[] = LOCKED_PORTALS.map((portal, index) => ({
    ...portal,
    status: hasMap && index === 0 ? 'glowing' : 'locked',
  }));
  return [first, ...locked];
}

export function buildPlayView(save: PlaySave): PlayView {
  const world = getWorld('nexus');
  const nova = characterView(GUIDE_CHARACTER_ID);
  const traveler = characterView(THRESHOLD_CHARACTER_ID);
  const explorer = save.runtime?.player.explorer;
  const events = save.runtime?.events ?? [];
  let foundationVersion: string | null = null;
  try {
    foundationVersion = getFoundation().foundationVersion;
  } catch {
    foundationVersion = null;
  }
  return {
    screen: save.screen,
    title: 'OPSLY UNIVERSE',
    subtitle: 'THE MAP IS STILL BEING DRAWN',
    explorerName: explorer?.displayName ?? null,
    palette: explorer?.appearance.palette ?? null,
    avatarVariant: save.avatarVariant ?? null,
    worldName: world.name,
    worldDescription: world.description,
    nova,
    traveler,
    dialogue: currentDialogue(save),
    portals: portalViews(save),
    missionTitle: save.screen === 'portal' ? getFirstPortalMission().title : null,
    nodes: [
      { id: IPO_INPUT_NODE, ...IPO_NODE_LABELS[IPO_INPUT_NODE] },
      { id: IPO_PROCESS_NODE, ...IPO_NODE_LABELS[IPO_PROCESS_NODE] },
      { id: IPO_OUTPUT_NODE, ...IPO_NODE_LABELS[IPO_OUTPUT_NODE] },
    ],
    edges: save.runtime?.edges ?? [],
    inventory: save.runtime?.inventory.items ?? [],
    events,
    lastEventType: events.at(-1)?.type ?? null,
    retryMessage: save.retryMessage ?? null,
    closingLines: [
      "I don't know where your path leads.",
      "That's the point.",
      "Let's discover it.",
    ],
    explorerOptions: {
      palettes: [...ALLOWED_PALETTES],
      avatars: [...AVATAR_VARIANTS],
    },
    storageKey: STORAGE_KEY,
    debug: {
      sessionId: save.runtime?.session.id ?? null,
      gameSchemaVersion: GAME_SCHEMA_VERSION,
      playSchemaVersion: PLAY_SCHEMA_VERSION,
      canonVersion: CANON_VERSION,
      foundationVersion,
    },
  };
}
