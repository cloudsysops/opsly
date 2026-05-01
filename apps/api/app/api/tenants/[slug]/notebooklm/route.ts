import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Sprint 9: These functions will be implemented in @intcloudsysops/notebooklm-agent
interface TenantNotebookConfig {
  notebook_id: string;
  notebook_name: string;
  status: string;
  last_sync_at: string | null;
}

interface TenantNotebookSource {
  id: string;
  source_id: string;
  source_type: 'url' | 'text' | 'file';
  source_title: string;
  source_url?: string;
  status: 'pending' | 'indexed' | 'failed';
  indexed_at: string | null;
}

async function getTenantNotebookConfig(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _supabase: any,
  _slug: string
): Promise<TenantNotebookConfig | null> {
  // TODO (Sprint 9): Load from tenant_{slug}_config table
  return null;
}

async function getTenantNotebookSources(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _supabase: any,
  _slug: string
): Promise<TenantNotebookSource[]> {
  // TODO (Sprint 9): Load from tenant_{slug}_sources table
  return [];
}

async function markSourcesForResync(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _supabase: any,
  _slug: string
): Promise<void> {
  // TODO (Sprint 9): Mark sources for resync in tenant_{slug}_sources
}

/**
 * GET /api/tenants/[slug]/notebooklm/sources
 * Retorna lista de fuentes indexadas en NotebookLM
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse> {
  try {
    const { slug } = params;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Validar que el tenant existe
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('slug', slug)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Obtener configuración de NotebookLM
    const config = await getTenantNotebookConfig(supabase, slug);
    if (!config) {
      return NextResponse.json({
        sources: [],
        config: null,
      });
    }

    // Obtener fuentes indexadas
    const sources = await getTenantNotebookSources(supabase, slug);

    return NextResponse.json({
      config: {
        notebook_id: config.notebook_id,
        notebook_name: config.notebook_name,
        status: config.status,
        last_sync_at: config.last_sync_at,
      },
      sources: sources.map((s: TenantNotebookSource) => ({
        id: s.id,
        source_id: s.source_id,
        source_type: s.source_type,
        source_title: s.source_title,
        source_url: s.source_url,
        status: s.status,
        indexed_at: s.indexed_at,
      })),
      total_sources: sources.length,
    });
  } catch (error) {
    console.error('GET /notebooklm/sources error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/tenants/[slug]/notebooklm/sync
 * Fuerza re-sincronización de fuentes (job async)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse> {
  try {
    const { slug } = params;
    const body = await request.json().catch(() => ({}));
    const { action } = body;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Validar que el tenant existe
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('slug', slug)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const config = await getTenantNotebookConfig(supabase, slug);
    if (!config) {
      return NextResponse.json(
        { error: 'NotebookLM not configured for this tenant' },
        { status: 400 }
      );
    }

    if (action === 'sync') {
      // Marcar fuentes para resync
      await markSourcesForResync(supabase, slug);

      // TODO: Encolar job de sincronización en BullMQ
      // const job = await syncNotebookQueue.add('sync-tenant-sources', {
      //   tenant_slug: slug,
      //   notebook_id: config.notebook_id,
      // });

      return NextResponse.json({
        message: 'Sync job queued',
        tenant_slug: slug,
        notebook_id: config.notebook_id,
        // job_id: job.id,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('POST /notebooklm/sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
