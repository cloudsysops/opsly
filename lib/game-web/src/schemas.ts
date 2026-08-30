import { z } from 'zod';
import { ALLOWED_PALETTES, SessionStateSchema } from '@intcloudsysops/game-core';
import {
  AVATAR_VARIANTS,
  FORBIDDEN_EXPLORER_FIELDS,
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
  z.object({ type: z.literal('connect'), from: z.string().min(1), to: z.string().min(1) }),
  z.object({ type: z.literal('return-to-nexus') }),
  z.object({ type: z.literal('hydrate') }),
]);

export const PlaySaveSchema = z.object({
  schemaVersion: z.literal(PLAY_SCHEMA_VERSION),
  screen: z.enum(PLAY_SCREENS),
  dialogueIndex: z.number().int().min(0),
  avatarVariant: z.enum(AVATAR_VARIANTS).optional(),
  retryMessage: z.string().optional(),
  runtime: SessionStateSchema.nullable(),
});

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
export type PlaySave = z.infer<typeof PlaySaveSchema>;
export type PlayScreen = (typeof PLAY_SCREENS)[number];
