import type { Collectible, GameEvent, SessionState } from '@intcloudsysops/game-core';
import { PLAY_SCHEMA_VERSION } from './constants.js';
import type { PlaySave, PlayScreen } from './schemas.js';

export type { PlaySave, PlayScreen };

export interface CharacterView {
  id: string;
  name: string;
  tone: string;
}

export interface PortalView {
  id: string;
  name: string;
  status: 'available' | 'locked' | 'glowing';
}

export interface IpoNodeView {
  id: string;
  role: string;
  label: string;
}

export interface DialogueLine {
  speakerId: string;
  speakerName: string;
  text: string;
}

export interface PlayView {
  screen: PlayScreen;
  title: string;
  subtitle: string;
  explorerName: string | null;
  palette: string | null;
  avatarVariant: string | null;
  worldName: string;
  worldDescription: string;
  nova: CharacterView;
  traveler: CharacterView;
  dialogue: DialogueLine | null;
  portals: PortalView[];
  missionTitle: string | null;
  nodes: IpoNodeView[];
  edges: Array<{ from: string; to: string }>;
  inventory: Collectible[];
  events: GameEvent[];
  lastEventType: string | null;
  retryMessage: string | null;
  closingLines: string[];
  explorerOptions: {
    palettes: string[];
    avatars: string[];
  };
  storageKey: string;
  debug: {
    sessionId: string | null;
    gameSchemaVersion: string;
    playSchemaVersion: string;
    canonVersion: string;
    foundationVersion: string | null;
  };
}

export interface PlayResult {
  save: PlaySave;
  view: PlayView;
}

export interface PlayerStateStorage {
  load(): PlaySave | null;
  save(value: PlaySave): void;
  clear(): void;
}

export function emptySave(): PlaySave {
  return {
    schemaVersion: PLAY_SCHEMA_VERSION,
    screen: 'title',
    dialogueIndex: 0,
    runtime: null,
  };
}

export function cloneRuntime(state: SessionState | null): SessionState | null {
  return state ? structuredClone(state) : null;
}
