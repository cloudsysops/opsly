'use client'

import { useEffect, useMemo, useState } from 'react'
import { RotateCcw, ShieldCheck, Sparkles, Trophy, Waves } from 'lucide-react'

type MissionId = 'bubbles' | 'streamline' | 'kick'
type Progress = Record<MissionId, number>

const EMPTY_PROGRESS: Progress = {
  bubbles: 0,
  streamline: 0,
  kick: 0,
}

const STORAGE_KEY = 'peskids-swim-home-progress-v1'

export function SwimHomeGame(): React.ReactElement {
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS)
  const [mission, setMission] = useState<MissionId>('bubbles')
  const [bubbleCount, setBubbleCount] = useState(0)
  const [kickCount, setKickCount] = useState(0)
  const [nextKick, setNextKick] = useState<'left' | 'right'>('left')
  const [feedback, setFeedback] = useState('Elige una misión y juega con Peki.')
  const [parentMode, setParentMode] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setProgress({ ...EMPTY_PROGRESS, ...JSON.parse(stored) })
      }
    } catch {
      // Local progress is optional; the game remains playable without storage.
    }
  }, [])

  const stars = useMemo(
    () => Object.values(progress).reduce((total, value) => total + value, 0),
    [progress],
  )

  function save(next: Progress) {
    setProgress(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Ignore unavailable storage.
    }
  }

  function completeMission(id: MissionId) {
    const next = { ...progress, [id]: Math.max(progress[id], 1) }
    save(next)
    setFeedback('⭐ ¡Misión completada! Peki guardó una estrella en este dispositivo.')
  }

  function tapBubble() {
    const next = bubbleCount + 1
    setBubbleCount(next)
    setFeedback(`Burbuja ${next} de 8. Sopla suave; nunca aguantes la respiración.`)
    if (next >= 8) completeMission('bubbles')
  }

  function answerStreamline(correct: boolean) {
    if (correct) {
      completeMission('streamline')
      return
    }
    setFeedback('Casi. Busca la postura larga: brazos arriba, cuerpo alineado y mirada al frente.')
  }

  function tapKick(side: 'left' | 'right') {
    if (side !== nextKick) {
      setFeedback(`Ahora toca ${nextKick === 'left' ? 'izquierda' : 'derecha'}.`)
      return
    }

    const next = kickCount + 1
    setKickCount(next)
    setNextKick(side === 'left' ? 'right' : 'left')
    setFeedback(`Ritmo ${next} de 10. Alterna suave: izquierda, derecha.`)
    if (next >= 10) completeMission('kick')
  }

  function resetCurrent() {
    setBubbleCount(0)
    setKickCount(0)
    setNextKick('left')
    setFeedback('Misión reiniciada. Listos para intentarlo otra vez.')
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] bg-[#062F46] p-5 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-extrabold tracking-[0.16em] text-[#CFF7F2]">
              <Waves className="h-4 w-4" aria-hidden />
              PEKI EN CASA
            </div>
            <h1 className="mt-4 text-3xl font-black sm:text-5xl">Entrena habilidades de natación jugando.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
              Misiones cortas para practicar coordinación, postura y confianza fuera del agua,
              junto a un adulto.
            </p>
          </div>

          <div className="flex min-w-36 items-center justify-center gap-3 rounded-3xl bg-white/10 px-5 py-4">
            <Trophy className="h-8 w-8 text-[#FFD56A]" aria-hidden />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-white/60">Estrellas</div>
              <div className="text-3xl font-black">{stars}/3</div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border-2 border-[#F7C948] bg-[#FFF8DC] p-4 text-[#684C00] sm:p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0" aria-hidden />
          <div>
            <h2 className="font-black">Regla de seguridad</h2>
            <p className="mt-1 text-sm leading-6">
              Estas misiones son para practicar <strong>fuera del agua</strong>. No las hagas solo
              en piscina, bañera, tina ni recipientes con agua. La práctica acuática siempre debe
              ser con supervisión adulta directa y siguiendo las indicaciones del profesor.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3" aria-label="Misiones de Peki">
        <MissionButton
          active={mission === 'bubbles'}
          complete={progress.bubbles > 0}
          title="Burbujas"
          subtitle="Respiración suave"
          onClick={() => {
            setMission('bubbles')
            setFeedback('Toca la burbuja 8 veces y acompaña cada toque con una exhalación suave.')
          }}
        />
        <MissionButton
          active={mission === 'streamline'}
          complete={progress.streamline > 0}
          title="Flecha"
          subtitle="Postura larga"
          onClick={() => {
            setMission('streamline')
            setFeedback('Encuentra la postura que se parece a una flecha.')
          }}
        />
        <MissionButton
          active={mission === 'kick'}
          complete={progress.kick > 0}
          title="Patada"
          subtitle="Ritmo alternado"
          onClick={() => {
            setMission('kick')
            setFeedback('Alterna izquierda y derecha hasta completar 10 toques.')
          }}
        />
      </div>

      <section className="rounded-[30px] border border-[#D6E9E5] bg-white p-5 shadow-sm sm:p-8">
        {mission === 'bubbles' ? (
          <div className="text-center">
            <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[#2A8F88]">Misión 1</p>
            <h2 className="mt-2 text-3xl font-black text-[#063B4A]">Burbujas con Peki</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#55747B]">
              Sentado o de pie, lejos del agua: toca la burbuja y sopla suavemente. No aguantes la
              respiración.
            </p>
            <button
              type="button"
              onClick={tapBubble}
              className="mx-auto mt-8 flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-br from-[#8FE7DC] to-[#2DB7B0] text-6xl shadow-[0_18px_50px_rgba(45,183,176,0.28)] transition active:scale-95"
              aria-label="Tocar burbuja"
            >
              🫧
            </button>
            <div className="mt-5 text-2xl font-black text-[#087D78]">{Math.min(bubbleCount, 8)}/8</div>
          </div>
        ) : null}

        {mission === 'streamline' ? (
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[#2A8F88]">Misión 2</p>
            <h2 className="mt-2 text-3xl font-black text-[#063B4A]">¿Cuál es la flecha?</h2>
            <p className="mt-2 text-sm leading-6 text-[#55747B]">
              Elige la postura que ayuda a mantener el cuerpo largo y alineado.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <QuizButton label="Brazos arriba y cuerpo largo ↗" onClick={() => answerStreamline(true)} />
              <QuizButton label="Brazos cruzados y hombros cerrados" onClick={() => answerStreamline(false)} />
              <QuizButton label="Sentado y encorvado" onClick={() => answerStreamline(false)} />
            </div>
          </div>
        ) : null}

        {mission === 'kick' ? (
          <div className="text-center">
            <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[#2A8F88]">Misión 3</p>
            <h2 className="mt-2 text-3xl font-black text-[#063B4A]">Ritmo de patada</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#55747B]">
              Sentado en una silla estable, toca los botones alternando izquierda y derecha.
            </p>
            <div className="mx-auto mt-8 grid max-w-lg grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => tapKick('left')}
                className="min-h-28 rounded-3xl bg-[#E8F8F5] text-xl font-black text-[#087D78] active:scale-95"
              >
                ← Izquierda
              </button>
              <button
                type="button"
                onClick={() => tapKick('right')}
                className="min-h-28 rounded-3xl bg-[#E8F8F5] text-xl font-black text-[#087D78] active:scale-95"
              >
                Derecha →
              </button>
            </div>
            <div className="mt-5 text-2xl font-black text-[#087D78]">{Math.min(kickCount, 10)}/10</div>
          </div>
        ) : null}

        <div className="mt-7 flex flex-col gap-3 rounded-2xl bg-[#F4FAF8] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-[#315B64]" aria-live="polite">{feedback}</p>
          <button
            type="button"
            onClick={resetCurrent}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#B9DCD6] px-4 text-sm font-extrabold text-[#087D78]"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Reiniciar
          </button>
        </div>
      </section>

      <section className="rounded-[30px] bg-[#EAF7FF] p-5 sm:p-8">
        <button
          type="button"
          onClick={() => setParentMode((value) => !value)}
          className="flex w-full items-center justify-between gap-4 text-left"
          aria-expanded={parentMode}
        >
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[#3176A3]">Para padres</p>
            <h2 className="mt-1 text-2xl font-black text-[#063B4A]">Acompañamiento en casa</h2>
          </div>
          <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#3176A3]">
            {parentMode ? 'Cerrar' : 'Abrir'}
          </span>
        </button>

        {parentMode ? (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <ParentCard
              title="1. Flecha seca"
              body="En una colchoneta o piso despejado, practicar brazos extendidos arriba y cuerpo largo. Sin agua."
            />
            <ParentCard
              title="2. Ritmo suave"
              body="Sentado en una silla estable, alternar pies con movimientos pequeños y controlados. Priorizar coordinación, no velocidad."
            />
            <ParentCard
              title="3. Conversar"
              body="Preguntar qué aprendió en clase, qué le dio confianza y qué quiere volver a practicar con su profesor."
            />
          </div>
        ) : null}
      </section>

      <section className="rounded-[30px] border border-[#D6E9E5] bg-white p-5 sm:p-8">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-1 h-6 w-6 shrink-0 text-[#2DB7B0]" aria-hidden />
          <div>
            <h2 className="text-xl font-black text-[#063B4A]">Siguiente evolución</h2>
            <p className="mt-2 text-sm leading-6 text-[#55747B]">
              El progreso de esta primera versión queda solo en el dispositivo. La siguiente fase
              puede vincular estrellas, misiones recomendadas por el profesor y progreso del alumno
              al portal de familias, con control adulto.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

function MissionButton({
  active,
  complete,
  title,
  subtitle,
  onClick,
}: {
  active: boolean
  complete: boolean
  title: string
  subtitle: string
  onClick: () => void
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-24 rounded-2xl border-2 p-4 text-left transition ${active
        ? 'border-[#2DB7B0] bg-[#E9F8F5]'
        : 'border-[#D6E9E5] bg-white hover:border-[#8AD8CF]'}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-black text-[#063B4A]">{title}</span>
        <span aria-label={complete ? 'completada' : 'pendiente'}>{complete ? '⭐' : '○'}</span>
      </div>
      <div className="mt-1 text-xs font-bold text-[#648087]">{subtitle}</div>
    </button>
  )
}

function QuizButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-24 rounded-2xl border-2 border-[#D6E9E5] bg-[#F8FCFB] p-4 text-left font-extrabold text-[#315B64] transition hover:border-[#2DB7B0] active:scale-[0.99]"
    >
      {label}
    </button>
  )
}

function ParentCard({ title, body }: { title: string; body: string }): React.ReactElement {
  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm">
      <h3 className="font-black text-[#063B4A]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#55747B]">{body}</p>
    </article>
  )
}
