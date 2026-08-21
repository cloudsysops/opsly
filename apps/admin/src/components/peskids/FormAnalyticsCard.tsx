'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@intcloudsysops/components';

interface FormAnalyticsMetrics {
  submissionCount: number;
  abandonnmentRate: number;
  avgCompletionTimeSeconds: number;
  errorCount: number;
  uniqueUsers: number;
}

interface FormAnalyticsCardProps {
  formId: string;
  formTitle: string;
  metrics: FormAnalyticsMetrics;
  isLoading?: boolean;
}

export function FormAnalyticsCard({
  formId,
  formTitle,
  metrics,
  isLoading = false,
}: FormAnalyticsCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{formTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-ops-surface" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-ops-surface" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const completionMinutes = Math.round(metrics.avgCompletionTimeSeconds / 60);
  const abandonnmentPercent = Math.round(metrics.abandonnmentRate * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{formTitle}</CardTitle>
        <CardDescription>Form ID: {formId.substring(0, 8)}...</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div>
            <div className="text-xs text-ops-gray">Submissions</div>
            <div className="text-2xl font-bold text-ops-green">{metrics.submissionCount}</div>
          </div>

          <div>
            <div className="text-xs text-ops-gray">Unique Users</div>
            <div className="text-2xl font-bold text-ops-blue">{metrics.uniqueUsers}</div>
          </div>

          <div>
            <div className="text-xs text-ops-gray">Abandonment</div>
            <div
              className={`text-2xl font-bold ${abandonnmentPercent > 30 ? 'text-ops-red' : 'text-ops-yellow'}`}
            >
              {abandonnmentPercent}%
            </div>
          </div>

          <div>
            <div className="text-xs text-ops-gray">Avg Time</div>
            <div className="text-2xl font-bold text-neutral-100">{completionMinutes}m</div>
          </div>

          <div>
            <div className="text-xs text-ops-gray">Errors</div>
            <div
              className={`text-2xl font-bold ${metrics.errorCount > 0 ? 'text-ops-red' : 'text-ops-green'}`}
            >
              {metrics.errorCount}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
