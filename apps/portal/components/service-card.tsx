import type { ReactNode } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, type ServiceHealth } from "@/components/status-badge";

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
  const {
    title,
    description,
    url,
    actionLabel,
    health,
    healthLabel,
    showHealth,
    children,
  } = props;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          {showHealth === true && health !== undefined ? (
            <StatusBadge state={health} label={healthLabel} />
          ) : null}
        </div>
        {description ? (
          <p className="font-sans text-sm text-ops-gray">{description}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {url ? (
          <Link
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 break-all font-mono text-xs text-ops-green hover:underline"
          >
            {url}
            <ExternalLink className="h-3 w-3 shrink-0" />
          </Link>
        ) : (
          <p className="font-sans text-sm text-ops-gray">URL no disponible</p>
        )}
        {children}
        {url ? (
          <Button variant="primary" size="sm" asChild>
            <a href={url} target="_blank" rel="noreferrer">
              {actionLabel}
            </a>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
