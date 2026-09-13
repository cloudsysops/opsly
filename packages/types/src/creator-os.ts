import { z } from 'zod';

export const CREATOR_EVENT_VERSION = 'creator-event-v1' as const;

export const FairPlaySourceClassSchema = z.enum([
  'user-hardware',
  'obs',
  'stream-platform',
  'official-game-api',
  'explicit-player-input',
  'first-party-game',
  'manual',
  'unverified-external',
]);

export type FairPlaySourceClass = z.infer<typeof FairPlaySourceClassSchema>;

const FAIR_PLAY_ELIGIBLE_SOURCE_CLASSES = new Set<FairPlaySourceClass>([
  'user-hardware',
  'obs',
  'stream-platform',
  'official-game-api',
  'explicit-player-input',
  'first-party-game',
  'manual',
]);

export function isFairPlayEligibleSourceClass(sourceClass: FairPlaySourceClass): boolean {
  return FAIR_PLAY_ELIGIBLE_SOURCE_CLASSES.has(sourceClass);
}

export const CreatorEventProvenanceSchema = z
  .object({
    sourceClass: FairPlaySourceClassSchema,
    adapterId: z.string().min(1).max(120),
    adapterVersion: z.string().min(1).max(64).optional(),
    fairPlayCertified: z.boolean(),
    evidence: z.array(z.string().min(1).max(240)).max(16).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.fairPlayCertified && !isFairPlayEligibleSourceClass(value.sourceClass)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fairPlayCertified'],
        message: `sourceClass "${value.sourceClass}" is not eligible for Fair-Play certification`,
      });
    }
  });

export type CreatorEventProvenance = z.infer<typeof CreatorEventProvenanceSchema>;

const EventTypeSchema = z
  .string()
  .min(3)
  .max(160)
  .regex(/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/);

export const CreatorEventEnvelopeV1Schema = z.object({
  version: z.literal(CREATOR_EVENT_VERSION),
  id: z.string().min(1).max(160),
  idempotencyKey: z.string().min(1).max(200),
  type: EventTypeSchema,
  sessionId: z.string().min(1).max(160),
  sequence: z.number().int().nonnegative(),
  occurredAt: z.string().datetime({ offset: true }),
  receivedAt: z.string().datetime({ offset: true }).optional(),
  gameId: z.string().min(1).max(120).optional(),
  correlationId: z.string().min(1).max(160).optional(),
  payload: z.record(z.string(), z.unknown()),
  provenance: CreatorEventProvenanceSchema,
});

export type CreatorEventEnvelopeV1 = z.infer<typeof CreatorEventEnvelopeV1Schema>;

export function parseCreatorEventEnvelopeV1(input: unknown): CreatorEventEnvelopeV1 {
  return CreatorEventEnvelopeV1Schema.parse(input);
}

export type CreatorEventSequenceAssessment =
  | { status: 'first' | 'next'; expected: number; actual: number }
  | { status: 'duplicate-or-replay'; expected: number; actual: number }
  | { status: 'gap'; expected: number; actual: number; missing: readonly number[] }
  | { status: 'out-of-order'; expected: number; actual: number };

export function assessCreatorEventSequence(
  previousSequence: number | null,
  nextSequence: number,
): CreatorEventSequenceAssessment {
  if (!Number.isInteger(nextSequence) || nextSequence < 0) {
    throw new Error('nextSequence must be a non-negative integer');
  }

  if (previousSequence === null) {
    return { status: 'first', expected: nextSequence, actual: nextSequence };
  }

  if (!Number.isInteger(previousSequence) || previousSequence < 0) {
    throw new Error('previousSequence must be null or a non-negative integer');
  }

  const expected = previousSequence + 1;

  if (nextSequence === expected) {
    return { status: 'next', expected, actual: nextSequence };
  }

  if (nextSequence === previousSequence) {
    return { status: 'duplicate-or-replay', expected, actual: nextSequence };
  }

  if (nextSequence < previousSequence) {
    return { status: 'out-of-order', expected, actual: nextSequence };
  }

  return {
    status: 'gap',
    expected,
    actual: nextSequence,
    missing: Array.from({ length: nextSequence - expected }, (_, index) => expected + index),
  };
}

export interface CreatorEventAdapterContext {
  readonly sessionId: string;
  readonly gameId?: string;
  readonly nextSequence: number;
  readonly receivedAt: string;
}

export interface CreatorEventAdapter<TVendorEvent = unknown> {
  readonly id: string;
  readonly sourceClass: FairPlaySourceClass;
  normalize(
    event: TVendorEvent,
    context: CreatorEventAdapterContext,
  ): CreatorEventEnvelopeV1 | Promise<CreatorEventEnvelopeV1>;
}

export interface CreatorEventSubscriptionFilter {
  readonly sessionId?: string;
  readonly types?: readonly string[];
}

export type CreatorEventHandler = (
  event: CreatorEventEnvelopeV1,
) => void | Promise<void>;

export interface CreatorEventPublishResult {
  readonly status: 'accepted' | 'duplicate';
  readonly eventId: string;
  readonly sequence: number;
}

export interface CreatorEventBus {
  publish(event: CreatorEventEnvelopeV1): Promise<CreatorEventPublishResult>;
  subscribe(
    filter: CreatorEventSubscriptionFilter,
    handler: CreatorEventHandler,
  ): () => void;
}
