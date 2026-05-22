// Onboarding flow (3 screens) for first-time parents:
// 1) Welcome  2) Add child  3) Choose plan + payment

// ─────────────────────────────────────────────────────────
// Screen 1 — Welcome
// ─────────────────────────────────────────────────────────
function OnbWelcome() {
  return (
    <IOSDevice dark>
      <div style={{
        minHeight: '100%',
        background: 'linear-gradient(180deg, #2DB7B0 0%, #0D4C63 60%, #0D4C63 100%)',
        fontFamily: "'Nunito', system-ui, sans-serif",
        color: '#fff',
        display: 'flex', flexDirection: 'column',
        position: 'relative', overflow: 'hidden',
      }}>
        <PeskidsWave color="rgba(255,255,255,0.1)" height={180}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 320 }} />
        <PeskidsWave color="rgba(255,255,255,0.15)" height={140}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 380 }} />

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
          <PeskidsLogo size={120} />
        </div>

        <div style={{ padding: '0 32px', textAlign: 'center', marginTop: 24 }}>
          <div style={{
            fontFamily: "'Nunito', system-ui, sans-serif",
            fontSize: 44, fontWeight: 700, letterSpacing: '-0.04em',
            lineHeight: 0.98,
          }}>
            Hola,<br/>
            <span style={{ color: '#FFC20E' }}>familia Pesk.</span>
          </div>
          <div style={{ fontSize: 15, marginTop: 16, opacity: 0.9, lineHeight: 1.5 }}>
            Cada brazada, logro y clase de tu peque — en un solo lugar.
          </div>
        </div>

        {/* Feature stack */}
        <div style={{ padding: '36px 24px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { ic: '📅', t: 'Reserva y cancela en segundos' },
            { ic: '⭐', t: 'Sigue el progreso por niveles' },
            { ic: '💬', t: 'Habla directo con el profe' },
          ].map((f,i)=>(
            <div key={i} style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 14, padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 14,
              backdropFilter: 'blur(10px)',
            }}>
              <div style={{ fontSize: 22 }}>{f.ic}</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{f.t}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ padding: '0 24px 36px', marginTop: 'auto' }}>
          <button style={{
            width: '100%', background: '#FFC20E', color: '#0D4C63', border: 0,
            padding: '16px', borderRadius: 18, fontWeight: 800, fontSize: 16,
            fontFamily: "'Nunito', system-ui, sans-serif",
          }}>Empezar →</button>
          <div style={{ textAlign: 'center', marginTop: 14, fontSize: 13, opacity: 0.75 }}>
            ¿Ya tienes cuenta? <span style={{ color: '#FFC20E', fontWeight: 700 }}>Iniciar sesión</span>
          </div>

          {/* Progress dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 24 }}>
            <Dot active />
            <Dot />
            <Dot />
          </div>
        </div>
      </div>
    </IOSDevice>
  );
}

// ─────────────────────────────────────────────────────────
// Screen 2 — Add child
// ─────────────────────────────────────────────────────────
function OnbAddChild() {
  return (
    <IOSDevice>
      <div style={{
        minHeight: '100%', background: '#fff',
        fontFamily: "'Nunito', system-ui, sans-serif", color: '#0D4C63',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '4px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button style={{ background: 'transparent', border: 0, fontSize: 22, color: '#3D6679', padding: 0 }}>‹</button>
          <div style={{ fontSize: 11, color: '#7D96A4',
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700 }}>Paso 2 de 3</div>
          <span style={{ fontSize: 13, color: '#7D96A4' }}>Omitir</span>
        </div>

        {/* Progress bar */}
        <div style={{ padding: '0 20px 24px', display: 'flex', gap: 6 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 99, background: '#2DB7B0' }} />
          <div style={{ flex: 1, height: 4, borderRadius: 99, background: '#2DB7B0' }} />
          <div style={{ flex: 1, height: 4, borderRadius: 99, background: '#E4ECF0' }} />
        </div>

        <div style={{ padding: '0 24px', flex: 1 }}>
          <h1 style={{
            fontFamily: "'Nunito', system-ui, sans-serif",
            fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em',
            margin: 0, lineHeight: 1,
          }}>Cuéntanos sobre<br/>tu peque.</h1>
          <p style={{ fontSize: 14, color: '#3D6679', marginTop: 10, lineHeight: 1.5 }}>
            Para asignar el nivel adecuado desde el primer día.
          </p>

          {/* Avatar picker */}
          <div style={{ marginTop: 22 }}>
            <FormLabel>Elige un avatar</FormLabel>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {['🦈','🐬','🐠','🐳','🦭'].map((a,i)=>(
                <div key={i} style={{
                  width: 54, height: 54, borderRadius: 16,
                  background: i === 0 ? 'linear-gradient(160deg, #FFE38A, #FFC20E)' : '#E6F6FB',
                  border: '2px solid ' + (i === 0 ? '#FFC20E' : '#E4ECF0'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
                }}>{a}</div>
              ))}
            </div>
          </div>

          {/* Inputs */}
          <div style={{ marginTop: 22 }}>
            <FormLabel>Nombre</FormLabel>
            <Input value="Mateo Restrepo" />
          </div>

          <div style={{ marginTop: 18, display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <FormLabel>Edad</FormLabel>
              <Input value="5 años" />
            </div>
            <div style={{ flex: 1 }}>
              <FormLabel>Género</FormLabel>
              <Input value="Niño" hasDropdown />
            </div>
          </div>

          {/* Experience level */}
          <div style={{ marginTop: 22 }}>
            <FormLabel>¿Sabe nadar?</FormLabel>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Choice label="Nunca ha estado en el agua" sub="Lo evaluamos en clase de prueba" />
              <Choice label="Se familiariza, no nada solo" sub="Recomendamos Nivel 1 · Burbujas" selected />
              <Choice label="Ya nada por su cuenta" sub="Lo evaluamos para Nivel 2+" />
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div style={{ padding: '16px 20px 32px',
          background: '#fff', borderTop: '1px solid #E4ECF0' }}>
          <button style={{
            width: '100%', background: '#2DB7B0', color: '#fff', border: 0,
            padding: '16px', borderRadius: 18, fontWeight: 700, fontSize: 15,
            fontFamily: "'Nunito', system-ui, sans-serif",
          }}>Continuar →</button>
        </div>
      </div>
    </IOSDevice>
  );
}

// ─────────────────────────────────────────────────────────
// Screen 3 — Plan + checkout
// ─────────────────────────────────────────────────────────
function OnbCheckout() {
  return (
    <IOSDevice>
      <div style={{
        minHeight: '100%', background: '#E6F6FB',
        fontFamily: "'Nunito', system-ui, sans-serif", color: '#0D4C63',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '4px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button style={{ background: 'transparent', border: 0, fontSize: 22, color: '#3D6679', padding: 0 }}>‹</button>
          <div style={{ fontSize: 11, color: '#7D96A4',
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700 }}>Paso 3 de 3</div>
          <span style={{ width: 20 }} />
        </div>

        <div style={{ padding: '0 20px 24px', display: 'flex', gap: 6 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 99, background: '#2DB7B0' }} />
          <div style={{ flex: 1, height: 4, borderRadius: 99, background: '#2DB7B0' }} />
          <div style={{ flex: 1, height: 4, borderRadius: 99, background: '#2DB7B0' }} />
        </div>

        <div style={{ padding: '0 20px', flex: 1 }}>
          <h1 style={{
            fontFamily: "'Nunito', system-ui, sans-serif",
            fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em',
            margin: 0, lineHeight: 1,
          }}>Elige el ritmo de Mateo.</h1>
          <p style={{ fontSize: 13, color: '#3D6679', marginTop: 8, lineHeight: 1.45 }}>
            Sin permanencia · Cancelas cuando quieras
          </p>

          {/* Plan cards */}
          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <PlanRow plan="Una vez" sub="1 clase / sem" price="220.000" />
            <PlanRow plan="Constante" sub="2 clases / sem" price="320.000" tag="Más elegido" selected />
            <PlanRow plan="Intensivo" sub="3 clases / sem" price="420.000" />
          </div>

          {/* Promo */}
          <div style={{
            marginTop: 18, padding: '12px 14px', borderRadius: 14,
            background: '#FFF1C2', border: '1px solid #FFC20E',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ fontSize: 18 }}>🎁</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#8B6A00' }}>Tu primera clase es gratis</div>
              <div style={{ fontSize: 11, color: '#8B6A00', opacity: 0.85 }}>Solo cobramos cuando Mateo decida quedarse.</div>
            </div>
          </div>

          {/* Summary */}
          <div style={{
            marginTop: 18, padding: '14px 16px',
            background: '#fff', borderRadius: 14, border: '1px solid #E4ECF0',
          }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              letterSpacing: '0.16em', textTransform: 'uppercase', color: '#7D96A4',
              fontWeight: 700, marginBottom: 8 }}>Resumen</div>
            <SummaryRow label="Plan Constante" val="$320.000 / mes" />
            <SummaryRow label="Clase de prueba" val="Gratis" tone="success" />
            <SummaryRow label="Primer cobro" val="Después de prueba" muted />
          </div>
        </div>

        <div style={{ padding: '16px 20px 32px',
          background: '#fff', borderTop: '1px solid #E4ECF0' }}>
          <button style={{
            width: '100%', background: '#0D4C63', color: '#fff', border: 0,
            padding: '16px', borderRadius: 18, fontWeight: 700, fontSize: 15,
            fontFamily: "'Nunito', system-ui, sans-serif",
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 14 }}>🍎</span> Reservar prueba con Apple Pay
          </button>
          <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: '#7D96A4' }}>
            o <span style={{ color: '#0D4C63', fontWeight: 700 }}>pagar con tarjeta</span>
          </div>
        </div>
      </div>
    </IOSDevice>
  );
}

