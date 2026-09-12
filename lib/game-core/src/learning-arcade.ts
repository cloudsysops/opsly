export const learningTrackValues = [
  'GAME_HISTORY',
  'CONSOLE_LAB',
  'HOME_LAB',
  'RASPBERRY_PI',
  'LINUX',
  'NETWORKING',
  'CYBER_DEFENSE',
  'SOFTWARE_ARCHITECTURE',
  'ELECTRONICS',
  'AI_LOCAL',
  'SPACE_SYSTEMS',
] as const;

export type LearningTrack = (typeof learningTrackValues)[number];

export interface LearningMission {
  id: string;
  title: string;
  track: LearningTrack;
  level: 1 | 2 | 3 | 4 | 5;
  storyHook: string;
  buildGoal: string;
  realConcepts: string[];
  evidence: string[];
  reward: string[];
  safety?: string[];
}

export interface ConsoleHistoryNode {
  id: string;
  era: string;
  title: string;
  lesson: string;
  hardwareConcepts: string[];
  softwareConcepts: string[];
  unlockMissionIds: string[];
}

export const CONSOLE_HISTORY: ConsoleHistoryNode[] = [
  {
    id: 'era-arcade-8bit',
    era: '1970s–1980s',
    title: 'De los arcades a las consolas de 8 bits',
    lesson: 'Learn how constrained hardware shaped game loops, sprites, memory use, and controller design.',
    hardwareConcepts: ['CPU basics', 'RAM limits', 'cartridges', 'controllers', 'display signals'],
    softwareConcepts: ['game loop', 'sprites', 'tile maps', 'input polling'],
    unlockMissionIds: ['console-001-game-loop', 'console-002-memory-budget'],
  },
  {
    id: 'era-16bit',
    era: 'late 1980s–1990s',
    title: 'La era de 16 bits',
    lesson: 'Compare richer graphics and audio with the need to optimize memory, timing, and asset pipelines.',
    hardwareConcepts: ['sound chips', 'graphics pipelines', 'memory buses'],
    softwareConcepts: ['asset compression', 'animation frames', 'level streaming'],
    unlockMissionIds: ['console-003-audio-pipeline', 'console-004-tile-world'],
  },
  {
    id: 'era-3d',
    era: '1990s–2000s',
    title: 'El salto al 3D',
    lesson: 'Understand transforms, cameras, polygons, storage, and why engines became more complex.',
    hardwareConcepts: ['GPU acceleration', 'optical media', '3D controllers'],
    softwareConcepts: ['3D transforms', 'scene graph', 'camera', 'collision'],
    unlockMissionIds: ['console-005-first-3d-scene', 'console-006-camera-system'],
  },
  {
    id: 'era-online',
    era: '2000s–2010s',
    title: 'Consolas conectadas',
    lesson: 'Online play introduces identity, matchmaking, latency, updates, telemetry, and service operations.',
    hardwareConcepts: ['network adapters', 'storage', 'multicore processors'],
    softwareConcepts: ['client-server', 'patching', 'matchmaking', 'latency', 'accounts'],
    unlockMissionIds: ['console-007-latency', 'console-008-matchmaking-architecture'],
  },
  {
    id: 'era-modern',
    era: '2010s–today',
    title: 'Consolas modernas, PC y juego distribuido',
    lesson: 'Modern games combine local rendering with cloud services, content pipelines, observability, and cross-platform systems.',
    hardwareConcepts: ['modern GPUs', 'SSDs', 'controllers', 'streaming hardware'],
    softwareConcepts: ['cloud services', 'CDN', 'telemetry', 'live ops', 'cross-platform identity'],
    unlockMissionIds: ['console-009-live-ops', 'console-010-content-pipeline'],
  },
];

