'use client';

import { useId } from 'react';
import { FeedbackComposerRating } from './feedback-composer-rating';

interface FeedbackComposerFieldsProps {
  childName: string;
  onChildNameChange: (value: string) => void;
  childNameLabel: string;
  childNameHidden: boolean;
  childNameLocked: boolean;
  familyEmail: string;
  onFamilyEmailChange: (value: string) => void;
  parentEmailLabel: string;
  parentEmailHidden: boolean;
  parentEmailLocked: boolean;
  rating: number;
  onRatingChange: (value: number) => void;
  message: string;
  onMessageChange: (value: string) => void;
  subjectHint?: string;
}

export function FeedbackComposerFields({
  childName,
  onChildNameChange,
  childNameLabel,
  childNameHidden,
  childNameLocked,
  familyEmail,
  onFamilyEmailChange,
  parentEmailLabel,
  parentEmailHidden,
  parentEmailLocked,
  rating,
  onRatingChange,
  message,
  onMessageChange,
  subjectHint,
}: FeedbackComposerFieldsProps): React.ReactElement {
  const reactId = useId();
  const childInputId = `${reactId}-child`;
  const emailInputId = `${reactId}-email`;
  const messageInputId = `${reactId}-message`;

  return (
    <div className="space-y-5">
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
            onChange={(event) => onChildNameChange(event.target.value)}
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
            onChange={(event) => onFamilyEmailChange(event.target.value)}
            disabled={parentEmailLocked}
            className="h-11 w-full rounded-xl border border-pk-border bg-white px-3 text-sm text-pk-ink outline-none transition focus:border-pk-primary focus:ring-2 focus:ring-pk-primary/10 disabled:bg-pk-muted/40"
            placeholder="escribe@email.com"
          />
        </div>
      ) : null}

      <FeedbackComposerRating value={rating} onChange={onRatingChange} />

      <div className="space-y-2">
        <label htmlFor={messageInputId} className="text-sm font-medium text-pk-ink">
          Comentario
        </label>
        <textarea
          id={messageInputId}
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          rows={5}
          className="w-full rounded-2xl border border-pk-border bg-white px-3 py-3 text-sm text-pk-ink outline-none transition focus:border-pk-primary focus:ring-2 focus:ring-pk-primary/10"
          placeholder="Escribe tu feedback con lo que quieras dejarle a la familia o al profesor."
        />
      </div>
    </div>
  );
}
