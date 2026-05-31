import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        {...props}
        type={type}
        className={cn(
          'flex h-10 w-full rounded border border-ops-border bg-ops-bg px-3 py-2 font-mono text-sm text-neutral-100 placeholder:text-ops-gray focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ops-green disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
      />
    );
  }
);
Input.displayName = 'Input';

const PasswordInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    const [show, setShow] = React.useState(false);

    const toggle = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setShow(!show);
    };

    return (
      <div className="relative w-full">
        <Input
          {...props}
          ref={ref}
          type={show ? 'text' : 'password'}
          className={cn('pr-10', className)}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-ops-gray hover:text-neutral-100"
          onClick={toggle}
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          title={show ? 'Ocultar' : 'Mostrar'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    );
  }
);
PasswordInput.displayName = 'PasswordInput';

export { Input, PasswordInput };
