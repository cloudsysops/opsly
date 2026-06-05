import type { ReactElement } from 'react';
import { solutionCards } from '@/lib/site';

export function SolutionGrid(): ReactElement {
  return (
    <section className="icso-section bg-icso-surface/30" id="solutions">
      <div className="icso-container">
        <p className="icso-eyebrow">Our solutions</p>
        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
          Automation that ships results
        </h2>
        <p className="mt-4 max-w-2xl text-icso-muted">
          From lead capture to cloud operations — one agency, proven stack, measurable
          outcomes.
        </p>
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {solutionCards.map((item) => (
            <li
              key={item.title}
              className="icso-glass-card border-icso-primary/20 p-6 transition hover:border-icso-cyan/40"
            >
              <h3 className="text-lg font-semibold text-icso-text">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-icso-muted">
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
