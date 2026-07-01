import Link from 'next/link';
import { Gift, BadgePercent, Link2 } from 'lucide-react';
import { PublicReservaWhatsAppLink } from '@/components/marketing/public-reserva-whatsapp-link';
import { peskidsColorTokens } from '@/lib/tokens';

function MiniReferralStep({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Gift;
  title: string;
  text: string;
}): React.ReactElement {
  return (
    <div className="rounded-2xl border border-pk-border bg-white p-4 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pk-primary/10 text-pk-primary">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <p className="mt-3 text-sm font-bold text-pk-ink">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-pk-sub">{text}</p>
    </div>
  );
}

function ReferralSection(): React.ReactElement {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-pk-border bg-white shadow-card">
      <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="border-b border-pk-border bg-pk-snow p-6 lg:border-b-0 lg:border-r">
          <p className="pk-eyebrow">Referidos y descuento</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-pk-ink sm:text-3xl">
            Comparte tu link y suma crédito para la factura.
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-pk-sub">
            El crédito se acumula automáticamente cuando alguien se registra con tu link.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <MiniReferralStep icon={Link2} title="1. Comparte" text="Pega tu link donde quieras." />
            <MiniReferralStep
              icon={Gift}
              title="2. Se registra"
              text="La familia entra con invitación."
            />
            <MiniReferralStep
              icon={BadgePercent}
              title="3. Se acredita"
              text="Tu saldo está siendo procesado."
            />
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="rounded-[1.5rem] border border-pk-border bg-pk-bg p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-pk-ink">Tu espacio de familia</p>
                <p className="mt-1 text-xs text-pk-mutedText">Invitación, referidos y saldo.</p>
              </div>
              <span className="rounded-full bg-pk-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-pk-primary">
                Activo
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-pk-mutedText">
                  Invitación de familia
                </p>
                <p className="mt-2 font-mono text-lg font-semibold text-pk-ink">PK-8H2KQ9</p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-pk-mutedText">
                  Crédito acumulado
                </p>
                <p className="mt-2 text-lg font-semibold text-pk-primary">20.000 COP</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-dashed border-pk-border bg-white/70 p-4">
              <p className="text-xs font-semibold text-pk-ink">Cómo se ve en la plataforma</p>
              <p className="mt-1 text-xs leading-relaxed text-pk-sub">
                Verás el crédito antes de que salga el cobro.
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/familias/login"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-pk-primary px-5 text-sm font-bold text-white transition hover:bg-pk-primary-dark"
              >
                Acceso por invitación
              </Link>
              <PublicReservaWhatsAppLink className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-pk-border bg-white px-5 text-sm font-bold text-pk-ink transition hover:border-pk-primary/30 hover:bg-pk-snow" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FinalCTA(): React.ReactElement {
  return (
    <div
      className="overflow-hidden rounded-[2rem] text-white shadow-hero"
      style={{
        backgroundImage: `linear-gradient(to bottom right, ${peskidsColorTokens.primary.blue}, ${peskidsColorTokens.dark.darkestBlue})`,
      }}
    >
      <div className="grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-10">
        <div>
          <p className="pk-eyebrow text-white/50">Portal inicializándose</p>
          <h2 className="mt-2 max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl">
            Una base visual clara para familias y equipo.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/75">
            El usuario ve progreso, agenda y mensajes en un solo lugar. El equipo puede operar sin
            fricción y mostrar el producto con claridad.
          </p>
        </div>

        <div className="flex flex-col justify-center gap-3 sm:flex-row lg:justify-end">
          <PublicReservaWhatsAppLink
            variant="onDark"
            label="Reservar clase gratuita"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-pk-sun px-6 text-sm font-bold text-pk-ink transition hover:brightness-105"
          />
        </div>
      </div>
    </div>
  );
}

export function PortalShowcaseCTA(): React.ReactElement {
  return (
    <>
      <div className="mt-14">
        <ReferralSection />
      </div>

      <div className="mt-14">
        <FinalCTA />
      </div>
    </>
  );
}
