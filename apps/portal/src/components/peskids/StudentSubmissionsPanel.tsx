'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@intcloudsysops/components';
import { Button } from '@intcloudsysops/components';

interface StudentSubmission {
  submissionId: string;
  studentName: string;
  formTitle: string;
  submittedAt: string;
  status: 'pending_review' | 'reviewed' | 'graded';
  score?: number;
  feedbackProvided: boolean;
}

interface StudentSubmissionsPanelProps {
  tenantSlug: string;
}

export function StudentSubmissionsPanel({ tenantSlug }: StudentSubmissionsPanelProps) {
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('pending');

  useEffect(() => {
    const fetchSubmissions = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/peskids/portal/${tenantSlug}/teacher/submissions?status=${filter}`);
        const data = await response.json();
        setSubmissions(data.submissions);
      } catch (error) {
        console.error('Failed to fetch submissions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmissions();
  }, [tenantSlug, filter]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getStatusColor = (status: StudentSubmission['status']) => {
    switch (status) {
      case 'pending_review':
        return 'bg-ops-yellow/20 text-ops-yellow';
      case 'reviewed':
        return 'bg-ops-blue/20 text-ops-blue';
      case 'graded':
        return 'bg-ops-green/20 text-ops-green';
      default:
        return 'bg-ops-gray/20 text-ops-gray';
    }
  };

  const pendingCount = submissions.filter((s) => s.status === 'pending_review').length;
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(new Set());
  const [isBulkGrading, setIsBulkGrading] = useState(false);
  const [bulkScore, setBulkScore] = useState(75);

  const handleSelectSubmission = (id: string) => {
    const newSelected = new Set(selectedSubmissions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSubmissions(newSelected);
  };

  const handleBulkGrade = async () => {
    if (selectedSubmissions.size === 0) return;

    setIsBulkGrading(true);
    try {
      const response = await fetch(`/api/peskids/portal/${tenantSlug}/submissions/bulk-grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionIds: Array.from(selectedSubmissions),
          score: bulkScore,
        }),
      });

      if (!response.ok) throw new Error('Failed to grade submissions');

      setSelectedSubmissions(new Set());
      // Refresh submissions
      setFilter('pending');
    } catch (error) {
      console.error('Error bulk grading:', error);
    } finally {
      setIsBulkGrading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(
        `/api/peskids/portal/${tenantSlug}/forms/${filter}/export?format=csv`
      );
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'submissions.csv';
      a.click();
    } catch (error) {
      console.error('Error exporting:', error);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-100">Student Submissions</h2>
          <p className="mt-1 text-sm text-ops-gray">Review and grade student work</p>
        </div>
        <Button
          onClick={handleExport}
          variant="outline"
          className="border-ops-border text-ops-blue hover:bg-ops-surface"
        >
          📥 Export as CSV
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-ops-border">
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 text-sm font-medium transition ${
            filter === 'pending'
              ? 'border-b-2 border-ops-blue text-ops-blue'
              : 'text-ops-gray hover:text-neutral-200'
          }`}
        >
          Pending Review ({pendingCount})
        </button>
        <button
          onClick={() => setFilter('reviewed')}
          className={`px-4 py-2 text-sm font-medium transition ${
            filter === 'reviewed'
              ? 'border-b-2 border-ops-blue text-ops-blue'
              : 'text-ops-gray hover:text-neutral-200'
          }`}
        >
          Reviewed
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-medium transition ${
            filter === 'all'
              ? 'border-b-2 border-ops-blue text-ops-blue'
              : 'text-ops-gray hover:text-neutral-200'
          }`}
        >
          All
        </button>
      </div>

      {/* Submissions List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <div className="space-y-2">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-ops-surface" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-ops-surface" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mb-4 text-4xl">✅</div>
            <p className="font-medium text-neutral-100">All caught up!</p>
            <p className="mt-2 text-sm text-ops-gray">No {filter !== 'all' ? filter + ' ' : ''}submissions to review</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {submissions.map((submission) => (
            <Card
              key={submission.submissionId}
              className={`cursor-pointer hover:border-ops-border/80 ${
                selectedSubmissions.has(submission.submissionId) ? 'border-ops-blue bg-ops-surface/50' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <input
                    type="checkbox"
                    checked={selectedSubmissions.has(submission.submissionId)}
                    onChange={() => handleSelectSubmission(submission.submissionId)}
                    className="mr-4 h-4 w-4 rounded border-ops-border bg-ops-surface text-ops-blue"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-semibold text-neutral-100">{submission.studentName}</p>
                        <p className="text-sm text-ops-gray">{submission.formTitle}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(submission.status)}`}
                      >
                        {submission.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-ops-gray">{formatDate(submission.submittedAt)}</span>
                      {submission.score !== undefined && (
                        <span className="text-sm font-semibold text-neutral-100">Score: {submission.score}%</span>
                      )}
                      {submission.feedbackProvided && (
                        <span className="text-xs text-ops-green">📝 Feedback provided</span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col gap-2">
                    <Button size="sm" className="bg-ops-blue hover:bg-ops-blue/90">
                      {submission.status === 'pending_review' ? 'Review' : 'View'}
                    </Button>
                    {submission.status !== 'graded' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-ops-border text-ops-green hover:bg-ops-surface"
                      >
                        Grade
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Bulk Actions */}
      {(selectedSubmissions.size > 0 || (submissions.length > 0 && filter === 'pending')) && (
        <Card className="border-ops-blue/30 bg-ops-surface/50">
          <CardContent className="py-4">
            {selectedSubmissions.size > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-ops-blue">
                  {selectedSubmissions.size} submission{selectedSubmissions.size !== 1 ? 's' : ''} selected
                </p>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-ops-gray">Score (0-100):</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={bulkScore}
                    onChange={(e) => setBulkScore(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm font-semibold text-neutral-100">{bulkScore}%</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleBulkGrade}
                    disabled={isBulkGrading}
                    className="flex-1 bg-ops-green hover:bg-ops-green/90 disabled:opacity-50"
                  >
                    {isBulkGrading ? 'Grading...' : 'Grade Selected'}
                  </Button>
                  <Button
                    onClick={() => setSelectedSubmissions(new Set())}
                    variant="outline"
                    className="border-ops-border text-ops-gray hover:bg-ops-surface"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-ops-gray">
                  💡 {pendingCount} submission{pendingCount !== 1 ? 's' : ''} awaiting review
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
