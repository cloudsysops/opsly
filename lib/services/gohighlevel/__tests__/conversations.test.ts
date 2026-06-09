import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GoHighLevelClient } from '../client.js';

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('GoHighLevelClient conversations', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('fetches conversation messages with the conversations API version', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        messages: [
          {
            id: 'msg-1',
            conversationId: 'conv-1',
            message: 'Hola',
            direction: 'inbound',
          },
        ],
      })
    );

    const client = new GoHighLevelClient('test-key', 'https://services.leadconnectorhq.com', {
      locationId: 'loc-1',
    });

    const messages = await client.getConversationMessages('conv-1', { limit: 50 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://services.leadconnectorhq.com/conversations/conv-1/messages?locationId=loc-1&limit=50'
    );
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Version: '2023-02-21',
        }),
      })
    );
    expect(messages).toEqual([
      expect.objectContaining({
        id: 'msg-1',
        conversationId: 'conv-1',
        message: 'Hola',
      }),
    ]);
  });

  it('sends a threaded message when conversationId is provided', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: 'sent-1',
        status: 'pending',
        conversationId: 'conv-1',
      })
    );

    const client = new GoHighLevelClient('test-key', 'https://services.leadconnectorhq.com', {
      locationId: 'loc-1',
    });

    const result = await client.sendConversationMessage({
      contactId: 'contact-1',
      conversationId: 'conv-1',
      message: 'Hola familia',
      channel: 'sms',
      replyToMessageId: 'msg-parent',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://services.leadconnectorhq.com/conversations/messages'
    );
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Version: '2023-02-21',
        }),
        body: JSON.stringify({
          locationId: 'loc-1',
          message: 'Hola familia',
          type: 'SMS',
          status: 'pending',
          contactId: 'contact-1',
          conversationId: 'conv-1',
          replyToMessageId: 'msg-parent',
        }),
      })
    );
    expect(result).toEqual({
      id: 'sent-1',
      status: 'pending',
      conversationId: 'conv-1',
      messageId: 'sent-1',
    });
  });

  it('prefers an existing conversation thread when sending by contact id', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          conversations: [{ id: 'conv-99', contactId: 'contact-99' }],
          total: 1,
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'sent-2',
          status: 'pending',
          conversationId: 'conv-99',
        })
      );

    const client = new GoHighLevelClient('test-key', 'https://services.leadconnectorhq.com', {
      locationId: 'loc-1',
    });

    const result = await client.sendMessage({
      contactId: 'contact-99',
      message: 'Seguimiento',
      channel: 'whatsapp',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://services.leadconnectorhq.com/conversations/search?locationId=loc-1&contactId=contact-99&limit=1'
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'https://services.leadconnectorhq.com/conversations/messages'
    );
    expect(result).toEqual({
      id: 'sent-2',
      status: 'pending',
    });
  });
});
