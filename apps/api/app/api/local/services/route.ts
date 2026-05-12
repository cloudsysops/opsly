import { NextResponse } from 'next/server';

import { HTTP_STATUS } from '../../../../lib/constants';
import {
  buildLocalServiceCatalog,
  healthUrl,
  isLocalServicesApiEnabled,
  probeLocalService,
  type LocalServiceCatalogEntry,
} from '../../../../lib/local-services';

export const runtime = 'nodejs';

function wantsProbe(request: Request): boolean {
  const url = new URL(request.url);
  const raw = url.searchParams.get('probe');
  if (raw === null) {
    return false;
  }
  const v = raw.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function jsonCatalogOnly(catalog: LocalServiceCatalogEntry[]): Response {
  return NextResponse.json(
    {
      services: catalog.map((s) => ({
        id: s.id,
        label: s.label,
        role: s.role,
        base_url: s.base_url,
        health_path: s.health_path,
        health_url: healthUrl(s),
      })),
      generated_at: new Date().toISOString(),
    },
    { status: HTTP_STATUS.OK }
  );
}

async function jsonCatalogProbed(catalog: LocalServiceCatalogEntry[]): Promise<Response> {
  const probed = await Promise.all(
    catalog.map(async (s) => {
      const probe = await probeLocalService(s);
      return {
        id: s.id,
        label: s.label,
        role: s.role,
        base_url: s.base_url,
        health_path: s.health_path,
        health_url: healthUrl(s),
        probe,
      };
    })
  );
  return NextResponse.json(
    {
      services: probed,
      generated_at: new Date().toISOString(),
    },
    { status: HTTP_STATUS.OK }
  );
}

export async function GET(request: Request): Promise<Response> {
  if (!isLocalServicesApiEnabled()) {
    return NextResponse.json(
      {
        error: 'LOCAL_SERVICES_DISABLED',
        message:
          'Local services catalog is only available in development or when ALLOW_LOCAL_SERVICES_API=true.',
      },
      { status: HTTP_STATUS.FORBIDDEN }
    );
  }

  const catalog = buildLocalServiceCatalog();
  if (!wantsProbe(request)) {
    return jsonCatalogOnly(catalog);
  }
  return jsonCatalogProbed(catalog);
}
