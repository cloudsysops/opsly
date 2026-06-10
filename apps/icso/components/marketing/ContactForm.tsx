'use client';

import { type FormEvent, useState, type ReactElement } from 'react';
import { siteConfig } from '@/lib/site';

export function ContactForm(): ReactElement {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });

      if (!response.ok) {
        const error = await response.json() as { error?: string };
        throw new Error(error.error || 'Failed to submit form');
      }

      setSubmitStatus('success');
      setName('');
      setEmail('');
      setMessage('');

      setTimeout(() => {
        setSubmitStatus('idle');
      }, 5000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-icso-text">
          Name
        </label>
        <input
          id="name"
          type="text"
          required
          disabled={isSubmitting}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-2 w-full rounded-lg border border-icso-border bg-white/5 px-4 py-3 text-sm text-icso-text placeholder:text-icso-muted focus:border-icso-primary focus:outline-none focus:ring-1 focus:ring-icso-primary disabled:opacity-50"
          placeholder="Your name"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-icso-text">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          disabled={isSubmitting}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 w-full rounded-lg border border-icso-border bg-white/5 px-4 py-3 text-sm text-icso-text placeholder:text-icso-muted focus:border-icso-primary focus:outline-none focus:ring-1 focus:ring-icso-primary disabled:opacity-50"
          placeholder="you@company.com"
        />
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-icso-text">
          What would you like to automate?
        </label>
        <textarea
          id="message"
          rows={5}
          required
          disabled={isSubmitting}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-2 w-full rounded-lg border border-icso-border bg-white/5 px-4 py-3 text-sm text-icso-text placeholder:text-icso-muted focus:border-icso-primary focus:outline-none focus:ring-1 focus:ring-icso-primary disabled:opacity-50"
          placeholder="Leads, CRM, follow-up, dashboards..."
        />
      </div>
      {submitStatus === 'success' && (
        <div className="rounded-lg bg-green-900/20 p-4 text-sm text-green-300">
          ✓ Thank you! We received your inquiry and will respond within one business day.
        </div>
      )}
      {submitStatus === 'error' && (
        <div className="rounded-lg bg-red-900/20 p-4 text-sm text-red-300">
          ✗ {errorMessage}
        </div>
      )}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="icso-btn-primary w-full disabled:opacity-50 sm:w-auto"
        >
          {isSubmitting ? 'Submitting...' : 'Send inquiry'}
        </button>
        {submitStatus !== 'success' && (
          <p className="text-xs text-icso-muted">
            Prefer email?{' '}
            <a
              href={`mailto:${siteConfig.contactEmail}`}
              className="font-medium text-icso-cyan hover:underline"
            >
              {siteConfig.contactEmail}
            </a>
          </p>
        )}
      </div>
    </form>
  );
}