export const LEARNING_MISSIONS: LearningMission[] = [
  {
    id: 'console-001-game-loop',
    title: 'Construye tu primer Game Loop',
    track: 'GAME_HISTORY',
    level: 1,
    storyHook: 'Una consola antigua del Museo Technolia solo entiende tres cosas: entrada, actualización y dibujo.',
    buildGoal: 'Model a simple input → update → render loop.',
    realConcepts: ['game loop', 'frame', 'input', 'state'],
    evidence: ['diagram of the loop', 'one playable interaction'],
    reward: ['museum-console-token', 'knowledge+10'],
  },
  {
    id: 'console-002-memory-budget',
    title: 'Solo tienes 64 bloques',
    track: 'CONSOLE_LAB',
    level: 1,
    storyHook: 'NX-7 limits your game memory so you feel what early developers had to optimize.',
    buildGoal: 'Choose which sprites, sounds, and maps fit inside a fixed fictional memory budget.',
    realConcepts: ['memory budget', 'trade-offs', 'asset size'],
    evidence: ['resource allocation plan'],
    reward: ['optimization-badge'],
  },
  {
    id: 'homelab-001-inventory',
    title: 'Mapa de tu Home Lab',
    track: 'HOME_LAB',
    level: 1,
    storyHook: 'Altair asks you to map every trusted machine before Technolia can connect to it.',
    buildGoal: 'Create a local inventory of machines and their roles without storing passwords.',
    realConcepts: ['hosts', 'roles', 'IP addressing', 'trust boundaries'],
    evidence: ['logical network diagram', 'device role list'],
    reward: ['homelab-map-fragment'],
    safety: ['No secrets in screenshots', 'Use only devices you own or are authorized to manage'],
  },
  {
    id: 'homelab-002-switch-router',
    title: 'La Puerta del Router',
    track: 'NETWORKING',
    level: 1,
    storyHook: 'Technolia cannot reach the lab until you explain how traffic moves between devices.',
    buildGoal: 'Model router, switch, LAN, WAN, DHCP, and DNS roles.',
    realConcepts: ['router', 'switch', 'LAN', 'WAN', 'DHCP', 'DNS'],
    evidence: ['labeled topology', 'explanation of one packet path'],
    reward: ['networking-sigil'],
  },
  {
    id: 'homelab-003-services',
    title: 'Servicios del Núcleo',
    track: 'HOME_LAB',
    level: 2,
    storyHook: 'Your lab needs useful services without turning every machine into a snowflake.',
    buildGoal: 'Design a small service map for DNS, monitoring, backups, and one application.',
    realConcepts: ['services', 'ports', 'containers', 'reverse proxy', 'backups'],
    evidence: ['service matrix', 'dependency diagram'],
    reward: ['service-architect-badge'],
  },
  {
    id: 'pi-001-boot',
    title: 'Despierta la Raspberry Pi',
    track: 'RASPBERRY_PI',
    level: 1,
    storyHook: 'A tiny Technolia node arrives with almost no resources but enormous potential.',
    buildGoal: 'Understand boot media, OS image, power, network, and remote administration.',
    realConcepts: ['ARM computer', 'boot media', 'Linux', 'network configuration', 'SSH keys'],
    evidence: ['device inventory entry', 'successful authorized remote login'],
    reward: ['pi-node-token'],
    safety: ['Use key-based authentication on your own lab', 'Do not expose SSH directly to the public Internet'],
  },
  {
    id: 'pi-002-sensor',
    title: 'Sensor del Nexo',
    track: 'ELECTRONICS',
    level: 2,
    storyHook: 'Arena wants the base to react when temperature or light changes.',
    buildGoal: 'Read a safe low-voltage sensor and record values.',
    realConcepts: ['GPIO', 'sensor input', 'sampling', 'time-series data'],
    evidence: ['sample readings', 'simple chart or log'],
    reward: ['sensor-module'],
  },
  {
    id: 'pi-003-edge-service',
    title: 'Nodo Edge de Technolia',
    track: 'RASPBERRY_PI',
    level: 3,
    storyHook: 'Brissa needs a local service that still works when the cloud portal is unavailable.',
    buildGoal: 'Run a small containerized service on the Pi with health checks.',
    realConcepts: ['containers', 'edge computing', 'health checks', 'local-first systems'],
    evidence: ['service health evidence', 'architecture diagram'],
    reward: ['edge-node-module'],
  },
  {
    id: 'linux-001-permissions',
    title: 'Quién puede abrir la Bóveda',
    track: 'LINUX',
    level: 1,
    storyHook: 'The Memory Vault fails because every process has too much access.',
    buildGoal: 'Practice users, groups, file ownership, and least privilege in a disposable lab.',
    realConcepts: ['users', 'groups', 'permissions', 'least privilege'],
    evidence: ['before/after permission model'],
    reward: ['least-privilege-badge'],
  },
  {
    id: 'linux-002-processes',
    title: 'Caza el Proceso Perdido',
    track: 'LINUX',
    level: 2,
    storyHook: 'NX-7 sees CPU usage rising but the cause is hidden.',
    buildGoal: 'Inspect processes, resources, logs, and service status on your own lab.',
    realConcepts: ['processes', 'CPU', 'memory', 'logs', 'services'],
    evidence: ['diagnostic notes', 'identified benign lab process'],
    reward: ['observability-shard'],
  },
  {
    id: 'network-001-dns',
    title: '¿Dónde vive el Portal?',
    track: 'NETWORKING',
    level: 2,
    storyHook: 'The portal name works on one device but not another.',
    buildGoal: 'Trace a fictional/local DNS resolution path and distinguish name resolution from connectivity.',
    realConcepts: ['DNS', 'resolver', 'cache', 'record', 'IP'],
    evidence: ['resolution flow diagram'],
    reward: ['dns-crystal'],
  },
  {
    id: 'network-002-segmentation',
    title: 'Divide el Reino',
    track: 'NETWORKING',
    level: 3,
    storyHook: 'Guest devices should not reach the Memory Vault.',
    buildGoal: 'Design separate trusted, guest, IoT, and lab zones.',
    realConcepts: ['segmentation', 'VLAN concept', 'firewall policy', 'trust zones'],
    evidence: ['segmented topology', 'allow/deny policy table'],
    reward: ['segmentation-shield'],
  },
  {
    id: 'cyber-009-exposed-service',
    title: 'El Servicio que Nadie Debía Ver',
    track: 'CYBER_DEFENSE',
    level: 2,
    storyHook: 'Altair Observatory detects a lab service listening where it should not.',
    buildGoal: 'Identify exposure inside an isolated lab and reduce it to the intended network boundary.',
    realConcepts: ['attack surface', 'service exposure', 'firewall', 'binding'],
    evidence: ['before/after service exposure diagram'],
    reward: ['surface-reduction-badge'],
    safety: ['Inspect only your disposable lab environment', 'No scanning public networks'],
  },
  {
    id: 'cyber-010-logs',
    title: 'Reconstruye el Incidente',
    track: 'CYBER_DEFENSE',
    level: 3,
    storyHook: 'Something happened in Cyber Arena. You must reconstruct the timeline before changing anything.',
    buildGoal: 'Use generated lab logs to build an incident timeline.',
    realConcepts: ['logs', 'timestamps', 'correlation', 'incident response'],
    evidence: ['timeline', 'root-cause hypothesis', 'defensive fix'],
    reward: ['incident-responder-badge'],
  },
  {
    id: 'cyber-011-container-range',
    title: 'Arena de Contenedores',
    track: 'CYBER_DEFENSE',
    level: 4,
    storyHook: 'NX-7 creates disposable services with intentional mistakes for a defense exercise.',
    buildGoal: 'Find configuration weaknesses in an isolated local container range and harden them.',
    realConcepts: ['containers', 'configuration', 'least privilege', 'network isolation', 'secrets'],
    evidence: ['hardening checklist', 'post-fix validation'],
    reward: ['cyber-range-key'],
    safety: ['Disposable local containers only', 'No persistence, evasion, credential theft, or external targeting'],
  },
  {
    id: 'architecture-001-three-tier',
    title: 'Construye una App de Tres Capas',
    track: 'SOFTWARE_ARCHITECTURE',
    level: 2,
    storyHook: 'Technolia needs an app that can evolve without putting everything in one process.',
    buildGoal: 'Design client, API, and database boundaries.',
    realConcepts: ['frontend', 'API', 'database', 'contracts', 'state'],
    evidence: ['architecture diagram', 'request lifecycle'],
    reward: ['architect-core'],
  },
  {
    id: 'architecture-002-queue',
    title: 'No Bloquees el Portal',
    track: 'SOFTWARE_ARCHITECTURE',
    level: 3,
    storyHook: 'A long job freezes the user request path.',
    buildGoal: 'Move slow work behind a queue and worker.',
    realConcepts: ['asynchronous work', 'queue', 'worker', 'retries', 'idempotency'],
    evidence: ['before/after architecture', 'failure-path explanation'],
    reward: ['event-engine-part'],
  },
  {
    id: 'ai-001-local-model',
    title: 'Primer Modelo Local',
    track: 'AI_LOCAL',
    level: 2,
    storyHook: 'NX-7 wants an assistant that works without sending every thought to the cloud.',
    buildGoal: 'Run an approved local model and compare resource use and latency.',
    realConcepts: ['local inference', 'model size', 'RAM/VRAM', 'latency', 'privacy'],
    evidence: ['resource measurements', 'short comparison'],
    reward: ['local-ai-core'],
  },
  {
    id: 'ai-002-router',
    title: '¿Qué Cerebro Usa Cada Misión?',
    track: 'AI_LOCAL',
    level: 4,
    storyHook: 'Not every task needs the largest model.',
    buildGoal: 'Design routing rules for small, medium, and heavy models.',
    realConcepts: ['model routing', 'cost', 'latency', 'capability', 'fallback'],
    evidence: ['routing table', 'three example decisions'],
    reward: ['model-router-module'],
  },
  {
    id: 'space-001-ship-systems',
    title: 'Arquitectura de la Nave',
    track: 'SPACE_SYSTEMS',
    level: 4,
    storyHook: 'The Guardian starship cannot launch until every subsystem has a contract and failure plan.',
    buildGoal: 'Map navigation, identity, event engine, memory, telemetry, and backup systems.',
    realConcepts: ['modularity', 'interfaces', 'dependency graph', 'failure domains'],
    evidence: ['ship architecture map', 'failure-mode table'],
    reward: ['launch-clearance'],
  },
];

export function missionsForTrack(track: LearningTrack): LearningMission[] {
  return LEARNING_MISSIONS.filter((mission) => mission.track === track);
}

export function missionById(id: string): LearningMission {
  const mission = LEARNING_MISSIONS.find((mission) => mission.id === id);
  if (!mission) throw new Error(`Unknown learning mission: ${id}`);
  return mission;
}
