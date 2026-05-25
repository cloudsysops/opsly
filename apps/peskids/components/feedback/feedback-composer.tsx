'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import { Loader2, Send, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type FeedbackAuthorType = 'parent' | 'teacher' | 'staff'
type FeedbackSubjectType = 'general' | 'class' | 'student' | 'operations'
type FeedbackVisibility = 'public' | 'private'
type FeedbackAudience = 'family' | 'teacher' | 'admin'

interface FeedbackComposerProps {
  title: string
  description: string
  submitLabel: string
  authorType: FeedbackAuthorType
  subjectType: FeedbackSubjectType
  childNameLabel?: string
  childNameDefault?: string
  childNameLocked?: boolean
  childNameHidden?: boolean
  parentEmailLabel?: string
  parentEmailDefault?: string
  parentEmailLocked?: boolean
  parentEmailHidden?: boolean
  parentEmail?: string | null
  authorRefId?: string | null
  subjectRefId?: string | null
  subjectHint?: string
  visibility?: FeedbackVisibility
  audience?: FeedbackAudience
  className?: string
  onSubmitted?: () => void
}

export function FeedbackComposer({
  title,
  description,
  submitLabel,
  authorType,
  subjectType,
  childNameLabel = 'Nombre del niño o niña',
  childNameDefault = '',
  childNameLocked = false,
  childNameHidden = false,
  parentEmailLabel = 'Email de la familia',
  parentEmailDefault = '',
  parentEmailLocked = false,
  parentEmailHidden = true,
  parentEmail = null,
  authorRefId = null,
  subjectRefId = null,
  subjectHint,
  visibility = 'public',
  audience = 'family',
  className,
  onSubmitted,
}: FeedbackComposerProps): React.ReactElement {
  const [childName, setChildName] = useState(childNameDefault)
  const [familyEmail, setFamilyEmail] = useState(parentEmailDefault || parentEmail || '')
  const [rating, setRating] = useState(3)
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const reactId = useId()
  const childInputId = `${reactId}-child`
  const emailInputId = `${reactId}-email`
  const messageInputId = `${reactId}-message`

  useEffect(() => {
    setChildName(childNameDefault)
  }, [childNameDefault])

  useEffect(() => {
    setFamilyEmail(parentEmailDefault || parentEmail || '')
  }, [parentEmail, parentEmailDefault])

  const ratingLabel = useMemo(() => {
    if (rating >= 5) return 'Excelente'
    if (rating === 4) return 'Muy bien'
    if (rating === 3) return 'Bien'
    if (rating === 2) return 'Necesita ajustes'
    return 'Requiere atención'
  }, [rating])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const trimmedChildName = childName.trim()
    const trimmedEmail = familyEmail.trim()
    const trimmedMessage = message.trim()

    if (!childNameHidden && !trimmedChildName) {
      setError('Escribe el nombre de la familia o del estudiante.')
      setSuccess('')
      return
    }

    if (!parentEmailHidden && !trimmedEmail) {
      setError('Escribe el email de la familia para enviar este feedback.')
      setSuccess('')
      return
    }

    if (!trimmedMessage) {
      setError('Escribe un comentario para poder enviarlo.')
      setSuccess('')
      return
    }

    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          author_type: authorType,
          subject_type: subjectType,
          child_name: childNameHidden ? childNameDefault : trimmedChildName,
          rating,
          satisfaction: rating,
          body: trimmedMessage,
          suggestion: trimmedMessage,
          parent_email: parentEmailHidden ? parentEmail ?? parentEmailDefault : trimmedEmail,
          author_ref_id: authorRefId,
          subject_ref_id: subjectRefId,
          visibility,
          audience,
          contact_wanted: false,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string }
      if (!response.ok) {
        throw new Error(payload.error || 'No se pudo enviar el feedback.')
      }

      setSuccess(payload.message || 'Feedback enviado correctamente.')
      setMessage('')
      setRating(3)
      if (!childNameLocked && !childNameHidden) {
        setChildName('')
      }
      if (!parentEmailLocked && !parentEmailHidden) {
        setFamilyEmail('')
      }
      onSubmitted?.()
    } catch (submissionError) {
      const messageText =
        submissionError instanceof Error ? submissionError.message : 'No se pudo enviar el feedback.'
      setError(messageText)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className={cn('border-pk-border/80 bg-white', className)}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit}>
          {subjectHint ? (
            <div className="rounded-2xl border border-pk-border bg-pk-muted/25 px-4 py-3 text-sm text-pk-sub">
              {subjectHint}
            </div>
          ) : null}

          {!childNameHidden ? (
            <div className="space-y-2">
              <label htmlFor={childInputId} className="text-sm font-medium text-pk-ink">
                {childNameLabel}
              </label>
              <input
                id={childInputId}
                value={childName}
                onChange={(event) => setChildName(event.target.value)}
                disabled={childNameLocked}
                className="h-11 w-full rounded-xl border border-pk-border bg-white px-3 text-sm text-pk-ink outline-none transition focus:border-pk-primary focus:ring-2 focus:ring-pk-primary/10 disabled:bg-pk-muted/40"
                placeholder="Escribe el nombre aquí"
              />
            </div>
          ) : null}

          {!parentEmailHidden ? (
            <div className="space-y-2">
              <label htmlFor={emailInputId} className="text-sm font-medium text-pk-ink">
                {parentEmailLabel}
              </label>
              <input
                id={emailInputId}
                value={familyEmail}
                onChange={(event) => setFamilyEmail(event.target.value)}
                disabled={parentEmailLocked}
                className="h-11 w-full rounded-xl border border-pk-border bg-white px-3 text-sm text-pk-ink outline-none transition focus:border-pk-primary focus:ring-2 focus:ring-pk-primary/10 disabled:bg-pk-muted/40"
                placeholder="escribe@email.com"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium text-pk-ink">Valoración</label>
              <Badge tone={rating >= 4 ? 'green' : rating === 3 ? 'amber' : 'coral'}>{ratingLabel}</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }, (_, index) => index + 1).map((value) => {
                const active = rating === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className={cn(
                      'inline-flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold transition',
                      active
                        ? 'border-pk-primary bg-pk-primary text-white shadow-sm'
                        : 'border-pk-border bg-white text-pk-sub hover:border-pk-primary/40 hover:text-pk-ink'
                    )}
                    aria-label={`Valoración ${value} de 5`}
                  >
                    <Star className={cn('h-4 w-4', active && 'fill-current')} aria-hidden />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor={messageInputId} className="text-sm font-medium text-pk-ink">
              Comentario
            </label>
            <textarea
              id={messageInputId}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              className="w-full rounded-2xl border border-pk-border bg-white px-3 py-3 text-sm text-pk-ink outline-none transition focus:border-pk-primary focus:ring-2 focus:ring-pk-primary/10"
              placeholder="Escribe tu feedback con lo que quieras dejarle a la familia o al profesor."
            />
          </div>

          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1 text-xs leading-5 text-pk-mutedText">
              <p>Se guardará en el panel de Peskids para seguimiento del equipo.</p>
              <p className="flex flex-wrap gap-2">
                <Badge tone={visibility === 'private' ? 'violet' : 'green'}>
                  {visibility === 'private' ? 'Privado' : 'Público'}
                </Badge>
                <Badge tone="neutral">
                  {audience === 'family'
                    ? 'Familia'
                    : audience === 'teacher'
                      ? 'Profesor'
                      : 'Equipo'}
                </Badge>
              </p>
            </div>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
              <span>{submitLabel}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
