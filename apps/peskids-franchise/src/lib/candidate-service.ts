import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  assertCandidateTransition,
  isCandidateStatus,
  type CandidateStatus,
} from './candidate-domain';
import type { CanonicalPeskidsSession } from './franchise-session';
import { PESKIDS_TENANT_SLUG } from './franchise-session';

export const CandidateInputSchema = z.object({
  displayName: z.string().trim().min(2).max(160),
  organizationName: z.string().trim().max(160).optional().nullable(),
  email: z.string().trim().email().max(320).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  source: z.string().trim().max(80).optional().nullable(),
  desiredTerritory: z.string().trim().max(160).optional().nullable(),
  notes: z.string().trim().max(4000).optional(),
});

export const CandidatePatchSchema = CandidateInputSchema.partial().extend({
  assignedTo: z.string().uuid().optional().nullable(),
});

export type CandidateInput = z.infer<typeof CandidateInputSchema>;
export type CandidatePatch = z.infer<typeof CandidatePatchSchema>;

type CandidateRow = {
  id: string;
  tenant_id: string;
  display_name: string;
  organization_name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  desired_territory: string | null;
  notes: string;
  status: CandidateStatus;
  assigned_to: string | null;
  franchisee_id: string | null;
  proposed_unit_id: string | null;
  created_at: string;
  updated_at: string;
};

