'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronDown, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase-browser';
import { isOperationalStaffUser } from '@/lib/staff-user';

const DASHBOARD_VIEWS = [
  { label: 'Admin', href: '/admin', description: 'Operación diaria, interesados y familias.' },
  {
    label: 'Profesores',
    href: '/teacher/dashboard',
    description: 'Agenda, entregas y calificación.',
  },
  {
    label: 'Soporte',
    href: '/support/dashboard',
    description: 'Casos, mensajes y seguimientos.',
  },
  {
    label: 'Familia (preview)',
    href: '/admin/preview/family',
    description: 'Vista de solo lectura. No entra a /familias ni cambia tu rol.',
  },
] as const;

export function RoleSwitcher(): React.ReactElement | null {
  const [viewSwitcherOpen, setViewSwitcherOpen] = useState(false);
  const [canSwitchViews, setCanSwitchViews] = useState<boolean | null>(null);

  useEffect(() => {
    const checkUser = async (): Promise<void> => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      setCanSwitchViews(user ? isOperationalStaffUser(user) : false);
    };
    void checkUser();
  }, []);

  if (canSwitchViews !== true) return null;

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
            {DASHBOARD_VIEWS.map((view) => (
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
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
