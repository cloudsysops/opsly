import Link from 'next/link'
import {
  CalendarClock,
  CreditCard,
  Gift,
  MessageSquare,
  Sparkles,
  Star,
  Bell,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  ShieldCheck,
  Waves,
  BadgePercent,
  Link2,
} from 'lucide-react'
import { PeskidsLogo, PeskidsWave, StarBurst } from '@/components/brand/peskids-logo'
import { GrowthWidget } from '@/components/progress/growth-widget'
import { Card, CardContent } from '@/components/ui/card'
import { peskidsColorTokens } from '@/lib/tokens'
import { cn } from '@/lib/utils'

const parentActions = [
  { icon: CalendarClock, label: 'Reservar' },
  { icon: CreditCard, label: 'Pagar' },
  { icon: MessageSquare, label: 'Mensaje' },
  { icon: Star, label: 'Progreso' },
]

const week = [
  { day: 'Lun', date: 18, has: false },
  { day: 'Mar', date: 19, has: true, attended: true },
  { day: 'Mié', date: 20, has: false },
  { day: 'Jue', date: 21, has: true, today: true },
  { day: 'Vie', date: 22, has: false },
  { day: 'Sáb', date: 23, has: true },
  { day: 'Dom', date: 24, has: false },
]

const milestones = [
  { name: 'Burbujas', state: 'done', date: 'mar 2025' },
  { name: 'Flotación dorsal', state: 'done', date: 'jul 2025' },
  { name: 'Patada estilo libre', state: 'done', date: 'oct 2025' },
  { name: 'Brazada completa', state: 'current', date: 'En progreso' },
  { name: 'Clavado de salida', state: 'next', date: 'Próximo' },
  { name: 'Estilo mariposa', state: 'next', date: 'Locked' },
]

const onboardingAnswers = [
  'Nunca ha estado en el agua',
  'Se familiariza, no nada solo',
  'Ya nada por su cuenta',
]

const socialPosts = [
  {
    title: 'Ciclo junio · cupos abiertos',
    tone: 'teal',
    body: 'Disfrutar del agua empieza ya.',
  },
  {
    title: 'Logro desbloqueado',
    tone: 'deep',
    body: 'Mateo subió a Delfines 🐬',
  },
  {
    title: '¿Sabías que…?',
    tone: 'coral',
    body: 'Tu bebé puede nadar desde los 6 meses.',
  },
]

const adminLeads = [
  {
    name: 'Camila Restrepo',
    email: 'camila@correo.com',
    note: 'Nivel 2 · solicita clase de prueba',
    tone: 'teal',
  },
  {
    name: 'Sebastián Pérez',
    email: 'sebastian@correo.com',
    note: 'Nivel 4 · pidió cupo nocturno',
    tone: 'amber',
  },
  {
    name: 'Laura Gómez',
    email: 'laura@correo.com',
    note: 'Feedback 4/5 · seguimiento hoy',
    tone: 'coral',
  },
]

