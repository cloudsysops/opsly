import { Call, CallState } from '../types';

interface CallManagerConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

export class CallManager {
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor(config: CallManagerConfig) {
    this.supabaseUrl = config.supabaseUrl;
    this.supabaseKey = config.supabaseKey;
  }

  async createCall(call: Call): Promise<Call> {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/calls`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        id: call.id,
        tenant_id: call.tenantId,
        call_id: call.callId,
        initiator_contact: call.initiatorContact,
        recipient_contact: call.recipientContact,
        channel: call.channel,
        call_state: call.callState,
        started_at: call.startedAt?.toISOString(),
        ended_at: call.endedAt?.toISOString(),
        duration_seconds: call.durationSeconds,
        recording_url: call.recordingUrl,
        recording_id: call.recordingId,
        created_at: call.createdAt.toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create call: ${response.statusText}`);
    }

    return call;
  }

  async getCall(tenantId: string, callId: string): Promise<Call | null> {
    const response = await fetch(
      `${this.supabaseUrl}/rest/v1/calls?call_id=eq.${callId}&tenant_id=eq.${tenantId}`,
      {
        headers: {
          Authorization: `Bearer ${this.supabaseKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch call: ${response.statusText}`);
    }

    const data = (await response.json()) as Array<{
      id: string;
      tenant_id: string;
      call_id: string;
      initiator_contact: string;
      recipient_contact: string;
      channel: string;
      call_state: CallState;
      started_at: string | null;
      ended_at: string | null;
      duration_seconds: number | null;
      recording_url: string | null;
      recording_id: string | null;
      created_at: string;
    }>;

    if (data.length === 0) {
      return null;
    }

    return this.mapDbToCall(data[0]);
  }

  async updateCallState(tenantId: string, callId: string, state: CallState): Promise<Call> {
    const response = await fetch(
      `${this.supabaseUrl}/rest/v1/calls?call_id=eq.${callId}&tenant_id=eq.${tenantId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          call_state: state,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update call state: ${response.statusText}`);
    }

    const data = (await response.json()) as unknown[];
    if (data.length === 0) {
      throw new Error('Call not found');
    }

    return this.mapDbToCall(data[0] as Record<string, unknown>);
  }

  async endCall(
    tenantId: string,
    callId: string,
    durationSeconds: number,
    recordingUrl?: string
  ): Promise<Call> {
    const now = new Date();

    const response = await fetch(
      `${this.supabaseUrl}/rest/v1/calls?call_id=eq.${callId}&tenant_id=eq.${tenantId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          call_state: 'ended',
          ended_at: now.toISOString(),
          duration_seconds: durationSeconds,
          recording_url: recordingUrl,
          updated_at: now.toISOString(),
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to end call: ${response.statusText}`);
    }

    const data = (await response.json()) as unknown[];
    if (data.length === 0) {
      throw new Error('Call not found');
    }

    return this.mapDbToCall(data[0] as Record<string, unknown>);
  }

  async getCallsByTenant(tenantId: string, limit = 50): Promise<Call[]> {
    const response = await fetch(
      `${this.supabaseUrl}/rest/v1/calls?tenant_id=eq.${tenantId}&order=created_at.desc&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${this.supabaseKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch calls: ${response.statusText}`);
    }

    const data = (await response.json()) as Record<string, unknown>[];
    return data.map((item) => this.mapDbToCall(item));
  }

  private mapDbToCall(dbRecord: Record<string, unknown>): Call {
    return {
      id: dbRecord.id as string,
      tenantId: dbRecord.tenant_id as string,
      callId: dbRecord.call_id as string,
      initiatorContact: dbRecord.initiator_contact as string,
      recipientContact: dbRecord.recipient_contact as string,
      channel: dbRecord.channel as 'whatsapp' | 'telegram' | 'web',
      callState: dbRecord.call_state as CallState,
      startedAt: dbRecord.started_at ? new Date(dbRecord.started_at as string) : undefined,
      endedAt: dbRecord.ended_at ? new Date(dbRecord.ended_at as string) : undefined,
      durationSeconds: dbRecord.duration_seconds as number | undefined,
      recordingUrl: dbRecord.recording_url as string | undefined,
      recordingId: dbRecord.recording_id as string | undefined,
      createdAt: new Date(dbRecord.created_at as string),
    };
  }
}
