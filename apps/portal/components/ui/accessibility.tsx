'use client';

import type { ReactElement, ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export function SkipLink(props: {
  href?: string;
  className?: string;
  children?: ReactNode;
}): ReactElement {
  const { href = '#main-content', className, children = 'Saltar al contenido principal' } = props;
  return (
    <a
      href={href}
      className={cn(
        'sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-ops-green focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-ops-bg',
        className
      )}
    >
      {children}
    </a>
  );
}

export function FocusTrap({ children }: { children: ReactNode }): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length === 0) {
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTab = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab') {
        return;
      }

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else if (document.activeElement === lastElement) {
        firstElement?.focus();
        e.preventDefault();
      }
    };

    container.addEventListener('keydown', handleTab);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTab);
    };
  }, []);

  return <div ref={containerRef}>{children}</div>;
}

export function Announcer(props: { message: string; assertive?: boolean }): ReactElement {
  const { message, assertive = false } = props;
  return (
    <div
      role="status"
      aria-live={assertive ? 'assertive' : 'polite'}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

export function VisuallyHidden({ children }: { children: ReactNode }): ReactElement {
  return <span className="sr-only">{children}</span>;
}
