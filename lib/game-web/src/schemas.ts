import { z } from 'zod';
import {
  ALLOWED_PALETTES,
  MAP_FRAGMENT_FIRST_PORTAL_ID,
  SessionStateSchema,
  WILD_CHOICE_IDS,
  WILD_WORLD_ID,
  type SessionState,
} from '@intcloudsysops/game-core';
import {
  AVATAR_VARIANTS,
  FORBIDDEN_EXPLORER_FIELDS,
  LEGACY_PLAY_SCHEMA_VERSION,
  PLAY_SCREENS,
  PLAY_SCHEMA_VERSION,
} from './constants.js';

export const ExplorerFormSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1)
      .max(32)
      .regex(/^[\p{L}\p{N} _-]+$/u, 'Alias must be letters, numbers, spaces, or _-'),
    palette: z.enum(ALLOWED_PALETTES),
    avatarVariant: z.enum(AVATAR_VARIANTS),
  })
  .strict();

export const PlayActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('begin') }),
  z.object({ type: z.literal('create-explorer'), explorer: ExplorerFormSchema }),
  z.object({ type: z.literal('advance-dialogue') }),
  z.object({ type: z.literal('enter-first-portal') }),
  z.object({ type: z.literal('enter-wild') }),
  z.object({ type: z.literal('continue-wild') }),
  z.object({
    type: z.literal('apply-wild-choice'),
    choice: z.enum(WILD_CHOICE_IDS),
  }),
  z.object({ type: z.literal('connect'), from: z.string().min(1), to: z.string().min(1) }),
  z.object({ type: z.literal('return-to-nexus') }),
  z.object({ type: z.literal('hydrate') }),
]);

const PlaySaveShape = z.object({
  schemaVersion: z.literal(PLAY_SCHEMA_VERSION),
  screen: z.enum(PLAY_SCREENS),
  dialogueIndex: z.number().int().min(0),
  avatarVariant: z.enum(AVATAR_VARIANTS).optional(),
  retryMessage: z.string().optional(),
  runtime: SessionStateSchema.nullable(),
});

function migrateRuntime(runtime: unknown): SessionState {
  const parsed = SessionStateSchema.parse(runtime);
  const fragmentIds = parsed.inventory.items
    .filter((item) => item.family === 'map-fragment')
    .map((item) => item.id);
  const mapFragments = [...new Set([...parsed.mapFragments, ...fragmentIds])];
  const unlockedWorlds =
    fragmentIds.includes(MAP_FRAGMENT_FIRST_PORTAL_ID) &&
    !parsed.unlockedWorlds.includes(WILD_WORLD_ID)
      ? [...parsed.unlockedWorlds, WILD_WORLD_ID]
      : parsed.unlockedWorlds;
  return { ...parsed, mapFragments, unlockedWorlds };
}

export function migratePlaySaveInput(input: unknown): unknown {
  if (input == null) {
    return {
      schemaVersion: PLAY_SCHEMA_VERSION,
      screen: 'title',
      dialogueIndex: 0,
      runtime: null,
    };
  }
  if (typeof input !== 'object' || Array.isArray(input)) {
    return input;
  }
  const record = input as Record<string, unknown>;
  const runtime = record.runtime == null ? null : migrateRuntime(record.runtime);
  const screen = typeof record.screen === 'string' ? record.screen : 'title';
  return {
    ...record,
    schemaVersion: PLAY_SCHEMA_VERSION,
    screen,
    dialogueIndex: typeof record.dialogueIndex === 'number' ? record.dialogueIndex : 0,
    runtime,
    retryMessage: typeof record.retryMessage === 'string' ? record.retryMessage : undefined,
  };
}

export const PlaySaveSchema = z.preprocess(migratePlaySaveInput, PlaySaveShape);

export function assertNoForbiddenExplorerFields(input: unknown): void {
  if (!input || typeof input !== 'object') {
    return;
  }
  const keys = Object.keys(input);
  for (const field of FORBIDDEN_EXPLORER_FIELDS) {
    if (keys.includes(field)) {
      throw new Error(`Explorer form must not collect ${field}`);
    }
  }
}

export type ExplorerForm = z.infer<typeof ExplorerFormSchema>;
export type PlayAction = z.infer<typeof PlayActionSchema>;
export type PlaySave = z.infer<typeof PlaySaveShape>;
export type PlayScreen = (typeof PLAY_SCREENS)[number];

export { LEGACY_PLAY_SCHEMA_VERSION };
