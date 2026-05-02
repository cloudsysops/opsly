import { NextRequest } from 'next/server';
import { z } from 'zod';
import { HTTP_STATUS } from '../../../../../../../lib/constants';
import {
  activateN8nMarketplacePack,
  countN8nMarketplaceMeteringThisMonth,
  listN8nMarketplaceInstallsForTenant,
} from '../../../../../../../lib/n8n-marketplace-installs-service';
import { N8N_CATALOG_ITEM_ID_MAX_LEN } from '../../../../../../../lib/n8n-workflow-catalog-api';
import { runTrustedPortalDalForPathSlug } from '../../../../../../../lib/portal-tenant-dal';

const BODY_SCHEMA = z.object({
  catalog_item_id: z.string().min(1).max(N8N_CATALOG_ITEM_ID_MAX_LEN),
});

type ActivateFailureReason = 'not_found' | 'plan_forbidden' | 'included_by_default';

function mapActivateFailure(reason: ActivateFailureReason): {
  status: number;
  message: string;
} {
  if (reason === 'not_found') {
    return { status: HTTP_STATUS.NOT_FOUND, message: 'Catalog item not found' };
  }
  if (reason === 'plan_forbidden') {
    return {
      status: HTTP_STATUS.FORBIDDEN,
      message: 'Your plan does not include this pack. Upgrade to activate.',
    };
  }
  return {
    status: HTTP_STATUS.UNPROCESSABLE,
    message: 'This pack is included by default; open n8n to review and activate workflows.',
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await context.params;
  return runTrustedPortalDalForPathSlug(request, slug, async (session) => {
    try {
      const [installs, packMeteringThisMonth] = await Promise.all([
        listN8nMarketplaceInstallsForTenant(session.tenant.id),
        countN8nMarketplaceMeteringThisMonth(session.tenant.id),
      ]);
      return Response.json({
        tenant: slug,
        installs: installs.map((r) => ({
          catalog_item_id: r.catalog_item_id,
          catalog_version: r.catalog_version,
          status: r.status,
          activated_at: r.created_at,
        })),
        billing_usage: {
          pack_metering_events_this_month: packMeteringThisMonth,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      return Response.json({ error: message }, { status: HTTP_STATUS.INTERNAL_ERROR });
    }
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await context.params;

  return runTrustedPortalDalForPathSlug(request, slug, async (session) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: HTTP_STATUS.BAD_REQUEST });
    }

    const parsed = BODY_SCHEMA.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: 'catalog_item_id required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    try {
      const result = await activateN8nMarketplacePack(
        session.tenant.id,
        session.tenant.plan,
        parsed.data.catalog_item_id
      );
      if (!result.ok) {
        const { status, message } = mapActivateFailure(result.reason);
        return Response.json({ error: message }, { status });
      }
      return Response.json({
        ok: true,
        already: result.already,
        install: {
          catalog_item_id: result.install.catalog_item_id,
          catalog_version: result.install.catalog_version,
          status: result.install.status,
          activated_at: result.install.created_at,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      return Response.json({ error: message }, { status: HTTP_STATUS.INTERNAL_ERROR });
    }
  });
}
