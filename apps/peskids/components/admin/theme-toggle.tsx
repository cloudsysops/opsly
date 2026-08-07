'use client';

/** Sun/moon as inline SVG, not lucide-react — several lucide icon names
 * (Sun, Moon, and most alternatives) fail to type-check against the
 * lucide-react version pinned in this repo even though they exist at
 * runtime (declaration file only surfaces icons already imported
 * elsewhere in the codebase; see git history for the same issue hit
 * building Mission Control). Inline SVG sidesteps it entirely. */
function SunIcon(props: React.SVGProps<SVGSVGElement>): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon(props: React.SVGProps<SVGSVGElement>): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

export type AdminTheme = 'light' | 'dark';

interface ThemeToggleProps {
  theme: AdminTheme;
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps): React.ReactElement {
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={onToggle}
      className="pk-focus inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-pk-border bg-pk-surface text-pk-sub transition-colors hover:bg-pk-muted"
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
    >
      {isDark ? <SunIcon className="h-4 w-4" aria-hidden /> : <MoonIcon className="h-4 w-4" aria-hidden />}
    </button>
  );
}
