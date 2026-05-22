'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@intcloudsysops/components';

interface FormResponse {
  submissionId: string;
  completedAt: string;
  data: Record<string, string | number | boolean | null>;
}

interface FormResponsesProps {
  formId: string;
  tenantSlug: string;
}

export function FormResponses({ formId, tenantSlug }: FormResponsesProps) {
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchResponses = async () => {
      try {
        const response = await fetch(
          `/api/peskids/portal/${tenantSlug}/forms/${formId}/responses`
        );
        if (!response.ok) {
          throw new Error('Failed to load responses');
        }
        const data = await response.json();
        setResponses(data.responses || []);
      } catch (error) {
        console.error('Error loading responses:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResponses();
  }, [formId, tenantSlug]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="py-6">
              <div className="space-y-2 animate-pulse">
                <div className="h-4 w-1/3 rounded bg-ops-surface" />
                <div className="h-4 w-2/3 rounded bg-ops-surface" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (responses.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-neutral-100">No responses yet</p>
          <p className="mt-2 text-sm text-ops-gray">Responses will appear here once submitted</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-neutral-100">Form Responses ({responses.length})</h3>
      </div>
      {responses.map((response) => (
        <Card key={response.submissionId} className="hover:border-ops-border/80">
          <CardHeader>
            <CardTitle className="text-base text-neutral-100">
              Submission #{response.submissionId.slice(0, 8)}
            </CardTitle>
            <CardDescription className="text-ops-gray">
              {new Date(response.completedAt).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(response.data).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-4 border-b border-ops-border/30 pb-3">
                  <span className="text-sm text-ops-gray">{key}</span>
                  <span className="text-sm text-neutral-100">{String(value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
