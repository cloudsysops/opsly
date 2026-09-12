export const TECHNOLIA_WORLD_ID = 'technolia';

export const technoliaResourceValues = [
  'ASTRAL_ENERGY',
  'NEXUS_CRYSTAL',
  'KNOWLEDGE',
  'DATA',
  'ALLOY',
  'TRUST',
] as const;
export type TechnoliaResource = (typeof technoliaResourceValues)[number];

export interface ResourceCost {
  resource: TechnoliaResource;
  amount: number;
}

export const technoliaEraValues = [
  'SPARK_ERA',
  'NETWORK_ERA',
  'AUTOMATION_ERA',
  'STELLAR_ERA',
] as const;
export type TechnoliaEra = (typeof technoliaEraValues)[number];

export interface TechnoliaBuilding {
  id: string;
  name: string;
  era: TechnoliaEra;
  purpose: string;
  softwareAnalogy: string;
  cost: ResourceCost[];
  unlocks: string[];
}

export interface TechnoliaTechnology {
  id: string;
  name: string;
  era: TechnoliaEra;
  lesson: string;
  requires: string[];
  cost: ResourceCost[];
  unlocks: string[];
}

export interface StarshipModule {
  id: string;
  name: string;
  purpose: string;
  architectureAnalogy: string;
  requires: string[];
  cost: ResourceCost[];
}

export interface TechnoliaRegion {
  id: string;
  name: string;
  description: string;
  requiredTechnology: string[];
  rewardResources: Partial<Record<TechnoliaResource, number>>;
  unlocks?: string[];
}

export interface TechnoliaProgressionState {
  era: TechnoliaEra;
  resources: Record<TechnoliaResource, number>;
  buildings: string[];
  technologies: string[];
  shipModules: string[];
  discoveredRegions: string[];
}

export const TECHNOLIA_STARTING_RESOURCES: Record<TechnoliaResource, number> = {
  ASTRAL_ENERGY: 120,
  NEXUS_CRYSTAL: 80,
  KNOWLEDGE: 40,
  DATA: 20,
  ALLOY: 60,
  TRUST: 10,
};

