import { cn } from '@/lib/utils';
import type { MoonDataConfidence } from '@/lib/moon/data-label';
import type { MoonHealthTone } from '@/lib/moon/tenant-card';

export function MoonCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-[#0c1424]/90 shadow-[0_8px_30px_rgba(0,0,0,0.35)]',
        className
      )}
    >
      {children}
    </div>
  );
}

export function MoonPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-violet-300/80">
          Opsly Moon
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-slate-50">
          {title}
        </h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-slate-400">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

const confidenceTone: Record<MoonDataConfidence, string> = {
  REAL: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  ESTIMADO: 'border-amber-500/40 bg-amber-500/10 text-amber-100',
  PROYECTADO: 'border-sky-500/40 bg-sky-500/10 text-sky-100',
};

export function MoonConfidenceBadge({
  confidence,
}: {
  confidence: MoonDataConfidence;
}): React.ReactElement {
  return (
    <span
      className={cn(
        'inline-flex rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider',
        confidenceTone[confidence]
      )}
    >
      {confidence}
    </span>
  );
}

const healthToneClass: Record<MoonHealthTone, string> = {
  healthy: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
  warning: 'border-amber-500/40 bg-amber-500/15 text-amber-100',
  critical: 'border-red-500/40 bg-red-500/15 text-red-200',
  unknown: 'border-slate-500/40 bg-slate-500/15 text-slate-300',
};

export function MoonStatusBadge({
  tone,
  children,
}: {
  tone: MoonHealthTone;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
        healthToneClass[tone]
      )}
    >
      {children}
    </span>
  );
}

export function MoonEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}): React.ReactElement {
  return (
    <MoonCard className="border-dashed p-8 text-center">
      <p className="font-display text-base font-semibold text-slate-100">{title}</p>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
    </MoonCard>
  );
}

export function MoonErrorState({ message }: { message: string }): React.ReactElement {
  return (
    <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
      {message}
    </div>
  );
}

export function MoonSkeleton({ className }: { className?: string }): React.ReactElement {
  return (
    <div className={cn('animate-pulse rounded-xl bg-white/5', className ?? 'h-24 w-full')} />
  );
}
