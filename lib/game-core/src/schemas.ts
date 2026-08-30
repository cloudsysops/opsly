import { z } from 'zod';
import {
  ALLOWED_PALETTES,
  GAME_SCHEMA_VERSION,
  OBSERVATION_EVENT_TYPES,
} from './constants.js';

const NonEmpty = z.string().min(1);
const SchemaVersion = z.literal(GAME_SCHEMA_VERSION);

export const ExplorerIdentitySchema = z.object({
  schemaVersion: SchemaVersion,
  explorerId: NonEmpty,
  displayName: NonEmpty,
  appearance: z.object({
    palette: z.enum(ALLOWED_PALETTES),
    companionCharacterId: z.string().min(1).optional(),
  }),
  interestTags: z.array(NonEmpty).default([]),
});

export const PlayerProfileSchema = z.object({
  schemaVersion: SchemaVersion,
  playerId: NonEmpty,
  tenantSlug: NonEmpty,
  explorer: ExplorerIdentitySchema.optional(),
});

export const GameSessionSchema = z.object({
  schemaVersion: SchemaVersion,
  id: NonEmpty,
  playerId: NonEmpty,
  tenantSlug: NonEmpty,
  status: z.enum(['active', 'completed']),
  portalId: z.string().min(1).optional(),
  worldInstanceId: z.string().min(1).optional(),
  missionId: z.string().min(1).optional(),
  startedAt: NonEmpty,
});

export const WorldInstanceSchema = z.object({
  schemaVersion: SchemaVersion,
  id: NonEmpty,
  sessionId: NonEmpty,
  portalId: NonEmpty,
  universeWorldId: NonEmpty,
  status: z.enum(['open', 'cleared']),
});

export const MissionStepSchema = z.object({
  id: NonEmpty,
  prompt: NonEmpty,
  kind: z.enum(['connect', 'explore', 'create']),
});

export const MissionSchema = z.object({
  schemaVersion: SchemaVersion,
  id: NonEmpty,
  portalId: NonEmpty,
  universeWorldId: NonEmpty,
  thresholdCharacterId: NonEmpty,
  guideCharacterId: NonEmpty,
  title: NonEmpty,
  summary: NonEmpty,
  steps: z.array(MissionStepSchema).min(1),
});

export const MissionResultSchema = z.object({
  schemaVersion: SchemaVersion,
  missionId: NonEmpty,
  status: z.enum(['in-progress', 'completed']),
  attempts: z.number().int().min(0),
  completedAt: z.string().min(1).optional(),
});

export const CollectibleSchema = z.object({
  schemaVersion: SchemaVersion,
  id: NonEmpty,
  family: z.enum([
    'bit',
    'artifact',
    'companion',
    'tool',
    'knowledge-fragment',
    'portal-key',
    'map-fragment',
  ]),
  name: NonEmpty,
  knowledge: NonEmpty,
  gameUse: NonEmpty,
  narrative: NonEmpty,
});

export const InventorySchema = z.object({
  schemaVersion: SchemaVersion,
  playerId: NonEmpty,
  items: z.array(CollectibleSchema),
});

export const RewardSchema = z.object({
  collectibleId: NonEmpty,
  reason: NonEmpty,
});

export const AchievementSchema = z.object({
  id: NonEmpty,
  name: NonEmpty,
  evidenceEventType: z.enum(OBSERVATION_EVENT_TYPES),
});

export const AbilitySchema = z.object({
  id: NonEmpty,
  name: NonEmpty,
  unlocks: NonEmpty,
});

export const GameEventSchema = z.object({
  schemaVersion: SchemaVersion,
  eventId: NonEmpty,
  type: z.enum(OBSERVATION_EVENT_TYPES),
  playerId: NonEmpty,
  sessionId: NonEmpty,
  missionId: z.string().min(1).optional(),
  timestamp: NonEmpty,
  context: z.record(z.string(), z.unknown()).default({}),
  evidence: NonEmpty,
});

export const GraphEdgeSchema = z.object({
  from: NonEmpty,
  to: NonEmpty,
});

export const SessionStateSchema = z.object({
  session: GameSessionSchema,
  player: PlayerProfileSchema,
  world: WorldInstanceSchema.optional(),
  mission: MissionResultSchema.optional(),
  edges: z.array(GraphEdgeSchema),
  inventory: InventorySchema,
  events: z.array(GameEventSchema),
});
