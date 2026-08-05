import Image from 'next/image';
import { cn } from '@/lib/utils';
import { peskidsColorTokens } from '@/lib/tokens';

/** Public brand mark — see docs/brand/peskids/BRAND.md */
export const PESKIDS_LOGO_MARK_SRC = '/brand/logo-mark.svg';
export const PESKIDS_LOGO_PNG_SRC = '/brand/logo-official.png';

interface PeskidsLogoProps {
  size?: number;
  className?: string;
}

/** Logo circular oficial (4 colores + wordmark). */
export function PeskidsLogo({ size = 96, className }: PeskidsLogoProps): React.ReactElement {
  return (
    <Image
      src={PESKIDS_LOGO_PNG_SRC}
      alt="Peskids natación"
      width={size}
      height={size}
      className={cn('shrink-0 rounded-full object-cover', className)}
      style={{ width: size, height: size }}
      priority={size >= 64}
    />
  );
}

interface PeskidsLockupProps {
  height?: number;
  color?: string;
  tag?: string;
  className?: string;
}

export function PeskidsLockup({
  height = 48,
  color = peskidsColorTokens.primary.blue,
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
  );
}

interface PeskidsBrushProps {
  children: React.ReactNode;
  size?: number;
  color?: string;
  tilt?: number;
  className?: string;
}

export function PeskidsBrush({
  children,
  size = 64,
  color = peskidsColorTokens.primary.blue,
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
  );
}

export function PeskidsWave({
  className,
  color = peskidsColorTokens.primary.teal,
  height = 40,
}: {
  className?: string;
  color?: string;
  height?: number;
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
  );
}

export function WiggleLine({
  width = 80,
  color = peskidsColorTokens.primary.teal,
  className,
}: {
  width?: number;
  color?: string;
  className?: string;
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
  );
}

export function StarBurst({
  size = 32,
  color = peskidsColorTokens.secondary.yellow,
  className,
}: {
  size?: number;
  color?: string;
  className?: string;
}): React.ReactElement {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden>
      <path
        d="M20 2 L23 14 L36 14 L26 22 L30 34 L20 27 L10 34 L14 22 L4 14 L17 14 Z"
        fill={color}
      />
    </svg>
  );
}
