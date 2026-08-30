"use client";

import Link from "next/link";
import {
  ViewColumnsIcon,
  DocumentPlusIcon,
  ArrowPathIcon,
  ChartBarIcon,
  UserPlusIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";

interface QuickAction {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: "primary" | "secondary" | "outline";
}

const quickActions: QuickAction[] = [
  {
    id: "pipeline",
    label: "Pipeline Board",
    href: "/admin/crm/pipeline",
    icon: ViewColumnsIcon,
    variant: "primary",
  },
  {
    id: "invoice",
    label: "Generate Invoice",
    href: "/admin/franchisees/invoices/new",
    icon: DocumentPlusIcon,
    variant: "secondary",
  },
  {
    id: "sync",
    label: "Sync TutorCruncher",
    href: "/admin/franchisees/financials?sync=true",
    icon: ArrowPathIcon,
    variant: "secondary",
  },
  {
    id: "analytics",
    label: "View Analytics",
    href: "/admin/crm/analytics",
    icon: ChartBarIcon,
    variant: "outline",
  },
  {
    id: "prospect",
    label: "Add Prospect",
    href: "/admin/crm/prospects/new",
    icon: UserPlusIcon,
    variant: "outline",
  },
  {
    id: "email",
    label: "Email Templates",
    href: "/admin/crm/email-templates",
    icon: EnvelopeIcon,
    variant: "outline",
  },
];

const variantStyles = {
  primary:
    "bg-brand-navy text-white hover:bg-brand-purple shadow-sm",
  secondary:
    "bg-brand-cyan/10 text-brand-navy hover:bg-brand-cyan/20 border border-brand-cyan/20",
  outline:
    "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200",
};

export default function QuickActionsPanel() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {quickActions.map((action) => (
        <Link
          key={action.id}
          href={action.href}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${variantStyles[action.variant]}`}
        >
          <action.icon className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{action.label}</span>
        </Link>
      ))}
    </div>
  );
}
