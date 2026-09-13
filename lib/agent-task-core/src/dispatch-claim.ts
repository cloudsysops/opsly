import { z } from 'zod';

export const DISPATCH_CLAIM_VERSION = 'dispatch-claim-v1' as const;

export const DispatchClaimInputSchema = z.object({
  taskId: z.string().min(1).max(160),
  workstream: z.string().min(1).max(160),
  conflictKey: z.string().min(1).max(200),
  semanticScope: z.string().min(1).max(240).optional(),
  affectedPaths: z.array(z.string().min(1).max(500)).max(64).default([]),
});

export type DispatchClaimInput = z.infer<typeof DispatchClaimInputSchema>;
export type DispatchClaimDimension = 'task' | 'conflict' | 'semantic' | 'path';

export interface DispatchClaimDescriptor {
  dimension: DispatchClaimDimension;
  value: string;
}

export type DispatchConflictDecision =
  | 'JOIN_EXISTING'
  | 'ALREADY_DONE'
  | 'CONFLICT_BLOCKED';

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function normalizeDispatchPath(value: string): string {
  const normalized = value
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '');

  if (
    normalized.length === 0 ||
    normalized === '.' ||
    normalized === '..' ||
    normalized.startsWith('../') ||
    normalized.includes('/../')
  ) {
    throw new Error(`invalid affected path scope: ${value}`);
  }

  return normalized;
}

export function buildDispatchClaimDescriptors(
  raw: DispatchClaimInput
): DispatchClaimDescriptor[] {
  const input = DispatchClaimInputSchema.parse(raw);
  const descriptors: DispatchClaimDescriptor[] = [
    { dimension: 'task', value: normalizeText(input.taskId) },
    { dimension: 'conflict', value: normalizeText(input.conflictKey) },
  ];

  if (input.semanticScope?.trim()) {
    descriptors.push({
      dimension: 'semantic',
      value: normalizeText(input.semanticScope),
    });
  }

  for (const affectedPath of input.affectedPaths) {
    descriptors.push({
      dimension: 'path',
      value: normalizeDispatchPath(affectedPath),
    });
  }

  const seen = new Set<string>();
  return descriptors.filter((descriptor) => {
    const key = `${descriptor.dimension}:${descriptor.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function classifyDispatchConflict(
  descriptor: DispatchClaimDescriptor,
  existingState: 'active' | 'completed' = 'active'
): DispatchConflictDecision {
  if (descriptor.dimension === 'task') {
    return existingState === 'completed' ? 'ALREADY_DONE' : 'JOIN_EXISTING';
  }
  return 'CONFLICT_BLOCKED';
}
