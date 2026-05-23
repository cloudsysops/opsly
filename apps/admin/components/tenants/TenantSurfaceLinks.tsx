'use client';

import { ExternalLink } from 'lucide-react';
import type { Json } from '@/lib/types';
import { resolveTenantSurfaces, type TenantSurfaceLink } from '@/lib/tenant-surfaces';
import { Button } from '@/components/ui/button';

function SurfaceButton({ link }: { link: TenantSurfaceLink }): React.ReactElement {
  const isRelative = link.href.startsWith('/');
  if (isRelative) {
    return (
      <Button variant="primary" size="sm" asChild>
        <a href={link.href} className="inline-flex items-center gap-1">
          {link.label}
          <ExternalLink className="h-3 w-3" />
        </a>
      </Button>
    );
  }
  return (
    <Button variant="primary" size="sm" asChild>
      <a
        href={link.href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1"
        title={link.description}
      >
        {link.label}
        <ExternalLink className="h-3 w-3" />
      </a>
    </Button>
  );
}

export function TenantSurfaceLinks({
  slug,
  services,
  metadata,
  compact = false,
}: {
  slug: string;
  services: Json;
  metadata: Json;
  compact?: boolean;
}): React.ReactElement {
  const surfaces = resolveTenantSurfaces(slug, services, metadata);
  const primary = surfaces.links.filter((l) => l.id !== 'opsly-admin-tenant');

  if (compact) {
    const main =
      primary.find((l) => l.id === 'staff-app' || l.id === 'client-site') ?? primary[0];
    if (!main) {
      return <span className="font-sans text-xs text-ops-gray">Sin URL de producto</span>;
    }
    return <SurfaceButton link={main} />;
  }

  return (
    <div className="space-y-3">
      <p className="font-sans text-xs text-ops-gray">
        Modo:{' '}
        <span className="font-mono text-ops-cyan">
          {surfaces.deploymentMode === 'dedicated' ? 'dedicado (VPS cliente)' : 'incubado en Opsly'}
        </span>
        . Los enlaces usan el dominio del tenant, no asumen que el cliente vive en portal.op-sly.com.
      </p>
      <div className="flex flex-wrap gap-2">
        {primary.map((link) => (
          <SurfaceButton key={link.id} link={link} />
        ))}
      </div>
      <ul className="space-y-1 font-sans text-xs text-neutral-500">
        {primary.map((link) => (
          <li key={`${link.id}-hint`}>
            <span className="text-neutral-400">{link.label}:</span> {link.description}
          </li>
        ))}
      </ul>
    </div>
  );
}
