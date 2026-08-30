"use client";

import React, { useState } from "react";
import {
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  AcademicCapIcon,
  ShieldCheckIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

interface Tab {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabs: Tab[] = [
  { id: "overview", name: "Overview", icon: BuildingOfficeIcon },
  { id: "financials", name: "Financials", icon: CurrencyDollarIcon },
  { id: "academy", name: "Learning Center", icon: AcademicCapIcon },
  { id: "compliance", name: "Compliance", icon: ShieldCheckIcon },
  { id: "activity", name: "Activity", icon: ClockIcon },
];

interface FranchiseeProfileTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function FranchiseeProfileTabs({
  activeTab,
  onTabChange,
}: FranchiseeProfileTabsProps) {
  return (
    <div className="border-b border-gray-200">
      <div className="-mb-px flex space-x-4 overflow-x-auto" role="tablist" aria-label="Franchisee profile">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              className={`flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-brand-navy text-brand-navy"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
