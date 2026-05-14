import { z } from 'zod';
import { jsonError, parseJsonBody, serverErrorLogged } from '../../../../lib/api-response';
import { requireAdminAccess, requireAdminAccessUnlessDemoRead } from '../../../../lib/auth';
import { HTTP_STATUS } from '../../../../lib/constants';
import { getTenantStackStatus } from '../../../../lib/docker';
import { deleteTenant } from '../../../../lib/orchestrator';
import { getServiceClient } from '../../../../lib/supabase';
import type { Json, Tenant } from '../../../../lib/supabase/types';
import {
  TenantRefParamSchema,
  UpdateTenantSchema,
  formatZodError,
} from '../../../../lib/validation';

const idParamSchema = z.string().uuid();

function mergeTenantMetadata(existing: Json | null | undefined, patch: Record<string, unknown>): Json {
  const base =
    existing !== null && existing !== undefined && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  return { ...base, ...patch } as Json;
}

async function patchTenantRecord(
  tenantId: string,
  updates: Partial<Pick<Tenant, 'name' | 'plan' | 'metadata'>>
): Promise<Response> {
  const { data, error } = await getServiceClient()
    .schema('platform')
    .from('tenants')
    .update(updates)
    .eq('id', tenantId)
    .is('deleted_at', null)
    .select('*')
    .single();

  if (error) {
    return serverErrorLogged('PATCH tenant:', error);
  }
  if (!data) {
    return jsonError('Tenant not found', HTTP_STATUS.NOT_FOUND);
  }

  return Response.json(data);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ ref: string }> }
): Promise<Response> {
  const authError = await requireAdminAccessUnlessDemoRead(request);
  if (authError) {
    return authError;
  }

  const { ref } = await context.params;
  const refParsed = TenantRefParamSchema.safeParse(ref);
  if (!refParsed.success) {
    return jsonError(formatZodError(refParsed.error), HTTP_STATUS.BAD_REQUEST);
  }

  const refValue = refParsed.data;
  const byId = z.string().uuid().safeParse(refValue).success;

  const { data: tenant, error } = await getServiceClient()
    .schema('platform')
    .from('tenants')
    .select('*')
    .is('deleted_at', null)
    .eq(byId ? 'id' : 'slug', refValue)
    .maybeSingle();

  if (error) {
    return serverErrorLogged('GET tenant:', error);
  }
  if (!tenant) {
    return jsonError('Tenant not found', HTTP_STATUS.NOT_FOUND);
  }

  const stackStatus = await getTenantStackStatus(tenant.slug);

  return Response.json({
    tenant,
    stack_status: stackStatus,
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ ref: string }> }
): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) {
    return authError;
  }

  const { ref } = await context.params;
  const idParsed = idParamSchema.safeParse(ref);
  if (!idParsed.success) {
    return jsonError(formatZodError(idParsed.error), HTTP_STATUS.BAD_REQUEST);
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const parsed = UpdateTenantSchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return jsonError(formatZodError(parsed.error), HTTP_STATUS.BAD_REQUEST);
  }

  const updates: Partial<Pick<Tenant, 'name' | 'plan' | 'metadata'>> = {};
  if (parsed.data.name !== undefined) {
    updates.name = parsed.data.name;
  }
  if (parsed.data.plan !== undefined) {
    updates.plan = parsed.data.plan;
  }
  if (parsed.data.metadata !== undefined) {
    const { data: row, error: fetchErr } = await getServiceClient()
      .schema('platform')
      .from('tenants')
      .select('metadata')
      .eq('id', idParsed.data)
      .is('deleted_at', null)
      .maybeSingle();
    if (fetchErr) {
      return serverErrorLogged('PATCH tenant metadata fetch:', fetchErr);
    }
    if (!row) {
      return jsonError('Tenant not found', HTTP_STATUS.NOT_FOUND);
    }
    updates.metadata = mergeTenantMetadata((row as { metadata: Json | null }).metadata, parsed.data.metadata);
  }

  return patchTenantRecord(idParsed.data, updates);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ ref: string }> }
): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) {
    return authError;
  }

  const { ref } = await context.params;
  const idParsed = idParamSchema.safeParse(ref);
  if (!idParsed.success) {
    return jsonError(formatZodError(idParsed.error), HTTP_STATUS.BAD_REQUEST);
  }

  const { data: existing, error: fetchError } = await getServiceClient()
    .schema('platform')
    .from('tenants')
    .select('id')
    .eq('id', idParsed.data)
    .is('deleted_at', null)
    .maybeSingle();

  if (fetchError) {
    return serverErrorLogged('DELETE tenant fetch:', fetchError);
  }
  if (!existing) {
    return jsonError('Tenant not found', HTTP_STATUS.NOT_FOUND);
  }

  try {
    await deleteTenant(idParsed.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Delete failed';
    if (message === 'Tenant not found') {
      return jsonError('Tenant not found', HTTP_STATUS.NOT_FOUND);
    }
    return serverErrorLogged('DELETE tenant:', err);
  }

  return new Response(null, { status: HTTP_STATUS.NO_CONTENT });
}
