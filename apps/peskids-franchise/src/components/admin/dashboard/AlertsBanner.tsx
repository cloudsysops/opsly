"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ExclamationTriangleIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";

interface Alert {
  id: string;
  type: "overdue" | "disputed" | "urgent";
  message: string;
  href: string;
  count?: number;
}

interface AlertsBannerProps {
  alerts: Alert[];
}

export default function AlertsBanner({ alerts }: AlertsBannerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed || alerts.length === 0) {
    return null;
  }

  const highPriorityAlerts = alerts.filter(
    (a) => a.type === "overdue" || a.type === "disputed"
  );

  if (highPriorityAlerts.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl overflow-hidden" role="alert" aria-live="polite">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {highPriorityAlerts.map((alert) => (
              <Link
                key={alert.id}
                href={alert.href}
                className="text-sm font-medium text-red-800 hover:text-red-600 hover:underline"
              >
                {alert.count && alert.count > 1 ? (
                  <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded-md mr-1.5 text-xs font-bold">
                    {alert.count}
                  </span>
                ) : null}
                {alert.message}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {highPriorityAlerts.length > 1 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded hover:bg-red-100 text-red-600"
              aria-label={isExpanded ? "Collapse alerts" : "Expand alerts"}
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <ChevronUpIcon className="h-4 w-4" />
              ) : (
                <ChevronDownIcon className="h-4 w-4" />
              )}
            </button>
          )}
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded hover:bg-red-100 text-red-600"
            aria-label="Dismiss alerts"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
