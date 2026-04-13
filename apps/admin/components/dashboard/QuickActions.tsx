"use client";

import { useRouter } from "next/navigation";
import {
  Plus,
  MailPlus,
  CreditCard,
  Settings,
  RefreshCw,
  Users,
  TrendingUp,
  Shield,
} from "lucide-react";

const actions = [
  {
    label: "Nuevo Tenant",
    href: "/tenants?new=true",
    icon: Plus,
    color: "bg-ops-green/10 text-ops-green hover:bg-ops-green/20",
  },
  {
    label: "Invitar",
    href: "/invitations",
    icon: MailPlus,
    color: "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20",
  },
  {
    label: "Costos",
    href: "/costs",
    icon: CreditCard,
    color: "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20",
  },
  {
    label: "Teams",
    href: "/agents",
    icon: Users,
    color: "bg-purple-500/10 text-purple-400 hover:bg-purple-500/20",
  },
  {
    label: "Insights",
    href: "/insights",
    icon: TrendingUp,
    color: "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    color: "bg-neutral-500/10 text-neutral-400 hover:bg-neutral-500/20",
  },
];

export function QuickActions() {
  const router = useRouter();

  return (
    <div className="space-y-3">
      <h2 className="font-mono text-xs uppercase tracking-wider text-ops-gray">
        Acciones rápidas
      </h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={() => router.push(action.href)}
              className={`
                flex flex-col items-center justify-center gap-1.5 rounded-lg border border-white/10 p-3
                transition-all hover:scale-[1.02] active:scale-[0.98]
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