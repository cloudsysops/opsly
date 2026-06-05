import Link from 'next/link';
import { ArrowRight, BarChart3, Bot, LayoutDashboard, UserPlus } from 'lucide-react';
import type { ReactElement } from 'react';

const highlights = [
  { label: 'Lead Capture', icon: UserPlus },
  { label: 'CRM', icon: BarChart3 },
  { label: 'Automation', icon: Bot },
  { label: 'Dashboard', icon: LayoutDashboard },
] as const;

export function CaseStudyCard(): ReactElement {
  return (
    <section className="icso-section bg-icso-surface/30" id="case-study">
      <div className="icso-container">
        <p className="icso-eyebrow">Case study</p>
        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Peskids</h2>
        <p className="mt-4 max-w-2xl text-icso-muted">
          Education growth platform with automated lead intake, CRM follow-up, and
          operational dashboards — built on the same stack we deploy for clients.
        </p>
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="icso-glass-card overflow-hidden p-2">
            <div
              className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-icso-border bg-gradient-to-br from-icso-primary/20 via-icso-bg to-icso-accent/20"
              role="img"
              aria-label="Peskids dashboard screenshot placeholder"
            >
              <span className="text-sm text-icso-muted">Dashboard preview</span>
            </div>
          </div>
          <div className="icso-glass-card overflow-hidden p-2">
            <div
              className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-icso-border bg-gradient-to-br from-icso-cyan/20 via-icso-bg to-icso-primary/20"
              role="img"
              aria-label="Peskids lead capture screenshot placeholder"
            >
              <span className="text-sm text-icso-muted">Lead capture preview</span>
            </div>
          </div>
        </div>
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {highlights.map(({ label, icon: Icon }) => (
            <li
              key={label}
              className="flex flex-col items-center rounded-xl border border-icso-border bg-icso-bg/60 px-4 py-5 text-center"
            >
              <Icon className="h-6 w-6 text-icso-cyan" aria-hidden />
              <span className="mt-2 text-sm font-medium">{label}</span>
            </li>
          ))}
        </ul>
        <Link
          href="/case-studies"
          className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-icso-cyan hover:text-icso-text"
        >
          View all case studies
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
