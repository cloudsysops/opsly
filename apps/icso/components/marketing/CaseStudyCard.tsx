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
          Live Opsly vertical (swim school): automated lead intake, Twenty CRM, n8n
          follow-up, and ops dashboards — the Hybrid package pattern we sell and operate.
        </p>
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <a
            href="https://peskids.op-sly.com"
            target="_blank"
            rel="noopener noreferrer"
            className="icso-glass-card block overflow-hidden p-2 transition hover:border-icso-cyan/40"
          >
            <div
              className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-icso-border bg-gradient-to-br from-icso-primary/20 via-icso-bg to-icso-accent/20"
              role="img"
              aria-label="Open live Peskids landing"
            >
              <span className="text-sm font-medium text-icso-cyan">
                Live site → peskids.op-sly.com
              </span>
            </div>
          </a>
          <Link
            href="/quote?package=hybrid-opsly&vertical=swim-school"
            className="icso-glass-card block overflow-hidden p-2 transition hover:border-icso-cyan/40"
          >
            <div
              className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-icso-border bg-gradient-to-br from-icso-cyan/20 via-icso-bg to-icso-primary/20"
              role="img"
              aria-label="Build Hybrid SOW for swim school vertical"
            >
              <span className="text-sm font-medium text-icso-cyan">
                Build this SOW (Hybrid + natación)
              </span>
            </div>
          </Link>
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
