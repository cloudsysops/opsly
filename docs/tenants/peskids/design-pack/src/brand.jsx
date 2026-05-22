// Brand foundations — Peskids · v2
// Recreated from the supplied brand board reference. Layout mirrors that
// board: hero with logo + tagline, palette row, type, iconography, graphic
// elements, then app/site/admin previews and brand voice strip.

const BRAND = {
  azulProfundo: '#0D4C63',
  turquesa:     '#2DB7B0',
  naranja:      '#FF5A1F',
  amarillo:     '#FFC20E',
  azulClaro:    '#E6F6FB',
  blanco:       '#FFFFFF',
  grisClaro:    '#F2F4F7',

  // Aliases used throughout the system
  ink:    '#0D4C63',
  ink2:   '#3D6679',
  ink3:   '#7D96A4',
  line:   '#E4ECF0',
  snow:   '#F7FBFD',
  primary: '#2DB7B0',
  accent:  '#FF5A1F',
  highlight: '#FFC20E',
};

const BRAND_FONT_HEAD = "'Nunito', system-ui, sans-serif";
const BRAND_FONT_BODY = "'Nunito', system-ui, sans-serif";
const BRAND_FONT_BRUSH = "'Caveat Brush', cursive";

function BrandFoundations() {
  return (
    <div style={{
      width: 1180, padding: 48, background: BRAND.blanco,
      fontFamily: BRAND_FONT_BODY, color: BRAND.ink,
    }}>
      <BrandBoardTop />
      <BrandPaletteRow />
      <BrandTypeIcons />
      <BrandPreviewsRow />
      <BrandVoiceStrip />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Hero — logo big + tagline
// ─────────────────────────────────────────────────────────
function BrandBoardTop() {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '320px 1fr',
      gap: 56, alignItems: 'center', marginBottom: 48,
    }}>
      <div style={{ position: 'relative' }}>
        <PeskidsLogo size={260} />
        {/* Decorative wiggle */}
        <WiggleLine width={80} height={18} color={BRAND.turquesa}
          style={{ position: 'absolute', bottom: -12, right: 20 }} />
      </div>
      <div>
        <div style={{
          fontFamily: BRAND_FONT_HEAD, fontWeight: 900,
          fontSize: 64, lineHeight: 1, letterSpacing: '-0.03em',
          color: BRAND.ink,
        }}>
          Aprenden.<br/>
          Se divierten.<br/>
          Son{' '}
          <PeskidsBrush color={BRAND.turquesa} tilt={-3} size={84} style={{ verticalAlign: 'baseline' }}>
            Pes
          </PeskidsBrush>
          <PeskidsBrush color={BRAND.naranja} tilt={-3} size={84}>
            kids
          </PeskidsBrush>
          <span style={{ color: BRAND.ink }}>.</span>
        </div>
        <div style={{ fontSize: 18, color: BRAND.ink2, marginTop: 18, maxWidth: 480, lineHeight: 1.45 }}>
          Academia de natación para niños desde <strong style={{ color: BRAND.ink }}>3 meses hasta 15 años</strong>. Sede Llanogrande · Medellín.
        </div>
        <div style={{ marginTop: 14 }}>
          <WiggleLine width={120} height={20} color={BRAND.turquesa} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Palette
// ─────────────────────────────────────────────────────────
function BrandPaletteRow() {
  const swatches = [
    { name: 'Azul Profundo', hex: '#0D4C63', dark: true },
    { name: 'Turquesa',      hex: '#2DB7B0', dark: true },
    { name: 'Naranja',       hex: '#FF5A1F', dark: true },
    { name: 'Amarillo',      hex: '#FFC20E', dark: false },
    { name: 'Azul Claro',    hex: '#E6F6FB', dark: false },
    { name: 'Blanco',        hex: '#FFFFFF', dark: false },
    { name: 'Gris Claro',    hex: '#F2F4F7', dark: false },
  ];
  return (
    <div style={{ marginBottom: 48 }}>
      <SectionEyebrow>Paleta de colores</SectionEyebrow>
      <div style={{
        marginTop: 20, display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)', gap: 14,
      }}>
        {swatches.map((s,i)=>(
          <div key={i}>
            <div style={{
              height: 110, borderRadius: 16, background: s.hex,
              border: s.hex === '#FFFFFF' ? '1px solid ' + BRAND.line : 'none',
            }} />
            <div style={{ fontFamily: BRAND_FONT_HEAD, fontWeight: 700, fontSize: 14,
              color: BRAND.ink, marginTop: 10 }}>{s.name}</div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              color: BRAND.ink3, marginTop: 2,
            }}>{s.hex}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Typography + Iconography + Graphic elements
// ─────────────────────────────────────────────────────────
function BrandTypeIcons() {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1.1fr 1fr',
      gap: 28, marginBottom: 48,
    }}>
      {/* Type */}
      <div>
        <SectionEyebrow>Tipografía</SectionEyebrow>
        <div style={{ marginTop: 16, padding: 24, borderRadius: 18, background: BRAND.grisClaro }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
            <span style={{
              fontFamily: BRAND_FONT_HEAD, fontWeight: 900, fontSize: 100,
              lineHeight: 0.9, color: BRAND.ink, letterSpacing: '-0.04em',
            }}>Aa</span>
            <div>
              <div style={{ fontFamily: BRAND_FONT_HEAD, fontWeight: 800,
                fontSize: 18, color: BRAND.ink }}>Nunito Rounded</div>
              <div style={{ fontSize: 12, color: BRAND.ink2, marginTop: 4, lineHeight: 1.45,
                fontFamily: 'monospace', wordBreak: 'break-all' }}>
                ABCDEFGHIJK·abcdefghijk<br/>1234567890
              </div>
            </div>
          </div>
          <div style={{
            marginTop: 18, paddingTop: 14, borderTop: '1px solid ' + BRAND.line,
            display: 'flex', alignItems: 'baseline', gap: 12,
          }}>
            <PeskidsBrush size={36} color={BRAND.turquesa} tilt={-2}>Peskids</PeskidsBrush>
            <span style={{ fontSize: 11, color: BRAND.ink3, fontFamily: BRAND_FONT_BODY, fontWeight: 600 }}>
              Caveat Brush · acento de marca
            </span>
          </div>
        </div>
      </div>

      {/* Iconography */}
      <div>
        <SectionEyebrow>Uso de iconos</SectionEyebrow>
        <div style={{
          marginTop: 16, padding: '24px 16px', borderRadius: 18, background: BRAND.azulClaro,
          display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12,
        }}>
          <IconTile icon={<IconStudents />} label="Alumnos" />
          <IconTile icon={<IconSwim />} label="Clases" />
          <IconTile icon={<IconCalendar />} label="Horarios" />
          <IconTile icon={<IconShield />} label="Seguridad" />
          <IconTile icon={<IconStarSm />} label="Diversión" />
          <IconTile icon={<IconChart />} label="Progreso" />
        </div>
      </div>

      {/* Graphic elements */}
      <div>
        <SectionEyebrow>Elementos gráficos</SectionEyebrow>
        <div style={{
          marginTop: 16, padding: 24, borderRadius: 18, background: BRAND.snow,
          position: 'relative', overflow: 'hidden', minHeight: 200,
        }}>
          <Blob color={BRAND.naranja} size={92} variant={0}
            style={{ position: 'absolute', top: 16, left: 18 }} />
          <Blob color={BRAND.azulClaro} size={74} variant={1}
            style={{ position: 'absolute', top: 32, left: 100 }} />
          <Blob color={BRAND.turquesa} size={62} variant={2}
            style={{ position: 'absolute', top: 90, left: 150 }} />
          <StarBurst size={26} color={BRAND.amarillo}
            style={{ position: 'absolute', top: 24, right: 36 }} />
          <span style={{
            position: 'absolute', top: 60, right: 18,
            width: 8, height: 8, borderRadius: 999, background: BRAND.turquesa,
          }} />
          <span style={{
            position: 'absolute', top: 80, right: 50,
            width: 6, height: 6, borderRadius: 999, background: BRAND.amarillo,
          }} />
          <DotsGrid rows={3} cols={6} dot={4} gap={8} color={BRAND.turquesa}
            style={{ position: 'absolute', bottom: 18, left: 18 }} />
          <WiggleLine width={84} height={16} color={BRAND.turquesa}
            style={{ position: 'absolute', bottom: 24, left: 110 }} />
          <WiggleLine width={84} height={16} color={BRAND.naranja}
            style={{ position: 'absolute', bottom: 46, left: 110 }} />
        </div>
      </div>
    </div>
  );
}

function IconTile({ icon, label }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 50, height: 50, margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: BRAND.ink,
      }}>{icon}</div>
      <div style={{
        fontFamily: BRAND_FONT_HEAD, fontWeight: 700, fontSize: 11,
        color: BRAND.ink, marginTop: 4,
      }}>{label}</div>
    </div>
  );
}

