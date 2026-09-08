'use client';

import { cn } from '@/lib/utils';
import {
  buildLeadPipelineProgress,
  type LeadAdminStatus,
} from '@/lib/admin/lead-pipeline-progress';

type LeadStatusPipelineProps = {
  status: LeadAdminStatus;
  firstClassAttended?: boolean;
  className?: string;
  compact?: boolean;
};

/**
 * Horizontal status timeline for admin lead cards.
 */
export function LeadStatusPipeline({
  status,
  firstClassAttended = false,
  className,
  compact = false,
}: LeadStatusPipelineProps): React.ReactElement {
  const progress = buildLeadPipelineProgress(status, firstClassAttended);

  return (
    <div className={cn('w-full', className)} aria-label={`Estado del embudo: ${status}`}>
      {progress.archived ? (
        <p
          className={cn(
            'rounded-xl border border-pk-border bg-pk-muted/40 px-3 py-2 text-pk-sub',
            compact ? 'text-[11px]' : 'text-xs'
          )}
        >
          Interesado archivado — fuera del embudo activo.
        </p>
      ) : (
        <ol className="flex w-full items-start gap-0">
          {progress.stages.map((stage, index) => {
            const state = progress.states[index];
            const isLast = index === progress.stages.length - 1;
            const dotClass =
              state === 'done'
                ? 'bg-pk-primary border-pk-primary'
                : state === 'current'
                  ? 'bg-white border-pk-primary ring-2 ring-pk-primary/30'
                  : 'bg-white border-pk-border';
            const labelClass =
              state === 'current'
                ? 'font-semibold text-pk-ink'
                : state === 'done'
                  ? 'font-medium text-pk-sub'
                  : 'text-pk-mutedText';
            const connectorClass =
              state === 'done' || (state === 'current' && index > 0)
                ? 'bg-pk-primary/70'
                : index > 0 && progress.states[index - 1] === 'done'
                  ? 'bg-pk-primary/70'
                  : 'bg-pk-border';

            return (
              <li key={stage.id} className="relative flex min-w-0 flex-1 flex-col items-center">
                {!isLast ? (
                  <span
                    className={cn(
                      'absolute left-[50%] top-[7px] h-0.5 w-full',
                      connectorClass
                    )}
                    aria-hidden
                  />
                ) : null}
                <span
                  className={cn(
                    'relative z-[1] h-3.5 w-3.5 rounded-full border-2',
                    dotClass
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    'mt-1.5 max-w-full whitespace-normal break-words text-center',
                    compact ? 'text-[10px] leading-tight' : 'text-[11px] leading-tight',
                    labelClass
                  )}
                >
                  {stage.label}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
