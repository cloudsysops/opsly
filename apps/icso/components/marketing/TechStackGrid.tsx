import type { ReactElement } from 'react';
import { techStackItems } from '@/lib/site';

export function TechStackGrid(): ReactElement {
  return (
    <section className="icso-section" id="technology">
      <div className="icso-container">
        <p className="icso-eyebrow">Inside Opsly · run by ICSO</p>
        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
          One operating system, agency-operated
        </h2>
        <p className="mt-4 max-w-2xl text-icso-muted">
          Opsly is ICSO&apos;s OS. CRM, workflows, data, and AI agents are layers we own
          and operate — not a mashup of unrelated vendors.
        </p>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {techStackItems.map((item) => (
            <li
              key={item.name}
              className="icso-glass-card flex flex-col justify-between p-6"
            >
              <span className="text-xl font-bold text-icso-text">{item.name}</span>
              <span className="mt-2 text-sm text-icso-muted">{item.role}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
