'use client';

import Link from 'next/link';
import {
  Clock,
  ExternalLink,
  Mail,
  MessageSquare,
  Phone,
  Users,
} from 'lucide-react';
import type { DashboardData } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LeadStatusPipeline } from '@/components/admin/lead-status-pipeline';
import {
  LEAD_STATUS_LABEL,
  leadStatusTone,
  type LeadAdminStatus,
} from '@/lib/admin/lead-pipeline-progress';
import { normalizeLeadSourceLabel } from '@/lib/admin/lead-source-label';
import { classModalityLabel, leadTypeLabel, serviceModeLabel } from '@/lib/lead-modality';
import { formatAgeRange } from '@/lib/peskids-domain';
import { buildWhatsAppDeepLink } from '@/lib/integrations/wacrm-admin-links';
import { cn, formatRelativeTime } from '@/lib/utils';

export type AdminLeadCardLead = DashboardData['new_leads'][number];

type AdminLeadCardProps = {
  lead: AdminLeadCardLead;
  /** Extra actions under the card footer (notes, convert, etc.). */
  footer?: React.ReactNode;
  className?: string;
  /** Show compact pipeline for denser grids. */
  compactPipeline?: boolean;
};

function modalityText(lead: AdminLeadCardLead): string {
  const service = serviceModeLabel(lead.service_mode);
  if (service !== '—') return service;
  return classModalityLabel(lead.class_modality);
}

function formatBirthDate(value: string | null | undefined): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeZone: 'America/Bogota',
  }).format(new Date(`${value}T12:00:00-05:00`));
}

/**
 * One lead per card: identity, status, key facts, funnel timeline, quick actions.
 */
export function AdminLeadCard({
  lead,
  footer,
  className,
  compactPipeline = false,
}: AdminLeadCardProps): React.ReactElement {
  const status = lead.status as LeadAdminStatus;
  const whatsappUrl = lead.phone ? buildWhatsAppDeepLink(lead.phone) : null;
  const twentyUrl = lead.twenty_person_url ?? lead.twenty_opportunity_url;
  const createdLabel = lead.created_at
    ? formatRelativeTime(new Date(lead.created_at))
    : 'sin fecha';

  return (
    <article
      className={cn(
        'flex h-full flex-col rounded-3xl border border-pk-border bg-white p-4 shadow-sm transition hover:border-pk-primary/35 hover:shadow-card',
        className
      )}
      data-lead-id={lead.id}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <Link
            href={`/admin/interesados/${lead.id}`}
            className="block truncate font-display text-base font-semibold text-pk-ink hover:text-pk-primary hover:underline"
          >
            {lead.name}
          </Link>
          <p className="flex items-center gap-1.5 text-xs text-pk-sub">
            <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{leadTypeLabel(lead.lead_type)}</span>
          </p>
        </div>
        <Badge tone={leadStatusTone(status)}>{LEAD_STATUS_LABEL[status]}</Badge>
      </header>

      <div className="mt-3 space-y-1.5 text-sm text-pk-sub">
        <p className="flex items-start gap-2">
          <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{lead.phone || 'Sin teléfono'}</span>
        </p>
        <p className="flex items-start gap-2">
          <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="break-all">{lead.email || 'Sin correo'}</span>
        </p>
        <p className="flex items-center gap-1.5 text-xs text-pk-mutedText">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Registrado {createdLabel}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge tone="violet">{normalizeLeadSourceLabel(lead.referral_source)}</Badge>
        <Badge tone="amber">{modalityText(lead)}</Badge>
        <Badge tone="teal">{formatAgeRange(lead.grade_interested)}</Badge>
        {lead.child_name ? <Badge tone="neutral">Hijo/a: {lead.child_name}</Badge> : null}
        {lead.birth_date ? (
          <Badge tone="neutral">Nacimiento: {formatBirthDate(lead.birth_date)}</Badge>
        ) : null}
        {lead.neighborhood ? <Badge tone="neutral">{lead.neighborhood}</Badge> : null}
        {lead.company_name ? <Badge tone="neutral">{lead.company_name}</Badge> : null}
      </div>

      <div className="mt-4 rounded-2xl border border-pk-border/80 bg-pk-muted/25 px-3 py-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-pk-mutedText">
          Línea de tiempo
        </p>
        <LeadStatusPipeline
          status={status}
          firstClassAttended={lead.first_class_attended}
          compact={compactPipeline}
        />
      </div>

      {lead.admin_notes?.trim() ? (
        <p className="mt-3 line-clamp-2 rounded-xl bg-pk-bg px-3 py-2 text-xs text-pk-sub">
          <span className="font-semibold text-pk-ink">Nota: </span>
          {lead.admin_notes}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/admin/interesados/${lead.id}`}>
          <Button type="button" size="sm" variant="secondary">
            Ver ficha
          </Button>
        </Link>
        {whatsappUrl ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => window.open(whatsappUrl, '_blank', 'noopener,noreferrer')}
          >
            <Phone className="h-4 w-4" aria-hidden />
            <span className="ml-1">WhatsApp</span>
          </Button>
        ) : null}
        {lead.email ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() =>
              window.open(`mailto:${encodeURIComponent(lead.email)}`, '_blank', 'noopener,noreferrer')
            }
          >
            <Mail className="h-4 w-4" aria-hidden />
            <span className="ml-1">Correo</span>
          </Button>
        ) : null}
        {twentyUrl ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => window.open(twentyUrl, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            <span className="ml-1">CRM</span>
          </Button>
        ) : null}
      </div>

      {footer ? <div className="mt-4 border-t border-pk-border/70 pt-3">{footer}</div> : null}
    </article>
  );
}
