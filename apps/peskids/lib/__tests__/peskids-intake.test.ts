import { beforeEach, describe, expect, it, vi } from 'vitest';

const getConversationMessagesMock = vi.fn();

vi.mock('@/lib/message-store', () => ({
  getConversationMessages: getConversationMessagesMock,
}));

describe('buildPeskidsIntakeTurn', () => {
  beforeEach(() => {
    getConversationMessagesMock.mockReset();
  });

  it('keeps a short name answer when the next turn contains the email', async () => {
    getConversationMessagesMock.mockResolvedValue([
      { direction: 'inbound', message_text: 'familia' },
      { direction: 'outbound', message_text: '¿Cómo te llamas?' },
      { direction: 'inbound', message_text: 'Valeria' },
      { direction: 'outbound', message_text: '¿Cuál es tu correo electrónico?' },
    ]);

    const { buildPeskidsIntakeTurn } = await import('../peskids-intake');
    const turn = await buildPeskidsIntakeTurn({
      senderContact: 'web:session-1',
      source: 'web',
      latestMessage: 'valefleishman@gmail.com',
    });

    expect(turn.profile.parentName).toBe('Valeria');
    expect(turn.profile.email).toBe('valefleishman@gmail.com');
    expect(turn.missingField).not.toBe('parentName');
  });

  it('keeps short name and email when the latest turn is a phone number', async () => {
    getConversationMessagesMock.mockResolvedValue([
      { direction: 'inbound', message_text: 'familia' },
      { direction: 'outbound', message_text: '¿Cómo te llamas?' },
      { direction: 'inbound', message_text: 'Valeria' },
      { direction: 'outbound', message_text: '¿Cuál es tu correo electrónico?' },
      { direction: 'inbound', message_text: 'valefleishman@gmail.com' },
      { direction: 'outbound', message_text: '¿Cuál es tu WhatsApp o celular?' },
    ]);

    const { buildPeskidsIntakeTurn } = await import('../peskids-intake');
    const turn = await buildPeskidsIntakeTurn({
      senderContact: 'web:session-2',
      source: 'web',
      latestMessage: '3001234567',
    });

    expect(turn.profile.parentName).toBe('Valeria');
    expect(turn.profile.email).toBe('valefleishman@gmail.com');
    expect(turn.profile.phone).toMatch(/3001234567/);
    expect(turn.missingField).not.toBe('parentName');
    expect(turn.missingField).not.toBe('email');
  });
});
