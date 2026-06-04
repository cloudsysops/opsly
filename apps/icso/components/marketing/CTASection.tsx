import Link from 'next/link';
import type { ReactElement } from 'react';

type CTASectionProps = {
  title?: string;
  subtitle?: string;
};

export function CTASection({
  title = 'Ready to automate your business?',
  subtitle = 'Book a discovery call and we will map your fastest path to leads, follow-up, and visibility.',
}: CTASectionProps): ReactElement {
  return (
    <section className="icso-section">
      <div className="icso-container">
        <div className="icso-glass-card relative overflow-hidden px-8 py-14 text-center sm:px-12">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-icso-primary/20 via-transparent to-icso-accent/20"
            aria-hidden
          />
          <h2 className="relative text-3xl font-bold sm:text-4xl">{title}</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-icso-muted">{subtitle}</p>
          <Link href="/contact#discovery" className="icso-btn-primary relative mt-8">
            Book a discovery call
          </Link>
        </div>
      </div>
    </section>
  );
}
