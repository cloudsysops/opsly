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

export interface PlayCollectible {
  id: string;
  family: string;
  name: string;
  knowledge: string;
  gameUse: string;
  narrative: string;
}

export interface PlayEvent {
  type: string;
  evidence: string;
}

export interface PlayView {
  screen: string;
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
  inventory: PlayCollectible[];
  events: PlayEvent[];
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
  save: unknown;
  view: PlayView;
}

export const FORBIDDEN_EXPLORER_FIELDS = [
  'email',
  'phone',
  'surname',
  'school',
  'age',
  'location',
] as const;