export const TECHNOLIA_BUILDINGS: TechnoliaBuilding[] = [
  {
    id: 'nexus-core',
    name: 'Núcleo del Nexo',
    era: 'SPARK_ERA',
    purpose: 'Main base and power coordinator.',
    softwareAnalogy: 'Control plane: knows desired state and coordinates services.',
    cost: [
      { resource: 'ASTRAL_ENERGY', amount: 30 },
      { resource: 'NEXUS_CRYSTAL', amount: 20 },
    ],
    unlocks: ['portal-gateway', 'memory-vault'],
  },
  {
    id: 'portal-gateway',
    name: 'Torre Portal',
    era: 'SPARK_ERA',
    purpose: 'Controls entry into the settlement and routes travelers.',
    softwareAnalogy: 'Edge gateway / reverse proxy / rate-limit boundary.',
    cost: [
      { resource: 'ALLOY', amount: 20 },
      { resource: 'ASTRAL_ENERGY', amount: 20 },
    ],
    unlocks: ['identity-citadel'],
  },
  {
    id: 'memory-vault',
    name: 'Bóveda de Memoria',
    era: 'SPARK_ERA',
    purpose: 'Stores discoveries, maps, and mission state.',
    softwareAnalogy: 'Primary database with durable state.',
    cost: [
      { resource: 'NEXUS_CRYSTAL', amount: 25 },
      { resource: 'DATA', amount: 10 },
    ],
    unlocks: ['backup-archive'],
  },
  {
    id: 'identity-citadel',
    name: 'Ciudadela de Identidad',
    era: 'NETWORK_ERA',
    purpose: 'Recognizes Guardians and controls what each role can access.',
    softwareAnalogy: 'Authentication, authorization, roles, short-lived tokens.',
    cost: [
      { resource: 'KNOWLEDGE', amount: 30 },
      { resource: 'TRUST', amount: 10 },
      { resource: 'ALLOY', amount: 25 },
    ],
    unlocks: ['api-forge'],
  },
  {
    id: 'api-forge',
    name: 'Forja de Interfaces',
    era: 'NETWORK_ERA',
    purpose: 'Lets machines and districts exchange commands through stable contracts.',
    softwareAnalogy: 'API layer with validation and versioned contracts.',
    cost: [
      { resource: 'KNOWLEDGE', amount: 35 },
      { resource: 'DATA', amount: 20 },
    ],
    unlocks: ['dragon-queue'],
  },
  {
    id: 'dragon-queue',
    name: 'Muelles de la Cola Dragón',
    era: 'NETWORK_ERA',
    purpose: 'Buffers work when too many jobs arrive at once.',
    softwareAnalogy: 'Message queue / event bus / backpressure.',
    cost: [
      { resource: 'ALLOY', amount: 30 },
      { resource: 'ASTRAL_ENERGY', amount: 25 },
      { resource: 'KNOWLEDGE', amount: 20 },
    ],
    unlocks: ['nx-foundry'],
  },
  {
    id: 'nx-foundry',
    name: 'Fundición NX',
    era: 'AUTOMATION_ERA',
    purpose: 'Builds and dispatches specialized helper machines.',
    softwareAnalogy: 'Worker pool / job executors / autoscaling compute.',
    cost: [
      { resource: 'ALLOY', amount: 50 },
      { resource: 'ASTRAL_ENERGY', amount: 40 },
      { resource: 'KNOWLEDGE', amount: 35 },
    ],
    unlocks: ['observatory', 'shipyard'],
  },
  {
    id: 'observatory',
    name: 'Observatorio de Altair',
    era: 'AUTOMATION_ERA',
    purpose: 'Shows the health of the whole civilization and detects anomalies.',
    softwareAnalogy: 'Logs, metrics, traces, alerts, SLOs, and incident signals.',
    cost: [
      { resource: 'DATA', amount: 40 },
      { resource: 'KNOWLEDGE', amount: 40 },
      { resource: 'NEXUS_CRYSTAL', amount: 25 },
    ],
    unlocks: ['threat-lab'],
  },
  {
    id: 'backup-archive',
    name: 'Archivo de Asterion',
    era: 'AUTOMATION_ERA',
    purpose: 'Keeps isolated copies of critical memories.',
    softwareAnalogy: 'Immutable backup and tested disaster recovery.',
    cost: [
      { resource: 'NEXUS_CRYSTAL', amount: 35 },
      { resource: 'DATA', amount: 30 },
    ],
    unlocks: ['resilience-grid'],
  },
  {
    id: 'threat-lab',
    name: 'Laboratorio Cyber Arena',
    era: 'AUTOMATION_ERA',
    purpose: 'Runs safe simulated attacks against disposable systems.',
    softwareAnalogy: 'Cyber range / staging environment / threat-model laboratory.',
    cost: [
      { resource: 'KNOWLEDGE', amount: 50 },
      { resource: 'DATA', amount: 30 },
      { resource: 'TRUST', amount: 15 },
    ],
    unlocks: ['cyber-battle-tier-2'],
  },
  {
    id: 'shipyard',
    name: 'Astillero Estelar',
    era: 'AUTOMATION_ERA',
    purpose: 'Builds and upgrades the team starship.',
    softwareAnalogy: 'Platform engineering: composed modules behind stable interfaces.',
    cost: [
      { resource: 'ALLOY', amount: 70 },
      { resource: 'ASTRAL_ENERGY', amount: 50 },
      { resource: 'NEXUS_CRYSTAL', amount: 35 },
    ],
    unlocks: ['starship-hull-v1'],
  },
  {
    id: 'resilience-grid',
    name: 'Malla de Resiliencia',
    era: 'STELLAR_ERA',
    purpose: 'Keeps critical districts working when one component fails.',
    softwareAnalogy: 'Redundancy, health checks, failover, circuit breakers, graceful degradation.',
    cost: [
      { resource: 'KNOWLEDGE', amount: 70 },
      { resource: 'ASTRAL_ENERGY', amount: 60 },
      { resource: 'TRUST', amount: 25 },
    ],
    unlocks: ['stellar-distributed-core'],
  },
  {
    id: 'stellar-distributed-core',
    name: 'Núcleo Distribuido Estelar',
    era: 'STELLAR_ERA',
    purpose: 'Coordinates several settlements without making one planet a single point of failure.',
    softwareAnalogy: 'Distributed regional architecture with explicit consistency and failure boundaries.',
    cost: [
      { resource: 'KNOWLEDGE', amount: 100 },
      { resource: 'DATA', amount: 80 },
      { resource: 'ASTRAL_ENERGY', amount: 80 },
      { resource: 'TRUST', amount: 40 },
    ],
    unlocks: ['technolia-endgame'],
  },
];

