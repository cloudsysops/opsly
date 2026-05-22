'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@intcloudsysops/components';
import { Button } from '@intcloudsysops/components';

interface FormMetadata {
  formId: string;
  formTitle: string;
  description?: string;
  submissionCount: number;
  lastSubmissionAt?: string;
  status: 'active' | 'archived';
}

interface MyFormsPanelProps {
  tenantSlug: string;
}

export function MyFormsPanel({ tenantSlug }: MyFormsPanelProps) {
  const [forms, setForms] = useState<FormMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchForms = async () => {
      setIsLoading(true);
      try {
        // TODO: Fetch from API endpoint
        // const response = await fetch(`/api/portal/peskids/${tenantSlug}/forms`);
        // const data = await response.json();
        // setForms(data.forms);

        // Mock data for now
        setForms([
          {
            formId: 'form_001',
            formTitle: 'Lead Capture Form',
            description: 'Collect basic information about new prospects',
            submissionCount: 156,
            lastSubmissionAt: new Date(Date.now() - 3600000).toISOString(),
            status: 'active',
          },
          {
            formId: 'form_002',
            formTitle: 'Parent Feedback Survey',
            description: 'Quarterly feedback from parents and guardians',
            submissionCount: 89,
            lastSubmissionAt: new Date(Date.now() - 172800000).toISOString(),
            status: 'active',
          },
        ]);
      } catch (error) {
        console.error('Failed to fetch forms:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchForms();
  }, [tenantSlug]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-100">My Forms</h2>
          <p className="mt-1 text-sm text-ops-gray">Manage and track your active forms</p>
        </div>
        <Button className="bg-ops-green hover:bg-ops-green/90">+ Create New Form</Button>
      </div>

      {/* Forms List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="py-8">
                <div className="space-y-3">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-ops-surface" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-ops-surface" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : forms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mb-4 text-4xl">📝</div>
            <p className="font-medium text-neutral-100">No forms yet</p>
            <p className="mt-2 text-sm text-ops-gray">Create your first form to start collecting responses</p>
            <Button className="mt-6 bg-ops-green hover:bg-ops-green/90">Create Your First Form</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {forms.map((form) => (
            <Card key={form.formId} className="hover:border-ops-border/80">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-neutral-100">{form.formTitle}</h3>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          form.status === 'active'
                            ? 'bg-ops-green/20 text-ops-green'
                            : 'bg-ops-gray/20 text-ops-gray'
                        }`}
                      >
                        {form.status}
                      </span>
                    </div>
                    {form.description && (
                      <p className="mt-2 text-sm text-ops-gray">{form.description}</p>
                    )}
                    <div className="mt-4 flex gap-6 text-sm">
                      <div>
                        <span className="text-ops-gray">Submissions: </span>
                        <span className="font-semibold text-neutral-100">{form.submissionCount}</span>
                      </div>
                      <div>
                        <span className="text-ops-gray">Last submission: </span>
                        <span className="font-semibold text-neutral-100">
                          {formatDate(form.lastSubmissionAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="ml-6 flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-ops-border text-ops-blue hover:bg-ops-surface"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-ops-border text-ops-blue hover:bg-ops-surface"
                    >
                      Responses
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
