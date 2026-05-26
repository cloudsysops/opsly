'use client'

import { useEffect, useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { FeedbackComposerFields } from './feedback-composer-fields'
import { submitFeedback, type FeedbackAuthorType, type FeedbackSubjectType, type FeedbackVisibility, type FeedbackAudience } from './feedback-composer-submission'

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

  useEffect(() => {
    setChildName(childNameDefault)
  }, [childNameDefault])

  useEffect(() => {
    setFamilyEmail(parentEmailDefault || parentEmail || '')
  }, [parentEmail, parentEmailDefault])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    setIsSubmitting(true)
    setError('')
    setSuccess('')

    const result = await submitFeedback({
      childName,
      childNameHidden,
      childNameDefault,
      familyEmail,
      parentEmailHidden,
      parentEmail,
      parentEmailDefault,
      rating,
      message,
      authorType,
      subjectType,
      authorRefId,
      subjectRefId,
      visibility,
      audience,
    })

    if (result.ok) {
      setSuccess(result.message || 'Feedback enviado correctamente.')
      setMessage('')
      setRating(3)
      if (!childNameLocked && !childNameHidden) {
        setChildName('')
      }
      if (!parentEmailLocked && !parentEmailHidden) {
        setFamilyEmail('')
      }
      onSubmitted?.()
    } else {
      setError(result.error || 'No se pudo enviar el feedback.')
    }

    setIsSubmitting(false)
  }

  return (
    <Card className={cn('border-pk-border/80 bg-white', className)}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <FeedbackComposerFields
            childName={childName}
            onChildNameChange={setChildName}
            childNameLabel={childNameLabel}
            childNameHidden={childNameHidden}
            childNameLocked={childNameLocked}
            familyEmail={familyEmail}
            onFamilyEmailChange={setFamilyEmail}
            parentEmailLabel={parentEmailLabel}
            parentEmailHidden={parentEmailHidden}
            parentEmailLocked={parentEmailLocked}
            rating={rating}
            onRatingChange={setRating}
            message={message}
            onMessageChange={setMessage}
            subjectHint={subjectHint}
          />

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