// Stroke icons — simple, rounded, matching the brand board sample
function IconStudents() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="14" cy="14" r="4.5" />
      <circle cx="26" cy="14" r="4.5" />
      <path d="M5 30 C5 25 9 22 14 22 C19 22 23 25 23 30" />
      <path d="M17 30 C17 25 21 22 26 22 C31 22 35 25 35 30" />
    </svg>
  );
}
function IconSwim() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="26" cy="11" r="3" />
      <path d="M6 28 C9 25 12 31 16 28 C20 25 23 31 27 28 C31 25 34 28 36 27" />
      <path d="M14 22 L22 16 L30 21" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="9" width="28" height="24" rx="3" />
      <path d="M6 16 L34 16" />
      <path d="M13 6 L13 12" />
      <path d="M27 6 L27 12" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 5 L34 10 L34 22 C34 30 27 34 20 36 C13 34 6 30 6 22 L6 10 Z" />
      <path d="M15 20 L19 24 L26 16" />
    </svg>
  );
}
function IconStarSm() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 L24 16 L34 16 L26 22 L29 32 L20 26 L11 32 L14 22 L6 16 L16 16 Z" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 28 L14 20 L20 24 L32 10" />
      <path d="M24 10 L32 10 L32 18" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────
// Component preview tiles — admin, app, site (mini illustrations)
// ─────────────────────────────────────────────────────────
function BrandPreviewsRow() {
  return (
    <div style={{ marginBottom: 32 }}>
      <SectionEyebrow style={{ marginBottom: 16 }}>Aplicaciones del sistema</SectionEyebrow>
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.6fr 1fr', gap: 14, marginTop: 8 }}>
        <PreviewAdmin />
        <PreviewApp />
        <PreviewSite />
      </div>
    </div>
  );
}

