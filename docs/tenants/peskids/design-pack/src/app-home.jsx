// Three home variations for the Peskids parent app + supporting screens.
// All wrapped in IOSDevice frames so they render at iPhone scale inside DC.

const APP_DATA = {
  parentName: 'Camila',
  child: {
    name: 'Mateo',
    age: 5,
    avatar: '🦈',
    level: 3,
    levelName: 'Delfines',
    progress: 0.62,
    nextBadge: 'Clavado de salida',
  },
  nextClass: {
    day: 'Hoy',
    time: '3:30 pm',
    teacher: 'Santiago R.',
    teacherInitials: 'SR',
    location: 'Sede Llanogrande',
    pool: 'Piscina 1 · climatizada',
    countdown: '2 h 14 min',
  },
  thisWeek: [
    { day: 'Lun', date: 18, has: false },
    { day: 'Mar', date: 19, has: true,  attended: true },
    { day: 'Mié', date: 20, has: false },
    { day: 'Jue', date: 21, has: true,  today: true },
    { day: 'Vie', date: 22, has: false },
    { day: 'Sáb', date: 23, has: true },
    { day: 'Dom', date: 24, has: false },
  ],
  badges: ['Flotación', 'Patada', 'Burbujas', 'Brazada', 'Clavado'],
  payments: { status: 'Al día', next: '1 de junio', amount: 320000 },
};

