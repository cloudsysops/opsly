import { Sparkles, CheckCircle2, ClipboardList, ShieldCheck, Waves } from 'lucide-react';
import { PeskidsLogo } from '@/components/brand/peskids-logo';
import { Card, CardContent } from '@/components/ui/card';
import { peskidsColorTokens } from '@/lib/tokens';
import { cn } from '@/lib/utils';

const milestones = [
  { name: 'Burbujas', state: 'done', date: 'mar 2025' },
  { name: 'Flotación dorsal', state: 'done', date: 'jul 2025' },
  { name: 'Patada estilo libre', state: 'done', date: 'oct 2025' },
  { name: 'Brazada completa', state: 'current', date: 'En progreso' },
  { name: 'Clavado de salida', state: 'next', date: 'Próximo' },
  { name: 'Estilo mariposa', state: 'next', date: 'Locked' },
];

const onboardingAnswers = [
  'Nunca ha estado en el agua',
  'Se familiariza, no nada solo',
  'Ya nada por su cuenta',
];

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
];

const adminLeads = [
  {
    name: 'Camila Restrepo',
    email: 'camila@correo.com',
    note: 'Grupo 2 · solicita clase de prueba',
    tone: 'teal',
  },
  {
    name: 'Sebastián Pérez',
    email: 'sebastian@correo.com',
    note: 'Grupo 4 · pidió cupo nocturno',
    tone: 'amber',
  },
  {
    name: 'Laura Gómez',
    email: 'laura@correo.com',
    note: 'Feedback 4/5 · seguimiento hoy',
    tone: 'coral',
  },
];

function PreviewFrame({
  eyebrow,
  title,
  description,
  accent,
  className,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  accent: 'teal' | 'amber' | 'coral' | 'violet' | 'slate';
  className?: string;
  children: React.ReactNode;
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
  );
}

function MiniStat({
  value,
  label,
  tone = 'teal',
}: {
  value: string;
  label: string;
  tone?: 'teal' | 'amber' | 'green' | 'slate';
}): React.ReactElement {
  const toneClass = {
    teal: 'bg-pk-primary/10 text-pk-primary',
    amber: 'bg-pk-sun/20 text-[#8B6A00]',
    green: 'bg-emerald-50 text-emerald-700',
    slate: 'bg-pk-muted text-pk-sub',
  }[tone];
  return (
    <div className={cn('rounded-2xl p-3', toneClass)}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-75">{label}</p>
      <p className="mt-1 text-lg font-bold tracking-tight">{value}</p>
    </div>
  );
}

