import { describe, expect, it } from 'vitest';
import {
  deriveWacrmLeadInboxSnapshot,
  countWacrmPendingReplies,
} from '@/lib/integrations/wacrm-inbox-status';

describe('wacrm inbox status', () => {
  it('returns no_conversation when there are no wacrm messages', () => {
    const snapshot = deriveWacrmLeadInboxSnapshot('+573001112233', []);
    expect(snapshot.status).toBe('no_conversation');
    expect(snapshot.isWacrm).toBe(false);
  });

  it('marks pending_reply when latest inbound is unresolved', () => {
    const snapshot = deriveWacrmLeadInboxSnapshot('+573001112233', [
      {
        sender_contact: '573001112233',
        message_text: 'Hola',
        created_at: '2026-06-09T10:00:00.000Z',
        status: 'pending',
        direction: 'inbound',
        external_id: 'wacrm:msg-1',
      },
    ]);
    expect(snapshot.status).toBe('pending_reply');
    expect(snapshot.isWacrm).toBe(true);
  });

  it('counts pending wacrm conversations', () => {
    const pending = countWacrmPendingReplies([
      {
        sender_contact: '573001112233',
        message_text: 'Hola',
        created_at: '2026-06-09T10:00:00.000Z',
        status: 'pending',
        direction: 'inbound',
        external_id: 'wacrm:msg-1',
      },
      {
        sender_contact: '573009998877',
        message_text: 'Respondido',
        created_at: '2026-06-09T09:00:00.000Z',
        status: 'sent',
        direction: 'outbound',
        external_id: 'wacrm:msg-2',
      },
    ]);
    expect(pending).toBe(1);
  });
});
