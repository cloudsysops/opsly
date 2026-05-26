import { beforeEach, describe, expect, it, vi } from 'vitest'
import { submitFeedback } from './feedback-composer-submission'

const fetchMock = vi.fn<typeof fetch>()

function makeParams() {
  return {
    childName: ' Mateo ',
    childNameHidden: false,
    childNameDefault: 'Mateo',
    familyEmail: ' family@example.com ',
    parentEmailHidden: false,
    parentEmail: null,
    parentEmailDefault: 'fallback@example.com',
    rating: 4,
    message: ' Gran avance ',
    authorType: 'parent' as const,
    subjectType: 'class' as const,
    authorRefId: 'family-1',
    subjectRefId: 'class-1',
    visibility: 'public' as const,
    audience: 'teacher' as const,
  }
}

describe('submitFeedback', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    global.fetch = fetchMock
  })

  it('validates required visible fields before calling the API', async () => {
    const result = await submitFeedback({
      ...makeParams(),
      childName: '   ',
    })

    expect(result).toEqual({
      ok: false,
      error: 'Escribe el nombre de la familia o del estudiante.',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends the normalized feedback payload and returns the server message', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Guardado con exito' }),
    } as Response)

    const result = await submitFeedback(makeParams())

    expect(result).toEqual({ ok: true, message: 'Guardado con exito' })
    expect(fetchMock).toHaveBeenCalledWith('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        author_type: 'parent',
        subject_type: 'class',
        child_name: 'Mateo',
        rating: 4,
        satisfaction: 4,
        body: 'Gran avance',
        suggestion: 'Gran avance',
        parent_email: 'family@example.com',
        author_ref_id: 'family-1',
        subject_ref_id: 'class-1',
        visibility: 'public',
        audience: 'teacher',
        contact_wanted: false,
      }),
    })
  })

  it('returns API errors and uses hidden defaults when fields are locked', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Forbidden' }),
    } as Response)

    const result = await submitFeedback({
      ...makeParams(),
      childNameHidden: true,
      childNameDefault: 'Sofia',
      parentEmailHidden: true,
      parentEmail: null,
      parentEmailDefault: 'locked@example.com',
      familyEmail: '',
      authorType: 'teacher',
      audience: 'family',
    })

    expect(result).toEqual({ ok: false, error: 'Forbidden' })
    expect(fetchMock).toHaveBeenCalledOnce()
    const [, requestInit] = fetchMock.mock.calls[0] ?? []
    expect(requestInit?.body).toContain('"child_name":"Sofia"')
    expect(requestInit?.body).toContain('"parent_email":"locked@example.com"')
  })
})
