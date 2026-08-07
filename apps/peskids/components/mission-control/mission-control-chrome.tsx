'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type MissionControlAudience = 'admin' | 'support' | 'teacher' | 'family';

const audienceLabel: Record<MissionControlAudience, string> = {
  admin: 'Admin',
  support: 'Soporte',
  teacher: 'Profesores',
  family: 'Familias',
};

interface MissionControlChromeProps {
  audience: MissionControlAudience;
  title: string;
  summary?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Shared Mission Control page chrome for admin/support/teacher/family surfaces. */
export function MissionControlChrome({
  audience,
  title,
  summary,
  actions,
  className,
  children,
}: MissionControlChromeProps): React.ReactElement {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-pk-mutedText">
            Peskids / Mission Control · {audienceLabel[audience]}
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-pk-ink sm:text-3xl">
            {title}
          </h1>
          {summary ? <p className="mt-1 text-sm text-pk-sub">{summary}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}
