// Instagram posts — 3 templates following the Peskids brand DNA.
// Each post is 1080×1080 (rendered scaled). The set shows: announcement,
// achievement spotlight, and tips/educational post.

const IG_SIZE = 540; // half-scale of 1080

// ─────────────────────────────────────────────────────────
// Post 1 — Class schedule announcement
// ─────────────────────────────────────────────────────────
function IgPost1() {
  return (
    <div style={{
      width: IG_SIZE, height: IG_SIZE,
      background: '#2DB7B0', color: '#fff',
      fontFamily: "'Nunito', system-ui, sans-serif",
      position: 'relative', overflow: 'hidden',
      padding: 40, boxSizing: 'border-box',
    }}>
      <div style={{ position: 'absolute', bottom: -60, right: -60, fontSize: 320, opacity: 0.08 }}>🌊</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <PeskidsLogo size={48} />
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          background: 'rgba(255,255,255,0.16)',
          padding: '5px 11px', borderRadius: 999, fontWeight: 700,
          letterSpacing: '0.16em', textTransform: 'uppercase',
        }}>#TeamPesk</div>
      </div>

      <div style={{ position: 'relative', marginTop: 80 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          letterSpacing: '0.24em', textTransform: 'uppercase', opacity: 0.85 }}>
          Ciclo junio · cupos abiertos
        </div>
        <div style={{
          fontFamily: "'Nunito', system-ui, sans-serif",
          fontSize: 78, fontWeight: 700, letterSpacing: '-0.04em',
          lineHeight: 0.92, marginTop: 14,
        }}>
          Disfrutar<br/>
          <span style={{ color: '#FFC20E' }}>del agua</span><br/>
          empieza ya.
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 36, left: 40, right: 40,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ fontSize: 14, lineHeight: 1.4, maxWidth: 260, opacity: 0.95 }}>
          Bebés desde 6 meses · Sede Llanogrande<br/>
          <span style={{ opacity: 0.7 }}>Reservas en bio · linktr.ee/peskidsnatacion</span>
        </div>
        <div style={{
          background: '#FFC20E', color: '#0D4C63',
          padding: '10px 16px', borderRadius: 999,
          fontWeight: 800, fontSize: 13,
        }}>Bio link →</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Post 2 — Achievement / level-up spotlight (photo-led)