function PreviewAdmin() {
  return (
    <div style={{
      borderRadius: 16, padding: 14, background: BRAND.snow,
      border: '1px solid ' + BRAND.line, display: 'flex', gap: 10,
      height: 260, overflow: 'hidden',
    }}>
      <div style={{
        width: 52, background: BRAND.azulProfundo, borderRadius: 10, padding: 8,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      }}>
        <PeskidsLogo size={36} />
        {[BRAND.turquesa, 'transparent', 'transparent', 'transparent', 'transparent'].map((c,i)=>(
          <div key={i} style={{
            width: 24, height: 18, borderRadius: 6, background: c, opacity: i === 0 ? 1 : 0.4,
            border: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.12)',
          }} />
        ))}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontFamily: BRAND_FONT_HEAD, fontWeight: 800, fontSize: 13, color: BRAND.ink }}>
          ¡Hola, Admin! 👋
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {[
            { v: '85', l: 'Alumnos', c: BRAND.turquesa },
            { v: '24', l: 'Clases',  c: BRAND.naranja },
            { v: '18', l: 'Hoy',     c: BRAND.amarillo },
            { v: '7',  l: 'Mensajes',c: BRAND.azulProfundo },
          ].map((k,i)=>(
            <div key={i} style={{
              background: BRAND.blanco, border: '1px solid ' + BRAND.line,
              borderRadius: 8, padding: '6px 8px',
            }}>
              <div style={{ fontFamily: BRAND_FONT_HEAD, fontWeight: 800, fontSize: 16, color: BRAND.ink }}>{k.v}</div>
              <div style={{ fontSize: 8, color: BRAND.ink3, fontWeight: 700 }}>{k.l}</div>
              <div style={{ height: 2, background: k.c, marginTop: 4, borderRadius: 999 }} />
            </div>
          ))}
        </div>
        <div style={{ background: BRAND.blanco, border: '1px solid ' + BRAND.line, borderRadius: 8,
          padding: '6px 8px', flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: BRAND.ink2 }}>Asistencias 6 meses</div>
          <svg viewBox="0 0 220 60" width="100%" height="70" style={{ marginTop: 4 }}>
            <polyline fill="none" stroke={BRAND.turquesa} strokeWidth="2.5" strokeLinejoin="round"
              points="0,40 40,30 80,35 120,20 160,25 220,15" />
            {[0,40,80,120,160,220].map((x,i)=>(
              <circle key={i} cx={x} cy={[40,30,35,20,25,15][i]} r="3.5" fill={BRAND.turquesa} />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}

function PreviewApp() {
  return (
    <div style={{
      borderRadius: 16, padding: 14, background: BRAND.azulClaro,
      border: '1px solid ' + BRAND.line, height: 260, position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 140, height: 224, borderRadius: 22, background: BRAND.blanco,
        border: '1px solid ' + BRAND.line, padding: 10,
        boxShadow: '0 10px 28px -10px rgba(13,76,99,0.25)',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <PeskidsLogo size={22} />
          <span style={{ fontFamily: BRAND_FONT_BRUSH, fontSize: 16, color: BRAND.ink,
            transform: 'rotate(-2deg)' }}>Peskids</span>
        </div>
        <div style={{ fontSize: 9, fontWeight: 800, color: BRAND.ink }}>¡Hola, María! 👋</div>
        <div style={{
          background: BRAND.turquesa, color: '#fff', borderRadius: 10, padding: 8,
        }}>
          <div style={{ fontSize: 7, fontWeight: 700, opacity: 0.85 }}>Sofía tiene clase hoy</div>
          <div style={{ fontSize: 9, fontWeight: 800, marginTop: 4 }}>3:30 pm · Nivel 2</div>
        </div>
        <div style={{ background: BRAND.grisClaro, borderRadius: 8, padding: 8 }}>
          <div style={{ fontSize: 7, fontWeight: 700, color: BRAND.ink2 }}>Asistencia este mes</div>
          <div style={{ fontFamily: BRAND_FONT_HEAD, fontWeight: 800, fontSize: 18, color: BRAND.ink }}>85%</div>
          <div style={{ height: 3, background: BRAND.line, borderRadius: 999, overflow: 'hidden', marginTop: 4 }}>
            <div style={{ width: '85%', height: '100%', background: BRAND.turquesa }} />
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', justifyContent: 'space-around', borderTop: '1px solid ' + BRAND.line,
          paddingTop: 6 }}>
          {['🏠','📅','💬','👤'].map((g,i)=>(
            <span key={i} style={{ fontSize: 10, opacity: i === 0 ? 1 : 0.4 }}>{g}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewSite() {
  return (
    <div style={{
      borderRadius: 16, padding: 14, background: BRAND.snow,
      border: '1px solid ' + BRAND.line, height: 260, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <PeskidsLockup height={20} tag="" />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 8, color: BRAND.ink2 }}>
          {['Inicio','Clases','Horarios'].map((l,i)=>(<span key={i}>{l}</span>))}
          <span style={{ background: BRAND.naranja, color: '#fff', padding: '3px 8px',
            borderRadius: 6, fontWeight: 800 }}>Inscríbete</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.9fr', gap: 12, marginTop: 14 }}>
        <div>
          <div style={{ fontFamily: BRAND_FONT_HEAD, fontWeight: 900, fontSize: 18,
            color: BRAND.ink, letterSpacing: '-0.03em', lineHeight: 1 }}>
            Aprenden.<br/>Se divierten.<br/>
            Son <PeskidsBrush color={BRAND.turquesa} tilt={-2} size={22}>Pes</PeskidsBrush><PeskidsBrush color={BRAND.naranja} tilt={-2} size={22}>kids</PeskidsBrush>.
          </div>
          <div style={{ fontSize: 8, color: BRAND.ink2, marginTop: 6, lineHeight: 1.4 }}>
            Clases de natación para niños desde 3 meses hasta 15 años.
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            <span style={{ background: BRAND.naranja, color: '#fff', padding: '3px 8px',
              borderRadius: 6, fontSize: 8, fontWeight: 800 }}>Agendar prueba</span>
            <span style={{ background: BRAND.turquesa, color: '#fff', padding: '3px 8px',
              borderRadius: 6, fontSize: 8, fontWeight: 800 }}>WhatsApp</span>
          </div>
        </div>
        {/* Pool placeholder */}
        <div style={{
          borderRadius: 12,
          background: `radial-gradient(circle at 30% 30%, ${BRAND.azulClaro} 0%, ${BRAND.turquesa} 60%, ${BRAND.azulProfundo} 100%)`,
          position: 'relative', overflow: 'hidden',
        }}>
          <PeskidsWave color="rgba(255,255,255,0.18)" height={30}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 14 }} />
          <PeskidsWave color="rgba(255,255,255,0.28)" height={20}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 30 }} />
          <Blob color={BRAND.amarillo} size={28} variant={1}
            style={{ position: 'absolute', bottom: -6, right: -6 }} />
        </div>
      </div>
      {/* Value icons row */}
      <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14,
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {[
          { ic: <IconStudents />, l: 'Profesores' },
          { ic: <IconSwim />,     l: 'Grupos' },
          { ic: <IconShield />,   l: 'Instalaciones' },
          { ic: <IconStarSm />,   l: 'Metodología' },
        ].map((v,i)=>(
          <div key={i} style={{ textAlign: 'center', color: BRAND.ink }}>
            <div style={{ display: 'flex', justifyContent: 'center', transform: 'scale(0.5)' }}>{v.ic}</div>
            <div style={{ fontSize: 8, fontWeight: 700, marginTop: -4 }}>{v.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Voice strip — at-the-bottom band like the reference
// ─────────────────────────────────────────────────────────
function BrandVoiceStrip() {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1.1fr 0.5fr 0.5fr 0.5fr 0.5fr 0.5fr 0.5fr 1.1fr',
      gap: 8, height: 130,
    }}>
      <div style={{
        background: BRAND.azulClaro, borderRadius: 14,
        padding: 18, display: 'flex', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontFamily: BRAND_FONT_HEAD, fontWeight: 800, fontSize: 18,
            color: BRAND.ink, lineHeight: 1.15 }}>
            Más que natación,<br/>formamos para la vida.
          </div>
          <WiggleLine width={64} height={14} color={BRAND.turquesa} style={{ marginTop: 8 }} />
        </div>
      </div>
      {/* 5 image placeholders */}
      {Array(5).fill(0).map((_,i)=>(
        <div key={i} style={{
          borderRadius: 14, overflow: 'hidden',
          background: [
            `linear-gradient(160deg, ${BRAND.turquesa}, ${BRAND.azulProfundo})`,
            `linear-gradient(160deg, ${BRAND.azulClaro}, ${BRAND.turquesa})`,
            `linear-gradient(160deg, ${BRAND.naranja}, ${BRAND.amarillo})`,
            `linear-gradient(160deg, ${BRAND.azulProfundo}, ${BRAND.turquesa})`,
            `linear-gradient(160deg, ${BRAND.amarillo}, ${BRAND.naranja})`,
          ][i],
          position: 'relative',
        }}>
          <div style={{ position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, opacity: 0.7,
          }}>{['🏊','🥽','😄','🐬','⭐'][i]}</div>
        </div>
      ))}
      {/* Last tile: graphic */}
      <div style={{
        borderRadius: 14, background: BRAND.grisClaro,
        position: 'relative', overflow: 'hidden',
      }}>
        <Blob color={BRAND.naranja} size={50} variant={0}
          style={{ position: 'absolute', top: 8, left: 8 }} />
        <Blob color={BRAND.turquesa} size={36} variant={1}
          style={{ position: 'absolute', bottom: 10, right: 10 }} />
        <span style={{ position: 'absolute', top: 20, right: 16,
          width: 10, height: 10, borderRadius: 999, background: BRAND.amarillo }} />
      </div>
      <div style={{
        background: BRAND.azulProfundo, color: '#fff',
        borderRadius: 14, padding: 18, display: 'flex', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 13, lineHeight: 1.4, fontWeight: 600 }}>
            Confianza, disciplina y amor por el agua en un ambiente seguro y divertido.
          </div>
          <WiggleLine width={64} height={14} color={BRAND.turquesa} style={{ marginTop: 10 }} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Shared building blocks (used elsewhere)
// ─────────────────────────────────────────────────────────
function SectionEyebrow({ children, style = {} }) {
  return (
    <div style={{
      fontFamily: BRAND_FONT_HEAD, fontWeight: 800,
      fontSize: 12, letterSpacing: '0.18em',
      textTransform: 'uppercase', color: BRAND.ink2,
      ...style,
    }}>{children}</div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 18 }}>
        <h2 style={{
          fontFamily: BRAND_FONT_HEAD, fontSize: 28, fontWeight: 800,
          margin: 0, letterSpacing: '-0.02em', color: BRAND.ink,
        }}>{title}</h2>
        <div style={{ height: 1, flex: 1, background: BRAND.line }} />
      </div>
      {children}
    </div>
  );
}

function Card({ children, pad = 20, bg = BRAND.blanco, dark, style }) {
  return (
    <div style={{
      background: bg, borderRadius: 18, padding: pad,
      border: dark ? 'none' : '1px solid ' + BRAND.line,
      color: dark ? '#fff' : BRAND.ink, ...style,
    }}>{children}</div>
  );
}

function CardCap({ children, dark }) {
  return (
    <div style={{
      padding: '10px 16px', fontSize: 11, fontFamily: BRAND_FONT_HEAD,
      fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
      color: dark ? 'rgba(255,255,255,0.65)' : BRAND.ink3,
      borderTop: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid ' + BRAND.line,
    }}>{children}</div>
  );
}

function Eyebrow({ children }) {
  return (
    <div style={{
      fontFamily: BRAND_FONT_HEAD, fontWeight: 800, fontSize: 10,
      letterSpacing: '0.18em', textTransform: 'uppercase', color: BRAND.ink3,
    }}>{children}</div>
  );
}

function Btn({ children, variant = 'primary', size = 'md' }) {
  const styles = {
    primary:   { bg: BRAND.naranja,    fg: '#fff', bd: BRAND.naranja },
    teal:      { bg: BRAND.turquesa,   fg: '#fff', bd: BRAND.turquesa },
    secondary: { bg: BRAND.blanco,     fg: BRAND.ink, bd: BRAND.line },
    ghost:     { bg: 'transparent',    fg: BRAND.ink2, bd: 'transparent' },
    dark:      { bg: BRAND.azulProfundo, fg: '#fff', bd: BRAND.azulProfundo },
  }[variant];
  const sz = size === 'sm' ? { padY: 8, padX: 14, fs: 13 } : { padY: 12, padX: 20, fs: 14 };
  return (
    <button style={{
      background: styles.bg, color: styles.fg, border: '1px solid ' + styles.bd,
      borderRadius: 12, padding: `${sz.padY}px ${sz.padX}px`,
      fontFamily: BRAND_FONT_HEAD, fontWeight: 800, fontSize: sz.fs, cursor: 'pointer',
      letterSpacing: '-0.005em',
    }}>{children}</button>
  );
}

function Pill({ children, tone = 'teal' }) {
  const t = {
    teal:    { bg: '#D4F0EE', fg: '#0D4C63' },
    orange:  { bg: '#FFE0D2', fg: '#B23A0E' },
    sun:     { bg: '#FFF1C2', fg: '#8B6A00' },
    coral:   { bg: '#FFE0D2', fg: '#B23A0E' },
    success: { bg: '#DBF5E3', fg: '#1E6E3D' },
    warning: { bg: '#FFF1C2', fg: '#8B6A00' },
    muted:   { bg: '#EEF2F5', fg: '#6F8398' },
    info:    { bg: '#E6F6FB', fg: '#0D4C63' },
    pool:    { bg: '#E6F6FB', fg: '#0D4C63' },
  }[tone];
  return (
    <span style={{
      background: t.bg, color: t.fg, padding: '5px 11px', borderRadius: 999,
      fontFamily: BRAND_FONT_HEAD, fontWeight: 800, fontSize: 12,
      letterSpacing: '-0.005em',
      display: 'inline-flex', alignItems: 'center', gap: 6,
    }}>{children}</span>
  );
}

Object.assign(window, {
  BRAND, BRAND_FONT_HEAD, BRAND_FONT_BODY, BRAND_FONT_BRUSH,
  BrandFoundations, Section, Card, CardCap, Eyebrow,
  SectionEyebrow, Btn, Pill,
  IconStudents, IconSwim, IconCalendar, IconShield, IconStarSm, IconChart,
});
