'use client';

import { useState, useEffect, useRef } from 'react';
import {
  TrophyIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  AcademicCapIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';

interface LeaderboardEntry {
  id: string;
  rank: number;
  previousRank?: number;
  name: string;
  territory: string;
  revenue: number;
  growth: number;
  lessons: number;
  isYou?: boolean;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  metric?: 'revenue' | 'growth' | 'lessons';
  showTop?: number;
}

const metricConfig = {
  revenue: {
    label: 'Revenue',
    icon: ChartBarIcon,
    format: (value: number) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value),
    color: 'text-brand-navy',
  },
  growth: {
    label: 'Growth',
    icon: ArrowTrendingUpIcon,
    format: (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`,
    color: 'text-emerald-600',
  },
  lessons: {
    label: 'Lessons',
    icon: AcademicCapIcon,
    format: (value: number) => value.toLocaleString(),
    color: 'text-brand-purple',
  },
};

function RankBadge({ rank, animate = false }: { rank: number; animate?: boolean }) {
  const baseClasses = 'inline-flex items-center justify-center w-10 h-10 rounded-full font-display font-bold text-sm';

  if (rank === 1) {
    return (
      <div
        className={`${baseClasses} relative`}
        style={{
          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
          boxShadow: animate ? '0 4px 20px rgb(245 158 11 / 0.5)' : '0 4px 12px rgb(245 158 11 / 0.4)',
        }}
      >
        <span className="text-amber-900">1</span>
        {animate && (
          <div className="absolute inset-0 rounded-full animate-shimmer" />
        )}
      </div>
    );
  }

  if (rank === 2) {
    return (
      <div
        className={baseClasses}
        style={{
          background: 'linear-gradient(135deg, #e5e7eb 0%, #9ca3af 100%)',
          boxShadow: '0 4px 12px rgb(156 163 175 / 0.4)',
        }}
      >
        <span className="text-gray-700">2</span>
      </div>
    );
  }

  if (rank === 3) {
    return (
      <div
        className={baseClasses}
        style={{
          background: 'linear-gradient(135deg, #fcd7a8 0%, #d97706 100%)',
          boxShadow: '0 4px 12px rgb(217 119 6 / 0.4)',
        }}
      >
        <span className="text-amber-900">3</span>
      </div>
    );
  }

  return (
    <div className={`${baseClasses} bg-gray-100 text-gray-600`}>
      {rank}
    </div>
  );
}

function RankChange({ current, previous }: { current: number; previous?: number }) {
  if (previous === undefined || current === previous) {
    return <span className="text-xs text-gray-400">—</span>;
  }

  const change = previous - current;

  if (change > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
        <ArrowTrendingUpIcon className="w-3 h-3" />
        +{change}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-red-600">
      <ArrowTrendingUpIcon className="w-3 h-3 rotate-180" />
      {change}
    </span>
  );
}

export default function Leaderboard({
  entries,
  currentUserId,
  metric = 'revenue',
  showTop = 10,
}: LeaderboardProps) {
  const [activeMetric, setActiveMetric] = useState(metric);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Sort entries by active metric
  const sortedEntries = [...entries]
    .sort((a, b) => {
      const aValue = a[activeMetric];
      const bValue = b[activeMetric];
      return (bValue as number) - (aValue as number);
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }))
    .slice(0, showTop);

  const yourEntry = sortedEntries.find((e) => e.id === currentUserId || e.isYou);
  const yourPosition = yourEntry?.rank || 0;
  const config = metricConfig[activeMetric];
  const MetricIcon = config.icon;

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Header with metric selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50">
            <TrophyIcon className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="font-display text-xl font-bold text-gray-900">
              Network Leaderboard
            </h3>
            <p className="text-sm text-gray-500">
              See how you rank against other franchisees
            </p>
          </div>
        </div>

        {/* Metric Toggle */}
        <div className="flex rounded-xl bg-gray-100 p-1">
          {(Object.keys(metricConfig) as Array<keyof typeof metricConfig>).map((key) => {
            const Icon = metricConfig[key].icon;
            return (
              <button
                key={key}
                onClick={() => setActiveMetric(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeMetric === key
                    ? 'bg-white text-brand-navy shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{metricConfig[key].label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Your Position Card (if you're in top 10) */}
      {yourEntry && yourPosition <= 3 && (
        <div
          className="fp-card p-6 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(45, 47, 142, 0.05) 0%, rgba(106, 70, 157, 0.05) 100%)',
          }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
            <SparklesIcon className="w-full h-full text-amber-500" />
          </div>
          <div className="flex items-center gap-4">
            <RankBadge rank={yourPosition} animate />
            <div>
              <p className="text-sm font-medium text-gray-600">Your Current Rank</p>
              <p className="font-display text-2xl font-bold text-brand-navy">
                {yourPosition === 1 && 'You\'re #1!'}
                {yourPosition === 2 && 'Silver Position!'}
                {yourPosition === 3 && 'Bronze Position!'}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm font-medium text-gray-600">{config.label}</p>
              <p className={`font-display text-2xl font-bold ${config.color}`}>
                {config.format(yourEntry[activeMetric] as number)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="fp-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Franchisee
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {config.label}
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Change
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedEntries.map((entry, index) => {
                const isYou = entry.id === currentUserId || entry.isYou;
                return (
                  <tr
                    key={entry.id}
                    className={`transition-all ${
                      isYou
                        ? 'bg-gradient-to-r from-brand-navy/5 to-brand-purple/5'
                        : 'hover:bg-gray-50'
                    }`}
                    style={{
                      opacity: isVisible ? 1 : 0,
                      transform: isVisible ? 'translateX(0)' : 'translateX(-20px)',
                      transition: `opacity 0.4s ease ${index * 0.05}s, transform 0.4s ease ${index * 0.05}s`,
                    }}
                  >
                    <td className="px-4 py-4">
                      <RankBadge rank={entry.rank} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className={`font-medium ${isYou ? 'text-brand-navy' : 'text-gray-900'}`}>
                            {entry.name}
                            {isYou && (
                              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-navy/10 text-brand-navy text-xs font-semibold">
                                <StarIcon className="w-3 h-3" />
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-500">{entry.territory}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`px-4 py-4 text-right font-display font-bold ${config.color}`}>
                      {config.format(entry[activeMetric] as number)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <RankChange current={entry.rank} previous={entry.previousRank} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Your Position (if not in top 10) */}
      {yourEntry && yourPosition > showTop && (
        <div className="fp-card p-4 border-2 border-brand-navy/20">
          <div className="flex items-center gap-4">
            <RankBadge rank={yourPosition} />
            <div className="flex-1">
              <p className="font-medium text-gray-900">
                {yourEntry.name}
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-navy/10 text-brand-navy text-xs font-semibold">
                  <StarIcon className="w-3 h-3" />
                  You
                </span>
              </p>
              <p className="text-sm text-gray-500">{yourEntry.territory}</p>
            </div>
            <div className="text-right">
              <p className={`font-display text-xl font-bold ${config.color}`}>
                {config.format(yourEntry[activeMetric] as number)}
              </p>
              <RankChange current={yourPosition} previous={yourEntry.previousRank} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
