"use client";

import { Card, CardContent, CardHeader } from "@/components/shared/Card";

interface KeyInsightsProps {
  insights: string[];
}

export function KeyInsights({ insights }: KeyInsightsProps) {
  if (!insights || insights.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-brand-cyan"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-brand-navy">Key Insights</h2>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {insights.map((insight, index) => (
            <li key={index} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-cyan/10 flex items-center justify-center mt-0.5">
                <span className="text-xs font-medium text-brand-cyan">
                  {index + 1}
                </span>
              </div>
              <p className="text-sm text-gray-700">{insight}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
