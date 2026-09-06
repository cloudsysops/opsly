import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const singleMock = vi.fn()
  const selectAfterInsertMock = vi.fn(() => ({
    single: singleMock,
  }))
  const insertMock = vi.fn(() => ({
    select: selectAfterInsertMock,
  }))

  const maybeSingleMock = vi.fn()
  const eqTenantForByIdMock = vi.fn(() => ({
    maybeSingle: maybeSingleMock,
  }))
  const eqIdMock = vi.fn(() => ({
    eq: eqTenantForByIdMock,
  }))
  const selectForByIdMock = vi.fn(() => ({
    eq: eqIdMock,
  }))

  const limitMock = vi.fn()
  const orderMock = vi.fn(() => ({
    limit: limitMock,
  }))
  const eqSenderContactMock = vi.fn(() => ({
    order: orderMock,
  }))
  const eqTenantForConversationMock = vi.fn(() => ({
    eq: eqSenderContactMock,
  }))
  const selectForConversationMock = vi.fn(() => ({
    eq: eqTenantForConversationMock,
  }))

  const fromMock = vi.fn((table: string) => {
    if (table !== 'messages') {
      throw new Error(`Unexpected table ${table}`)
    }

    return {
      insert: insertMock,
      select: vi.fn((selection: string) => {
        if (selection.includes('created_at')) {
          return {
            eq: eqIdMock.mock.calls.length === 0 ? eqTenantForConversationMock : eqIdMock,
          }
        }
        return {
          eq: eqTenantForConversationMock,
        }
      }),
    }
  })

  const supabaseServerMock = vi.fn(() => ({
    from: fromMock,
  }))

  return {
    singleMock,
    selectAfterInsertMock,
    insertMock,
    maybeSingleMock,
    eqTenantForByIdMock,
    eqIdMock,
    selectForByIdMock,
    limitMock,
    orderMock,
    eqSenderContactMock,
    eqTenantForConversationMock,
    selectForConversationMock,
    fromMock,
    supabaseServerMock,
  }
})

const {
  singleMock,
  insertMock,
  maybeSingleMock,
  eqTenantForByIdMock,
  eqIdMock,
  limitMock,
  orderMock,
  eqSenderContactMock,
  eqTenantForConversationMock,
  fromMock,
  supabaseServerMock,
} = mocks

vi.mock('@/lib/supabase', () => ({
  supabaseServer: supabaseServerMock,
}))

