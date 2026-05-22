import { cn } from '@/lib/utils'

interface PeskidsLogoProps {
  size?: number
  className?: string
}

/** Logo circular pinwheel (4 colores) + wordmark brush */
export function PeskidsLogo({ size = 96, className }: PeskidsLogoProps): React.ReactElement {
  return (
    <div
      className={cn('relative inline-block shrink-0 overflow-hidden rounded-full', className)}
      style={{
        width: size,
        height: size,
        background:
          'conic-gradient(from -45deg, #2DB7B0 0deg 90deg, #FFC20E 90deg 180deg, #0D4C63 180deg 270deg, #FF5A1F 270deg 360deg)',
      }}
      aria-hidden
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <span
          className="font-brush leading-none"
          style={{
            fontSize: size * 0.34,
            transform: `rotate(-3deg) translateY(${size * 0.015}px)`,
            textShadow: `0 ${size * 0.012}px ${size * 0.025}px rgba(0,0,0,0.18)`,
          }}
        >
          Peskids
        </span>
        <span
          className="font-sans font-semibold italic opacity-95"
          style={{ fontSize: size * 0.11, letterSpacing: '0.04em', marginTop: size * 0.008 }}
        >
          natación
        </span>
      </div>
    </div>
  )
}

interface PeskidsLockupProps {
  height?: number
  color?: string
  tag?: string
  className?: string
}

export function PeskidsLockup({
  height = 48,
  color = '#0D4C63',
  tag = 'NATACIÓN · MEDELLÍN',
  className,
}: PeskidsLockupProps): React.ReactElement {
  return (
    <div className={cn('flex items-center', className)} style={{ gap: height * 0.3 }}>
      <PeskidsLogo size={height} />
      <div className="flex flex-col leading-none">
        <span
          className="font-brush inline-block origin-left"
          style={{
            fontSize: height * 0.78,
            color,
            transform: 'rotate(-2deg)',
            lineHeight: 0.9,
          }}
        >
          Peskids
        </span>
        {tag ? (
          <span
            className="mt-1 font-sans font-bold uppercase opacity-55"
            style={{ fontSize: height * 0.18, letterSpacing: '0.22em', color }}
          >
            {tag}
          </span>
        ) : null}
      </div>
    </div>
  )
}

interface PeskidsBrushProps {
  children: React.ReactNode
  size?: number
  color?: string
  tilt?: number
  className?: string
}

export function PeskidsBrush({
  children,
  size = 64,
  color = '#0D4C63',
  tilt = -2,
  className,
}: PeskidsBrushProps): React.ReactElement {
  return (
    <span
      className={cn('font-brush inline-block leading-none', className)}
      style={{
        fontSize: size,
        color,
        transform: `rotate(${tilt}deg)`,
      }}
    >
      {children}
    </span>
  )
}

export function PeskidsWave({
  className,
  color = '#2DB7B0',
  height = 40,
}: {
  className?: string
  color?: string
  height?: number
}): React.ReactElement {
  return (
    <svg
      viewBox="0 0 1200 80"
      className={cn('block w-full', className)}
      style={{ height }}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d="M0,40 C150,80 300,0 450,40 C600,80 750,0 900,40 C1050,80 1150,20 1200,40 L1200,80 L0,80 Z"
        fill={color}
      />
    </svg>
  )
}

export function WiggleLine({
  width = 80,
  color = '#2DB7B0',
  className,
}: {
  width?: number
  color?: string
  className?: string
}): React.ReactElement {
  return (
    <svg viewBox="0 0 80 18" width={width} height={18} className={className} aria-hidden>
      <path
        d="M2,9 C12,2 22,16 32,9 C42,2 52,16 62,9 C72,2 78,9 78,9"
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </svg>
  )
}

export function StarBurst({
  size = 32,
  color = '#FFC20E',
  className,
}: {
  size?: number
  color?: string
  className?: string
}): React.ReactElement {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden>
      <path
        d="M20 2 L23 14 L36 14 L26 22 L30 34 L20 27 L10 34 L14 22 L4 14 L17 14 Z"
        fill={color}
      />
    </svg>
  )
}
