import * as React from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'deep' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-pk-primary text-white shadow-md shadow-pk-primary/30 hover:bg-pk-primary-dark active:scale-[0.99]',
  secondary:
    'border border-pk-border bg-pk-surface text-pk-ink hover:border-pk-primary/40 hover:bg-pk-snow',
  outline:
    'border border-pk-border bg-transparent text-pk-ink hover:border-pk-primary/40 hover:bg-pk-snow',
  ghost: 'text-pk-sub hover:bg-pk-muted hover:text-pk-ink',
  accent:
    'bg-pk-sun text-pk-ink shadow-md shadow-pk-sun/40 hover:brightness-105 active:scale-[0.99]',
  deep: 'bg-pk-deep text-white shadow-md hover:brightness-110',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-xs rounded-lg',
  md: 'h-10 px-5 text-sm rounded-full',
  lg: 'h-12 px-7 text-base rounded-full',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', fullWidth, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-bold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pk-primary/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    />
  )
);
Button.displayName = 'Button';
