import { z } from 'zod';
import {
  AbilitySchema,
  AchievementSchema,
  CollectibleSchema,
  ExplorerIdentitySchema,
  GameEventSchema,
  GameSessionSchema,
  GraphEdgeSchema,
  InventorySchema,
  MissionResultSchema,
  MissionSchema,
  PlayerProfileSchema,
  RewardSchema,
  SessionStateSchema,
  WorldInstanceSchema,
} from './schemas.js';

export type ExplorerIdentity = z.infer<typeof ExplorerIdentitySchema>;
export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;
export type GameSession = z.infer<typeof GameSessionSchema>;
export type WorldInstance = z.infer<typeof WorldInstanceSchema>;
export type Mission = z.infer<typeof MissionSchema>;
export type MissionResult = z.infer<typeof MissionResultSchema>;
export type Collectible = z.infer<typeof CollectibleSchema>;
export type Inventory = z.infer<typeof InventorySchema>;
export type Reward = z.infer<typeof RewardSchema>;
export type Achievement = z.infer<typeof AchievementSchema>;
export type Ability = z.infer<typeof AbilitySchema>;
export type GameEvent = z.infer<typeof GameEventSchema>;
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;
export type SessionState = z.infer<typeof SessionStateSchema>;

export interface StartSessionInput {
  tenantSlug: string;
  playerId?: string;
}

export interface ChooseExplorerInput {
  displayName: string;
  palette?: ExplorerIdentity['appearance']['palette'];
  companionCharacterId?: string;
  interestTags?: string[];
}
