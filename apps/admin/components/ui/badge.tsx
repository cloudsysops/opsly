import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium font-sans transition-colors',
  {
    variants: {
      variant: {
        default: 'border-ops-border bg-ops-surface text-neutral-300',
        green: 'border-ops-green/50 bg-ops-green/10 text-ops-green',
        yellow: 'border-ops-yellow/50 bg-ops-yellow/10 text-ops-yellow',
        red: 'border-ops-red/50 bg-ops-red/10 text-ops-red',
        gray: 'border-ops-gray/50 bg-ops-gray/10 text-ops-gray',
        blue: 'border-ops-blue/50 bg-ops-blue/10 text-ops-blue',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export type BadgeProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