// ─────────────────────────────────────────────────────────
// Tournament / event detail screen
// ─────────────────────────────────────────────────────────
function AppTournament() {
  return (
    <IOSDevice>
      <div style={{
        minHeight: '100%', background: '#fff',
        fontFamily: "'Nunito', system-ui, sans-serif", color: '#0D4C63',
        paddingBottom: 100,
      }}>
        {/* Hero banner */}
        <div style={{
          position: 'relative', height: 220,
          background: 'linear-gradient(140deg, #FF5A1F 0%, #FFC20E 100%)',
          color: '#fff', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: -40, bottom: -40, fontSize: 220, opacity: 0.15 }}>🏆</div>
          <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between' }}>
            <button style={{
              background: 'rgba(255,255,255,0.2)', border: 0, color: '#fff',
              width: 36, height: 36, borderRadius: 999, fontSize: 18,
              backdropFilter: 'blur(10px)',
            }}>‹</button>
            <button style={{
              background: 'rgba(255,255,255,0.2)', border: 0, color: '#fff',
              width: 36, height: 36, borderRadius: 999, fontSize: 15,
              backdropFilter: 'blur(10px)',
            }}>♡</button>
          </div>
          <div style={{ padding: '20px 20px 0' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              fontWeight: 700, opacity: 0.9 }}>Torneo · 7 jun 2026</div>
            <div style={{
              fontFamily: "'Nunito', system-ui, sans-serif",
              fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em',
              marginTop: 8, lineHeight: 1,
            }}>Copa Peskids<br/>Llanogrande</div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            <Pill tone="coral">Estilo libre</Pill>
            <Pill tone="sun">25m · 50m</Pill>
            <Pill tone="teal">Nivel 3+</Pill>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <StatCard num="48" label="Inscritos" />
            <StatCard num="12" label="Cupos" tone="sun" />
            <StatCard num="3" label="Días" tone="success" />
          </div>

          {/* Description */}
          <div style={{ marginTop: 20, fontSize: 14, color: '#3D6679', lineHeight: 1.55 }}>
            Tradicional copa interna de fin de ciclo. Niveles 3 en adelante compiten por categoría y edad. Medallas, fotos profesionales y bocadillos para todas las familias.
          </div>

          {/* Schedule */}
          <div style={{ marginTop: 24 }}>
            <SectionTitle>Cronograma</SectionTitle>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { t: '7:30', e: 'Calentamiento general' },
                { t: '8:00', e: 'Categoría Delfines · 25m libre' },
                { t: '9:00', e: 'Categoría Tiburones · 50m libre' },
                { t: '10:30', e: 'Premiación + brunch familiar' },
              ].map((s,i)=>(
                <div key={i} style={{
                  display: 'flex', gap: 14, padding: '12px 14px',
                  background: '#E6F6FB', borderRadius: 14, alignItems: 'center',
                  border: '1px solid #E4ECF0',
                }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700, fontSize: 13, color: '#0D4C63',
                    fontVariantNumeric: 'tabular-nums', width: 44 }}>{s.t}</div>
                  <div style={{ flex: 1, fontSize: 13, color: '#0D4C63', fontWeight: 600 }}>{s.e}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky CTA */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          padding: '14px 20px 32px',
          background: '#fff', borderTop: '1px solid #E4ECF0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                color: '#7D96A4', letterSpacing: '0.12em' }}>INSCRIPCIÓN</div>
              <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
                fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>$65.000</div>
            </div>
            <button style={{
              flex: 1, background: '#FF5A1F', color: '#fff', border: 0,
              padding: '14px', borderRadius: 14, fontWeight: 700, fontSize: 14,
              fontFamily: "'Nunito', system-ui, sans-serif",
            }}>Inscribir a Mateo →</button>
          </div>
        </div>
      </div>
    </IOSDevice>
  );
}

