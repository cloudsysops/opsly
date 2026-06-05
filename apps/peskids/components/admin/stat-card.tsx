import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  description?: string;
  value: number | string;
  icon: LucideIcon;
  accent?: 'teal' | 'green' | 'amber' | 'coral' | 'violet' | 'slate';
  sectionId?: string;
  children?: React.ReactNode;
}

const iconTone: Record<NonNullable<StatCardProps['accent']>, string> = {
  teal: 'bg-teal-50 text-pk-primary',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-800',
  coral: 'bg-orange-50 text-pk-accent',
  violet: 'bg-violet-50 text-violet-700',
  slate: 'bg-pk-muted text-pk-sub',
};

export function StatCard({
  title,
  description,
  value,
  icon: Icon,
  accent = 'teal',
  sectionId,
  children,
}: StatCardProps): React.ReactElement {
  return (
    <Card accent={accent} hover className="flex h-full flex-col" data-admin-section={sectionId}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
        </div>
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            iconTone[accent]
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col pt-0">
        <p className="text-4xl font-bold tabular-nums tracking-tight text-pk-ink">{value}</p>
        {children ? (
          <div className="mt-4 flex-1 border-t border-pk-border pt-4">{children}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}
