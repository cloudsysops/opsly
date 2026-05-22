'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@intcloudsysops/components';
import { FormAnalyticsCard } from './FormAnalyticsCard';

interface FormAnalytics {
  formId: string;
  formTitle: string;
  submissionCount: number;
  abandonnmentRate: number;
  avgCompletionTimeSeconds: number;
  errorCount: number;
  uniqueUsers: number;
  lastSubmissionAt?: string;
}

interface FormsDashboardProps {
  tenantSlug: string;
}

export function FormsDashboard({ tenantSlug }: FormsDashboardProps) {
  const [forms, setForms] = useState<FormAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    totalForms: 0,
    avgCompletionTime: 0,
    totalErrors: 0,
  });

  useEffect(() => {
    const fetchFormAnalytics = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/peskids/admin/${tenantSlug}/forms/analytics`);
        const data = await response.json();
        setForms(data.forms);
        setStats(data.stats);
      } catch (error) {
        console.error('Failed to fetch form analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFormAnalytics();
  }, [tenantSlug]);

  return (
    <div className="w-full space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-ops-gray">Total Submissions</div>
            <div className="mt-2 text-3xl font-bold text-ops-green">{stats.totalSubmissions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-ops-gray">Active Forms</div>
            <div className="mt-2 text-3xl font-bold text-ops-blue">{stats.totalForms}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-ops-gray">Avg Completion</div>
            <div className="mt-2 text-3xl font-bold text-neutral-100">
              {Math.round(stats.avgCompletionTime / 60)}m
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-ops-gray">Total Errors</div>
            <div className={`mt-2 text-3xl font-bold ${stats.totalErrors > 0 ? 'text-ops-red' : 'text-ops-green'}`}>
              {stats.totalErrors}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forms Analytics List */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-100">Form Performance</h2>
        <div className="space-y-4">
          {isLoading ? (
            <>
              <FormAnalyticsCard formId="" formTitle="" metrics={{} as any} isLoading={true} />
              <FormAnalyticsCard formId="" formTitle="" metrics={{} as any} isLoading={true} />
              <FormAnalyticsCard formId="" formTitle="" metrics={{} as any} isLoading={true} />
            </>
          ) : forms.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-ops-gray">No forms found. Create your first form to see analytics.</p>
              </CardContent>
            </Card>
          ) : (
            forms.map((form) => (
              <FormAnalyticsCard
                key={form.formId}
                formId={form.formId}
                formTitle={form.formTitle}
                metrics={{
                  submissionCount: form.submissionCount,
                  abandonnmentRate: form.abandonnmentRate,
                  avgCompletionTimeSeconds: form.avgCompletionTimeSeconds,
                  errorCount: form.errorCount,
                  uniqueUsers: form.uniqueUsers,
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Error Log Section */}
      {stats.totalErrors > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Form Errors</CardTitle>
            <CardDescription>Last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-ops-gray">
              <div className="flex justify-between">
                <span>Lead Capture Form - Field validation error</span>
                <span className="text-xs">2 hours ago</span>
              </div>
              <div className="flex justify-between">
                <span>Lead Capture Form - Submission timeout</span>
                <span className="text-xs">5 hours ago</span>
              </div>
              <div className="flex justify-between">
                <span>Parent Feedback Survey - File upload failed</span>
                <span className="text-xs">12 hours ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
