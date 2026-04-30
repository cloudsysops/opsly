'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  BookOpen,
  Boxes,
  CircleDollarSign,
  LayoutGrid,
  Network,
  Gavel,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Server,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/machines', label: 'Máquinas', icon: Boxes },
  { href: '/tenants', label: 'Tenants', icon: Server },
  { href: '/invitations', label: 'Invitations', icon: Mail },
  { href: '/metrics/llm', label: 'LLM Metrics', icon: BarChart3 },
  { href: '/api-surface', label: 'API Surface', icon: Network },
  { href: '/agents', label: 'Agent Teams', icon: Activity },
  { href: '/agents-team', label: 'Agents Config', icon: Activity },
  { href: '/mission-control/office', label: 'Mission Control', icon: LayoutGrid },
  { href: '/openclaw-governance', label: 'OpenClaw Governance', icon: Gavel },
  { href: '/costs', label: 'Costos', icon: CircleDollarSign },
  { href: '/notebooklm', label: 'NotebookLM', icon: BookOpen },
  { href: '/feedback', label: 'Feedback', icon: MessageSquare },
  { href: '/approval-decisions', label: 'Approval Gate', icon: ShieldCheck },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="holo-border neon-glow fixed left-0 top-0 z-40 flex h-screen w-[240px] flex-col rounded-r-2xl bg-ops-surface/90 backdrop-blur-md">
      <div className="relative border-b border-ops-border px-4 py-4">
        <div className="pointer-events-none absolute inset-0 opacity-15 [background:repeating-linear-gradient(180deg,transparent,transparent_6px,rgba(0,255,255,0.35)_7px)]" />
        <Link
          href="/dashboard"
          className="relative block font-display text-lg font-semibold tracking-[0.16em] text-ops-cyan hover:text-ops-cyan/90"
        >
          Opsly
        </Link>
        <div className="relative mt-1 text-[10px] uppercase tracking-[0.24em] text-ops-magenta">Admin</div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className={cn(
                'cyber-hover flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 font-sans text-sm transition-colors',
                active
                  ? 'holo-border bg-ops-cyan/10 text-ops-cyan shadow-[0_0_20px_rgba(0,255,255,0.25)]'
                  : 'text-neutral-300 hover:bg-ops-purple/10 hover:text-ops-cyan'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', active ? 'animate-neon-flicker text-ops-cyan' : '')} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
