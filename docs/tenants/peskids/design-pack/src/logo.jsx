// Peskids logo — recreated from the brand board.
// Circular, 4 colored quadrants pinwheel, "Peskids" brush wordmark
// in white tilted slightly, "natación" tagline below.

function PeskidsLogo({ size = 96, style = {} }) {
  const s = size;
  return (
    <div style={{
      width: s, height: s, borderRadius: '50%', overflow: 'hidden',
      position: 'relative', display: 'inline-block', flexShrink: 0,
      // 4-color pinwheel via conic-gradient. Starts at -45deg so each
      // color owns a clean diagonal quarter.
      background: 'conic-gradient(from -45deg, #2DB7B0 0deg 90deg, #FFC20E 90deg 180deg, #0D4C63 180deg 270deg, #FF5A1F 270deg 360deg)',
      ...style,
    }}>
      {/* Wordmark */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column',
      }}>
        <span style={{
          fontFamily: "'Caveat Brush', cursive",
          fontWeight: 400, fontSize: s * 0.34, lineHeight: 0.9,
          color: '#fff', letterSpacing: '-0.005em',
          transform: `rotate(-3deg) translateY(${s * 0.015}px)`,
          textShadow: `0 ${s*0.012}px ${s*0.025}px rgba(0,0,0,0.18)`,
        }}>Peskids</span>
        <span style={{
          fontFamily: "'Nunito', system-ui, sans-serif",
          fontWeight: 600, fontStyle: 'italic',
          fontSize: s * 0.11, color: '#fff', opacity: 0.95,
          letterSpacing: '0.04em',
          marginTop: s * 0.008,
        }}>natación</span>
      </div>
    </div>
  );
}

// Horizontal lockup — mark + wordmark to the right.
function PeskidsLockup({ height = 48, color = '#0D4C63', tag = 'NATACIÓN · MEDELLÍN', style = {} }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: height * 0.3, ...style }}>
      <PeskidsLogo size={height} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{
          fontFamily: "'Caveat Brush', cursive",
          fontWeight: 400, fontSize: height * 0.78,
          color, letterSpacing: '-0.005em',
          transform: 'rotate(-2deg)', transformOrigin: 'left center',
          lineHeight: 0.9,
        }}>Peskids</span>
        {tag && (
          <span style={{
            fontFamily: "'Nunito', system-ui, sans-serif",
            fontWeight: 700, fontSize: height * 0.18,
            color, opacity: 0.55, letterSpacing: '0.22em',
            marginTop: height * 0.14, textTransform: 'uppercase',
          }}>{tag}</span>
        )}
      </div>
    </div>
  );
}

// Brush-script display word — for "Peskids" inside larger headlines.
function PeskidsBrush({ children, size = 64, color = '#0D4C63', tilt = -2, style = {} }) {
  return (
    <span style={{
      fontFamily: "'Caveat Brush', cursive",
      fontWeight: 400, fontSize: size, lineHeight: 0.95,
      color, letterSpacing: '-0.005em',
      display: 'inline-block', transform: `rotate(${tilt}deg)`,
      ...style,
    }}>{children}</span>
  );
}

// Wave divider — reusable graphic motif.
function PeskidsWave({ width = '100%', height = 40, color = '#2DB7B0', style = {} }) {
  return (
    <svg viewBox="0 0 1200 80" width={width} height={height} preserveAspectRatio="none" style={{ display: 'block', ...style }}>
      <path d="M0,40 C150,80 300,0 450,40 C600,80 750,0 900,40 C1050,80 1150,20 1200,40 L1200,80 L0,80 Z" fill={color} />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────
// Decorative graphic elements — blobs, dots, stars
// ──────────────────────────────────────────────────────────

function Blob({ color = '#FF5A1F', size = 80, variant = 0, style = {} }) {
  const paths = [
    "M40,5 C60,5 80,20 78,45 C76,65 60,78 38,76 C18,74 5,55 8,35 C11,18 24,5 40,5 Z",
    "M40,8 C62,10 78,28 75,50 C72,68 52,78 32,73 C12,68 4,48 10,28 C16,14 28,8 40,8 Z",
    "M42,6 C66,8 80,30 73,52 C66,70 44,80 24,72 C8,65 4,42 14,24 C22,12 32,6 42,6 Z",
  ];
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} style={style}>
      <path d={paths[variant % paths.length]} fill={color} />
    </svg>
  );
}

function DotsGrid({ rows = 4, cols = 8, dot = 5, gap = 12, color = '#2DB7B0', style = {} }) {
  return (
    <div style={{
      display: 'grid', gap, gridTemplateColumns: `repeat(${cols}, ${dot}px)`,
      gridTemplateRows: `repeat(${rows}, ${dot}px)`, ...style,
    }}>
      {Array(rows * cols).fill(0).map((_,i)=>(
        <span key={i} style={{ width: dot, height: dot, borderRadius: 999, background: color }} />
      ))}
    </div>
  );
}

function StarBurst({ size = 40, color = '#FFC20E', style = {} }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} style={style}>
      <path d="M20 2 L23 14 L36 14 L26 22 L30 34 L20 27 L10 34 L14 22 L4 14 L17 14 Z" fill={color} />
    </svg>
  );
}

function WiggleLine({ width = 80, height = 18, color = '#2DB7B0', stroke = 2.5, style = {} }) {
  return (
    <svg viewBox="0 0 80 18" width={width} height={height} style={style}>
      <path d="M2,9 C12,2 22,16 32,9 C42,2 52,16 62,9 C72,2 78,9 78,9"
        fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
    </svg>
  );
}

Object.assign(window, {
  PeskidsLogo, PeskidsLockup, PeskidsBrush, PeskidsWave,
  Blob, DotsGrid, StarBurst, WiggleLine,
});
