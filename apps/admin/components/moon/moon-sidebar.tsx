'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Moon, X } from 'lucide-react';
import { MOON_NAV_SECTIONS, isMoonNavActive } from '@/lib/moon/nav';
import { cn } from '@/lib/utils';

function NavBody({ onNavigate }: { onNavigate?: () => void }): React.ReactElement {
  const pathname = usePathname();
  return (
    <>
      <div className="border-b border-white/10 px-4 py-4">
        <Link
          href="/moon"
          onClick={onNavigate}
          className="flex items-center gap-2 text-slate-50 hover:text-violet-200"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/30">
            <Moon className="h-4 w-4" aria-hidden />
          </span>
          <span>
            <span className="block font-display text-sm font-semibold tracking-tight">Opsly Moon</span>
            <span className="block font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
              Control Center
            </span>
          </span>
        </Link>
      </div>
      <nav className="flex-1 space-y-3 overflow-y-auto p-2 pb-4" aria-label="Opsly Moon">
        {MOON_NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="px-3 pb-1 pt-2 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isMoonNavActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      prefetch={false}
                      onClick={onNavigate}
                      className={cn(
                        'block rounded-lg px-3 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400',
                        active
                          ? 'bg-violet-500/15 text-violet-100 ring-1 ring-violet-400/30'
                          : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-100">
          Sistema operativo · memoria VPS bajo vigilancia
        </p>
      </div>
    </>
  );
}

export function MoonSidebar(): React.ReactElement {
  const [open, setOpen] = useState(false);
  const close = (): void => setOpen(false);

  return (
    <>
      <button
        type="button"
        className="fixed left-3 top-3 z-50 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#0c1424] text-slate-100 md:hidden"
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          aria-label="Cerrar overlay"
          onClick={close}
        />
      ) : null}

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen w-[248px] flex-col border-r border-white/10 bg-[#070d18]/95 backdrop-blur-md transition-transform md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <NavBody onNavigate={close} />
      </aside>
    </>
  );
}
