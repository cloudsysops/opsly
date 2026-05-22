// Landing page — two distinct directions.
// V1: "Sereno aquí debajo" · clean editorial, photography-led, blues
// V2: "Brand bold" · uses the 4 logo colors as graphic blocks

// Shared: emulate desktop browser shell? Render at 1280 wide.

const LANDING_W = 1280;

// ─────────────────────────────────────────────────────────
// V1 — Editorial calm
// ─────────────────────────────────────────────────────────
function LandingV1() {
  return (
    <div style={{
      width: LANDING_W, background: '#E6F6FB',
      fontFamily: "'Nunito', system-ui, sans-serif", color: '#0D4C63',
    }}>
      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 56px', background: 'rgba(244,251,252,0.85)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #E4ECF0',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <PeskidsLockup height={40} />
        <div style={{ display: 'flex', gap: 32, fontSize: 14, fontWeight: 600 }}>
          <span>Programa</span>
          <span>Niveles</span>
          <span>Sedes</span>
          <span>Tarifas</span>
          <span>Equipo</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Iniciar sesión</span>
          <button style={{
            background: '#0D4C63', color: '#fff', border: 0,
            padding: '10px 18px', borderRadius: 999, fontWeight: 700, fontSize: 13,
            fontFamily: "'Nunito', system-ui, sans-serif",
          }}>Reservar prueba →</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        display: 'grid', gridTemplateColumns: '1.05fr 1fr',
        gap: 56, padding: '72px 56px 80px', alignItems: 'center',
      }}>
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#fff', border: '1px solid #E4ECF0',
            padding: '6px 12px', borderRadius: 999,
            fontSize: 12, fontWeight: 600, color: '#0D4C63',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: '#22C55E' }} />
            Cupos abiertos · ciclo junio
          </div>
          <h1 style={{
            fontFamily: "'Nunito', system-ui, sans-serif",
            fontSize: 84, fontWeight: 700, letterSpacing: '-0.04em',
            lineHeight: 0.98, margin: '20px 0 0',
          }}>
            Aprenden.<br/>Se divierten.<br/>
            Son <span style={{ fontFamily: "'Caveat Brush', cursive", color: '#2DB7B0', display: 'inline-block', transform: 'rotate(-2deg)' }}>Pes</span><span style={{ fontFamily: "'Caveat Brush', cursive", color: '#FF5A1F', display: 'inline-block', transform: 'rotate(-2deg)' }}>kids</span>.
          </h1>
          <p style={{ fontSize: 20, lineHeight: 1.45, color: '#3D6679',
            marginTop: 24, maxWidth: 520 }}>
            Academia de natación para niños desde <strong style={{ color: '#0D4C63' }}>3 meses hasta 15 años</strong>. Sede Llanogrande · Medellín. Confianza, disciplina y amor por el agua.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
            <button style={{
              background: '#2DB7B0', color: '#fff', border: 0,
              padding: '16px 28px', borderRadius: 999, fontWeight: 700, fontSize: 15,
              fontFamily: "'Nunito', system-ui, sans-serif",
            }}>Reservar clase de prueba →</button>
            <button style={{
              background: '#fff', color: '#0D4C63', border: '1px solid #E4ECF0',
              padding: '16px 24px', borderRadius: 999, fontWeight: 600, fontSize: 15,
              fontFamily: "'Nunito', system-ui, sans-serif",
            }}>Ver el método</button>
          </div>
          <div style={{ display: 'flex', gap: 32, marginTop: 40 }}>
            <StatBlock num="14" label="años enseñando" />
            <StatBlock num="2 800+" label="niños certificados" />
            <StatBlock num="6" label="niveles graduados" />
          </div>
        </div>

        {/* Photo placeholder */}
        <div style={{ position: 'relative' }}>
          <div style={{
            aspectRatio: '4/5', borderRadius: 32,
            background: 'linear-gradient(160deg, #A8DDE3 0%, #2DB7B0 60%, #0D4C63 100%)',
            position: 'relative', overflow: 'hidden',
            boxShadow: '0 30px 80px -30px rgba(11,42,74,0.5)',
          }}>
            <PeskidsWave color="rgba(255,255,255,0.18)" height={120}
              style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} />
            <PeskidsWave color="rgba(255,255,255,0.12)" height={80}
              style={{ position: 'absolute', left: 0, right: 0, bottom: 50 }} />
            {/* placeholder caption */}
            <div style={{ position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', color: 'rgba(255,255,255,0.7)' }}>
              <div style={{ fontSize: 14, fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.16em', textTransform: 'uppercase' }}>Imagen</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>Niño nadando · clase real</div>
            </div>
          </div>
          {/* Floating quote card */}
          <div style={{
            position: 'absolute', bottom: 32, left: -32,
            background: '#fff', borderRadius: 20, padding: '16px 20px',
            boxShadow: '0 20px 50px -10px rgba(11,42,74,0.25)',
            maxWidth: 260,
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'linear-gradient(160deg, #FFE38A, #FFC20E)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
              }}>🦈</div>
              <div>
                <div style={{ fontSize: 13, color: '#0D4C63', lineHeight: 1.4, fontWeight: 500 }}>
                  "Mateo pasó del miedo al agua a un clavado de salida en 6 meses."
                </div>
                <div style={{ fontSize: 11, color: '#7D96A4', marginTop: 6 }}>
                  — Camila, mamá de Mateo (5 años)
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Levels */}
      <section style={{ padding: '40px 56px 80px', background: '#fff', borderTop: '1px solid #E4ECF0', borderBottom: '1px solid #E4ECF0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
              letterSpacing: '0.22em', textTransform: 'uppercase', color: '#0D4C63' }}>
              El método Peskids
            </div>
            <h2 style={{
              fontFamily: "'Nunito', system-ui, sans-serif",
              fontSize: 48, fontWeight: 700, letterSpacing: '-0.03em',
              margin: '8px 0 0', maxWidth: 560,
            }}>Seis niveles · de la primera burbuja al estilo mariposa.</h2>
          </div>
          <div style={{ fontSize: 14, color: '#3D6679', maxWidth: 320, lineHeight: 1.5 }}>
            Cada nivel tiene logros concretos. Avanzas cuando los dominas, no por edad ni por tiempo.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { n: 1, name: 'Burbujas',  ic: '💧', col: '#A8DDE3', desc: 'Familiarización. Entre 6 meses y 3 años con acompañamiento.' },
            { n: 2, name: 'Peces',     ic: '🐠', col: '#2DB7B0', desc: 'Flotación independiente y patada estilo libre.' },
            { n: 3, name: 'Delfines',  ic: '🐬', col: '#0D4C63', desc: 'Brazada coordinada y respiración lateral.' },
            { n: 4, name: 'Tiburones', ic: '🦈', col: '#0D4C63', desc: 'Cuatro estilos básicos y resistencia.', dark: true },
            { n: 5, name: 'Olímpicos', ic: '🏆', col: '#FFC20E', desc: 'Técnica avanzada, clavados de salida, virajes.' },
            { n: 6, name: 'Competencia', ic: '⚡', col: '#FF5A1F', desc: 'Equipo de torneos y entrenamiento dirigido.' },
          ].map((l,i)=>(
            <div key={i} style={{
              border: '1px solid #E4ECF0', borderRadius: 20, padding: 24,
              background: '#fff',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: l.col, color: l.dark ? '#A8DDE3' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
                }}>{l.ic}</div>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                    letterSpacing: '0.16em', color: '#7D96A4', fontWeight: 600 }}>NIVEL {l.n}</div>
                  <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
                    fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>{l.name}</div>
                </div>
              </div>
              <div style={{ marginTop: 14, fontSize: 14, color: '#3D6679', lineHeight: 1.5 }}>
                {l.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: '80px 56px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
            letterSpacing: '0.22em', textTransform: 'uppercase', color: '#0D4C63' }}>
            Planes mensuales
          </div>
          <h2 style={{
            fontFamily: "'Nunito', system-ui, sans-serif",
            fontSize: 48, fontWeight: 700, letterSpacing: '-0.03em',
            margin: '8px 0 0',
          }}>Elige el ritmo de tu peque.</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 1000, margin: '0 auto' }}>
          <PricingCard plan="Una vez" classes="1 clase / sem" price="220.000" sub="por mes" />
          <PricingCard plan="Constante" classes="2 clases / sem" price="320.000" sub="por mes" highlight />
          <PricingCard plan="Intensivo" classes="3 clases / sem" price="420.000" sub="por mes" />
        </div>
        <div style={{ textAlign: 'center', fontSize: 13, color: '#7D96A4', marginTop: 18 }}>
          Sin permanencia mínima · Hermanos -15% · Babyswim desde $180.000 con acompañante
        </div>
      </section>

      {/* CTA */}
      <section style={{
        margin: '0 56px 80px',
        background: 'linear-gradient(140deg, #0D4C63 0%, #1B607E 100%)',
        borderRadius: 32, padding: '60px 56px', color: '#fff',
        position: 'relative', overflow: 'hidden',
      }}>
        <PeskidsWave color="rgba(76,184,176,0.18)" height={140}
          style={{ position: 'absolute', left: 0, right: 0, bottom: -20 }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 40 }}>
          <div style={{ flex: 1 }}>
            <h2 style={{
              fontFamily: "'Nunito', system-ui, sans-serif",
              fontSize: 52, fontWeight: 700, letterSpacing: '-0.03em',
              margin: 0, lineHeight: 1,
            }}>
              La primera clase es gratis.
            </h2>
            <p style={{ fontSize: 17, opacity: 0.85, marginTop: 14, maxWidth: 520 }}>
              Trae a tu peque a probar el método. Sin compromiso, sin papeleo. Reserva en 30 segundos.
            </p>
          </div>
          <button style={{
            background: '#FFC20E', color: '#0D4C63', border: 0,
            padding: '20px 32px', borderRadius: 999, fontWeight: 800, fontSize: 16,
            fontFamily: "'Nunito', system-ui, sans-serif", whiteSpace: 'nowrap',
          }}>Reservar prueba gratis →</button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '40px 56px 60px', background: '#0D4C63', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <PeskidsLockup height={40} color="#fff" />
            <div style={{ fontSize: 13, opacity: 0.7, marginTop: 16, maxWidth: 280 }}>
              Clases de natación a domicilio en Medellín y alrededores. Sede principal en Llanogrande.
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: 56, fontSize: 13 }}>
            <FooterCol title="Programa" items={['Niveles','Babyswim','Torneos','Vacacionales']} />
            <FooterCol title="Información" items={['Sedes','Tarifas','Equipo','Preguntas']} />
            <FooterCol title="Contacto" items={['+57 300 000 0000','hola@peskids.co','@peskidsnatacion','Llanogrande, Rionegro']} />
          </div>
        </div>
        <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.6 }}>
          <span>© 2026 Peskids · #TeamPesk</span>
          <span>Más que natación, formamos para la vida.</span>
        </div>
      </footer>
    </div>
  );
}

