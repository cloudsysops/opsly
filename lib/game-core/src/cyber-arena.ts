export const CYBER_ARENA_ID = 'nexus-cyber-arena';

export const cyberThreatValues = [
  'BOT_SWARM',
  'CREDENTIAL_STORM',
  'INJECTION_ECHO',
  'TOKEN_FORGERY',
  'QUEUE_FLOOD',
  'SECRET_LEAK',
  'SUPPLY_CHAIN_SHADOW',
  'DATA_LOCK',
] as const;

export type CyberThreat = (typeof cyberThreatValues)[number];

export const cyberDefenseValues = [
  'RATE_LIMIT_SHIELD',
  'MFA_SIGIL',
  'INPUT_VALIDATION',
  'PARAMETERIZED_QUERIES',
  'TOKEN_ROTATION',
  'LEAST_PRIVILEGE',
  'QUEUE_BACKPRESSURE',
  'SECRET_VAULT',
  'DEPENDENCY_VERIFICATION',
  'NETWORK_SEGMENTATION',
  'OBSERVABILITY',
  'IMMUTABLE_BACKUP',
  'INCIDENT_RESPONSE',
] as const;

export type CyberDefense = (typeof cyberDefenseValues)[number];

export type ArchitectureNodeKind =
  | 'edge'
  | 'identity'
  | 'api'
  | 'queue'
  | 'worker'
  | 'database'
  | 'secrets'
  | 'observability'
  | 'backup';

export interface ArchitectureNode {
  id: string;
  kind: ArchitectureNodeKind;
  name: string;
  purpose: string;
}

export interface ArchitectureEdge {
  from: string;
  to: string;
  protocol: 'HTTPS' | 'EVENT' | 'SQL' | 'SECRET_REF' | 'TELEMETRY' | 'BACKUP';
}

export interface CyberArchitecture {
  id: string;
  title: string;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
}

export interface CyberBattle {
  id: string;
  title: string;
  threat: CyberThreat;
  storyThreat: string;
  architectureLesson: string;
  attackPhase: string;
  defensePhase: string;
  requiredDefenses: CyberDefense[];
  unlockedComponent?: ArchitectureNodeKind;
  safeSimulationOnly: true;
}

export const NEXUS_STARTER_ARCHITECTURE: CyberArchitecture = {
  id: 'nexus-service-v1',
  title: 'Nexus Service — first production architecture',
  nodes: [
    { id: 'edge-gateway', kind: 'edge', name: 'Portal Gateway', purpose: 'Terminates HTTPS, filters traffic, and enforces coarse limits.' },
    { id: 'identity', kind: 'identity', name: 'Guardian Identity', purpose: 'Authenticates users and issues short-lived session tokens.' },
    { id: 'api', kind: 'api', name: 'Nexus API', purpose: 'Validates requests and applies domain rules.' },
    { id: 'queue', kind: 'queue', name: 'Dragon Queue', purpose: 'Buffers asynchronous work so spikes do not crush workers.' },
    { id: 'worker', kind: 'worker', name: 'NX Worker', purpose: 'Processes jobs outside the request path.' },
    { id: 'database', kind: 'database', name: 'Memory Vault DB', purpose: 'Stores authoritative application data.' },
    { id: 'secrets', kind: 'secrets', name: 'Crystal Vault', purpose: 'Stores credentials and encryption material outside source code.' },
    { id: 'observability', kind: 'observability', name: 'Altair Observatory', purpose: 'Collects logs, metrics, traces, and security signals.' },
    { id: 'backup', kind: 'backup', name: 'Asterion Archive', purpose: 'Keeps isolated, recoverable copies of critical data.' },
  ],
  edges: [
    { from: 'edge-gateway', to: 'identity', protocol: 'HTTPS' },
    { from: 'edge-gateway', to: 'api', protocol: 'HTTPS' },
    { from: 'api', to: 'queue', protocol: 'EVENT' },
    { from: 'queue', to: 'worker', protocol: 'EVENT' },
    { from: 'api', to: 'database', protocol: 'SQL' },
    { from: 'worker', to: 'database', protocol: 'SQL' },
    { from: 'identity', to: 'secrets', protocol: 'SECRET_REF' },
    { from: 'api', to: 'secrets', protocol: 'SECRET_REF' },
    { from: 'edge-gateway', to: 'observability', protocol: 'TELEMETRY' },
    { from: 'identity', to: 'observability', protocol: 'TELEMETRY' },
    { from: 'api', to: 'observability', protocol: 'TELEMETRY' },
    { from: 'worker', to: 'observability', protocol: 'TELEMETRY' },
    { from: 'database', to: 'backup', protocol: 'BACKUP' },
  ],
};

