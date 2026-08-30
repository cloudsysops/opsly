"use client";

import Link from "next/link";
import {
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  ShieldExclamationIcon,
  UserMinusIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface ActionItem {
  id: string;
  title: string;
  count: number;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  bgClass: string;
}

interface ActionItemsGridProps {
  alerts: {
    franchisorTodos: number;
    overdueInvoices: number;
    expiringCerts: number;
    stalledProspects: number;
  };
}

export default function ActionItemsGrid({ alerts }: ActionItemsGridProps) {
  const items: ActionItem[] = [
    {
      id: "todos",
      title: "Franchisor To-Dos",
      count: alerts.franchisorTodos,
      href: "/admin/franchisees/todos",
      icon: ClipboardDocumentCheckIcon,
      colorClass: "text-brand-purple",
      bgClass: "bg-brand-purple/10",
    },
    {
      id: "overdue",
      title: "Overdue Invoices",
      count: alerts.overdueInvoices,
      href: "/admin/franchisees/invoices?status=PAYMENT_PENDING",
      icon: DocumentTextIcon,
      colorClass: "text-red-600",
      bgClass: "bg-red-50",
    },
    {
      id: "certs",
      title: "Expiring Certs",
      count: alerts.expiringCerts,
      href: "/admin/franchisees/compliance",
      icon: ShieldExclamationIcon,
      colorClass: "text-orange-600",
      bgClass: "bg-orange-50",
    },
    {
      id: "stalled",
      title: "Stalled Prospects",
      count: alerts.stalledProspects,
      href: "/admin/crm/prospects?stalled=true",
      icon: UserMinusIcon,
      colorClass: "text-yellow-600",
      bgClass: "bg-yellow-50",
    },
  ];

  const activeItems = items.filter((item) => item.count > 0);
  const hasAnyItems = activeItems.length > 0;

  // If no items need attention, show compact inline indicator
  if (!hasAnyItems) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircleIcon className="h-4 w-4 text-green-600" />
        <span className="text-sm text-green-700 font-medium">All caught up</span>
      </div>
    );
  }

  // Only show items with counts > 0
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {activeItems.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className="relative p-4 rounded-xl border border-gray-200 hover:border-gray-300 bg-white transition-all hover:shadow-md group"
        >
          <div className="flex items-start justify-between mb-2">
            <div className={`p-2 rounded-lg ${item.bgClass}`}>
              <item.icon className={`h-5 w-5 ${item.colorClass}`} />
            </div>
            <span
              className={`px-2 py-0.5 text-xs font-bold rounded-full ${item.bgClass} ${item.colorClass}`}
            >
              {item.count}
            </span>
          </div>
          <h4 className="text-sm font-medium text-gray-900">
            {item.title}
          </h4>
          <p className="text-xs text-gray-500 mt-0.5 group-hover:text-brand-purple">
            View all &rarr;
          </p>
        </Link>
      ))}
    </div>
  );
}
