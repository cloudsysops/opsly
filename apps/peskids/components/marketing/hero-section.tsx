import Link from 'next/link'
import { PeskidsBrush, PeskidsWave, StarBurst, WiggleLine } from '@/components/brand/peskids-logo'

const stats = [
  { num: '14', label: 'años enseñando' },
  { num: '2 800+', label: 'niños certificados' },
  { num: '6', label: 'niveles graduados' },
]

export function HeroSection(): React.ReactElement {
  return (
    <section className="relative overflow-hidden bg-pk-bg">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:px-14 lg:py-20">
        <div className="relative z-10">
          <span className="pk-pill">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Cupos abiertos · ciclo junio
          </span>

          <h1 className="mt-5 text-5xl font-bold leading-[0.98] tracking-tight text-pk-ink sm:text-6xl lg:text-[5.25rem]">
            Aprenden.
            <br />
            Se divierten.
            <br />
            Son{' '}
            <PeskidsBrush color="#2DB7B0" size={56} tilt={-3} className="sm:text-[4.5rem]">
              Pes
            </PeskidsBrush>
            <PeskidsBrush color="#FF5A1F" size={56} tilt={-3} className="sm:text-[4.5rem]">
              kids
            </PeskidsBrush>
            <span className="text-pk-ink">.</span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-pk-sub">
            Academia de natación para niños desde{' '}
            <strong className="text-pk-ink">3 meses hasta 15 años</strong>. Sede Llanogrande ·
            Medellín. Confianza, disciplina y amor por el agua.
          </p>

          <WiggleLine width={120} className="mt-4" />

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="#contacto"
              className="inline-flex h-12 items-center justify-center rounded-full bg-pk-primary px-6 text-sm font-bold text-white shadow-md shadow-pk-primary/30 transition hover:bg-pk-primary-dark"
            >
              Reservar clase de prueba →
            </Link>
            <Link
              href="/familias"
              className="inline-flex h-12 items-center justify-center rounded-full border border-pk-border bg-pk-surface px-6 text-sm font-bold text-pk-ink transition hover:border-pk-primary/40 hover:bg-pk-snow"
            >
              Ver portal de familias
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-10">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-bold tabular-nums tracking-tight text-pk-ink">{s.num}</p>
                <p className="text-xs text-pk-mutedText">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Visual hero — foto placeholder del diseño */}
        <div className="relative">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#A8DDE3] via-pk-primary to-pk-deep shadow-hero">
            <PeskidsWave
              color="rgba(255,255,255,0.18)"
              height={100}
              className="absolute bottom-0 left-0 right-0"
            />
            <PeskidsWave
              color="rgba(255,255,255,0.1)"
              height={70}
              className="absolute bottom-12 left-0 right-0"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white/70">
              <p className="font-mono text-xs uppercase tracking-[0.16em]">Imagen</p>
              <p className="mt-1 text-sm">Niño nadando · clase real</p>
            </div>
          </div>

          <StarBurst size={28} className="absolute -right-2 top-8" />

          <div className="absolute -left-4 bottom-8 max-w-[260px] rounded-[1.25rem] bg-pk-surface p-4 shadow-card-hover sm:-left-8">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FFE38A] to-pk-sun text-xl">
                🦈
              </span>
              <div>
                <p className="text-sm font-medium leading-snug text-pk-ink">
                  &quot;Mateo pasó del miedo al agua a un clavado de salida en 6 meses.&quot;
                </p>
                <p className="mt-1 text-xs text-pk-mutedText">— Camila, mamá de Mateo (5 años)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