function StatBlock({ num, label }) {
  return (
    <div>
      <div style={{
        fontFamily: "'Nunito', system-ui, sans-serif",
        fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: '#0D4C63',
        fontVariantNumeric: 'tabular-nums',
      }}>{num}</div>
      <div style={{ fontSize: 12, color: '#7D96A4', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function PricingCard({ plan, classes, price, sub, highlight }) {
  return (
    <div style={{
      borderRadius: 24, padding: 32,
      background: highlight ? '#0D4C63' : '#fff',
      color: highlight ? '#fff' : '#0D4C63',
      border: highlight ? '1px solid #0D4C63' : '1px solid #E4ECF0',
      position: 'relative',
      boxShadow: highlight ? '0 24px 60px -20px rgba(11,42,74,0.4)' : 'none',
    }}>
      {highlight && (
        <div style={{
          position: 'absolute', top: -12, left: 32,
          background: '#FFC20E', color: '#0D4C63',
          padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}>Más elegido</div>
      )}
      <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
        fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{plan}</div>
      <div style={{ fontSize: 13, opacity: highlight ? 0.7 : 0.6, marginTop: 4 }}>{classes}</div>
      <div style={{ marginTop: 28, display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 14, opacity: highlight ? 0.7 : 0.6 }}>$</span>
        <span style={{
          fontFamily: "'Nunito', system-ui, sans-serif",
          fontSize: 48, fontWeight: 700, letterSpacing: '-0.04em',
          fontVariantNumeric: 'tabular-nums',
        }}>{price}</span>
      </div>
      <div style={{ fontSize: 12, opacity: highlight ? 0.7 : 0.6 }}>{sub}</div>

      <div style={{ marginTop: 22, paddingTop: 22,
        borderTop: '1px solid ' + (highlight ? 'rgba(255,255,255,0.12)' : '#E4ECF0') }}>
        {['Profesor certificado','Agua climatizada 31°C','Reposiciones flexibles','Reporte mensual'].map((f,i)=>(
          <div key={i} style={{ fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8,
            color: highlight ? 'rgba(255,255,255,0.85)' : '#3D6679' }}>
            <span style={{ color: highlight ? '#A8DDE3' : '#2DB7B0' }}>✓</span> {f}
          </div>
        ))}
      </div>

      <button style={{
        width: '100%', marginTop: 22,
        background: highlight ? '#FFC20E' : '#2DB7B0',
        color: highlight ? '#0D4C63' : '#fff',
        border: 0, padding: '14px', borderRadius: 999,
        fontWeight: 700, fontSize: 14,
        fontFamily: "'Nunito', system-ui, sans-serif",
      }}>Empezar →</button>
    </div>
  );
}

function FooterCol({ title, items }) {
  return (
    <div>
      <div style={{ fontSize: 11, opacity: 0.5, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.16em',
        fontFamily: "'JetBrains Mono', monospace", marginBottom: 12 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, opacity: 0.85 }}>
        {items.map((it,i)=><span key={i}>{it}</span>)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// V2 — Brand bold · uses 4 logo colors as blocks
// ─────────────────────────────────────────────────────────
function LandingV2() {
  return (
    <div style={{
      width: LANDING_W, background: '#fff',
      fontFamily: "'Nunito', system-ui, sans-serif", color: '#0D4C63',
    }}>
      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '24px 56px',
      }}>
        <PeskidsLockup height={44} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <NavLink>Método</NavLink>
          <NavLink>Niveles</NavLink>
          <NavLink>Tarifas</NavLink>
          <NavLink>Sedes</NavLink>
          <button style={{
            background: '#FF5A1F', color: '#fff', border: 0,
            padding: '12px 22px', borderRadius: 12, fontWeight: 700, fontSize: 13,
            fontFamily: "'Nunito', system-ui, sans-serif", marginLeft: 8,
          }}>Reservar prueba</button>
        </div>
      </nav>

      {/* Hero — quadrant block (mimics the logo) */}
      <section style={{ padding: '12px 56px 24px' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1.4fr 1fr',
          gridTemplateRows: 'auto auto', gap: 16, height: 580,
        }}>
          {/* Headline (large, takes 2 rows on left) */}
          <div style={{
            gridRow: '1 / span 2',
            background: '#2DB7B0',
            borderRadius: 28, padding: 48,
            color: '#fff', position: 'relative', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}>
            <div style={{ position: 'absolute', right: -60, bottom: -60, fontSize: 380, opacity: 0.08 }}>🌊</div>
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.16)',
                padding: '8px 14px', borderRadius: 999,
                fontSize: 12, fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.12em', textTransform: 'uppercase',
              }}>#TeamPesk · Llanogrande</div>
              <h1 style={{
                fontFamily: "'Nunito', system-ui, sans-serif",
                fontSize: 108, fontWeight: 700, letterSpacing: '-0.05em',
                lineHeight: 0.9, margin: '24px 0 0',
              }}>
                Aprenden.<br/>
                Se divierten.<br/>
                Son{' '}<span style={{ fontFamily: "'Caveat Brush', cursive", color: '#FFC20E', display: 'inline-block', transform: 'rotate(-3deg)' }}>Peskids</span>.
              </h1>
              <p style={{ fontSize: 19, lineHeight: 1.4, opacity: 0.95,
                marginTop: 20, maxWidth: 440 }}>
                Natación para bebés y niños en Medellín. Método propio, profesores certificados, sedes propias y a domicilio.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button style={{
                background: '#fff', color: '#0D4C63', border: 0,
                padding: '18px 28px', borderRadius: 14, fontWeight: 800, fontSize: 15,
                fontFamily: "'Nunito', system-ui, sans-serif",
              }}>Clase de prueba gratis →</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, opacity: 0.92 }}>
                <span style={{ fontSize: 18 }}>★★★★★</span>
                4.9 / 350+ familias
              </div>
            </div>
          </div>

          {/* Top right — coral block (numbers) */}
          <div style={{
            background: '#FF5A1F', color: '#fff',
            borderRadius: 28, padding: 32, position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.8 }}>
              Equipo
            </div>
            <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
              fontSize: 96, fontWeight: 700, letterSpacing: '-0.05em',
              lineHeight: 0.9, marginTop: 12,
              fontVariantNumeric: 'tabular-nums' }}>14</div>
            <div style={{ fontSize: 16, opacity: 0.92, marginTop: 8, maxWidth: 200, lineHeight: 1.3 }}>
              años enseñando a familias del oriente antioqueño.
            </div>
          </div>

          {/* Bottom right — sunshine block (CTA) */}
          <div style={{
            background: '#FFC20E', color: '#0D4C63',
            borderRadius: 28, padding: 32, position: 'relative', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.7 }}>
                Empieza ya
              </div>
              <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
                fontSize: 38, fontWeight: 700, letterSpacing: '-0.03em',
                lineHeight: 1, marginTop: 12 }}>
                Ciclo<br/>junio<br/>abierto.
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              Cupos limitados · 30 niños por sede
              <div style={{ marginTop: 12, fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11, letterSpacing: '0.18em' }}>VER HORARIOS →</div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <section style={{
        margin: '40px 0', padding: '24px 0',
        background: '#0D4C63', color: '#fff',
        display: 'flex', alignItems: 'center', gap: 56, overflow: 'hidden',
        fontFamily: "'Nunito', system-ui, sans-serif",
        fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em',
        whiteSpace: 'nowrap',
      }}>
        {Array(2).fill().flatMap((_,k)=>
          ['Bebés desde 6 meses','·','Niños hasta 14 años','·','Babyswim','·','Domicilios','·','Torneos','·','Vacacionales']
            .map((t,i)=>(
              <span key={`${k}-${i}`} style={{ color: t === '·' ? '#FFC20E' : '#fff' }}>{t}</span>
            ))
        )}
      </section>

      {/* Why */}
      <section style={{ padding: '60px 56px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
              letterSpacing: '0.22em', textTransform: 'uppercase', color: '#FF5A1F' }}>
              Por qué Peskids
            </div>
            <h2 style={{
              fontFamily: "'Nunito', system-ui, sans-serif",
              fontSize: 64, fontWeight: 700, letterSpacing: '-0.04em',
              margin: '16px 0 0', lineHeight: 1,
            }}>El agua es de tu peque. <span style={{ color: '#2DB7B0' }}>Él decide cómo.</span></h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {[
              { ic: '🌡️', t: 'Agua climatizada a 31°C', d: 'Bebés y niños no se enfrían — clases relajadas y largas.' },
              { ic: '👥', t: 'Máximo 4 niños por clase', d: 'Atención personalizada en cada sesión.' },
              { ic: '📈', t: 'Progreso visible', d: 'Cada brazada y logro queda registrado en tu app.' },
              { ic: '🏠', t: 'A domicilio o en sede', d: 'Llevamos el método a tu piscina o vienes a Llanogrande.' },
            ].map((f,i)=>(
              <div key={i} style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: '#E6F6FB', border: '1px solid #E4ECF0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                  flexShrink: 0,
                }}>{f.ic}</div>
                <div>
                  <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
                    fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: '#0D4C63' }}>{f.t}</div>
                  <div style={{ fontSize: 14, color: '#3D6679', marginTop: 4, lineHeight: 1.5 }}>{f.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder strip */}
      <section style={{ padding: '0 56px 60px' }}>
        <div style={{
          background: '#E6F6FB', borderRadius: 32, padding: 48,
          display: 'grid', gridTemplateColumns: '300px 1fr', gap: 48, alignItems: 'center',
        }}>
          <div style={{
            aspectRatio: '1/1', borderRadius: 24,
            background: 'linear-gradient(160deg, #2DB7B0, #0D4C63)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 90, color: '#fff',
          }}>🏊</div>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
              letterSpacing: '0.22em', textTransform: 'uppercase', color: '#0D4C63' }}>
              Conoce a Peska
            </div>
            <div style={{
              fontFamily: "'Nunito', system-ui, sans-serif",
              fontSize: 38, fontWeight: 700, letterSpacing: '-0.03em',
              marginTop: 8, lineHeight: 1.05,
            }}>
              Santiago Ramírez Sierra · fundador
            </div>
            <p style={{ fontSize: 16, color: '#3D6679', marginTop: 16, lineHeight: 1.55, maxWidth: 600 }}>
              "Llevo 14 años enseñando a familias del oriente antioqueño. Lo que más me importa no es la técnica — es que cada peque salga del agua con más confianza que cuando entró."
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ padding: '60px 56px 100px' }}>
        <div style={{
          background: '#0D4C63', borderRadius: 32, padding: 64,
          color: '#fff', textAlign: 'center', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -20, left: 56, opacity: 0.2 }}>
            <PeskidsLogo size={120} />
          </div>
          <div style={{ position: 'absolute', bottom: -30, right: 80, opacity: 0.18 }}>
            <PeskidsLogo size={160} />
          </div>
          <h2 style={{
            fontFamily: "'Nunito', system-ui, sans-serif",
            fontSize: 72, fontWeight: 700, letterSpacing: '-0.04em',
            margin: 0, lineHeight: 1,
          }}>
            ¿Listos para meterse al agua?
          </h2>
          <p style={{ fontSize: 18, opacity: 0.85, marginTop: 18, maxWidth: 540, marginLeft: 'auto', marginRight: 'auto' }}>
            Reserva la primera clase en 30 segundos. Es gratis y sin compromiso.
          </p>
          <button style={{
            background: '#FFC20E', color: '#0D4C63', border: 0,
            padding: '20px 40px', borderRadius: 14, fontWeight: 800, fontSize: 18,
            fontFamily: "'Nunito', system-ui, sans-serif", marginTop: 28,
          }}>Reservar clase de prueba →</button>
        </div>
      </section>
    </div>
  );
}

function NavLink({ children }) {
  return (
    <span style={{ padding: '8px 14px', fontSize: 14, fontWeight: 600,
      borderRadius: 8, cursor: 'pointer' }}>{children}</span>
  );
}

Object.assign(window, { LandingV1, LandingV2 });
