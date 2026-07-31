'use client';

import { type FormEvent, useState, type ReactElement } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  buildDiscoveryMailto,
  buildPackageInquiryMessage,
  commercialCatalog,
} from '@/lib/commercial-catalog';
import { siteConfig } from '@/lib/site';

interface LeadApiResponse {
  success: boolean;
  contactId: string;
  message: string;
  calendarBookingUrl?: string | null;
}

export function ContactForm(): ReactElement {
  const searchParams = useSearchParams();
  const packageId = searchParams.get('package');
  const verticalId = searchParams.get('vertical');
  const moduleId = searchParams.get('module');
  const initialPrefill = buildPackageInquiryMessage(packageId, verticalId, moduleId);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(initialPrefill);
  const [selectedPackage, setSelectedPackage] = useState(packageId ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [calendarBookingUrl, setCalendarBookingUrl] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          message,
          packageId: selectedPackage || undefined,
          verticalId: verticalId || undefined,
          moduleId: moduleId || undefined,
        }),
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error || 'Failed to submit form');
      }

      const data = (await response.json()) as LeadApiResponse;
      setSubmitStatus('success');
      setCalendarBookingUrl(data.calendarBookingUrl ?? null);
      setName('');
      setEmail('');
      setMessage('');
      setSelectedPackage('');

      setTimeout(() => {
        setSubmitStatus('idle');
        setCalendarBookingUrl(null);
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
        <label htmlFor="package" className="block text-sm font-medium text-icso-text">
          Package interest
        </label>
        <select
          id="package"
          disabled={isSubmitting}
          value={selectedPackage}
          onChange={(e) => setSelectedPackage(e.target.value)}
          className="mt-2 w-full rounded-lg border border-icso-border bg-white/5 px-4 py-3 text-sm text-icso-text focus:border-icso-primary focus:outline-none focus:ring-1 focus:ring-icso-primary disabled:opacity-50"
        >
          <option value="">Not sure yet — recommend on discovery</option>
          {commercialCatalog.packages.map((pkg) => (
            <option key={pkg.id} value={pkg.id}>
              {pkg.name} — {pkg.name_es}
            </option>
          ))}
        </select>
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
        <div className="space-y-3 rounded-lg bg-green-900/20 p-4">
          <div className="text-sm text-green-300">
            ✓ Thank you! We received your inquiry and will respond within one business day.
          </div>
          {calendarBookingUrl && (
            <a
              href={calendarBookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded bg-green-700/40 px-3 py-2 text-sm font-medium text-green-200 transition-colors hover:bg-green-700/60"
            >
              Schedule a Discovery Call →
            </a>
          )}
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
              href={buildDiscoveryMailto({
                to: siteConfig.contactEmail,
                packageId: selectedPackage || packageId,
                verticalId,
                moduleId,
              })}
              className="font-medium text-icso-cyan hover:underline"
            >
              Prefill brief to {siteConfig.contactEmail}
            </a>
          </p>
        )}
      </div>
    </form>
  );
}
