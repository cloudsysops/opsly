import type { ReactElement } from 'react';
import { howItWorksSteps } from '@/lib/site';

export function HowItWorks(): ReactElement {
  return (
    <section className="icso-section" id="how-it-works">
      <div className="icso-container">
        <p className="icso-eyebrow">How it works</p>
        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
          From discovery to optimization
        </h2>
        <ol className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {howItWorksSteps.map((step) => (
            <li key={step.step} className="relative">
              <span className="text-4xl font-bold text-icso-primary/40">{step.step}</span>
              <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-icso-muted">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
