"use client";

import {
  UserGroupIcon,
  StarIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";

interface PipelineStats {
  total: number;
  avgScore: number;
  staleCount: number;
  conversionRate: number;
}

interface PipelineSummaryBarProps {
  stats: PipelineStats;
}

export function PipelineSummaryBar({ stats }: PipelineSummaryBarProps) {
  const cards = [
    {
      label: "Total Prospects",
      value: stats.total,
      icon: UserGroupIcon,
      borderColor: "border-emerald-500",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "Avg Score",
      value: stats.avgScore,
      icon: StarIcon,
      borderColor: "border-amber-500",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      label: "Stale (30d+)",
      value: stats.staleCount,
      icon: ClockIcon,
      borderColor: "border-red-500",
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
    },
    {
      label: "Funnel Conversion",
      value: `${stats.conversionRate}%`,
      icon: ArrowTrendingUpIcon,
      borderColor: "border-purple-500",
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`bg-white rounded-xl shadow-sm border-l-4 ${card.borderColor} px-4 py-3`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${card.iconBg}`}>
              <card.icon className={`w-5 h-5 ${card.iconColor}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-lg font-bold text-brand-navy">{card.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