export const TECHNOLIA_TECH_TREE: TechnoliaTechnology[] = [
  {
    id: 'structured-requests',
    name: 'Mensajes Estructurados',
    era: 'SPARK_ERA',
    lesson: 'Systems are easier to reason about when inputs have explicit shapes and validation.',
    requires: ['nexus-core'],
    cost: [{ resource: 'KNOWLEDGE', amount: 15 }],
    unlocks: ['input-validation'],
  },
  {
    id: 'trust-boundaries',
    name: 'Fronteras de Confianza',
    era: 'NETWORK_ERA',
    lesson: 'Every connection crosses a trust boundary; identity and authorization must be explicit.',
    requires: ['portal-gateway', 'identity-citadel'],
    cost: [
      { resource: 'KNOWLEDGE', amount: 25 },
      { resource: 'TRUST', amount: 5 },
    ],
    unlocks: ['mfa-sigil', 'least-privilege'],
  },
  {
    id: 'event-driven-systems',
    name: 'Sistemas por Eventos',
    era: 'NETWORK_ERA',
    lesson: 'Queues decouple producers from workers and make burst handling observable.',
    requires: ['api-forge', 'dragon-queue'],
    cost: [
      { resource: 'KNOWLEDGE', amount: 35 },
      { resource: 'DATA', amount: 15 },
    ],
    unlocks: ['backpressure', 'retry-policy'],
  },
  {
    id: 'observability-first',
    name: 'Observabilidad Primero',
    era: 'AUTOMATION_ERA',
    lesson: 'A system you cannot observe is a system you cannot reliably operate.',
    requires: ['observatory'],
    cost: [
      { resource: 'KNOWLEDGE', amount: 40 },
      { resource: 'DATA', amount: 25 },
    ],
    unlocks: ['slo-dashboard', 'incident-timeline'],
  },
  {
    id: 'secure-delivery',
    name: 'Entrega Segura',
    era: 'AUTOMATION_ERA',
    lesson: 'Build provenance, locked dependencies, tests, and gated promotion protect the software supply chain.',
    requires: ['threat-lab', 'observatory'],
    cost: [
      { resource: 'KNOWLEDGE', amount: 50 },
      { resource: 'TRUST', amount: 15 },
    ],
    unlocks: ['dependency-verification', 'signed-build'],
  },
  {
    id: 'distributed-resilience',
    name: 'Resiliencia Distribuida',
    era: 'STELLAR_ERA',
    lesson: 'Distribution trades one kind of failure for coordination complexity; boundaries must be deliberate.',
    requires: ['resilience-grid', 'backup-archive'],
    cost: [
      { resource: 'KNOWLEDGE', amount: 80 },
      { resource: 'TRUST', amount: 25 },
    ],
    unlocks: ['multi-region-route', 'recovery-drill'],
  },
];

export const STARSHIP_MODULES: StarshipModule[] = [
  {
    id: 'navigation-core',
    name: 'Núcleo de Navegación Asterion',
    purpose: 'Maps explored and unexplored Nexus routes.',
    architectureAnalogy: 'Service discovery and routing.',
    requires: ['shipyard', 'observatory'],
    cost: [
      { resource: 'NEXUS_CRYSTAL', amount: 30 },
      { resource: 'KNOWLEDGE', amount: 30 },
    ],
  },
  {
    id: 'identity-shield',
    name: 'Escudo de Identidad',
    purpose: 'Allows only trusted crew commands to control the ship.',
    architectureAnalogy: 'Authentication, authorization, and signed command verification.',
    requires: ['identity-citadel', 'shipyard'],
    cost: [
      { resource: 'TRUST', amount: 15 },
      { resource: 'ALLOY', amount: 25 },
    ],
  },
  {
    id: 'event-engine',
    name: 'Motor de Eventos NX',
    purpose: 'Queues ship tasks so navigation, scanners, and repairs do not block one another.',
    architectureAnalogy: 'Asynchronous event-driven processing.',
    requires: ['dragon-queue', 'nx-foundry', 'shipyard'],
    cost: [
      { resource: 'ALLOY', amount: 35 },
      { resource: 'KNOWLEDGE', amount: 35 },
    ],
  },
  {
    id: 'memory-core',
    name: 'Memoria de Brissa',
    purpose: 'Stores mission state, maps, discoveries, and safe restore points.',
    architectureAnalogy: 'Database plus immutable backup strategy.',
    requires: ['memory-vault', 'backup-archive', 'shipyard'],
    cost: [
      { resource: 'DATA', amount: 40 },
      { resource: 'NEXUS_CRYSTAL', amount: 35 },
    ],
  },
  {
    id: 'wing-drive',
    name: 'Impulsor de Ascensión',
    purpose: 'Converts synchronized Guardian energy into long-range flight.',
    architectureAnalogy: 'A composed capability that only works when dependent subsystems are healthy.',
    requires: ['navigation-core', 'event-engine', 'identity-shield'],
    cost: [
      { resource: 'ASTRAL_ENERGY', amount: 70 },
      { resource: 'TRUST', amount: 25 },
      { resource: 'NEXUS_CRYSTAL', amount: 40 },
    ],
  },
];

