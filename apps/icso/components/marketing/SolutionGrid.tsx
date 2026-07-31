import Link from 'next/link';
import type { ReactElement } from 'react';
import { mvpModules } from '@/lib/commercial-catalog';

export function SolutionGrid(): ReactElement {
  const modules = mvpModules();

  return (
    <section className="icso-section bg-icso-surface/30" id="solutions">
      <div className="icso-container">
        <p className="icso-eyebrow">Reusable modules</p>
        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
          Build once in Opsly — activate per client
        </h2>
        <p className="mt-4 max-w-2xl text-icso-muted">
          MVP defaults every Hybrid deal ships with. Vertical branding and rules stay thin;
          the control plane stays shared.
        </p>
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((item) => (
            <li key={item.id}>
              <Link
                href={`/modules/${encodeURIComponent(item.id)}`}
                className="icso-glass-card block h-full border-icso-primary/20 p-6 transition hover:border-icso-cyan/40"
              >
                <h3 className="text-lg font-semibold text-icso-text">{item.label}</h3>
                <p className="mt-1 text-xs uppercase tracking-wide text-icso-cyan">
                  {item.label_es}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-icso-muted">{item.summary}</p>
                <span className="mt-4 inline-block text-xs font-medium text-icso-cyan">
                  View module →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
