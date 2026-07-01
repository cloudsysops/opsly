'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

export interface VoiceCall {
  id: string;
  tenantId: string;
  callId: string;
  initiatorContact: string;
  recipientContact: string;
  channel: 'whatsapp' | 'telegram' | 'web';
  callState: 'ringing' | 'connected' | 'hold' | 'ended' | 'failed';
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  recordingUrl?: string;
  createdAt: string;
}

export interface VoiceTranscription {
  id: string;
  tenantId: string;
  callId: string;
  speakerRole: 'caller' | 'recipient' | 'assistant';
  transcriptText: string;
  confidence?: number;
  createdAt: string;
}

interface UseVoiceCallOptions {
  tenantId: string;
  callId: string;
  onStateChange?: (state: VoiceCall) => void;
  onTranscriptionReceived?: (transcription: VoiceTranscription) => void;
  onError?: (error: Error) => void;
}

export function useVoiceCall({
  tenantId,
  callId,
  onStateChange,
  onTranscriptionReceived,
  onError,
}: UseVoiceCallOptions) {
  const [supabase] = useState(() => createClient());
  const [callState, setCallState] = useState<VoiceCall | null>(null);
  const [transcriptions, setTranscriptions] = useState<VoiceTranscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!callId || !tenantId) return;

    const callSubscription = supabase
      .channel(`calls:${callId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'calls', filter: `id=eq.${callId}` },
        (payload: { new: Record<string, unknown> }) => {
          const updatedCall = mapDbToCall(payload.new);
          setCallState(updatedCall);
          onStateChange?.(updatedCall);
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          setIsLoading(false);
        } else if (status === 'CHANNEL_ERROR') {
          const error = new Error('Failed to subscribe to call updates');
          onError?.(error);
        }
      });

    const transcriptionSubscription = supabase
      .channel(`transcriptions:${callId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'voice_transcriptions', filter: `call_id=eq.${callId}` },
        (payload: { new: Record<string, unknown> }) => {
          const transcription = mapDbToTranscription(payload.new);
          setTranscriptions((prev) => [...prev, transcription]);
          onTranscriptionReceived?.(transcription);
        }
      )
      .subscribe();

    return () => {
      callSubscription.unsubscribe();
      transcriptionSubscription.unsubscribe();
    };
  }, [supabase, callId, tenantId, onStateChange, onTranscriptionReceived, onError]);

  const fetchCallDetails = useCallback(async () => {
    if (!callId || !tenantId) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .eq('id', callId)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;
      if (data) {
        const call = mapDbToCall(data as Record<string, unknown>);
        setCallState(call);
        onStateChange?.(call);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, callId, tenantId, onStateChange, onError]);

  const fetchTranscriptions = useCallback(async () => {
    if (!callId || !tenantId) return;

    try {
      const { data, error } = await supabase
        .from('voice_transcriptions')
        .select('*')
        .eq('call_id', callId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) {
        setTranscriptions(data.map((row) => mapDbToTranscription(row as Record<string, unknown>)));
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    }
  }, [supabase, callId, tenantId, onError]);

  useEffect(() => {
    fetchCallDetails();
    fetchTranscriptions();
  }, [fetchCallDetails, fetchTranscriptions]);

  return {
    callState,
    transcriptions,
    isLoading,
    refetch: {
      callDetails: fetchCallDetails,
      transcriptions: fetchTranscriptions,
    },
  };
}

function mapDbToCall(dbRecord: Record<string, unknown>): VoiceCall {
  return {
    id: dbRecord.id as string,
    tenantId: dbRecord.tenant_id as string,
    callId: dbRecord.call_id as string,
    initiatorContact: dbRecord.initiator_contact as string,
    recipientContact: dbRecord.recipient_contact as string,
    channel: dbRecord.channel as 'whatsapp' | 'telegram' | 'web',
    callState: dbRecord.call_state as
      | 'ringing'
      | 'connected'
      | 'hold'
      | 'ended'
      | 'failed',
    startedAt: dbRecord.started_at as string | undefined,
    endedAt: dbRecord.ended_at as string | undefined,
    durationSeconds: dbRecord.duration_seconds as number | undefined,
    recordingUrl: dbRecord.recording_url as string | undefined,
    createdAt: dbRecord.created_at as string,
  };
}

function mapDbToTranscription(
  dbRecord: Record<string, unknown>
): VoiceTranscription {
  return {
    id: dbRecord.id as string,
    tenantId: dbRecord.tenant_id as string,
    callId: dbRecord.call_id as string,
    speakerRole: dbRecord.speaker_role as
      | 'caller'
      | 'recipient'
      | 'assistant',
    transcriptText: dbRecord.transcript_text as string,
    confidence: dbRecord.confidence as number | undefined,
    createdAt: dbRecord.created_at as string,
  };
}
