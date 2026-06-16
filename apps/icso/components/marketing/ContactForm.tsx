'use client';

import { type FormEvent, useState, type ReactElement } from 'react';
import { siteConfig } from '@/lib/site';

export function ContactForm(): ReactElement {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const subject = encodeURIComponent(`Discovery call — ${name || 'ICSO inquiry'}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\n${message}`,
    );
    window.location.href = `mailto:${siteConfig.contactEmail}?subject=${subject}&body=${body}`;
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
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-2 w-full rounded-lg border border-icso-border bg-white/5 px-4 py-3 text-sm text-icso-text placeholder:text-icso-muted focus:border-icso-primary focus:outline-none focus:ring-1 focus:ring-icso-primary"
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 w-full rounded-lg border border-icso-border bg-white/5 px-4 py-3 text-sm text-icso-text placeholder:text-icso-muted focus:border-icso-primary focus:outline-none focus:ring-1 focus:ring-icso-primary"
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
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-2 w-full rounded-lg border border-icso-border bg-white/5 px-4 py-3 text-sm text-icso-text placeholder:text-icso-muted focus:border-icso-primary focus:outline-none focus:ring-1 focus:ring-icso-primary"
          placeholder="Leads, CRM, follow-up, dashboards..."
        />
      </div>
      <button type="submit" className="icso-btn-primary w-full sm:w-auto">
        Send inquiry
      </button>
      <p className="text-xs text-icso-muted">
        Opens your email client — no server-side form on this marketing site.
      </p>
    </form>
  );
}
