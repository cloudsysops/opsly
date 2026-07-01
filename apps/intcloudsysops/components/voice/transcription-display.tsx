'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface Transcription {
  id: string;
  speakerRole: 'caller' | 'recipient' | 'assistant';
  transcriptText: string;
  confidence?: number;
  createdAt: string;
}

interface TranscriptionDisplayProps {
  callId: string;
  transcriptions: Transcription[];
  isLoading?: boolean;
  className?: string;
}

export function TranscriptionDisplay({
  callId,
  transcriptions,
  isLoading = false,
  className,
}: TranscriptionDisplayProps): React.ReactElement {
  const getSpeakerLabel = (role: string): string => {
    const labels: Record<string, string> = {
      caller: 'Caller',
      recipient: 'Recipient',
      assistant: 'Assistant',
    };
    return labels[role] || role;
  };

  const getConfidenceColor = (confidence?: number): string => {
    if (!confidence) return 'text-pk-sub';
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-lg border border-pk-border bg-pk-muted p-4',
        className
      )}
    >
      <div className="space-y-1">
        <p className="text-sm font-semibold text-pk-text">Call Transcription</p>
        <p className="text-xs text-pk-sub">Call ID: {callId}</p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-pk-sub">
          <div className="h-2 w-2 animate-pulse rounded-full bg-pk-primary" />
          <span>Loading transcription...</span>
        </div>
      ) : transcriptions.length === 0 ? (
        <p className="text-sm text-pk-sub">No transcriptions available yet.</p>
      ) : (
        <div className="space-y-3">
          {transcriptions.map((t) => (
            <div key={t.id} className="space-y-1 rounded-md bg-white p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-pk-primary">
                  {getSpeakerLabel(t.speakerRole)}
                </span>
                {t.confidence !== undefined && (
                  <span
                    className={cn(
                      'text-xs font-medium',
                      getConfidenceColor(t.confidence)
                    )}
                  >
                    {(t.confidence * 100).toFixed(0)}% confidence
                  </span>
                )}
              </div>
              <p className="text-sm text-pk-text">{t.transcriptText}</p>
              <p className="text-xs text-pk-sub">
                {new Date(t.createdAt).toLocaleTimeString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