export const TECHNOLIA_MAP: TechnoliaRegion[] = [
  {
    id: 'crystal-landing',
    name: 'Desembarco de Cristal',
    description: 'Starting valley where the first Nexus Core is built.',
    requiredTechnology: [],
    rewardResources: { ASTRAL_ENERGY: 30, NEXUS_CRYSTAL: 20, ALLOY: 15 },
    unlocks: ['echo-ridge', 'data-canyon'],
  },
  {
    id: 'echo-ridge',
    name: 'Cordillera del Eco',
    description: 'Signals bounce between crystal walls; ideal for learning routing and observability.',
    requiredTechnology: ['structured-requests'],
    rewardResources: { KNOWLEDGE: 25, DATA: 20 },
    unlocks: ['dragon-docks'],
  },
  {
    id: 'data-canyon',
    name: 'Cañón de Datos',
    description: 'Ancient Memory Vault fragments reveal why durable state matters.',
    requiredTechnology: ['structured-requests'],
    rewardResources: { DATA: 35, NEXUS_CRYSTAL: 20 },
    unlocks: ['shadow-boundary'],
  },
  {
    id: 'dragon-docks',
    name: 'Muelles Dragón',
    description: 'A living Current intersects Technolia and forces the settlement to scale safely.',
    requiredTechnology: ['event-driven-systems'],
    rewardResources: { ASTRAL_ENERGY: 40, KNOWLEDGE: 30, TRUST: 10 },
    unlocks: ['starship-basin'],
  },
  {
    id: 'shadow-boundary',
    name: 'Frontera de la Sombra',
    description: 'First permanent Cyber Arena zone, where simulated threats teach defensive architecture.',
    requiredTechnology: ['trust-boundaries', 'observability-first'],
    rewardResources: { KNOWLEDGE: 50, TRUST: 20 },
    unlocks: ['starship-basin'],
  },
  {
    id: 'starship-basin',
    name: 'Cuenca del Astillero',
    description: 'Resource-rich crater where the Guardian starship can finally be assembled.',
    requiredTechnology: ['secure-delivery'],
    rewardResources: { ALLOY: 80, ASTRAL_ENERGY: 60, NEXUS_CRYSTAL: 40 },
    unlocks: ['stellar-frontier'],
  },
  {
    id: 'stellar-frontier',
    name: 'Frontera Estelar',
    description: 'Endgame map where multiple settlements must coordinate without sharing one failure domain.',
    requiredTechnology: ['distributed-resilience'],
    rewardResources: { KNOWLEDGE: 100, TRUST: 50, DATA: 80 },
    unlocks: ['great-rift-route'],
  },
];

function resourceMap(): Record<TechnoliaResource, number> {
  return { ...TECHNOLIA_STARTING_RESOURCES };
}

export function createTechnoliaProgression(): TechnoliaProgressionState {
  return {
    era: 'SPARK_ERA',
    resources: resourceMap(),
    buildings: [],
    technologies: [],
    shipModules: [],
    discoveredRegions: ['crystal-landing'],
  };
}

function canAfford(state: TechnoliaProgressionState, cost: ResourceCost[]): boolean {
  return cost.every((item) => state.resources[item.resource] >= item.amount);
}

function spend(state: TechnoliaProgressionState, cost: ResourceCost[]): Record<TechnoliaResource, number> {
  const next = { ...state.resources };
  for (const item of cost) next[item.resource] -= item.amount;
  return next;
}

