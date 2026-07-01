'use client';

import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const monthWeeks = [
  [null, null, 1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10, 11, 12],
  [13, 14, 15, 16, 17, 18, 19],
  [20, { d: 21, today: true }, 22, 23, { d: 24, has: true }, 25, 26],
  [27, 28, 29, 30, 31, null, null],
] as const;

type CalendarTimelineItem = {
  time: string;
  title: string;
  tag: string;
  tone: 'teal' | 'slate';
  highlight?: boolean;
};

const calendarTimeline: CalendarTimelineItem[] = [
  { time: '7:00', title: 'Iniciación · Llanogrande', tag: 'Grupo pequeño', tone: 'teal' },
  { time: '10:30', title: 'Técnica Junior', tag: 'Trabajo respiración', tone: 'slate' },
  {
    time: '3:30',
    title: 'Hoy · Grupo Iniciación',
    tag: 'Clase confirmada',
    tone: 'teal',
    highlight: true,
  },
  { time: '5:00', title: 'Avanzado', tag: 'Pendiente de asistencia', tone: 'slate' },
] as const;

export function TeacherCalendarShowcase(): React.ReactElement {
  const dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  return (
    <div className="overflow-hidden rounded-[2rem] border border-pk-border bg-white shadow-hero">
      <div className="flex items-center justify-between gap-4 border-b border-pk-border bg-pk-snow px-5 py-4">
        <div>
          <p className="font-bold text-pk-ink">Calendario semanal</p>
          <p className="text-xs text-pk-mutedText">Agenda semanal y ritmo del día</p>
        </div>
        <div className="flex gap-2">
          <div className="rounded-full border border-pk-border bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-pk-mutedText">
            Semana activa
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-7 gap-1">
          {dayLabels.map((label) => (
            <div
              key={label}
              className="pb-1 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-pk-mutedText"
            >
              {label}
            </div>
          ))}
          {monthWeeks.flat().map((cell, index) => {
            if (cell === null) return <div key={index} />;
            const day = typeof cell === 'object' ? cell.d : cell;
            const today = typeof cell === 'object' && 'today' in cell && cell.today;
            const has = typeof cell === 'object' && 'has' in cell && cell.has;

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
                {today ? (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-pk-sun" />
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-4 space-y-2">
          {calendarTimeline.map((item) => {
            const toneMap = {
              teal: 'bg-pk-primary text-white',
              slate: 'border border-pk-border bg-pk-snow text-pk-ink',
            } as const;

            return (
              <div
                key={item.title}
                className={cn(
                  'rounded-2xl px-3 py-3',
                  toneMap[item.tone],
                  item.highlight && 'shadow-card-hover'
                )}
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
                    item.tone === 'slate' ? 'opacity-70' : 'opacity-90'
                  )}
                >
                  {item.tag}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