describe('message-store helpers', () => {
  beforeEach(() => {
    singleMock.mockReset()
    insertMock.mockClear()
    maybeSingleMock.mockReset()
    eqTenantForByIdMock.mockReset()
    eqIdMock.mockReset()
    limitMock.mockReset()
    orderMock.mockReset()
    eqSenderContactMock.mockReset()
    eqTenantForConversationMock.mockReset()
    fromMock.mockClear()
    supabaseServerMock.mockClear()
    process.env.NEXT_PUBLIC_TENANT_ID = 'peskids'
    vi.spyOn(Date, 'now').mockReturnValue(1234567890)

    fromMock.mockImplementation((table: string) => {
      if (table !== 'messages') {
        throw new Error(`Unexpected table ${table}`)
      }

      return {
        insert: insertMock,
        select: vi.fn(() => {
          if (eqIdMock.getMockImplementation()) {
            return { eq: eqIdMock }
          }
          return { eq: eqTenantForConversationMock }
        }),
      }
    })
  })

  it('stores inbound, draft, and outbound messages with expected defaults', async () => {
    const { storeInboundMessage, storeDraftReply, storeOutboundMessage } = await import('../message-store')

    singleMock
      .mockResolvedValueOnce({
        data: { id: 'm1', sender_contact: 'family-1', message_text: 'Hola' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: 'm2', sender_contact: 'assistant', message_text: 'Borrador' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: 'm3', sender_contact: 'family-1', message_text: 'Respuesta' },
        error: null,
      })

    await expect(
      storeInboundMessage({
        source: 'web',
        sender_contact: 'family-1',
        sender_name: 'Familia',
        message_text: 'Hola',
        external_id: 'external-1',
      })
    ).resolves.toEqual({
      message: { id: 'm1', sender_contact: 'family-1', message_text: 'Hola' },
      error: null,
    })

    expect(insertMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        tenant_id: 'peskids',
        direction: 'inbound',
        status: 'pending',
        ai_generated: false,
        external_id: 'external-1',
      })
    )

    await expect(storeDraftReply('parent-1', 'Borrador', 'web')).resolves.toEqual({
      draft: { id: 'm2', sender_contact: 'assistant', message_text: 'Borrador' },
      error: null,
    })

    expect(insertMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        sender_contact: 'assistant',
        sender_name: 'Asistente Peskids',
        direction: 'draft',
        parent_message_id: 'parent-1',
        status: 'pending',
        ai_generated: true,
        external_id: 'draft-parent-1-1234567890',
      })
    )

    await expect(
      storeOutboundMessage({
        parentId: 'parent-2',
        source: 'whatsapp',
        sender_contact: 'family-1',
        replyText: 'Respuesta',
        aiGenerated: true,
      })
    ).resolves.toEqual({
      message: { id: 'm3', sender_contact: 'family-1', message_text: 'Respuesta' },
      error: null,
    })

    expect(insertMock).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        direction: 'outbound',
        sender_name: 'Asistente Peskids',
        status: 'sent',
        ai_generated: true,
        external_id: 'auto-parent-2-1234567890',
      })
    )
  })

  it('returns null or empty arrays when reads fail and reverses conversation order', async () => {
    const { getMessageById, getConversationMessages } = await import('../message-store')

    const maybeSingle = vi.fn().mockResolvedValueOnce({
      data: null,
      error: { message: 'missing' },
    })
    const eqTenantForById = vi.fn(() => ({
      maybeSingle,
    }))
    const eqId = vi.fn(() => ({
      eq: eqTenantForById,
    }))
    const limit = vi.fn().mockResolvedValueOnce({
      data: [
        { id: 'm-new', created_at: '2026-05-26T11:00:00.000Z' },
        { id: 'm-old', created_at: '2026-05-26T10:00:00.000Z' },
      ],
      error: null,
    })
    const order = vi.fn(() => ({
      limit,
    }))
    const eqSenderContact = vi.fn(() => ({
      order,
    }))
    const eqTenantForConversation = vi.fn(() => ({
      eq: eqSenderContact,
    }))

    fromMock
      .mockReturnValueOnce({
        insert: insertMock,
        select: vi.fn(() => ({
          eq: eqId,
        })),
      })
      .mockReturnValueOnce({
        insert: insertMock,
        select: vi.fn(() => ({
          eq: eqTenantForConversation,
        })),
      })

    await expect(getMessageById('msg-1')).resolves.toBeNull()

    await expect(getConversationMessages('thread-1', 2)).resolves.toEqual([
      { id: 'm-old', created_at: '2026-05-26T10:00:00.000Z' },
      { id: 'm-new', created_at: '2026-05-26T11:00:00.000Z' },
    ])
  })

  it('surfaces insert failures as explicit message-store errors', async () => {
    const { storeInboundMessage } = await import('../message-store')

    singleMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'write failed' },
    })
    const maybeSingleLookup = vi.fn().mockResolvedValue({ data: null, error: null })
    fromMock.mockImplementation((table: string) => {
      if (table !== 'messages') {
        throw new Error(`Unexpected table ${table}`)
      }
      return {
        insert: insertMock,
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: maybeSingleLookup,
            })),
          })),
        })),
      }
    })

    await expect(
      storeInboundMessage({
        source: 'web',
        sender_contact: 'family-1',
        sender_name: 'Familia',
        message_text: 'Hola',
        external_id: 'external-1',
      })
    ).resolves.toEqual({
      message: null,
      error: 'write failed',
    })
  })
})