function SchedulePreview(): React.ReactElement {
  const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const weeks = [
    [null, null, 1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10, 11, 12],
    [13, 14, 15, 16, 17, 18, 19],
    [20, { d: 21, today: true }, 22, 23, { d: 24, has: true }, 25, 26],
    [27, 28, 29, 30, 31, null, null],
  ];
  const timeline = [
    { time: '8:00', title: 'Babyswim · Luna', tone: 'pool', tag: '6 meses' },
    { time: '10:30', title: 'Bloque Burbujas', tone: 'gray', tag: '4 cupos' },
    { time: '3:30', title: 'Tu clase · Mateo', tone: 'teal', highlight: true, tag: 'Confirmada' },
    { time: '5:00', title: 'Tiburones · Lucas', tone: 'gray', tag: 'No reservada' },
  ];

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
          <div
            key={day}
            className="pb-1 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-pk-mutedText"
          >
            {day}
          </div>
        ))}
        {weeks.flat().map((cell, index) => {
          if (cell === null) return <div key={index} />;
          const day = typeof cell === 'object' ? cell.d : cell;
          const today = typeof cell === 'object' && cell.today;
          const has = typeof cell === 'object' && cell.has;

          return (
            <div
              key={index}
              className={cn(
                'relative flex aspect-square items-center justify-center rounded-xl border text-sm font-bold',
                today
                  ? 'border-pk-deep bg-pk-deep text-white'
                  : has
                    ? 'border-pk-primary text-pk-ink'
                    : 'border-transparent text-pk-ink'
              )}
            >
              {day}
              {has && !today ? (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-pk-primary" />
              ) : null}
              {today ? <span className="absolute bottom-1 h-1 w-1 rounded-full bg-pk-sun" /> : null}
            </div>
          );
        })}
      </div>

      <div className="mt-4 space-y-2">
        {timeline.map((item) => {
          const toneMap = {
            teal: 'bg-pk-primary text-white',
            pool: 'bg-[#A8DDE3] text-pk-ink',
            gray: 'border border-pk-border bg-pk-snow text-pk-ink',
          } as const;
          const tone = toneMap[item.tone as keyof typeof toneMap];
          return (
            <div
              key={item.title}
              className={cn('rounded-2xl px-3 py-3', tone, item.highlight && 'shadow-card-hover')}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-80">
                  {item.time}
                </p>
                {item.highlight ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : null}
              </div>
              <p className="mt-1 text-sm font-bold">{item.title}</p>
              <p
                className={cn(
                  'mt-1 text-[11px]',
                  item.tone === 'gray' ? 'opacity-70' : 'opacity-90'
                )}
              >
                {item.tag}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
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
            <p className="text-lg font-bold tracking-tight text-pk-ink">Grupo por edad · Delfín</p>
          </div>
        </div>

      <div className="mt-4 rounded-[1.5rem] bg-pk-deep p-4 text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/70">
              Progreso
            </p>
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
          const done = item.state === 'done';
          const curr = item.state === 'current';
          return (
            <div
              key={item.name}
              className="flex items-center gap-3 rounded-2xl border border-pk-border px-3 py-2.5"
            >
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
                <p
                  className={cn(
                    'text-sm font-bold',
                    done || curr ? 'text-pk-ink' : 'text-pk-mutedText'
                  )}
                >
                  {item.name}
                </p>
                <p className="text-[11px] text-pk-mutedText">{item.date}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OnboardingPreview(): React.ReactElement {
  return (
    <div className="rounded-[1.75rem] border border-pk-border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-pk-mutedText">
            Paso 2 de 3
          </p>
          <p className="mt-1 text-lg font-bold tracking-tight text-pk-ink">
            Cuéntanos sobre tu peque
          </p>
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
              index === 0
                ? 'border-pk-sun bg-gradient-to-br from-[#FFE38A] to-pk-sun'
                : 'border-pk-border bg-pk-bg'
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
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-pk-mutedText">
          ¿Sabe nadar?
        </p>
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
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/70">
          Plan sugerido
        </p>
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
  );
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
          }[post.tone as 'teal' | 'deep' | 'coral'];
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
          );
        })}
      </div>

      <div className="rounded-[1.5rem] border border-pk-border bg-pk-snow p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pk-primary text-white">
            <Sparkles className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-bold text-pk-ink">Story y highlights</p>
            <p className="text-xs text-pk-mutedText">
              Contenido listo para campañas y recordatorios.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
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
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-pk-mutedText">
              Interesados nuevos
            </p>
            <p className="mt-1 text-sm font-bold text-pk-ink">3 respuestas esta semana</p>
          </div>
          <ClipboardList className="h-4 w-4 text-pk-primary" aria-hidden />
        </div>
        <div className="mt-3 space-y-2">
          {adminLeads.map((lead) => (
            <div
              key={lead.name}
              className="rounded-2xl border border-pk-border bg-pk-snow px-3 py-2"
            >
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
                  Interesado
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
          <p>El staff ve mensajes, interesados y alertas. Las familias no ven esta capa.</p>
        </div>
      </div>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="rounded-2xl border border-pk-border bg-pk-snow px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-pk-mutedText">{label}</p>
      <p className="mt-1 text-sm font-semibold text-pk-ink">{value}</p>
    </div>
  );
}

export function PortalShowcaseFeatures(): React.ReactElement {
  return (
    <div className="grid gap-5 xl:grid-cols-3">
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
        description="Interesados, mensajes y seguimiento del equipo."
        accent="coral"
      >
        <AdminPreview />
      </PreviewFrame>

      <PreviewFrame
        eyebrow="Progreso"
        title="Grupos por edad y logros"
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
  );
}
