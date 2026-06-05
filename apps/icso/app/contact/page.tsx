import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { ContactForm } from '@/components/marketing/ContactForm';
import { CTASection } from '@/components/marketing/CTASection';
import { siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact',
  description: `Book a discovery call with ${siteConfig.name}.`,
};

export default function ContactPage(): ReactElement {
  return (
    <>
      <section className="icso-section pt-12" id="discovery">
        <div className="icso-container max-w-3xl">
          <p className="icso-eyebrow">Contact</p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">Book a discovery call</h1>
          <p className="mt-6 text-lg text-icso-muted">
            Tell us about your business, current tools, and goals. We respond within one
            business day.
          </p>
          <ContactForm />
          <p className="mt-8 text-sm text-icso-muted">
            Prefer email directly?{' '}
            <a
              href={`mailto:${siteConfig.contactEmail}`}
              className="font-medium text-icso-cyan hover:underline"
            >
              {siteConfig.contactEmail}
            </a>
          </p>
        </div>
      </section>
      <CTASection
        title="Prefer a quick intro?"
        subtitle="Share your site and main bottleneck — we will come prepared with options."
      />
    </>
  );
}
