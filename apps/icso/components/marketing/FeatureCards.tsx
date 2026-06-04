import { Clock, EyeOff, Layers, UserX, type LucideIcon } from 'lucide-react';
import type { ReactElement } from 'react';
import { problemCards } from '@/lib/site';

const iconMap: Record<(typeof problemCards)[number]['icon'], LucideIcon> = {
  'user-x': UserX,
  clock: Clock,
  layers: Layers,
  'eye-off': EyeOff,
};

type FeatureCardsProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

export function FeatureCards({
  eyebrow = 'Problems we solve',
  title,
  subtitle,
}: FeatureCardsProps): ReactElement {
  return (
    <section className="icso-section" id="problems">
      <div className="icso-container">
        <p className="icso-eyebrow">{eyebrow}</p>
        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">{title}</h2>
        {subtitle ? (
          <p className="mt-4 max-w-2xl text-icso-muted">{subtitle}</p>
        ) : null}
        <ul className="mt-12 grid gap-6 sm:grid-cols-2">
          {problemCards.map((card) => {
            const Icon = iconMap[card.icon];
            return (
              <li key={card.title} className="icso-glass-card p-6 sm:p-8">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-icso-cyan/30 bg-icso-cyan/10 text-icso-cyan">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-icso-muted">
                  {card.description}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
