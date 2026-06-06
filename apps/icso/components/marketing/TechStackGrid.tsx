import type { ReactElement } from 'react';
import { techStackItems } from '@/lib/site';

export function TechStackGrid(): ReactElement {
  return (
    <section className="icso-section" id="technology">
      <div className="icso-container">
        <p className="icso-eyebrow">Technology stack</p>
        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
          Enterprise-grade tools, agency delivery
        </h2>
        <p className="mt-4 max-w-2xl text-icso-muted">
          We implement and operate the platforms that power modern growth operations —
          not experiments stitched together overnight.
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