export function constructBuilding(
  state: TechnoliaProgressionState,
  buildingId: string,
): TechnoliaProgressionState {
  if (state.buildings.includes(buildingId)) return state;
  const building = TECHNOLIA_BUILDINGS.find((item) => item.id === buildingId);
  if (!building) throw new Error(`Unknown Technolia building: ${buildingId}`);
  const unlocked =
    buildingId === 'nexus-core' ||
    state.buildings.some((id) =>
      TECHNOLIA_BUILDINGS.find((candidate) => candidate.id === id)?.unlocks.includes(buildingId),
    ) ||
    state.technologies.some((id) =>
      TECHNOLIA_TECH_TREE.find((candidate) => candidate.id === id)?.unlocks.includes(buildingId),
    );
  if (!unlocked) throw new Error(`BUILDING_LOCKED:${buildingId}`);
  if (!canAfford(state, building.cost)) throw new Error('INSUFFICIENT_TECHNOLIA_RESOURCES');
  const next = {
    ...state,
    resources: spend(state, building.cost),
    buildings: [...state.buildings, buildingId],
  };
  return { ...next, era: resolveTechnoliaEra(next) };
}

export function researchTechnology(
  state: TechnoliaProgressionState,
  technologyId: string,
): TechnoliaProgressionState {
  if (state.technologies.includes(technologyId)) return state;
  const technology = TECHNOLIA_TECH_TREE.find((item) => item.id === technologyId);
  if (!technology) throw new Error(`Unknown Technolia technology: ${technologyId}`);
  const missing = technology.requires.filter(
    (requirement) =>
      !state.buildings.includes(requirement) &&
      !state.technologies.includes(requirement),
  );
  if (missing.length > 0) throw new Error(`MISSING_REQUIREMENTS:${missing.join(',')}`);
  if (!canAfford(state, technology.cost)) throw new Error('INSUFFICIENT_TECHNOLIA_RESOURCES');
  return {
    ...state,
    resources: spend(state, technology.cost),
    technologies: [...state.technologies, technologyId],
  };
}

export function installStarshipModule(
  state: TechnoliaProgressionState,
  moduleId: string,
): TechnoliaProgressionState {
  if (state.shipModules.includes(moduleId)) return state;
  const module = STARSHIP_MODULES.find((item) => item.id === moduleId);
  if (!module) throw new Error(`Unknown starship module: ${moduleId}`);
  const missing = module.requires.filter(
    (requirement) =>
      !state.buildings.includes(requirement) &&
      !state.technologies.includes(requirement) &&
      !state.shipModules.includes(requirement),
  );
  if (missing.length > 0) throw new Error(`MISSING_REQUIREMENTS:${missing.join(',')}`);
  if (!canAfford(state, module.cost)) throw new Error('INSUFFICIENT_TECHNOLIA_RESOURCES');
  return {
    ...state,
    resources: spend(state, module.cost),
    shipModules: [...state.shipModules, moduleId],
  };
}

export function discoverTechnoliaRegion(
  state: TechnoliaProgressionState,
  regionId: string,
): TechnoliaProgressionState {
  if (state.discoveredRegions.includes(regionId)) return state;
  const region = TECHNOLIA_MAP.find((item) => item.id === regionId);
  if (!region) throw new Error(`Unknown Technolia region: ${regionId}`);
  const missing = region.requiredTechnology.filter((id) => !state.technologies.includes(id));
  if (missing.length > 0) throw new Error(`MISSING_TECHNOLOGY:${missing.join(',')}`);
  const resources = { ...state.resources };
  for (const [key, amount] of Object.entries(region.rewardResources)) {
    resources[key as TechnoliaResource] += amount ?? 0;
  }
  return {
    ...state,
    resources,
    discoveredRegions: [...state.discoveredRegions, regionId],
  };
}

export function resolveTechnoliaEra(state: TechnoliaProgressionState): TechnoliaEra {
  if (state.buildings.includes('stellar-distributed-core')) return 'STELLAR_ERA';
  if (state.buildings.includes('nx-foundry') || state.buildings.includes('shipyard')) return 'AUTOMATION_ERA';
  if (state.buildings.includes('identity-citadel') || state.buildings.includes('api-forge')) return 'NETWORK_ERA';
  return 'SPARK_ERA';
}