// ─────────────────────────────────────────────────────────
// Variation A — "Acuático sereno" · gradient hero, calm
// ─────────────────────────────────────────────────────────
function AppHomeA() {
  const d = APP_DATA;
  return (
    <IOSDevice dark={false}>
      <div style={{
        minHeight: '100%', background: '#E6F6FB',
        fontFamily: "'Nunito', system-ui, sans-serif",
        paddingBottom: 100,
      }}>
        {/* Header */}
        <div style={{ padding: '8px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, color: '#7D96A4', fontWeight: 500 }}>Hola</div>
            <div style={{ fontSize: 22, color: '#0D4C63', fontWeight: 700, letterSpacing: '-0.02em',
              fontFamily: "'Nunito', system-ui, sans-serif" }}>{d.parentName}</div>
          </div>
          <div style={{
            width: 40, height: 40, borderRadius: 999, background: '#D4F0EE',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>🔔</div>
        </div>

        {/* Hero — next class gradient */}
        <div style={{ padding: '0 20px' }}>
          <div style={{
            borderRadius: 28, padding: 22,
            background: 'linear-gradient(160deg, #2DB7B0 0%, #A8DDE3 100%)',
            color: '#fff', position: 'relative', overflow: 'hidden',
            boxShadow: '0 18px 40px -18px rgba(76,184,176,0.5)',
          }}>
            <PeskidsWave color="rgba(255,255,255,0.18)" height={70}
              style={{ position: 'absolute', left: 0, right: 0, bottom: -14 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                  letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.85 }}>
                  Próxima clase
                </div>
                <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
                  fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em',
                  lineHeight: 1, marginTop: 8 }}>
                  {d.nextClass.time}
                </div>
                <div style={{ fontSize: 13, marginTop: 6, opacity: 0.94 }}>
                  {d.nextClass.day} · {d.nextClass.countdown}
                </div>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
                borderRadius: 14, padding: '6px 10px',
                fontSize: 11, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: '#fff' }} />
                Confirmada
              </div>
            </div>

            <div style={{
              marginTop: 28, position: 'relative',
              display: 'flex', alignItems: 'center', gap: 12,
              paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.22)',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 999, background: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#0D4C63', fontWeight: 700, fontSize: 13,
              }}>{d.nextClass.teacherInitials}</div>
              <div style={{ flex: 1, fontSize: 13, lineHeight: 1.35 }}>
                <div style={{ fontWeight: 600 }}>{d.nextClass.teacher}</div>
                <div style={{ opacity: 0.88 }}>{d.nextClass.location}</div>
              </div>
              <button style={{
                background: '#fff', color: '#0D4C63', border: 0,
                padding: '8px 14px', borderRadius: 999, fontWeight: 700, fontSize: 13,
                fontFamily: "'Nunito', system-ui, sans-serif",
              }}>Detalles</button>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ padding: '20px 20px 0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            { ic: '📅', label: 'Reservar' },
            { ic: '💳', label: 'Pagar' },
            { ic: '💬', label: 'Mensaje' },
            { ic: '⭐', label: 'Progreso' },
          ].map((q,i)=>(
            <div key={i} style={{
              background: '#fff', borderRadius: 18, padding: '14px 6px',
              textAlign: 'center', border: '1px solid #E4ECF0',
            }}>
              <div style={{ fontSize: 22 }}>{q.ic}</div>
              <div style={{ fontSize: 11, color: '#0D4C63', fontWeight: 600, marginTop: 4 }}>{q.label}</div>
            </div>
          ))}
        </div>

        {/* Child progress */}
        <div style={{ padding: '24px 20px 0' }}>
          <SectionTitle>Mateo · 5 años</SectionTitle>
          <div style={{
            marginTop: 10, background: '#fff', borderRadius: 22, padding: 18,
            border: '1px solid #E4ECF0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 18,
                background: 'linear-gradient(160deg, #FFE38A 0%, #FFC20E 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
              }}>{d.child.avatar}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: '#7D96A4', fontWeight: 600,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  fontFamily: "'JetBrains Mono', monospace" }}>
                  Nivel {d.child.level}
                </div>
                <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
                  fontSize: 19, fontWeight: 700, color: '#0D4C63', letterSpacing: '-0.02em' }}>
                  {d.child.levelName}
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#0D4C63', fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace" }}>
                {Math.round(d.child.progress*100)}%
              </div>
            </div>
            <div style={{ marginTop: 14, height: 8, background: '#E4ECF0', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${d.child.progress*100}%`, height: '100%',
                background: 'linear-gradient(90deg, #2DB7B0, #A8DDE3)' }} />
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: '#3D6679', lineHeight: 1.45 }}>
              Próximo logro · <span style={{ fontWeight: 700, color: '#0D4C63' }}>{d.child.nextBadge}</span>
            </div>
          </div>
        </div>

        {/* Week */}
        <div style={{ padding: '24px 20px 0' }}>
          <SectionTitle>Esta semana</SectionTitle>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {d.thisWeek.map((d2,i)=>{
              const sel = d2.today;
              const att = d2.attended;
              return (
                <div key={i} style={{
                  flex: 1, padding: '10px 0', borderRadius: 14,
                  background: sel ? '#0D4C63' : '#fff',
                  border: '1px solid ' + (sel ? '#0D4C63' : '#E4ECF0'),
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 10, color: sel ? 'rgba(255,255,255,0.7)' : '#7D96A4',
                    textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                    {d2.day}
                  </div>
                  <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
                    fontSize: 18, fontWeight: 700, color: sel ? '#fff' : '#0D4C63', marginTop: 2 }}>
                    {d2.date}
                  </div>
                  <div style={{
                    width: 6, height: 6, borderRadius: 999, margin: '4px auto 0',
                    background: d2.has ? (att ? '#22C55E' : (sel ? '#A8DDE3' : '#2DB7B0')) : 'transparent',
                  }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <AppTabBar active={0} />
    </IOSDevice>
  );
}

// ─────────────────────────────────────────────────────────
// Variation B — "Card-first" · structured, content-dense
// ─────────────────────────────────────────────────────────
function AppHomeB() {
  const d = APP_DATA;
  return (
    <IOSDevice>
      <div style={{
        minHeight: '100%', background: '#fff',
        fontFamily: "'Nunito', system-ui, sans-serif",
        paddingBottom: 100,
      }}>
        {/* Header */}
        <div style={{ padding: '4px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <PeskidsLogo size={38} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
              fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: '#0D4C63' }}>
              Hola, {d.parentName} 👋
            </div>
            <div style={{ fontSize: 12, color: '#7D96A4' }}>Sede Llanogrande</div>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 38, height: 38, borderRadius: 999, background: '#E6F6FB',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🔔</div>
            <div style={{ position: 'absolute', top: -2, right: -2, width: 14, height: 14, borderRadius: 999,
              background: '#FF5A1F', color: '#fff', fontSize: 9, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>2</div>
          </div>
        </div>

        {/* Big number — next class countdown */}
        <div style={{ padding: '0 20px' }}>
          <div style={{
            border: '1px solid #E4ECF0', borderRadius: 22, overflow: 'hidden',
          }}>
            <div style={{ padding: '18px 20px', background: '#0D4C63', color: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                  letterSpacing: '0.22em', textTransform: 'uppercase', color: '#A8DDE3' }}>
                  Falta para tu clase
                </div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>Hoy · 3:30 pm</div>
              </div>
              <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
                fontSize: 52, fontWeight: 700, letterSpacing: '-0.04em',
                lineHeight: 1, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>
                2<span style={{ fontSize: 28, opacity: 0.6 }}>h</span> 14<span style={{ fontSize: 28, opacity: 0.6 }}>m</span>
              </div>
            </div>
            <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 999, background: '#D4F0EE',
                color: '#0D4C63', fontWeight: 700, fontSize: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>SR</div>
              <div style={{ flex: 1, fontSize: 13, color: '#0D4C63', lineHeight: 1.35 }}>
                <div style={{ fontWeight: 600 }}>Prof. Santiago · Piscina 1</div>
                <div style={{ color: '#7D96A4' }}>Mateo · Delfines</div>
              </div>
              <button style={{ background: 'transparent', border: '1px solid #E4ECF0',
                color: '#3D6679', borderRadius: 999, padding: '7px 14px',
                fontWeight: 600, fontSize: 12,
                fontFamily: "'Nunito', system-ui, sans-serif" }}>Cancelar</button>
            </div>
          </div>
        </div>

        {/* Children selector */}
        <div style={{ padding: '24px 20px 0' }}>
          <SectionTitle>Mis peques</SectionTitle>
          <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
            <ChildChip name="Mateo" age={5} avatar="🦈" active />
            <ChildChip name="Luna"  age={3} avatar="🐠" />
            <div style={{
              width: 64, borderRadius: 18, border: '1px dashed #B7CCD4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#7D96A4', fontSize: 22,
            }}>+</div>
          </div>
        </div>

        {/* Progress card */}
        <div style={{ padding: '22px 20px 0' }}>
          <div style={{
            background: '#E6F6FB', borderRadius: 22, padding: 18,
            border: '1px solid #E4ECF0',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, color: '#7D96A4',
                  letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace" }}>
                  Mateo · Nivel 3
                </div>
                <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
                  fontSize: 22, fontWeight: 700, color: '#0D4C63', letterSpacing: '-0.02em', marginTop: 2 }}>
                  Delfines 🐬
                </div>
              </div>
              <div style={{
                width: 64, height: 64, position: 'relative',
              }}>
                <svg viewBox="0 0 64 64" width="64" height="64">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="#E4ECF0" strokeWidth="6" />
                  <circle cx="32" cy="32" r="26" fill="none" stroke="#2DB7B0" strokeWidth="6"
                    strokeDasharray={`${2*Math.PI*26}`}
                    strokeDashoffset={`${2*Math.PI*26*(1-d.child.progress)}`}
                    transform="rotate(-90 32 32)" strokeLinecap="round" />
                </svg>
                <div style={{ position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Nunito', system-ui, sans-serif",
                  fontSize: 16, fontWeight: 700, color: '#0D4C63' }}>
                  62%
                </div>
              </div>
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 6 }}>
              {d.badges.map((b,i)=>(
                <div key={i} style={{
                  flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 12,
                  background: i < 3 ? '#fff' : 'transparent',
                  border: '1px solid ' + (i < 3 ? '#E4ECF0' : 'transparent'),
                  opacity: i < 3 ? 1 : 0.4,
                }}>
                  <div style={{ fontSize: 18 }}>{i < 3 ? '⭐' : '○'}</div>
                  <div style={{ fontSize: 9, marginTop: 3, color: '#3D6679', fontWeight: 600 }}>{b}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Payments + Photos row */}
        <div style={{ padding: '20px 20px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ border: '1px solid #E4ECF0', borderRadius: 18, padding: 16 }}>
            <div style={{ fontSize: 11, color: '#7D96A4', textTransform: 'uppercase',
              letterSpacing: '0.1em', fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace" }}>Mensualidad</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: '#22C55E' }} />
              <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
                fontSize: 18, fontWeight: 700, color: '#0D4C63' }}>Al día</div>
            </div>
            <div style={{ fontSize: 11, color: '#3D6679', marginTop: 6 }}>
              Próximo cobro · 1 jun · $320.000
            </div>
          </div>
          <div style={{
            border: '1px solid #E4ECF0', borderRadius: 18, padding: 0, overflow: 'hidden',
            background: 'linear-gradient(160deg, #FFC9B0, #FFE38A)',
          }}>
            <div style={{ padding: 16, color: '#0D4C63' }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase',
                letterSpacing: '0.1em', fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace" }}>Galería</div>
              <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
                fontSize: 18, fontWeight: 700, marginTop: 4 }}>+12 fotos</div>
              <div style={{ fontSize: 11, marginTop: 6 }}>Clase de ayer</div>
            </div>
          </div>
        </div>
      </div>
      <AppTabBar active={0} />
    </IOSDevice>
  );
}

// ─────────────────────────────────────────────────────────
// Variation C — "Bold playful" · expressive type, big color
// ─────────────────────────────────────────────────────────
function AppHomeC() {
  const d = APP_DATA;
  return (
    <IOSDevice dark>
      <div style={{
        minHeight: '100%',
        background: 'linear-gradient(180deg, #0D4C63 0%, #0D4C63 50%, #051527 100%)',
        fontFamily: "'Nunito', system-ui, sans-serif",
        color: '#fff', paddingBottom: 100, position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative wave overlay */}
        <div style={{ position: 'absolute', top: 200, left: -40, right: -40, opacity: 0.07 }}>
          <PeskidsWave color="#A8DDE3" height={140} />
        </div>

        {/* Header */}
        <div style={{ padding: '8px 20px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <PeskidsLogo size={36} />
            <div>
              <div style={{ fontSize: 10, color: '#A8DDE3',
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.2em', textTransform: 'uppercase' }}>Hola</div>
              <div style={{ fontWeight: 700, fontSize: 15,
                fontFamily: "'Nunito', system-ui, sans-serif" }}>Camila</div>
            </div>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: 999, background: 'rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🔔</div>
        </div>

        {/* Massive headline */}
        <div style={{ padding: '8px 20px 24px' }}>
          <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
            fontSize: 44, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 0.95 }}>
            Mateo<br/>
            <span style={{ color: '#A8DDE3' }}>nada hoy.</span>
          </div>
          <div style={{ marginTop: 12, fontSize: 14, opacity: 0.75, lineHeight: 1.45, maxWidth: 280 }}>
            3:30 pm · Sede Llanogrande con Santiago. Faltan <span style={{ color: '#FFC20E', fontWeight: 700 }}>2h 14min</span>.
          </div>
        </div>

        {/* Reservation card glassy */}
        <div style={{ padding: '0 20px' }}>
          <div style={{
            borderRadius: 24, padding: 18,
            background: 'rgba(130,213,226,0.1)',
            border: '1px solid rgba(130,213,226,0.25)',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 50, height: 50, borderRadius: 16,
                background: 'linear-gradient(160deg, #2DB7B0, #A8DDE3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
              }}>🦈</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
                  fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>Delfines · Nivel 3</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Clase 18 de 32</div>
              </div>
              <button style={{
                background: '#FFC20E', color: '#0D4C63', border: 0,
                padding: '10px 16px', borderRadius: 999,
                fontWeight: 700, fontSize: 12,
                fontFamily: "'Nunito', system-ui, sans-serif",
              }}>Detalles</button>
            </div>

            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, opacity: 0.7,
                  textTransform: 'uppercase', letterSpacing: '0.12em',
                  fontFamily: "'JetBrains Mono', monospace" }}>Progreso</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#FFC20E',
                  fontFamily: "'JetBrains Mono', monospace" }}>62%</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: '62%', height: '100%',
                  background: 'linear-gradient(90deg, #2DB7B0, #FFC20E)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Action row */}
        <div style={{ padding: '24px 20px 0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <ActionBtn ic="📅" label="Agenda" hot />
          <ActionBtn ic="📸" label="Fotos" count="12" />
          <ActionBtn ic="💬" label="Profe" count="2" />
        </div>

        {/* Latest badge */}
        <div style={{ padding: '24px 20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: '#A8DDE3' }}>Logro reciente</div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>Ver todos →</div>
          </div>
          <div style={{
            marginTop: 10, borderRadius: 20, padding: 16,
            background: 'linear-gradient(120deg, #FF5A1F 0%, #FFC20E 100%)',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ width: 56, height: 56, borderRadius: 18,
              background: 'rgba(255,255,255,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🏆</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
                fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>
                Brazada completa
              </div>
              <div style={{ fontSize: 12, opacity: 0.92 }}>Desbloqueado hoy</div>
            </div>
          </div>
        </div>
      </div>
      <AppTabBar active={0} dark />
    </IOSDevice>
  );
}

// ─────────────────────────────────────────────────────────
// Reusable helpers
// ─────────────────────────────────────────────────────────
function SectionTitle({ children }) {
  return (
    <div style={{
      fontFamily: "'Nunito', system-ui, sans-serif",
      fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', color: '#0D4C63',
    }}>{children}</div>
  );
}

function ChildChip({ name, age, avatar, active }) {
  return (
    <div style={{
      flex: 1, borderRadius: 18, padding: '12px 10px',
      background: active ? '#0D4C63' : '#E6F6FB',
      color: active ? '#fff' : '#0D4C63',
      border: '1px solid ' + (active ? '#0D4C63' : '#E4ECF0'),
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 12,
        background: active ? 'rgba(255,255,255,0.12)' : 'linear-gradient(160deg, #FFE38A, #FFC20E)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
      }}>{avatar}</div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, fontFamily: "'Nunito', system-ui, sans-serif" }}>{name}</div>
        <div style={{ fontSize: 10, opacity: active ? 0.75 : 0.6 }}>{age} años</div>
      </div>
    </div>
  );
}

function ActionBtn({ ic, label, hot, count }) {
  return (
    <div style={{
      borderRadius: 18, padding: 14, background: hot ? '#FFC20E' : 'rgba(255,255,255,0.08)',
      color: hot ? '#0D4C63' : '#fff',
      border: '1px solid ' + (hot ? '#FFC20E' : 'rgba(255,255,255,0.1)'),
      textAlign: 'center', position: 'relative',
    }}>
      <div style={{ fontSize: 22 }}>{ic}</div>
      <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4 }}>{label}</div>
      {count && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          background: '#FF5A1F', color: '#fff', fontSize: 10, fontWeight: 700,
          padding: '2px 6px', borderRadius: 999,
        }}>{count}</div>
      )}
    </div>
  );
}

function AppTabBar({ active = 0, dark = false }) {
  const items = [
    { ic: '🏠', label: 'Inicio' },
    { ic: '📅', label: 'Agenda' },
    { ic: '⭐', label: 'Progreso' },
    { ic: '💬', label: 'Mensajes' },
    { ic: '👤', label: 'Yo' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      paddingBottom: 32, paddingTop: 8, paddingLeft: 12, paddingRight: 12,
      background: dark ? 'rgba(11,42,74,0.92)' : 'rgba(255,255,255,0.94)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid ' + (dark ? 'rgba(255,255,255,0.08)' : '#E4ECF0'),
      display: 'flex', gap: 4,
      fontFamily: "'Nunito', system-ui, sans-serif",
    }}>
      {items.map((it,i)=>(
        <div key={i} style={{
          flex: 1, padding: '8px 0', textAlign: 'center', borderRadius: 14,
          background: i === active ? (dark ? 'rgba(130,213,226,0.15)' : '#D4F0EE') : 'transparent',
        }}>
          <div style={{ fontSize: 18, opacity: i === active ? 1 : 0.5 }}>{it.ic}</div>
          <div style={{
            fontSize: 10, fontWeight: 700, marginTop: 2,
            color: i === active
              ? (dark ? '#A8DDE3' : '#0D4C63')
              : (dark ? 'rgba(255,255,255,0.55)' : '#7D96A4'),
          }}>{it.label}</div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { AppHomeA, AppHomeB, AppHomeC, AppTabBar, SectionTitle });
