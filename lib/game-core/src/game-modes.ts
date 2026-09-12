export const gamePresentationModeValues = ['2D', '3D', 'HYBRID'] as const;
export type GamePresentationMode = (typeof gamePresentationModeValues)[number];

export const battleActionKindValues = ['ATTACK', 'DEFEND', 'SUPPORT', 'CONTROL'] as const;
export type BattleActionKind = (typeof battleActionKindValues)[number];

export interface BattleAbilityDefinition {
  id: string;
  name: string;
  kind: BattleActionKind;
  power: number;
  energyCost: number;
  description: string;
}

export interface BattleFighterDefinition {
  id: string;
  name: string;
  maxHealth: number;
  maxEnergy: number;
  speed: number;
  abilities: BattleAbilityDefinition[];
}

export interface BattleRuleset {
  id: string;
  name: string;
  turnModel: 'ALTERNATING_SPEED';
  presentationModes: GamePresentationMode[];
  maxPartySize: number;
  winCondition: 'DEFEAT_ALL_OPPONENTS';
  energyRegenerationPerTurn: number;
  defenseReductionPercent: number;
}

export interface BattleRuntimeFighter {
  fighterId: string;
  health: number;
  energy: number;
  defending: boolean;
}

export interface BattleRuntimeState {
  rulesetId: string;
  round: number;
  activeSide: 'PLAYER' | 'OPPONENT';
  player: BattleRuntimeFighter[];
  opponent: BattleRuntimeFighter[];
  log: string[];
  winner: 'PLAYER' | 'OPPONENT' | null;
}

export const ASTRAL_DUEL_RULESET: BattleRuleset = {
  id: 'astral-duel-v1',
  name: 'Astral Duel',
  turnModel: 'ALTERNATING_SPEED',
  presentationModes: ['2D', '3D', 'HYBRID'],
  maxPartySize: 3,
  winCondition: 'DEFEAT_ALL_OPPONENTS',
  energyRegenerationPerTurn: 12,
  defenseReductionPercent: 45,
};

export const COMPANION_FAMILIES = [
  'REAL_PET',
  'FUTURIST_AI',
  'PREHISTORIC',
  'ASTRAL_DRAGON',
  'FANTASY',
  'MYTHIC_LEGEND',
  'CELESTIAL',
] as const;

export type CompanionFamily = (typeof COMPANION_FAMILIES)[number];

export interface CompanionDefinition extends BattleFighterDefinition {
  family: CompanionFamily;
  description: string;
  customizable: boolean;
  bondTrait: string;
}

export const ASTRAL_COMPANIONS: CompanionDefinition[] = [
  {
    id: 'shadow-scout',
    name: 'Explorador Sombra',
    maxHealth: 82,
    maxEnergy: 70,
    speed: 74,
    abilities: [
      {
        id: 'shadow-pulse',
        name: 'Pulso Sombrío',
        kind: 'ATTACK',
        power: 18,
        energyCost: 12,
        description: 'Synthetic enemy action used only inside the battle lab.',
      },
      {
        id: 'shadow-guard',
        name: 'Velo Sombrío',
        kind: 'DEFEND',
        power: 0,
        energyCost: 10,
        description: 'Synthetic defensive action.',
      },
    ],
  },
  ...ASTRAL_COMPANIONS,
];

export function fighterDefinition(id: string): BattleFighterDefinition {
  const fighter = ASTRAL_DUEL_FIGHTERS.find((item) => item.id === id);
  if (!fighter) throw new Error(`Unknown battle fighter: ${id}`);
  return fighter;
}

export function createBattleState(
  playerIds: string[],
  opponentIds: string[],
  ruleset: BattleRuleset = ASTRAL_DUEL_RULESET,
): BattleRuntimeState {
  if (playerIds.length < 1 || playerIds.length > ruleset.maxPartySize) {
    throw new Error('INVALID_PLAYER_PARTY_SIZE');
  }
  if (opponentIds.length < 1 || opponentIds.length > ruleset.maxPartySize) {
    throw new Error('INVALID_OPPONENT_PARTY_SIZE');
  }

  const runtimeFighter = (id: string): BattleRuntimeFighter => {
    const fighter = fighterDefinition(id);
    return {
      fighterId: fighter.id,
      health: fighter.maxHealth,
      energy: fighter.maxEnergy,
      defending: false,
    };
  };

  return {
    rulesetId: ruleset.id,
    round: 1,
    activeSide: 'PLAYER',
    player: playerIds.map(runtimeFighter),
    opponent: opponentIds.map(runtimeFighter),
    log: ['Astral Duel initialized.'],
    winner: null,
  };
}

export const GAME_MODE_BLUEPRINT = {
  schemaVersion: 1,
  modes: [
    {
      id: 'story-3d',
      presentation: '3D' as const,
      purpose: 'Narrative exploration, construction, cinematic encounters, and Steam-first play.',
    },
    {
      id: 'world-2d',
      presentation: '2D' as const,
      purpose: 'Top-down exploration, fast prototyping, web-friendly missions, and collection loops.',
    },
    {
      id: 'battle-lab-hybrid',
      presentation: 'HYBRID' as const,
      purpose: 'Run one deterministic battle state through 2D tactical and 3D arena presentations.',
    },
  ],
  sharedSystems: [
    'content-pack',
    'missions',
    'battle-rules',
    'inventory',
    'collectibles',
    'progression',
    'save-load',
    'telemetry',
  ],
} as const;
