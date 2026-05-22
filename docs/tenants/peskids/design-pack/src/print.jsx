// Print piece — A5 flyer (148 × 210 mm @ ~3.2 px/mm ≈ 480 × 670)
// Renders front + back. Printed at full bleed.

function FlyerFront() {
  return (
    <div style={{
      width: 480, height: 670,
      background: '#2DB7B0', color: '#fff',
      fontFamily: "'Nunito', system-ui, sans-serif",
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative waves */}
      <PeskidsWave color="rgba(255,255,255,0.12)" height={180}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 280 }} />
      <PeskidsWave color="rgba(255,255,255,0.16)" height={140}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 350 }} />

      {/* Header */}
      <div style={{ padding: '32px 32px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <PeskidsLogo size={70} />
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            opacity: 0.85, fontWeight: 700,
          }}>Ciclo Junio · 2026</div>
          <div style={{ fontSize: 11, marginTop: 4, opacity: 0.85 }}>Sede Llanogrande</div>
        </div>
      </div>

      {/* Headline */}
      <div style={{ padding: '40px 32px 0', position: 'relative' }}>
        <div style={{
          fontFamily: "'Nunito', system-ui, sans-serif",
          fontSize: 76, fontWeight: 700, letterSpacing: '-0.05em',
          lineHeight: 0.9,
        }}>
          La primera<br/>
          <span style={{ color: '#FFC20E' }}>clase es</span><br/>
          gratis.
        </div>
      </div>

      {/* Sub */}
      <div style={{ padding: '24px 32px 0', position: 'relative' }}>
        <div style={{ fontSize: 17, lineHeight: 1.4, maxWidth: 380, fontWeight: 500 }}>
          Natación para bebés desde 6 meses y niños hasta 14 años. Agua climatizada, profesores certificados y un método propio.
        </div>
      </div>

      {/* CTA strip */}
      <div style={{
        position: 'absolute', left: 32, right: 32, bottom: 32,
        background: '#FFC20E', color: '#0D4C63',
        borderRadius: 24, padding: '24px 28px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
              fontWeight: 700, opacity: 0.7 }}>Reserva ya</div>
            <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
              fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, marginTop: 4 }}>
              peskids.co
            </div>
            <div style={{ fontSize: 13, marginTop: 4, fontWeight: 600 }}>
              o escríbenos · +57 300 000 0000
            </div>
          </div>
          {/* QR mock */}
          <div style={{
            width: 86, height: 86, background: '#0D4C63', borderRadius: 12,
            display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2, padding: 8,
          }}>
            {Array(64).fill(0).map((_,i)=>{
              const corner = (i < 16 && (i % 8) < 2) || (i < 16 && (i % 8) > 5) || (i > 47 && (i % 8) < 2);
              const filled = corner || Math.random() > 0.55;
              return (
                <div key={i} style={{
                  background: filled ? '#FFC20E' : 'transparent',
                  borderRadius: 1,
                }} />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function FlyerBack() {
  return (
    <div style={{
      width: 480, height: 670,
      background: '#E6F6FB', color: '#0D4C63',
      fontFamily: "'Nunito', system-ui, sans-serif",
      position: 'relative', overflow: 'hidden',
      padding: '32px',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <PeskidsLockup height={36} />
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          letterSpacing: '0.2em', textTransform: 'uppercase', color: '#0D4C63',
          fontWeight: 700,
        }}>El método</div>
      </div>

      {/* Levels strip */}
      <div style={{ marginTop: 24 }}>
        <div style={{
          fontFamily: "'Nunito', system-ui, sans-serif",
          fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1,
        }}>Seis niveles · uno tras otro.</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 18 }}>
          {[
            { n: 1, name: 'Burbujas', col: '#A8DDE3' },
            { n: 2, name: 'Peces', col: '#2DB7B0' },
            { n: 3, name: 'Delfines', col: '#0D4C63' },
            { n: 4, name: 'Tiburones', col: '#0D4C63' },
            { n: 5, name: 'Olímpicos', col: '#FFC20E' },
            { n: 6, name: 'Compet.', col: '#FF5A1F' },
          ].map((l,i)=>(
            <div key={i} style={{
              flex: 1, background: l.col,
              color: l.col === '#FFC20E' ? '#0D4C63' : '#fff',
              padding: '10px 6px', borderRadius: 10, textAlign: 'center',
            }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, fontWeight: 700, letterSpacing: '0.1em' }}>N{l.n}</div>
              <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
                fontSize: 11, fontWeight: 700, marginTop: 2 }}>{l.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Two columns: features + pricing */}
      <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7D96A4',
            fontWeight: 700, marginBottom: 10,
          }}>Por qué Peskids</div>
          {[
            { ic: '🌡️', t: 'Agua climatizada · 31°C' },
            { ic: '👥', t: 'Máx 4 niños por clase' },
            { ic: '📱', t: 'App con progreso del peque' },
            { ic: '🏠', t: 'Sede o a domicilio' },
          ].map((f,i)=>(
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
              <span style={{ fontSize: 16 }}>{f.ic}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#0D4C63' }}>{f.t}</span>
            </div>
          ))}
        </div>

        <div style={{
          background: '#0D4C63', color: '#fff', borderRadius: 14, padding: 18,
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            fontWeight: 700, opacity: 0.7, marginBottom: 6,
          }}>Mensualidades</div>
          {[
            { p: '1 vez/sem', pr: '220k' },
            { p: '2 veces/sem', pr: '320k', hl: true },
            { p: '3 veces/sem', pr: '420k' },
          ].map((p,i)=>(
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '8px 0',
              borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.1)',
            }}>
              <span style={{ fontSize: 12, fontWeight: p.hl ? 700 : 500,
                color: p.hl ? '#FFC20E' : '#fff' }}>{p.p}</span>
              <span style={{
                fontFamily: "'Nunito', system-ui, sans-serif",
                fontSize: 14, fontWeight: 700,
                color: p.hl ? '#FFC20E' : '#fff',
              }}>${p.pr}</span>
            </div>
          ))}
          <div style={{ marginTop: 8, paddingTop: 8,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            fontSize: 10, opacity: 0.7 }}>
            Hermanos -15% · Sin permanencia
          </div>
        </div>
      </div>

      {/* Map / location strip */}
      <div style={{
        position: 'absolute', left: 32, right: 32, bottom: 32,
        background: '#fff', borderRadius: 16, padding: 18,
        border: '1px solid #E4ECF0',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'linear-gradient(160deg, #D4F0EE, #A8DDE3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
        }}>📍</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
            fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>
            Sede Llanogrande
          </div>
          <div style={{ fontSize: 12, color: '#3D6679' }}>
            Vía Llanogrande km 4 · Rionegro
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, color: '#7D96A4', letterSpacing: '0.1em' }}>SÍGUENOS</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0D4C63' }}>@peskidsnatacion</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Brand merch / applied — swim cap + uniform tag
// ─────────────────────────────────────────────────────────
function MerchSheet() {
  return (
    <div style={{
      width: 1180, height: 720,
      background: '#E6F6FB', padding: 48, boxSizing: 'border-box',
      fontFamily: "'Nunito', system-ui, sans-serif", color: '#0D4C63',
      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20,
    }}>
      {/* Header takes full row */}
      <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            letterSpacing: '0.22em', textTransform: 'uppercase', color: '#0D4C63',
            fontWeight: 700,
          }}>Marca aplicada</div>
          <h2 style={{
            fontFamily: "'Nunito', system-ui, sans-serif",
            fontSize: 44, fontWeight: 700, letterSpacing: '-0.03em',
            margin: '8px 0 0',
          }}>Tu peque · Team Pesk.</h2>
        </div>
        <PeskidsLockup height={36} />
      </div>

      {/* Swim cap — teal */}
      <CapMock color="#2DB7B0" label="Gorro · Teal" subLabel="Nivel 1-3" />

      {/* Swim cap — navy */}
      <CapMock color="#0D4C63" label="Gorro · Tinta" subLabel="Nivel 4-6" />

      {/* Swim cap — coral (team) */}
      <CapMock color="#FF5A1F" label="Gorro · Equipo" subLabel="Competencia" />

      {/* Towel */}
      <div style={{
        gridColumn: 'span 2',
        background: '#fff', borderRadius: 20, padding: 24,
        border: '1px solid #E4ECF0',
      }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7D96A4',
          fontWeight: 700, marginBottom: 12 }}>Toalla de bienvenida</div>
        <div style={{
          background: 'linear-gradient(180deg, #FFC20E 0%, #FFC20E 80%, #2DB7B0 80%, #2DB7B0 100%)',
          borderRadius: 14, height: 220, position: 'relative', overflow: 'hidden',
          padding: 20,
        }}>
          <div style={{
            fontFamily: "'Nunito', system-ui, sans-serif",
            fontSize: 64, fontWeight: 700, letterSpacing: '-0.04em',
            lineHeight: 0.9, color: '#0D4C63', textTransform: 'uppercase',
          }}>
            #Team<br/>Pesk
          </div>
          <div style={{ position: 'absolute', bottom: 16, right: 20 }}>
            <PeskidsLogo size={56} />
          </div>
          <div style={{ position: 'absolute', bottom: 18, left: 20,
            color: '#fff',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, letterSpacing: '0.2em', fontWeight: 700 }}>
            PESKIDSNATACION.CO
          </div>
        </div>
      </div>

      {/* Bag tag / id card */}
      <div style={{
        background: '#fff', borderRadius: 20, padding: 24,
        border: '1px solid #E4ECF0',
      }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7D96A4',
          fontWeight: 700, marginBottom: 12 }}>Carnet del alumno</div>
        <div style={{
          background: '#0D4C63', color: '#fff', borderRadius: 18, padding: 20,
          height: 220, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.15 }}>
            <PeskidsLogo size={140} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <PeskidsLogo size={32} />
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
              letterSpacing: '0.16em', opacity: 0.6,
            }}>ID 0824</div>
          </div>
          <div style={{ marginTop: 32 }}>
            <div style={{
              fontFamily: "'Nunito', system-ui, sans-serif",
              fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em',
            }}>Mateo Restrepo</div>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>5 años · Nivel 3 Delfines</div>
          </div>
          <div style={{ position: 'absolute', bottom: 16, left: 20, right: 20,
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
              opacity: 0.6, letterSpacing: '0.12em' }}>SEDE LLANOGRANDE</div>
            <div style={{ color: '#FFC20E', fontSize: 11, fontWeight: 700 }}>#TeamPesk</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CapMock({ color, label, subLabel }) {
  const onDark = color === '#0D4C63';
  return (
    <div style={{
      background: '#fff', borderRadius: 20, padding: 20,
      border: '1px solid #E4ECF0',
    }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7D96A4',
        fontWeight: 700, marginBottom: 12 }}>{label}</div>
      <div style={{
        height: 220, background: '#E6F6FB', borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* swim cap silhouette */}
        <svg viewBox="0 0 240 180" width="240" height="180">
          <defs>
            <linearGradient id={`cap-${label}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="1" />
              <stop offset="100%" stopColor={color} stopOpacity="0.7" />
            </linearGradient>
          </defs>
          {/* head shape — half dome */}
          <path d="M30 120 Q30 30 120 30 Q210 30 210 120 L200 130 Q120 110 40 130 Z"
            fill={`url(#cap-${label})`} />
          {/* highlight */}
          <path d="M60 60 Q90 40 120 42" stroke="rgba(255,255,255,0.4)" strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* logo on cap */}
          <g transform="translate(95, 70)">
            <circle cx="25" cy="25" r="25" fill="rgba(255,255,255,0.95)" />
            <text x="25" y="30" textAnchor="middle"
              fontFamily="'Nunito', system-ui, sans-serif"
              fontWeight="700" fontSize="13" fill={color}
              letterSpacing="-0.5">Peskids</text>
          </g>
        </svg>
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: '#3D6679' }}>{subLabel}</div>
    </div>
  );
}

Object.assign(window, { FlyerFront, FlyerBack, MerchSheet });
