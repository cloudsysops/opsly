import type { PlanKey } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

export function PlanBadge({ plan }: { plan: PlanKey }) {
  const variant =
    plan === 'enterprise'
      ? 'green'
      : plan === 'business'
        ? 'yellow'
        : plan === 'startup'
          ? 'gray'
          : 'gray';
  return <Badge variant={variant}>{plan}</Badge>;
}
