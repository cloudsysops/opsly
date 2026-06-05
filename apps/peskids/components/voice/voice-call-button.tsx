'use client';

import React, { useState } from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceCallButtonProps {
  tenantId: string;
  recipientContact: string;
  recipientName?: string;
  channel?: 'whatsapp' | 'telegram' | 'web';
  disabled?: boolean;
  className?: string;
  onCallInitiated?: (callId: string) => void;
  onCallEnded?: (callId: string) => void;
  onError?: (error: Error) => void;
}

export function VoiceCallButton({
  tenantId,
  recipientContact,
  recipientName = 'Contact',
  channel = 'web',
  disabled = false,
  className,
  onCallInitiated,
  onCallEnded,
  onError,
}: VoiceCallButtonProps): React.ReactElement {
  const [isCalling, setIsCalling] = useState(false);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);

  const handleInitiateCall = async () => {
    try {
      setIsCalling(true);
      const response = await fetch('/internal/voice/calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_BEARER_TOKEN || ''}`,
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          from: 'peskids-app',
          to: recipientContact,
          channel,
          webhook_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/voice/callbacks`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to initiate call: ${response.statusText}`);
      }

      const data = (await response.json()) as { data?: { id: string } };
      const callId = data.data?.id;
      if (callId) {
        setCurrentCallId(callId);
        onCallInitiated?.(callId);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
      setIsCalling(false);
    }
  };

  const handleEndCall = async () => {
    if (!currentCallId) return;

    try {
      const response = await fetch(`/internal/voice/calls/${currentCallId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_BEARER_TOKEN || ''}`,
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          call_state: 'ended',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to end call: ${response.statusText}`);
      }

      onCallEnded?.(currentCallId);
      setCurrentCallId(null);
      setIsCalling(false);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  };

  return (
    <button
      type="button"
      onClick={isCalling ? handleEndCall : handleInitiateCall}
      disabled={disabled || false}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors',
        isCalling
          ? 'bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300'
          : 'bg-green-500 text-white hover:bg-green-600 disabled:bg-green-300',
        'disabled:cursor-not-allowed',
        className
      )}
      aria-label={isCalling ? `End call with ${recipientName}` : `Call ${recipientName}`}
    >
      {isCalling ? (
        <>
          <PhoneOff className="h-4 w-4" />
          <span>End Call</span>
        </>
      ) : (
        <>
          <Phone className="h-4 w-4" />
          <span>Call {recipientName}</span>
        </>
      )}
    </button>
  );
}
