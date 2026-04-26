import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ops-green disabled:pointer-events-none disabled:opacity-50 font-sans',
  {
    variants: {
      variant: {
        default: 'bg-ops-surface border border-ops-border text-neutral-100 hover:bg-ops-border/40',
        primary: 'bg-ops-green/15 border border-ops-green text-ops-green hover:bg-ops-green/25',
        destructive: 'bg-ops-red/10 border border-ops-red text-ops-red hover:bg-ops-red/20',
        ghost: 'border border-transparent hover:bg-ops-surface',
        link: 'text-ops-green underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-3 py-1',
        sm: 'h-8 px-2 text-xs',
        lg: 'h-10 px-4',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
