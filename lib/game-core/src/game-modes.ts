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

export interface CompanionDefinition extends BattleFighterDefinition {
  family: CompanionFamily;
  description: string;
  customizable: boolean;
  bondTrait: string;
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

export const ASTRAL_COMPANIONS: CompanionDefinition[] = [
  {
    id: 'orion-shepherd',
    name: 'Orion',
    family: 'REAL_PET',
    description: 'German Shepherd Earth Guardian.',
    customizable: true,
    bondTrait: 'LOYALTY',
    maxHealth: 116,
    maxEnergy: 80,
    speed: 88,
    abilities: [
      { id: 'guardian-rush', name: 'Carga Guardiana', kind: 'ATTACK', power: 26, energyCost: 16, description: 'A loyal rescue charge.' },
      { id: 'rescue-guard', name: 'Guardia de Rescate', kind: 'DEFEND', power: 0, energyCost: 12, description: 'Protects the team from incoming pressure.' },
      { id: 'shadow-track', name: 'Rastro de Sombra', kind: 'CONTROL', power: 10, energyCost: 14, description: 'Marks a hidden Shadow weakness for the next team action.' },
    ],
  },
  {
    id: 'nx-7',
    name: 'NX-7',
    family: 'FUTURIST_AI',
    description: 'Exploration AI and Technology Guardian.',
    customizable: true,
    bondTrait: 'CURIOSITY',
    maxHealth: 104,
    maxEnergy: 120,
    speed: 72,
    abilities: [
      { id: 'logic-pulse', name: 'Pulso Lógico', kind: 'ATTACK', power: 22, energyCost: 14, description: 'A synthetic pulse that destabilizes Shadow code.' },
      { id: 'repair-field', name: 'Campo de Reparación', kind: 'SUPPORT', power: 22, energyCost: 18, description: 'Repairs an allied Nexus signature.' },
    ],
  },
  {
    id: 'raptor-echo',
    name: 'Echo Raptor',
    family: 'PREHISTORIC',
    description: 'A revived prehistoric scout adapted to Astral worlds.',
    customizable: true,
    bondTrait: 'INSTINCT',
    maxHealth: 102,
    maxEnergy: 88,
    speed: 108,
    abilities: [
      { id: 'raptor-dash', name: 'Carrera Raptor', kind: 'ATTACK', power: 25, energyCost: 15, description: 'Fast prehistoric strike.' },
      { id: 'pack-instinct', name: 'Instinto de Manada', kind: 'CONTROL', power: 10, energyCost: 12, description: 'Reads the opponent and creates an opening.' },
    ],
  },
  {
    id: 'asterion-dragon',
    name: 'Asterion',
    family: 'ASTRAL_DRAGON',
    description: 'Young Astral Dragon bonded to the Nexus.',
    customizable: true,
    bondTrait: 'COURAGE',
    maxHealth: 128,
    maxEnergy: 112,
    speed: 76,
    abilities: [
      { id: 'star-breath', name: 'Aliento Estelar', kind: 'ATTACK', power: 30, energyCost: 22, description: 'Astral breath shaped as protective starfire.' },
      { id: 'wing-shield', name: 'Escudo de Alas', kind: 'DEFEND', power: 0, energyCost: 16, description: 'Folds astral wings into a shield.' },
    ],
  },
  {
    id: 'aurora-unicorn',
    name: 'Aurora',
    family: 'FANTASY',
    description: 'Astral Unicorn and Magic Guardian.',
    customizable: true,
    bondTrait: 'HOPE',
    maxHealth: 100,
    maxEnergy: 130,
    speed: 96,
    abilities: [
      { id: 'prism-charge', name: 'Carga Prisma', kind: 'ATTACK', power: 23, energyCost: 15, description: 'A clean magical charge.' },
      { id: 'purify-nexus', name: 'Purificar Nexo', kind: 'SUPPORT', power: 26, energyCost: 20, description: 'Restores a damaged connection.' },
    ],
  },
  {
    id: 'pegasus-arc',
    name: 'Pegasus Arc',
    family: 'MYTHIC_LEGEND',
    description: 'A myth-inspired winged guardian reimagined for the Astral universe.',
    customizable: true,
    bondTrait: 'FREEDOM',
    maxHealth: 98,
    maxEnergy: 118,
    speed: 112,
    abilities: [
      { id: 'sky-lance', name: 'Lanza Celeste', kind: 'ATTACK', power: 24, energyCost: 16, description: 'A fast aerial strike.' },
      { id: 'wind-veil', name: 'Velo del Viento', kind: 'DEFEND', power: 0, energyCost: 13, description: 'Deflects incoming force.' },
    ],
  },
  {
    id: 'seraph-nova',
    name: 'Seraph Nova',
    family: 'CELESTIAL',
    description: 'Original winged celestial archetype of light and protection.',
    customizable: true,
    bondTrait: 'PROTECTION',
    maxHealth: 110,
    maxEnergy: 125,
    speed: 84,
    abilities: [
      { id: 'nova-feather', name: 'Pluma Nova', kind: 'ATTACK', power: 25, energyCost: 17, description: 'A luminous astral feather strike.' },
      { id: 'halo-guard', name: 'Guardia de Luz', kind: 'DEFEND', power: 0, energyCost: 14, description: 'Creates a protective ring of light.' },
    ],
  },
];

export const ASTRAL_DUEL_FIGHTERS: BattleFighterDefinition[] = [
  {
    id: 'arena',
    name: 'Arena',
    maxHealth: 90,
    maxEnergy: 120,
    speed: 94,
    abilities: [
      { id: 'astral-thread', name: 'Hilo Astral', kind: 'ATTACK', power: 24, energyCost: 18, description: 'A focused astral thread that damages a Shadow target.' },
      { id: 'nexus-stitch', name: 'Costura del Nexo', kind: 'SUPPORT', power: 20, energyCost: 24, description: 'Restores an ally by repairing a damaged Nexus connection.' },
      { id: 'thread-snare', name: 'Red de Hilos', kind: 'CONTROL', power: 12, energyCost: 20, description: 'Restrains an opponent and reduces the impact of its next action.' },
    ],
  },
  {
    id: 'brissa',
    name: 'Brissa',
    maxHealth: 108,
    maxEnergy: 105,
    speed: 82,
    abilities: [
      { id: 'nova-pulse', name: 'Pulso Nova', kind: 'ATTACK', power: 22, energyCost: 17, description: 'A constellation pulse that weakens Shadow energy.' },
      { id: 'astroshield', name: 'Astroescudo', kind: 'DEFEND', power: 0, energyCost: 14, description: 'Raises a constellation shield for the next incoming action.' },
      { id: 'nexus-sight', name: 'Visión del Nexo', kind: 'SUPPORT', power: 16, energyCost: 18, description: 'Reads the battle field and restores team energy.' },
    ],
  },
  {
    id: 'shadow-scout',
    name: 'Explorador Sombra',
    maxHealth: 82,
    maxEnergy: 70,
    speed: 74,
    abilities: [
      { id: 'shadow-pulse', name: 'Pulso Sombrío', kind: 'ATTACK', power: 18, energyCost: 12, description: 'Synthetic enemy action used only inside the battle lab.' },
      { id: 'shadow-guard', name: 'Velo Sombrío', kind: 'DEFEND', power: 0, energyCost: 10, description: 'Synthetic defensive action.' },
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