export type FranchiseCandidate = {
  id: string;
  displayName: string;
  organizationName: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  desiredTerritory: string | null;
  notes: string;
  status: CandidateStatus;
  assignedTo: string | null;
  franchiseeId: string | null;
  proposedUnitId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CandidateEvent = {
  id: string;
  eventType: string;
  createdAt: string;
};

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error('Canonical Peskids persistence is not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function mapCandidate(row: CandidateRow): FranchiseCandidate {
  return {
    id: row.id,
    displayName: row.display_name,
    organizationName: row.organization_name,
    email: row.email,
    phone: row.phone,
    source: row.source,
    desiredTerritory: row.desired_territory,
    notes: row.notes,
    status: row.status,
    assignedTo: row.assigned_to,
    franchiseeId: row.franchisee_id,
    proposedUnitId: row.proposed_unit_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function canAccessCandidateCrm(
  session: CanonicalPeskidsSession,
  action: 'read' | 'write' | 'approve'
) {
  if (session.roles.includes('teacher')) return false;
  if (action === 'approve')
    return session.roles.some((role) => role === 'owner' || role === 'admin');
  return session.roles.some((role) => role === 'owner' || role === 'admin' || role === 'support');
}

async function tenantId() {
  const { data, error } = await client()
    .schema('platform')
    .from('tenants')
    .select('id')
    .eq('slug', PESKIDS_TENANT_SLUG)
    .maybeSingle();
  if (error || !data?.id) throw new Error('Peskids tenant is not configured');
  return data.id as string;
}

export async function listCandidates(status?: CandidateStatus): Promise<FranchiseCandidate[]> {
  const id = await tenantId();
  let query = client()
    .schema('platform')
    .from('franchise_candidates')
    .select('*')
    .eq('tenant_id', id)
    .order('updated_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as CandidateRow[]).map(mapCandidate);
}

export async function getCandidate(candidateId: string): Promise<FranchiseCandidate | null> {
  const id = await tenantId();
  const { data, error } = await client()
    .schema('platform')
    .from('franchise_candidates')
    .select('*')
    .eq('tenant_id', id)
    .eq('id', candidateId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapCandidate(data as CandidateRow) : null;
}

export async function listCandidateEvents(candidateId: string): Promise<CandidateEvent[]> {
  const id = await tenantId();
  const { data, error } = await client()
    .schema('platform')
    .from('franchise_candidate_events')
    .select('id, event_type, created_at')
    .eq('tenant_id', id)
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((event) => ({
    id: event.id as string,
    eventType: event.event_type as string,
    createdAt: event.created_at as string,
  }));
}

export async function createCandidate(
  input: CandidateInput,
  actorId: string
): Promise<FranchiseCandidate | null> {
  const id = await tenantId();
  const db = client();
  const { data, error } = await db
    .schema('platform')
    .from('franchise_candidates')
    .insert({
      tenant_id: id,
      display_name: input.displayName,
      organization_name: input.organizationName ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      source: input.source ?? null,
      desired_territory: input.desiredTerritory ?? null,
      notes: input.notes ?? '',
      created_by: actorId,
    })
    .select('*')
    .single();
  if (error) throw error;
  const row = data as CandidateRow;
  await db
    .schema('platform')
    .from('franchise_candidate_events')
    .insert({
      tenant_id: id,
      candidate_id: row.id,
      event_type: 'candidate.created',
      actor_id: actorId,
      payload: { source: row.source },
    });
  return mapCandidate(row);
}

export async function updateCandidate(
  candidateId: string,
  patch: CandidatePatch,
  actorId: string
): Promise<FranchiseCandidate> {
  const id = await tenantId();
  const values: Record<string, unknown> = {};
  const mapping: Record<string, string> = {
    displayName: 'display_name',
    organizationName: 'organization_name',
    email: 'email',
    phone: 'phone',
    source: 'source',
    desiredTerritory: 'desired_territory',
    notes: 'notes',
    assignedTo: 'assigned_to',
  };
  for (const [key, column] of Object.entries(mapping))
    if (key in patch) values[column] = patch[key as keyof CandidatePatch] ?? null;
  if (!Object.keys(values).length) throw new Error('No candidate fields to update');
  const db = client();
  if (patch.assignedTo) {
    const { data: assignee, error: assigneeError } = await db
      .schema('platform')
      .from('tenant_memberships')
      .select('user_id')
      .eq('tenant_id', id)
      .eq('user_id', patch.assignedTo)
      .eq('status', 'active')
      .maybeSingle();
    if (assigneeError) throw assigneeError;
    if (!assignee) throw new Error('Candidate assignee is not an active Peskids member');
  }
  const { data, error } = await db
    .schema('platform')
    .from('franchise_candidates')
    .update(values)
    .eq('tenant_id', id)
    .eq('id', candidateId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  await db
    .schema('platform')
    .from('franchise_candidate_events')
    .insert({
      tenant_id: id,
      candidate_id: candidateId,
      event_type: patch.assignedTo ? 'candidate.assigned' : 'candidate.updated',
      actor_id: actorId,
      payload: { fields: Object.keys(values) },
    });
  return mapCandidate(data as CandidateRow);
}

export async function transitionCandidate(
  candidateId: string,
  nextStatus: CandidateStatus,
  actorId: string
): Promise<FranchiseCandidate | null> {
  const current = await getCandidate(candidateId);
  if (!current) return null;
  assertCandidateTransition(current.status, nextStatus);
  const id = await tenantId();
  const db = client();
  const { data, error } = await db
    .schema('platform')
    .from('franchise_candidates')
    .update({ status: nextStatus })
    .eq('tenant_id', id)
    .eq('id', candidateId)
    .eq('status', current.status)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Candidate changed concurrently; reload and retry');
  const eventType =
    nextStatus === 'approved'
      ? 'candidate.approved'
      : nextStatus === 'rejected'
        ? 'candidate.rejected'
        : nextStatus === 'withdrawn'
          ? 'candidate.withdrawn'
          : 'candidate.stage_changed';
  await db
    .schema('platform')
    .from('franchise_candidate_events')
    .insert({
      tenant_id: id,
      candidate_id: candidateId,
      event_type: eventType,
      actor_id: actorId,
      payload: { from: current.status, to: nextStatus },
    });
  return mapCandidate(data as CandidateRow);
}

export async function convertCandidate(candidateId: string, actorId: string) {
  const { data, error } = await client().rpc('convert_franchise_candidate', {
    p_candidate_id: candidateId,
    p_actor_id: actorId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.franchisee_id || !row?.proposed_unit_id)
    throw new Error('Candidate conversion returned no links');
  return {
    candidateId: row.candidate_id as string,
    franchiseeId: row.franchisee_id as string,
    proposedUnitId: row.proposed_unit_id as string,
  };
}

export function parseCandidateStatus(value: unknown): CandidateStatus | undefined {
  return isCandidateStatus(value) ? value : undefined;
}
