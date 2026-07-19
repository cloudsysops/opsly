'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronDown, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase-browser';

const ALLOWED_ADMIN_EMAIL = 'peskids.admin@gmail.com';

const DASHBOARD_VIEWS = [
  { label: 'Admin', href: '/admin', description: 'Operación diaria, leads y familias.' },
  {
    label: 'Profesores',
    href: '/teacher/dashboard',
    description: 'Agenda, entregas y calificación.',
  },
  {
    label: 'Familias',
    description: 'Requiere cuenta demo de familia para no mezclar permisos.',
    disabled: true,
  },
  {
    label: 'Soporte',
    href: '/support/dashboard',
    description: 'Casos, mensajes y seguimientos.',
  },
] as const;

export function RoleSwitcher(): React.ReactElement | null {
  const [viewSwitcherOpen, setViewSwitcherOpen] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState<boolean | null>(null);

  useEffect(() => {
    const checkUser = async (): Promise<void> => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      setIsAdminUser(data.user?.email === ALLOWED_ADMIN_EMAIL);
    };
    void checkUser();
  }, []);

  if (isAdminUser !== true) return null;

  return (
    <div className="relative">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setViewSwitcherOpen((open) => !open)}
        aria-expanded={viewSwitcherOpen}
        aria-haspopup="menu"
      >
        <Eye className="h-4 w-4" aria-hidden />
        <span className="ml-1 hidden sm:inline">Ver como</span>
        <ChevronDown className="ml-1 h-3.5 w-3.5" aria-hidden />
      </Button>
      {viewSwitcherOpen ? (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setViewSwitcherOpen(false)}
            aria-hidden
          />
          <div
            role="menu"
            className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-2xl border border-pk-border bg-white shadow-card-hover"
          >
            <p className="border-b border-pk-border px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-pk-mutedText">
              Cambiar de panel
            </p>
            {DASHBOARD_VIEWS.map((view) =>
              'href' in view ? (
                <Link
                  key={view.href}
                  href={view.href}
                  role="menuitem"
                  onClick={() => setViewSwitcherOpen(false)}
                  className="block px-4 py-3 text-sm hover:bg-pk-muted"
                >
                  <p className="font-semibold text-pk-ink">{view.label}</p>
                  <p className="text-xs text-pk-mutedText">{view.description}</p>
                </Link>
              ) : (
                <button
                  key={view.label}
                  type="button"
                  role="menuitem"
                  disabled
                  className="block w-full cursor-not-allowed px-4 py-3 text-left text-sm opacity-60"
                >
                  <p className="font-semibold text-pk-ink">{view.label}</p>
                  <p className="text-xs text-pk-mutedText">{view.description}</p>
                </button>
              )
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