export function PortalShowcase(): React.ReactElement {
  return (
    <section className="relative overflow-hidden bg-pk-bg pb-16 pt-14 sm:pt-20">
      <PeskidsWave
        color={`${peskidsColorTokens.primary.teal}14`}
        height={72}
        className="absolute left-0 right-0 top-0"
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-14">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="relative z-10">
            <p className="pk-eyebrow">Portal de familias</p>
            <h1 className="mt-4 max-w-xl text-4xl font-bold tracking-tight text-pk-ink sm:text-5xl lg:text-[4.5rem]">
              Todo lo importante de Peskids, en un solo lugar.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-pk-sub">
              Reservas, progreso, mensajes y pagos para familias y staff.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/#contacto"
                className={cn(
                  'inline-flex h-12 items-center justify-center gap-2 rounded-full bg-pk-primary px-6 text-sm font-bold text-white shadow-md shadow-pk-primary/30 transition-all duration-150 hover:bg-pk-primary-dark active:scale-[0.99]'
                )}
              >
                Reservar clase
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/familias/login"
                className={cn(
                  'inline-flex h-12 items-center justify-center gap-2 rounded-full border border-pk-primary/20 bg-white px-6 text-sm font-bold text-pk-ink transition-all duration-150 hover:border-pk-primary/40 hover:bg-pk-snow'
                )}
              >
                Acceso familias
              </Link>
              <Link
                href="/admin"
                className={cn(
                  'inline-flex h-12 items-center justify-center gap-2 rounded-full border border-pk-border bg-pk-surface px-6 text-sm font-bold text-pk-ink transition-all duration-150 hover:border-pk-primary/40 hover:bg-pk-snow'
                )}
              >
                Ver panel admin
              </Link>
            </div>

            <div className="mt-10 grid max-w-xl grid-cols-3 gap-4">
              <MetricCard value="1" label="portal" />
              <MetricCard value="5" label="flujos" />
              <MetricCard value="Tiempo real" label="mensajes" compact />
            </div>
          </div>

          <div className="relative">
            <HomePreview />
            <div className="absolute -right-3 top-6">
              <StarBurst size={26} />
            </div>
            <div className="absolute -left-4 bottom-8 max-w-[250px] rounded-[1.25rem] border border-pk-border bg-pk-surface p-4 shadow-card-hover">
              <div className="flex gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
                  style={{
                    backgroundImage: `linear-gradient(to bottom right, ${peskidsColorTokens.secondary.lightYellow}, #FFC20E)`,
                  }}
                >
                  🦈
                </span>
                <div>
                  <p className="text-sm font-medium leading-snug text-pk-ink">
                    &quot;Mateo pasó del miedo al agua a un clavado de salida en 6 meses.&quot;
                  </p>
                  <p className="mt-1 text-xs text-pk-mutedText">— Camila, mamá de Mateo</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-5 xl:grid-cols-3">
          <PreviewFrame
            eyebrow="Agenda"
            title="Calendario y turnos"
            description="Lo que viene hoy, esta semana y lo que está pendiente."
            accent="teal"
            className="xl:col-span-2"
          >
            <SchedulePreview />
          </PreviewFrame>

          <PreviewFrame
            eyebrow="Admin"
            title="Operación y alertas"
            description="Leads, mensajes y seguimiento del equipo."
            accent="coral"
          >
            <AdminPreview />
          </PreviewFrame>

          <PreviewFrame
            eyebrow="Progreso"
            title="Nivel y logros"
            description="Lo que ya avanzó y lo que viene después."
            accent="amber"
          >
            <ProgressPreview />
          </PreviewFrame>

          <PreviewFrame
            eyebrow="Onboarding"
            title="Primer ingreso"
            description="El alta del peque y el primer plan."
            accent="violet"
          >
            <OnboardingPreview />
          </PreviewFrame>

          <PreviewFrame
            eyebrow="Redes"
            title="Feed y stories"
            description="Piezas listas para vender y educar."
            accent="slate"
          >
            <SocialPreview />
          </PreviewFrame>
        </div>

        <div className="mt-14">
          <GrowthWidget
            eyebrow="Metas y logros"
            title="Progreso que se entiende de un vistazo"
            description="Cada familia ve qué se logró, qué sigue y qué necesita constancia para avanzar sin perder tiempo."
            mission="Acompañar al niño con claridad, constancia y señales simples para que toda la familia vea el avance."
            vision="Un peque autónomo en el agua y una familia que entiende el camino sin fricción."
            objectives={['Asistencia', 'Confianza', 'Técnica']}
            achievements={['Primera clase completada', 'Burbujas', 'Flotación dorsal']}
            streakLabel="Racha familiar"
            streakValue="8"
            progressLabel="Progreso hacia el siguiente nivel"
            progressPercent={62}
            accent="amber"
          />
        </div>

        <div className="mt-14 overflow-hidden rounded-[2rem] border border-pk-border bg-white shadow-card">
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
                <MiniReferralStep
                  icon={Link2}
                  title="1. Comparte"
                  text="Pega tu link donde quieras."
                />
                <MiniReferralStep
                  icon={Gift}
                  title="2. Se registra"
                  text="La familia entra con tu código."
                />
                <MiniReferralStep
                  icon={BadgePercent}
                  title="3. Se acredita"
                  text="Tu saldo queda listo para aplicar."
                />
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <div className="rounded-[1.5rem] border border-pk-border bg-pk-bg p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-pk-ink">Tu espacio de familia</p>
                    <p className="mt-1 text-xs text-pk-mutedText">Código, referidos y saldo.</p>
                  </div>
                  <span className="rounded-full bg-pk-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-pk-primary">
                    Activo
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-pk-mutedText">
                      Código de familia
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
                    Acceso familias
                  </Link>
                  <Link
                    href="/#contacto"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-pk-border bg-white px-5 text-sm font-bold text-pk-ink transition hover:border-pk-primary/30 hover:bg-pk-snow"
                  >
                    Reservar clase
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="mt-14 overflow-hidden rounded-[2rem] text-white shadow-hero"
          style={{
            backgroundImage: `linear-gradient(to bottom right, ${peskidsColorTokens.primary.blue}, ${peskidsColorTokens.dark.darkestBlue})`,
          }}
        >
          <div className="grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-10">
            <div>
              <p className="pk-eyebrow text-white/50">Portal listo</p>
              <h2 className="mt-2 max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl">
                Una base visual clara para familias y equipo.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/75">
                El usuario ve progreso, agenda y mensajes en un solo lugar. El equipo puede
                operar sin fricción y mostrar el producto con claridad.
              </p>
            </div>

            <div className="flex flex-col justify-center gap-3 sm:flex-row lg:justify-end">
              <Link
                href="/#contacto"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-pk-sun px-6 text-sm font-bold text-pk-ink transition hover:brightness-105"
              >
                Reservar demo
              </Link>
              <Link
                href="/admin"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Ver operación
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function PreviewFrame({
  eyebrow,
  title,
  description,
  accent,
  className,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  accent: 'teal' | 'amber' | 'coral' | 'violet' | 'slate'
  className?: string
  children: React.ReactNode
}): React.ReactElement {
  return (
    <Card accent={accent} hover className={cn('overflow-hidden', className)}>
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-4 border-b border-pk-border bg-pk-snow px-5 py-4">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-pk-mutedText">
              {eyebrow}
            </p>
            <h3 className="mt-1 text-lg font-bold tracking-tight text-pk-ink">{title}</h3>
            <p className="mt-1 text-sm text-pk-sub">{description}</p>
          </div>
          <PeskidsLogo size={30} />
        </div>
        <div className="p-5">{children}</div>
      </CardContent>
    </Card>
  )
}

function MetricCard({
  value,
  label,
  compact,
}: {
  value: string
  label: string
  compact?: boolean
}): React.ReactElement {
  return (
    <div className="rounded-2xl border border-pk-border bg-pk-surface p-4 shadow-card">
      <p
        className={cn(
          'font-bold tracking-tight text-pk-ink',
          compact ? 'text-sm' : 'text-2xl'
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-pk-mutedText">{label}</p>
    </div>
  )
}

function HomePreview(): React.ReactElement {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-pk-border bg-white shadow-hero">
      <div className="bg-pk-surface/80 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-pk-mutedText">Hola</p>
            <h3 className="text-xl font-bold tracking-tight text-pk-ink">Camila</h3>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pk-bg text-lg">
            <Bell className="h-4 w-4 text-pk-ink" aria-hidden />
          </div>
        </div>
      </div>

      <div className="p-5">
        <div
          className="rounded-[1.75rem] p-5 text-white shadow-card-hover"
          style={{
            backgroundImage: `linear-gradient(to bottom right, ${peskidsColorTokens.primary.teal}, ${peskidsColorTokens.secondary.lightTeal})`,
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/80">
                Próxima clase
              </p>
              <p className="mt-1 text-4xl font-bold tracking-tight">3:30 pm</p>
              <p className="mt-2 text-sm text-white/90">Hoy · 2 h 14 min</p>
            </div>
            <div className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
              Confirmada
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3 border-t border-white/20 pt-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-sm font-bold text-pk-ink">
              SR
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Santiago R.</p>
              <p className="text-xs text-white/85">Llanogrande · Piscina 1</p>
            </div>
            <div className="rounded-full bg-white px-3 py-2 text-xs font-bold text-pk-ink">
              Detalles
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {parentActions.map(({ icon: Icon, label }) => (
            <div key={label} className="rounded-2xl border border-pk-border bg-pk-surface py-3 text-center">
              <Icon className="mx-auto h-5 w-5 text-pk-primary" aria-hidden />
              <p className="mt-2 text-[11px] font-semibold text-pk-ink">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[1.5rem] border border-pk-border bg-pk-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-pk-mutedText">
                  Mateo · 5 años
                </p>
                <h4 className="mt-1 text-lg font-bold tracking-tight text-pk-ink">Delfines</h4>
              </div>
              <div className="font-mono text-[11px] font-bold text-pk-ink">62%</div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-pk-border">
              <div
              className="h-2 w-[62%] rounded-full"
              style={{
                backgroundImage: `linear-gradient(to right, ${peskidsColorTokens.primary.teal}, ${peskidsColorTokens.secondary.lightTeal})`,
              }}
            />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-pk-sub">
              Próximo logro · <span className="font-semibold text-pk-ink">Clavado de salida</span>
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-pk-border bg-pk-surface p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-pk-mutedText">
                  Esta semana
                </p>
                <p className="mt-1 text-sm font-semibold text-pk-ink">Registro de asistencia</p>
              </div>
              <div className="rounded-full border border-pk-border bg-pk-bg px-2 py-1 text-[10px] font-bold text-pk-mutedText">
                3 clases
              </div>
            </div>
            <div className="mt-3 flex gap-1.5">
              {week.map((day) => (
                <div
                  key={day.day}
                  className={cn(
                    'flex-1 rounded-2xl border px-0 py-2 text-center',
                    day.today ? 'border-pk-deep bg-pk-deep text-white' : 'border-pk-border bg-white'
                  )}
                >
                  <p className={cn('text-[9px] font-bold uppercase tracking-[0.08em]', day.today ? 'text-white/70' : 'text-pk-mutedText')}>
                    {day.day}
                  </p>
                  <p className={cn('mt-1 text-[14px] font-bold', day.today ? 'text-white' : 'text-pk-ink')}>
                    {day.date}
                  </p>
                  <div
                    className={cn(
                      'mx-auto mt-1 h-1.5 w-1.5 rounded-full',
                      day.has ? (day.attended ? 'bg-emerald-500' : day.today ? 'bg-pk-sun' : 'bg-pk-primary') : 'bg-transparent'
                    )}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SchedulePreview(): React.ReactElement {
  const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  const weeks = [
    [null, null, 1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10, 11, 12],
    [13, 14, 15, 16, 17, 18, 19],
    [20, { d: 21, today: true }, 22, 23, { d: 24, has: true }, 25, 26],
    [27, 28, 29, 30, 31, null, null],
  ]
  const timeline = [
    { time: '8:00', title: 'Babyswim · Luna', tone: 'pool', tag: '6 meses' },
    { time: '10:30', title: 'Bloque Burbujas', tone: 'gray', tag: '4 cupos' },
    { time: '3:30', title: 'Tu clase · Mateo', tone: 'teal', highlight: true, tag: 'Confirmada' },
    { time: '5:00', title: 'Tiburones · Lucas', tone: 'gray', tag: 'No reservada' },
  ]

  return (
    <div className="rounded-[1.75rem] border border-pk-border bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-pk-ink">Mayo 2026</p>
          <p className="text-xs text-pk-mutedText">Agenda mensual + timeline del día</p>
        </div>
        <div className="flex gap-1">
          <div className="rounded-full border border-pk-border bg-pk-surface px-2 py-1 text-[10px] font-bold text-pk-mutedText">
            Hoy
          </div>
          <div className="rounded-full border border-pk-border bg-pk-surface px-2 py-1 text-[10px] font-bold text-pk-mutedText">
            + Reservar
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1">
        {days.map((day) => (
          <div key={day} className="pb-1 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-pk-mutedText">
            {day}
          </div>
        ))}
        {weeks.flat().map((cell, index) => {
          if (cell === null) return <div key={index} />
          const day = typeof cell === 'object' ? cell.d : cell
          const today = typeof cell === 'object' && cell.today
          const has = typeof cell === 'object' && cell.has

          return (
            <div
              key={index}
              className={cn(
                'relative flex aspect-square items-center justify-center rounded-xl border text-sm font-bold',
                today ? 'border-pk-deep bg-pk-deep text-white' : has ? 'border-pk-primary text-pk-ink' : 'border-transparent text-pk-ink'
              )}
            >
              {day}
              {has && !today ? <span className="absolute bottom-1 h-1 w-1 rounded-full bg-pk-primary" /> : null}
              {today ? <span className="absolute bottom-1 h-1 w-1 rounded-full bg-pk-sun" /> : null}
            </div>
          )
        })}
      </div>

      <div className="mt-4 space-y-2">
        {timeline.map((item) => {
          const toneMap = {
            teal: 'bg-pk-primary text-white',
            pool: 'bg-[#A8DDE3] text-pk-ink',
            gray: 'border border-pk-border bg-pk-snow text-pk-ink',
          } as const
          const tone = toneMap[item.tone as keyof typeof toneMap]
          return (
            <div key={item.title} className={cn('rounded-2xl px-3 py-3', tone, item.highlight && 'shadow-card-hover')}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-80">{item.time}</p>
                {item.highlight ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : null}
              </div>
              <p className="mt-1 text-sm font-bold">{item.title}</p>
              <p className={cn('mt-1 text-[11px]', item.tone === 'gray' ? 'opacity-70' : 'opacity-90')}>
                {item.tag}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ProgressPreview(): React.ReactElement {
  return (
    <div className="rounded-[1.75rem] border border-pk-border bg-white p-4">
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
          style={{
            backgroundImage: `linear-gradient(to bottom right, ${peskidsColorTokens.secondary.lightYellow}, #FFC20E)`,
          }}
        >
          🦈
        </div>
        <div>
          <p className="text-xs text-pk-mutedText">Mateo · 5 años</p>
          <p className="text-lg font-bold tracking-tight text-pk-ink">Nivel 3 · Delfines</p>
        </div>
      </div>

      <div className="mt-4 rounded-[1.5rem] bg-pk-deep p-4 text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/70">Progreso</p>
            <p className="mt-1 text-4xl font-bold tracking-tight text-pk-sun">62%</p>
          </div>
          <Waves className="h-8 w-8 text-white/25" aria-hidden />
        </div>
        <div className="mt-4 h-2 rounded-full bg-white/15">
          <div
            className="h-2 w-[62%] rounded-full"
            style={{
              backgroundImage: `linear-gradient(to right, ${peskidsColorTokens.primary.teal}, #FFC20E)`,
            }}
          />
        </div>
        <p className="mt-3 text-xs text-white/80">
          Próximo logro · <span className="font-semibold text-white">Clavado de salida</span>
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat value="48" label="clases" />
        <MiniStat value="6" label="logros" tone="amber" />
        <MiniStat value="94%" label="asistencia" tone="green" />
      </div>

      <div className="mt-4 space-y-2">
        {milestones.map((item) => {
          const done = item.state === 'done'
          const curr = item.state === 'current'
          return (
            <div key={item.name} className="flex items-center gap-3 rounded-2xl border border-pk-border px-3 py-2.5">
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                  done
                    ? 'border-pk-primary bg-pk-primary text-white'
                    : curr
                      ? 'border-pk-sun bg-pk-sun text-pk-ink'
                      : 'border-pk-border bg-white text-pk-mutedText'
                )}
              >
                {done ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : curr ? '●' : '○'}
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm font-bold', done || curr ? 'text-pk-ink' : 'text-pk-mutedText')}>
                  {item.name}
                </p>
                <p className="text-[11px] text-pk-mutedText">{item.date}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function OnboardingPreview(): React.ReactElement {
  return (
    <div className="rounded-[1.75rem] border border-pk-border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-pk-mutedText">
            Paso 2 de 3
          </p>
          <p className="mt-1 text-lg font-bold tracking-tight text-pk-ink">Cuéntanos sobre tu peque</p>
        </div>
        <div className="flex gap-1.5">
          <div className="h-1.5 w-9 rounded-full bg-pk-primary" />
          <div className="h-1.5 w-9 rounded-full bg-pk-primary" />
          <div className="h-1.5 w-9 rounded-full bg-pk-border" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2">
        {['🦈', '🐬', '🐠', '🐳', '🦭'].map((avatar, index) => (
          <div
            key={avatar}
            className={cn(
              'flex aspect-square items-center justify-center rounded-2xl border text-2xl',
              index === 0 ? 'border-pk-sun bg-gradient-to-br from-[#FFE38A] to-pk-sun' : 'border-pk-border bg-pk-bg'
            )}
          >
            {avatar}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {['Reservar prueba', 'Agregar al peque', 'Elegir plan y pagar'].map((step, index) => (
          <div
            key={step}
            className={cn(
              'rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]',
              index === 0
                ? 'border-pk-primary bg-pk-primary/10 text-pk-primary'
                : 'border-pk-border bg-white text-pk-mutedText'
            )}
          >
            {step}
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        <FieldRow label="Nombre" value="Mateo Restrepo" />
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Edad" value="5 años" />
          <FieldRow label="Género" value="Niño" />
        </div>
      </div>

      <div className="mt-4 rounded-[1.5rem] border border-pk-border bg-pk-snow p-3">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-pk-mutedText">¿Sabe nadar?</p>
        <div className="mt-3 space-y-2">
          {onboardingAnswers.map((answer, index) => (
            <div
              key={answer}
              className={cn(
                'rounded-2xl border px-3 py-2 text-sm',
                index === 1 ? 'border-pk-primary bg-white shadow-sm' : 'border-pk-border bg-white'
              )}
            >
              <p className="font-medium text-pk-ink">{answer}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-[1.5rem] bg-pk-deep p-4 text-white">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/70">Plan sugerido</p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <p className="text-lg font-bold">Constante</p>
            <p className="text-sm text-white/80">2 clases / semana</p>
          </div>
          <p className="text-2xl font-bold text-pk-sun">$320.000</p>
        </div>
      </div>

      <div className="mt-4 rounded-full bg-pk-primary px-4 py-3 text-center text-sm font-bold text-white">
        Continuar → Reservar prueba con Apple Pay
      </div>
    </div>
  )
}

function SocialPreview(): React.ReactElement {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {socialPosts.map((post) => {
          const bg = {
            teal: 'bg-pk-primary',
            deep: 'bg-pk-deep',
            coral: 'bg-pk-accent',
          }[post.tone as 'teal' | 'deep' | 'coral']
          return (
            <div
              key={post.title}
              className={cn('aspect-square rounded-[1.5rem] p-3 text-white', bg)}
            >
              <div className="flex h-full flex-col justify-between">
                <div className="flex items-center justify-between">
                  <PeskidsLogo size={24} />
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/70">
                    #{post.tone}
                  </span>
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/75">
                    Peskids
                  </p>
                  <p className="mt-1 text-sm font-bold leading-tight">{post.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/85">{post.body}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-[1.5rem] border border-pk-border bg-pk-snow p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pk-primary text-white">
            <Sparkles className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-bold text-pk-ink">Story y highlights</p>
            <p className="text-xs text-pk-mutedText">Contenido listo para campañas y recordatorios.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function AdminPreview(): React.ReactElement {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <MiniStat value="87" label="alumnos" tone="teal" />
        <MiniStat value="12" label="clases hoy" tone="amber" />
        <MiniStat value="$24.8M" label="mensualidad" tone="green" />
        <MiniStat value="78%" label="capacidad" tone="slate" />
      </div>

      <div className="rounded-[1.5rem] border border-pk-border bg-white p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-pk-mutedText">Leads nuevos</p>
            <p className="mt-1 text-sm font-bold text-pk-ink">3 respuestas esta semana</p>
          </div>
          <ClipboardList className="h-4 w-4 text-pk-primary" aria-hidden />
        </div>
        <div className="mt-3 space-y-2">
          {adminLeads.map((lead) => (
            <div key={lead.name} className="rounded-2xl border border-pk-border bg-pk-snow px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-pk-ink">{lead.name}</p>
                <span
                  className={cn(
                    'rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em]',
                    lead.tone === 'teal' && 'bg-pk-primary/15 text-pk-primary',
                    lead.tone === 'amber' && 'bg-pk-sun/20 text-[#8B6A00]',
                    lead.tone === 'coral' && 'bg-pk-accent/15 text-pk-accent'
                  )}
                >
                  Lead
                </span>
              </div>
              <p className="mt-1 text-xs text-pk-mutedText">{lead.email}</p>
              <p className="mt-1 text-xs text-pk-sub">{lead.note}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-dashed border-pk-border bg-pk-bg p-3 text-xs text-pk-sub">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-pk-primary" aria-hidden />
          <p>
            El staff ve mensajes, leads y alertas. Las familias no ven esta capa.
          </p>
        </div>
      </div>
    </div>
  )
}

function MiniStat({
  value,
  label,
  tone = 'teal',
}: {
  value: string
  label: string
  tone?: 'teal' | 'amber' | 'green' | 'slate'
}): React.ReactElement {
  const toneClass = {
    teal: 'bg-pk-primary/10 text-pk-primary',
    amber: 'bg-pk-sun/20 text-[#8B6A00]',
    green: 'bg-emerald-50 text-emerald-700',
    slate: 'bg-pk-muted text-pk-sub',
  }[tone]
  return (
    <div className={cn('rounded-2xl p-3', toneClass)}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-75">{label}</p>
      <p className="mt-1 text-lg font-bold tracking-tight">{value}</p>
    </div>
  )
}

function MiniReferralStep({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Gift
  title: string
  text: string
}): React.ReactElement {
  return (
    <div className="rounded-2xl border border-pk-border bg-white p-4 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pk-primary/10 text-pk-primary">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <p className="mt-3 text-sm font-bold text-pk-ink">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-pk-sub">{text}</p>
    </div>
  )
}

function FieldRow({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="rounded-2xl border border-pk-border bg-pk-snow px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-pk-mutedText">{label}</p>
      <p className="mt-1 text-sm font-semibold text-pk-ink">{value}</p>
    </div>
  )
}
