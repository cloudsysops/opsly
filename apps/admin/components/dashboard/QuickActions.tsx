'use client';

import { useRouter } from 'next/navigation';
import {
  Plus,
  MailPlus,
  CreditCard,
  Settings,
  Users,
  Boxes,
  Network,
  LayoutGrid,
} from 'lucide-react';

const actions = [
  {
    label: 'Nuevo Tenant',
    href: '/tenants?new=true',
    icon: Plus,
    color: 'bg-ops-green/10 text-ops-green hover:bg-ops-green/20',
  },
  {
    label: 'Máquinas',
    href: '/machines',
    icon: Boxes,
    color: 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20',
  },
  {
    label: 'Mission Control',
    href: '/mission-control/office',
    icon: LayoutGrid,
    color: 'bg-fuchsia-500/10 text-fuchsia-300 hover:bg-fuchsia-500/20',
  },
  {
    label: 'Invitar',
    href: '/invitations',
    icon: MailPlus,
    color: 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20',
  },
  {
    label: 'Costos',
    href: '/costs',
    icon: CreditCard,
    color: 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20',
  },
  {
    label: 'Agentes',
    href: '/agents',
    icon: Users,
    color: 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20',
  },
  {
    label: 'API Surface',
    href: '/api-surface',
    icon: Network,
    color: 'bg-sky-500/10 text-sky-300 hover:bg-sky-500/20',
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    color: 'bg-neutral-500/10 text-neutral-400 hover:bg-neutral-500/20',
  },
];

export function QuickActions() {
  const router = useRouter();

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-mono text-xs uppercase tracking-wider text-ops-gray">
          Acciones rápidas
        </h2>
        <p className="font-sans text-[11px] text-ops-gray">Accesos operativos frecuentes</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={() => router.push(action.href)}
              className={`
                flex min-h-[84px] flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 p-3
                text-center transition-all hover:translate-y-[-1px] hover:border-white/20 active:translate-y-[0]
                ${action.color}
              `}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default QuickActions;
