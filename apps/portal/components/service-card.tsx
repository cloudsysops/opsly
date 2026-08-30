import type { ReactNode } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge, type ServiceHealth } from '@/components/status-badge';

export function ServiceCard(props: {
  title: string;
  description?: string;
  url: string | null;
  actionLabel: string;
  health?: ServiceHealth;
  healthLabel?: string;
  showHealth?: boolean;
  children?: ReactNode;
}) {
  const { title, description, url, actionLabel, health, healthLabel, showHealth, children } = props;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          {showHealth === true && health !== undefined ? (
            <StatusBadge state={health} label={healthLabel} />
          ) : null}
        </div>
        {description ? <p className="font-sans text-sm text-ops-gray">{description}</p> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {url ? (
          <Link
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 break-all font-mono text-xs text-ops-green hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops-green focus-visible:ring-offset-2 rounded-xs"
            aria-label={`${url} (se abre en una nueva pestaña)`}
            title={`${url} (se abre en una nueva pestaña)`}
          >
            {url}
            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
          </Link>
        ) : (
          <p className="font-sans text-sm text-ops-gray">URL no disponible</p>
        )}
        {children}
        {url ? (
          <Button variant="primary" size="sm" asChild>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              aria-label={`${actionLabel} (se abre en una nueva pestaña)`}
              title={actionLabel}
            >
              {actionLabel}
              <ExternalLink className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
