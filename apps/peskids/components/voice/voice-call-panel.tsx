'use client';

import React, { useEffect, useState } from 'react';
import { PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceCallPanelProps {
  callId: string;
  recipientName: string;
  recipientContact: string;
  isActive: boolean;
  className?: string;
  onCallEnd?: () => void;
  onError?: (error: Error) => void;
}

export function VoiceCallPanel({
  callId,
  recipientName,
  recipientContact,
  isActive,
  className,
  onCallEnd,
  onError,
}: VoiceCallPanelProps): React.ReactElement {
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callState, setCallState] = useState<string>('connecting');

  useEffect(() => {
    if (!isActive) return;

    const timer = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = async () => {
    try {
      const response = await fetch(`/api/voice/calls/${callId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          call_state: 'ended',
          duration_seconds: duration,
        }),
      });

      if (!response.ok) throw new Error('Failed to end call');
      onCallEnd?.();
      setCallState('ended');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  };

  if (!isActive) return <div />;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-6 rounded-2xl bg-pk-primary p-8 text-white',
        className
      )}
    >
      <div className="text-center">
        <p className="text-lg font-bold">{recipientName}</p>
        <p className="text-sm opacity-75">{recipientContact}</p>
      </div>

      <div className="text-4xl font-mono font-bold">{formatDuration(duration)}</div>

      <div className="text-sm font-medium capitalize">{callState}</div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => setIsMuted(!isMuted)}
          className={cn(
            'rounded-full p-3 transition-colors',
            isMuted
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-white/20 hover:bg-white/30'
          )}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <MicOff className="h-6 w-6" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setIsSpeakerOn(!isSpeakerOn)}
          className={cn(
            'rounded-full p-3 transition-colors',
            isSpeakerOn
              ? 'bg-white/20 hover:bg-white/30'
              : 'bg-red-500 hover:bg-red-600'
          )}
          aria-label={isSpeakerOn ? 'Speaker on' : 'Speaker off'}
        >
          {isSpeakerOn ? (
            <Volume2 className="h-6 w-6" />
          ) : (
            <VolumeX className="h-6 w-6" />
          )}
        </button>

        <button
          type="button"
          onClick={handleEndCall}
          className="rounded-full bg-red-500 p-3 hover:bg-red-600 transition-colors"
          aria-label="End call"
        >
          <PhoneOff className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