export const CYBER_BATTLES: CyberBattle[] = [
  {
    id: 'cyber-001-bot-swarm',
    title: 'La Tormenta de Bots',
    threat: 'BOT_SWARM',
    storyThreat: 'Miles of Shadow drones hit the Portal Gateway at once.',
    architectureLesson: 'Why edge controls and rate limits belong before the application.',
    attackPhase: 'The simulator increases synthetic request pressure until an unprotected gateway becomes saturated.',
    defensePhase: 'Place RATE_LIMIT_SHIELD at the edge and use OBSERVABILITY to verify that valid traffic still flows.',
    requiredDefenses: ['RATE_LIMIT_SHIELD', 'OBSERVABILITY'],
    unlockedComponent: 'edge',
    safeSimulationOnly: true,
  },
  {
    id: 'cyber-002-credential-storm',
    title: 'Las Llaves Robadas',
    threat: 'CREDENTIAL_STORM',
    storyThreat: 'Shadow copies try many stolen identities against Guardian Identity.',
    architectureLesson: 'Passwords alone are weak boundaries; identity needs layered controls.',
    attackPhase: 'The simulator replays fictional failed sign-in events against a sandbox identity service.',
    defensePhase: 'Add MFA_SIGIL, RATE_LIMIT_SHIELD, and OBSERVABILITY; compare detection and lockout behavior.',
    requiredDefenses: ['MFA_SIGIL', 'RATE_LIMIT_SHIELD', 'OBSERVABILITY'],
    unlockedComponent: 'identity',
    safeSimulationOnly: true,
  },
  {
    id: 'cyber-003-injection-echo',
    title: 'El Eco de Inyección',
    threat: 'INJECTION_ECHO',
    storyThreat: 'A corrupted message tries to make the Nexus API confuse data with instructions.',
    architectureLesson: 'Untrusted input must be validated and database queries must remain parameterized.',
    attackPhase: 'The simulator marks a request as malformed and demonstrates how unsafe string handling could cross a trust boundary.',
    defensePhase: 'Apply INPUT_VALIDATION and PARAMETERIZED_QUERIES, then replay the same synthetic request.',
    requiredDefenses: ['INPUT_VALIDATION', 'PARAMETERIZED_QUERIES'],
    unlockedComponent: 'api',
    safeSimulationOnly: true,
  },
  {
    id: 'cyber-004-token-forgery',
    title: 'El Sello Falso',
    threat: 'TOKEN_FORGERY',
    storyThreat: 'A Shadow artifact presents an invalid Guardian token.',
    architectureLesson: 'Authentication tokens need signature verification, expiration, rotation, and least privilege.',
    attackPhase: 'The simulator presents a deliberately invalid sandbox token object without exposing real signing material.',
    defensePhase: 'Use TOKEN_ROTATION and LEAST_PRIVILEGE; verify the forged identity cannot reach protected resources.',
    requiredDefenses: ['TOKEN_ROTATION', 'LEAST_PRIVILEGE'],
    unlockedComponent: 'identity',
    safeSimulationOnly: true,
  },
  {
    id: 'cyber-005-queue-flood',
    title: 'La Cola del Dragón',
    threat: 'QUEUE_FLOOD',
    storyThreat: 'Too many jobs enter Dragon Queue faster than NX Worker can process them.',
    architectureLesson: 'Asynchronous systems need bounded queues, backpressure, retry policy, and observability.',
    attackPhase: 'The simulator generates synthetic jobs until latency and queue depth cross a safe threshold.',
    defensePhase: 'Enable QUEUE_BACKPRESSURE and OBSERVABILITY, then scale or reject work deliberately.',
    requiredDefenses: ['QUEUE_BACKPRESSURE', 'OBSERVABILITY'],
    unlockedComponent: 'queue',
    safeSimulationOnly: true,
  },
  {
    id: 'cyber-006-secret-leak',
    title: 'El Cristal Expuesto',
    threat: 'SECRET_LEAK',
    storyThreat: 'A secret appears where application code can see it directly.',
    architectureLesson: 'Secrets belong in a vault with scoped access and rotation, not source code or logs.',
    attackPhase: 'The simulator flags a fictional credential placed in a sandbox configuration object.',
    defensePhase: 'Move the value behind SECRET_VAULT and LEAST_PRIVILEGE, then verify logs remain clean.',
    requiredDefenses: ['SECRET_VAULT', 'LEAST_PRIVILEGE', 'OBSERVABILITY'],
    unlockedComponent: 'secrets',
    safeSimulationOnly: true,
  },
  {
    id: 'cyber-007-supply-chain',
    title: 'La Sombra en la Dependencia',
    threat: 'SUPPLY_CHAIN_SHADOW',
    storyThreat: 'A tampered package tries to enter the build.',
    architectureLesson: 'Software supply chains need locked versions, provenance, scanning, and review.',
    attackPhase: 'The simulator changes a fictional dependency checksum inside the lab manifest.',
    defensePhase: 'Use DEPENDENCY_VERIFICATION and INCIDENT_RESPONSE; stop promotion before production.',
    requiredDefenses: ['DEPENDENCY_VERIFICATION', 'INCIDENT_RESPONSE'],
    safeSimulationOnly: true,
  },
  {
    id: 'cyber-008-data-lock',
    title: 'El Archivo Sellado',
    threat: 'DATA_LOCK',
    storyThreat: 'Shadow corruption makes the Memory Vault database unreadable.',
    architectureLesson: 'Recovery depends on segmentation, immutable backups, and practiced incident response.',
    attackPhase: 'The simulator marks the sandbox database unavailable and corrupts only disposable lab state.',
    defensePhase: 'Use NETWORK_SEGMENTATION, IMMUTABLE_BACKUP, and INCIDENT_RESPONSE to restore service.',
    requiredDefenses: ['NETWORK_SEGMENTATION', 'IMMUTABLE_BACKUP', 'INCIDENT_RESPONSE'],
    unlockedComponent: 'backup',
    safeSimulationOnly: true,
  },
];

export interface CyberBattleResult {
  battleId: string;
  passed: boolean;
  missingDefenses: CyberDefense[];
  architectureLesson: string;
}

export function evaluateCyberDefense(
  battleId: string,
  selectedDefenses: CyberDefense[],
): CyberBattleResult {
  const battle = CYBER_BATTLES.find((item) => item.id === battleId);
  if (!battle) throw new Error(`Unknown cyber battle: ${battleId}`);

  const selected = new Set(selectedDefenses);
  const missingDefenses = battle.requiredDefenses.filter((defense) => !selected.has(defense));

  return {
    battleId,
    passed: missingDefenses.length === 0,
    missingDefenses,
    architectureLesson: battle.architectureLesson,
  };
}

export const CYBER_ARENA_SAFETY_RULES = [
  'All attack actions are abstract simulations against disposable fictional lab state.',
  'No real hostnames, public IP addresses, credentials, exploit payloads, malware, persistence, or evasion instructions.',
  'Every attack lesson must include the corresponding defense and architecture reason.',
  'The objective is secure software architecture and incident response, not unauthorized access.',
  'PC-gamer execution remains isolated from production credentials and publishing credentials.',
] as const;
