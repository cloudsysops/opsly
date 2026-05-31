import { supabaseServer } from '@/lib/supabase';
import type {
  ClassListItem,
  ClassStatus,
  PeskidsClass,
  PeskidsPool,
  SwimLocation,
} from '@/lib/class-types';
import { ClassScheduleConflictError } from '@/lib/class-types';
import type { createClassSchema, updateClassSchema } from '@/lib/validation/class.schema';
import type { Database } from '@/lib/types';
import type { z } from 'zod';

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

function peskidsClient() {
  return supabaseServer().schema('peskids');
}

async function countActiveEnrollments(classId: string): Promise<number> {
  const { count, error } = await peskidsClient()
    .from('class_enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('class_id', classId)
    .not('status', 'eq', 'cancelled');

  if (error) throw error;
  return count ?? 0;
}

async function hasScheduleOverlap(input: {
  professorUserId: string;
  poolId: string;
  startsAt: string;
  endsAt: string;
  excludeClassId?: string;
}): Promise<boolean> {
  let query = peskidsClient()
    .from('classes')
    .select('id')
    .eq('tenant_slug', tenantSlug())
    .eq('status', 'scheduled')
    .lt('starts_at', input.endsAt)
    .gt('ends_at', input.startsAt)
    .or(`professor_user_id.eq.${input.professorUserId},pool_id.eq.${input.poolId}`);

  if (input.excludeClassId) {
    query = query.neq('id', input.excludeClassId);
  }

  const { data, error } = await query.limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function listPools(): Promise<PeskidsPool[]> {
  const { data, error } = await peskidsClient()
    .from('pools')
    .select('*')
    .eq('tenant_slug', tenantSlug())
    .eq('active', true)
    .order('name');

  if (error) throw error;
  return (data ?? []) as PeskidsPool[];
}

export async function listClasses(input: {
  from: string;
  to: string;
  professorUserId?: string;
  poolId?: string;
  status?: string;
}): Promise<ClassListItem[]> {
  let query = peskidsClient()
    .from('classes')
    .select('*, pools(name)')
    .eq('tenant_slug', tenantSlug())
    .gte('starts_at', input.from)
    .lte('starts_at', input.to)
    .order('starts_at', { ascending: true });

  if (input.professorUserId) {
    query = query.eq('professor_user_id', input.professorUserId);
  }
  if (input.poolId) {
    query = query.eq('pool_id', input.poolId);
  }
  if (input.status) {
    query = query.eq('status', input.status as ClassStatus);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as Array<
    PeskidsClass & { pools: { name: string } | null }
  >;

  const items: ClassListItem[] = [];
  for (const row of rows) {
    const enrolled_count = await countActiveEnrollments(row.id);
    items.push({
      ...row,
      pool_name: row.pools?.name,
      enrolled_count,
    });
  }

  return items;
}

export async function getClassById(classId: string): Promise<ClassListItem | null> {
  const { data, error } = await peskidsClient()
    .from('classes')
    .select('*, pools(name)')
    .eq('id', classId)
    .eq('tenant_slug', tenantSlug())
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as PeskidsClass & { pools: { name: string } | null };
  const enrolled_count = await countActiveEnrollments(row.id);
  return { ...row, pool_name: row.pools?.name, enrolled_count };
}

export async function createClass(
  input: z.infer<typeof createClassSchema>,
  createdBy: string | null
): Promise<PeskidsClass> {
  const overlap = await hasScheduleOverlap({
    professorUserId: input.professor_user_id,
    poolId: input.pool_id,
    startsAt: input.starts_at,
    endsAt: input.ends_at,
  });
  if (overlap) {
    throw new ClassScheduleConflictError();
  }

  const { data, error } = await peskidsClient()
    .from('classes')
    .insert({
      tenant_slug: tenantSlug(),
      title: input.title,
      level: input.level,
      professor_user_id: input.professor_user_id,
      pool_id: input.pool_id,
      location: input.location as SwimLocation,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      capacity: input.capacity,
      price_cents: input.price_cents,
      currency: input.currency ?? 'cop',
      status: 'scheduled',
      created_by: createdBy,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as PeskidsClass;
}

export async function updateClass(
  classId: string,
  input: z.infer<typeof updateClassSchema>
): Promise<PeskidsClass> {
  const existing = await getClassById(classId);
  if (!existing) {
    throw new Error('Class not found');
  }

  const professorUserId = input.professor_user_id ?? existing.professor_user_id;
  const poolId = input.pool_id ?? existing.pool_id;
  const startsAt = input.starts_at ?? existing.starts_at;
  const endsAt = input.ends_at ?? existing.ends_at;

  if (
    input.professor_user_id ||
    input.pool_id ||
    input.starts_at ||
    input.ends_at
  ) {
    const overlap = await hasScheduleOverlap({
      professorUserId,
      poolId,
      startsAt,
      endsAt,
      excludeClassId: classId,
    });
    if (overlap) {
      throw new ClassScheduleConflictError();
    }
  }

  const patch: Database['peskids']['Tables']['classes']['Update'] = {
    updated_at: new Date().toISOString(),
  };
  if (input.title !== undefined) patch.title = input.title;
  if (input.level !== undefined) patch.level = input.level;
  if (input.professor_user_id !== undefined) patch.professor_user_id = input.professor_user_id;
  if (input.pool_id !== undefined) patch.pool_id = input.pool_id;
  if (input.location !== undefined) patch.location = input.location;
  if (input.starts_at !== undefined) patch.starts_at = input.starts_at;
  if (input.ends_at !== undefined) patch.ends_at = input.ends_at;
  if (input.capacity !== undefined) patch.capacity = input.capacity;
  if (input.price_cents !== undefined) patch.price_cents = input.price_cents;
  if (input.status !== undefined) patch.status = input.status;
  if (input.cancelled_reason !== undefined) patch.cancelled_reason = input.cancelled_reason;

  const { data, error } = await peskidsClient()
    .from('classes')
    .update(patch)
    .eq('id', classId)
    .eq('tenant_slug', tenantSlug())
    .select('*')
    .single();

  if (error) throw error;
  return data as PeskidsClass;
}