// ─────────────────────────────────────────────────────────
// Reusable bits
// ─────────────────────────────────────────────────────────
function Dot({ active }) {
  return (
    <span style={{
      width: active ? 24 : 8, height: 8, borderRadius: 999,
      background: active ? '#FFC20E' : 'rgba(255,255,255,0.4)',
      transition: 'all 0.2s',
    }} />
  );
}

function FormLabel({ children }) {
  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
      fontWeight: 700, color: '#7D96A4' }}>{children}</div>
  );
}

function Input({ value, hasDropdown }) {
  return (
    <div style={{
      marginTop: 6, padding: '12px 14px',
      background: '#E6F6FB', border: '1px solid #E4ECF0',
      borderRadius: 12, display: 'flex', alignItems: 'center',
      fontSize: 14, fontWeight: 500, color: '#0D4C63',
    }}>
      <span style={{ flex: 1 }}>{value}</span>
      {hasDropdown && <span style={{ color: '#7D96A4' }}>▾</span>}
    </div>
  );
}

function Choice({ label, sub, selected }) {
  return (
    <div style={{
      padding: '14px 16px', borderRadius: 14,
      background: selected ? '#D4F0EE' : '#E6F6FB',
      border: '1px solid ' + (selected ? '#2DB7B0' : '#E4ECF0'),
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: 999,
        border: '2px solid ' + (selected ? '#2DB7B0' : '#B7CCD4'),
        background: selected ? '#2DB7B0' : '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {selected && <span style={{ width: 8, height: 8, background: '#fff', borderRadius: 999 }} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#0D4C63' }}>{label}</div>
        <div style={{ fontSize: 11, color: '#3D6679', opacity: 0.8, marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

function PlanRow({ plan, sub, price, tag, selected }) {
  return (
    <div style={{
      padding: '14px 16px', borderRadius: 16,
      background: selected ? '#fff' : '#fff',
      border: '2px solid ' + (selected ? '#2DB7B0' : '#E4ECF0'),
      display: 'flex', alignItems: 'center', gap: 12,
      position: 'relative',
    }}>
      {tag && (
        <div style={{
          position: 'absolute', top: -10, right: 14,
          background: '#FFC20E', color: '#0D4C63',
          padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}>{tag}</div>
      )}
      <div style={{
        width: 20, height: 20, borderRadius: 999,
        border: '2px solid ' + (selected ? '#2DB7B0' : '#B7CCD4'),
        background: selected ? '#2DB7B0' : '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {selected && <span style={{ width: 8, height: 8, background: '#fff', borderRadius: 999 }} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#0D4C63',
          fontFamily: "'Nunito', system-ui, sans-serif", letterSpacing: '-0.01em' }}>{plan}</div>
        <div style={{ fontSize: 11, color: '#7D96A4' }}>{sub}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontFamily: "'Nunito', system-ui, sans-serif",
          fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: '#0D4C63',
          fontVariantNumeric: 'tabular-nums',
        }}>${price}</div>
        <div style={{ fontSize: 10, color: '#7D96A4' }}>/mes</div>
      </div>
    </div>
  );
}

function SummaryRow({ label, val, tone, muted }) {
  const valColor = tone === 'success' ? '#1E6E3D'
    : muted ? '#7D96A4' : '#0D4C63';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between',
      padding: '6px 0', fontSize: 13 }}>
      <span style={{ color: '#3D6679' }}>{label}</span>
      <span style={{ fontWeight: 700, color: valColor,
        fontFamily: "'JetBrains Mono', monospace",
        fontVariantNumeric: 'tabular-nums' }}>{val}</span>
    </div>
  );
}

Object.assign(window, { OnbWelcome, OnbAddChild, OnbCheckout, AppTournament });
