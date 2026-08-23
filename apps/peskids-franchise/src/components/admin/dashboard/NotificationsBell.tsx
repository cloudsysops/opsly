"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { BellIcon } from "@heroicons/react/24/outline";
import {
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  ShieldExclamationIcon,
  UserMinusIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface AlertItem {
  id: string;
  type: string;
  label: string;
  count: number;
  href: string;
  priority: "high" | "medium" | "low";
}

interface NotificationsBellProps {
  alerts: Record<string, number>;
  variant?: "light" | "dark";
}

const alertConfig: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    href: string;
    priority: "high" | "medium" | "low";
    colorClass: string;
  }
> = {
  overdueInvoices: {
    icon: DocumentTextIcon,
    label: "Overdue invoices",
    href: "/admin/franchisees/invoices?status=PAYMENT_PENDING",
    priority: "high",
    colorClass: "text-red-500 bg-red-50",
  },
  disputedInvoices: {
    icon: ExclamationTriangleIcon,
    label: "Disputed invoices",
    href: "/admin/franchisees/invoices?status=DISPUTED",
    priority: "high",
    colorClass: "text-red-500 bg-red-50",
  },
  franchisorTodos: {
    icon: ClipboardDocumentCheckIcon,
    label: "Franchisor to-dos",
    href: "/admin/franchisees/todos",
    priority: "medium",
    colorClass: "text-orange-500 bg-orange-50",
  },
  expiringCerts: {
    icon: ShieldExclamationIcon,
    label: "Expiring certifications",
    href: "/admin/franchisees/compliance",
    priority: "medium",
    colorClass: "text-orange-500 bg-orange-50",
  },
  stalledProspects: {
    icon: UserMinusIcon,
    label: "Stalled prospects",
    href: "/admin/crm/prospects?stalled=true",
    priority: "low",
    colorClass: "text-yellow-600 bg-yellow-50",
  },
  failedWorkflows: {
    icon: ExclamationCircleIcon,
    label: "Failed workflows",
    href: "/admin/settings/workflows?status=FAILED",
    priority: "medium",
    colorClass: "text-orange-500 bg-orange-50",
  },
  expiringInsurance: {
    icon: ShieldExclamationIcon,
    label: "Expiring insurance",
    href: "/admin/franchisees/compliance",
    priority: "high",
    colorClass: "text-red-500 bg-red-50",
  },
  expiredInsurance: {
    icon: ShieldExclamationIcon,
    label: "Expired insurance",
    href: "/admin/franchisees/compliance",
    priority: "high",
    colorClass: "text-red-500 bg-red-50",
  },
  missingInsurance: {
    icon: ShieldExclamationIcon,
    label: "Missing insurance",
    href: "/admin/franchisees/compliance",
    priority: "high",
    colorClass: "text-red-500 bg-red-50",
  },
};

export default function NotificationsBell({
  alerts,
  variant = "dark",
}: NotificationsBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const totalAlerts = Object.values(alerts).reduce((a, b) => a + b, 0);

  // Create alert items from the alerts object
  const alertItems: AlertItem[] = Object.entries(alerts)
    .filter(([key, count]) => count > 0 && alertConfig[key])
    .map(([key, count]) => ({
      id: key,
      type: key,
      label: alertConfig[key].label,
      count,
      href: alertConfig[key].href,
      priority: alertConfig[key].priority,
    }))
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-colors ${
          variant === "dark"
            ? "text-white/80 hover:text-white hover:bg-white/10"
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        }`}
        aria-label={`Notifications (${totalAlerts} alerts)`}
      >
        <BellIcon className="h-5 w-5" />
        {totalAlerts > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {totalAlerts > 9 ? "9+" : totalAlerts}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {totalAlerts > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">
                {totalAlerts} item{totalAlerts !== 1 ? "s" : ""} need attention
              </p>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {alertItems.length > 0 ? (
              <div className="py-2">
                {alertItems.map((item) => {
                  const config = alertConfig[item.id];
                  const Icon = config.icon;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                    >
                      <div className={`p-2 rounded-lg ${config.colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {item.label}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.count} {item.count === 1 ? "item" : "items"}
                        </p>
                      </div>
                      <span
                        className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                          item.priority === "high"
                            ? "bg-red-100 text-red-700"
                            : item.priority === "medium"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {item.count}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center">
                <BellIcon className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No notifications</p>
                <p className="text-xs text-gray-400 mt-1">You&apos;re all caught up!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