// ─────────────────────────────────────────────────────────
function IgPost2() {
  return (
    <div style={{
      width: IG_SIZE, height: IG_SIZE,
      background: '#0D4C63', color: '#fff',
      fontFamily: "'Nunito', system-ui, sans-serif",
      position: 'relative', overflow: 'hidden',
      boxSizing: 'border-box',
    }}>
      {/* "Photo" area (placeholder) */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, #A8DDE3 0%, #2DB7B0 60%, #0D4C63 100%)',
      }}>
        <PeskidsWave color="rgba(255,255,255,0.12)" height={160}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 200 }} />
        <PeskidsWave color="rgba(255,255,255,0.18)" height={100}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 250 }} />
        <div style={{ position: 'absolute', top: 60, left: 0, right: 0,
          textAlign: 'center', fontSize: 14,
          fontFamily: "'JetBrains Mono', monospace",
          opacity: 0.5, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Foto · niño nadando</div>
      </div>

      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%',
        background: 'linear-gradient(180deg, rgba(11,42,74,0) 0%, rgba(11,42,74,0.95) 70%, #0D4C63 100%)',
      }} />

      {/* Badge medallion */}
      <div style={{
        position: 'absolute', top: 36, right: 36,
        width: 88, height: 88, borderRadius: '50%',
        background: 'linear-gradient(140deg, #FFC20E 0%, #FF5A1F 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
      }}>
        <div style={{ fontSize: 32 }}>🏆</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          fontWeight: 700, letterSpacing: '0.12em', marginTop: -2 }}>NUEVO</div>
      </div>

      {/* Top mark */}
      <div style={{ position: 'absolute', top: 36, left: 40 }}>
        <PeskidsLogo size={44} />
      </div>

      {/* Bottom content */}
      <div style={{ position: 'absolute', bottom: 40, left: 40, right: 40 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(76,184,176,0.25)',
          border: '1px solid rgba(76,184,176,0.5)',
          padding: '5px 12px', borderRadius: 999,
          fontSize: 11, fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.16em', textTransform: 'uppercase', color: '#A8DDE3',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: '#A8DDE3' }} />
          Logro desbloqueado
        </div>
        <div style={{
          fontFamily: "'Nunito', system-ui, sans-serif",
          fontSize: 56, fontWeight: 700, letterSpacing: '-0.04em',
          lineHeight: 0.95, marginTop: 14,
        }}>
          Mateo,<br/>
          <span style={{ color: '#FFC20E' }}>5 años,</span><br/>
          subió a Delfines 🐬
        </div>
        <div style={{ fontSize: 14, opacity: 0.85, marginTop: 14, maxWidth: 360 }}>
          Después de 8 meses con nosotros. Brazada coordinada, respiración lateral y muchas ganas de seguir.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Post 3 — Tip / educational (carousel-style page)
// ─────────────────────────────────────────────────────────
function IgPost3() {
  return (
    <div style={{
      width: IG_SIZE, height: IG_SIZE,
      background: '#E6F6FB', color: '#0D4C63',
      fontFamily: "'Nunito', system-ui, sans-serif",
      position: 'relative', overflow: 'hidden',
      padding: 40, boxSizing: 'border-box',
    }}>
      {/* Color band header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 80,
        background: '#FF5A1F',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px',
      }}>
        <div style={{ color: '#fff',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', fontWeight: 700 }}>
          ¿Sabías que…?
        </div>
        <div style={{ color: '#fff', fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, opacity: 0.7 }}>1 / 5</div>
      </div>

      <div style={{ marginTop: 92 }}>
        <div style={{
          fontFamily: "'Nunito', system-ui, sans-serif",
          fontSize: 60, fontWeight: 700, letterSpacing: '-0.04em',
          lineHeight: 0.95,
        }}>
          Tu bebé puede nadar <span style={{ color: '#FF5A1F' }}>desde los 6 meses.</span>
        </div>
        <div style={{ fontSize: 16, lineHeight: 1.5, marginTop: 20, color: '#3D6679', maxWidth: 440 }}>
          La <strong style={{ color: '#0D4C63' }}>familiarización temprana</strong> con el agua reduce el miedo, mejora la coordinación y crea un vínculo único con papá y mamá.
        </div>
      </div>

      {/* Bullet list */}
      <div style={{ position: 'absolute', bottom: 110, left: 40, right: 40 }}>
        {['Agua climatizada a 31°C — sin frío','Sesiones de 30 min con acompañante','Sin separación, sin presión'].map((b,i)=>(
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 999, background: '#2DB7B0',
              color: '#fff', fontWeight: 700, fontSize: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{i+1}</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{b}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ position: 'absolute', bottom: 32, left: 40, right: 40,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: '1px solid #E4ECF0', paddingTop: 18,
      }}>
        <PeskidsLockup height={28} color="#0D4C63" />
        <div style={{ fontSize: 12, color: '#7D96A4', display: 'flex', alignItems: 'center', gap: 6 }}>
          Desliza <span>→</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Story / Highlight cover
// ─────────────────────────────────────────────────────────
function IgStory() {
  return (
    <div style={{
      width: 320, height: 568, // 9:16
      background: 'linear-gradient(180deg, #0D4C63 0%, #1B607E 100%)',
      color: '#fff',
      fontFamily: "'Nunito', system-ui, sans-serif",
      position: 'relative', overflow: 'hidden',
      padding: 24, boxSizing: 'border-box',
    }}>
      <div style={{ position: 'absolute', bottom: -40, right: -40, opacity: 0.15 }}>
        <PeskidsLogo size={280} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <PeskidsLogo size={36} />
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          opacity: 0.7, letterSpacing: '0.2em', textTransform: 'uppercase' }}>21·05·26</div>
      </div>

      <div style={{ marginTop: 90 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          letterSpacing: '0.22em', textTransform: 'uppercase', color: '#FFC20E', fontWeight: 700 }}>
          Hoy en sede
        </div>
        <div style={{
          fontFamily: "'Nunito', system-ui, sans-serif",
          fontSize: 52, fontWeight: 700, letterSpacing: '-0.04em',
          lineHeight: 0.95, marginTop: 14,
        }}>
          Clase<br/>abierta<br/>
          <span style={{ color: '#A8DDE3' }}>de prueba</span>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 80, left: 24, right: 24 }}>
        <div style={{
          background: '#FFC20E', color: '#0D4C63',
          padding: '14px 18px', borderRadius: 14,
          fontWeight: 700, fontSize: 14, textAlign: 'center',
        }}>Reservar gratis →</div>
        <div style={{ fontSize: 11, opacity: 0.6, marginTop: 12, textAlign: 'center' }}>
          Desliza arriba · linktr.ee/peskidsnatacion
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { IgPost1, IgPost2, IgPost3, IgStory });
