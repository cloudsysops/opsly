// Additional parent-app screens: Schedule, Progress, Payments, Messages.

// ─────────────────────────────────────────────────────────
// Schedule — month grid + day timeline
// ─────────────────────────────────────────────────────────
function AppSchedule() {
  const weeks = [
    [null, null, 1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10, 11, 12],
    [13, 14, 15, 16, 17, 18, 19],
    [20, { d: 21, today: true }, 22, 23, { d: 24, has: true }, 25, 26],
    [27, 28, 29, 30, 31, null, null],
  ];
  const days = ['L','M','M','J','V','S','D'];
  const timeline = [
    { time: '8:00',  title: 'Babyswim · Luna', tone: 'pool', tag: '6 meses' },
    { time: '10:30', title: 'Bloque Burbujas', tone: 'gray',  tag: '4 cupos' },
    { time: '3:30',  title: 'Tu clase · Mateo', tone: 'teal', highlight: true, tag: 'Confirmada' },
    { time: '5:00',  title: 'Tiburones · Lucas', tone: 'gray', tag: 'No reservada' },
  ];

  return (
    <IOSDevice>
      <div style={{
        minHeight: '100%', background: '#fff',
        fontFamily: "'Nunito', system-ui, sans-serif",
        paddingBottom: 100,
      }}>
        <div style={{ padding: '4px 20px 12px' }}>
          <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
            fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: '#0D4C63' }}>
            Agenda
          </div>
        </div>

        {/* Month switcher */}
        <div style={{ padding: '0 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#0D4C63' }}>Mayo</span>
            <span style={{ color: '#7D96A4', fontSize: 16 }}>2026</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <RoundBtn>‹</RoundBtn>
            <RoundBtn>›</RoundBtn>
          </div>
        </div>

        {/* Mini calendar */}
        <div style={{ padding: '0 20px 8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: 2, columnGap: 2 }}>
            {days.map((d,i)=>(
              <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700,
                color: '#7D96A4', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 0' }}>{d}</div>
            ))}
            {weeks.flat().map((c,i)=>{
              if (c === null) return <div key={i} />;
              const day = typeof c === 'object' ? c.d : c;
              const today = typeof c === 'object' && c.today;
              const has   = typeof c === 'object' && c.has;
              return (
                <div key={i} style={{
                  aspectRatio: '1 / 1', borderRadius: 12,
                  background: today ? '#0D4C63' : 'transparent',
                  border: !today && has ? '1px solid #2DB7B0' : 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                }}>
                  <span style={{
                    fontFamily: "'Nunito', system-ui, sans-serif",
                    fontSize: 15, fontWeight: today ? 700 : 500,
                    color: today ? '#fff' : '#0D4C63',
                  }}>{day}</span>
                  {has && !today && (
                    <span style={{ position: 'absolute', bottom: 6,
                      width: 4, height: 4, borderRadius: 999, background: '#2DB7B0' }} />
                  )}
                  {today && (
                    <span style={{ position: 'absolute', bottom: 6,
                      width: 4, height: 4, borderRadius: 999, background: '#A8DDE3' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Today's timeline */}
        <div style={{ padding: '16px 20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
              fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', color: '#0D4C63' }}>
              Jueves 21 · Hoy
            </div>
            <div style={{ fontSize: 11, color: '#7D96A4' }}>{timeline.length} clases</div>
          </div>

          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {timeline.map((t,i)=>{
              const colors = {
                teal: { bg: '#2DB7B0', fg: '#fff' },
                pool: { bg: '#A8DDE3', fg: '#0D4C63' },
                gray: { bg: '#E6F6FB', fg: '#0D4C63' },
              }[t.tone];
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'stretch', gap: 12,
                }}>
                  <div style={{
                    width: 50, fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12, color: '#7D96A4', fontWeight: 600, paddingTop: 14,
                  }}>{t.time}</div>
                  <div style={{
                    flex: 1, borderRadius: 16, padding: '14px 16px',
                    background: colors.bg, color: colors.fg,
                    border: t.tone === 'gray' ? '1px solid #E4ECF0' : 'none',
                    boxShadow: t.highlight ? '0 8px 24px -10px rgba(76,184,176,0.5)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
                        fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>
                        {t.title}
                      </div>
                      {t.highlight && <span style={{ fontSize: 14 }}>✓</span>}
                    </div>
                    <div style={{ fontSize: 11, opacity: t.tone === 'gray' ? 0.6 : 0.9, marginTop: 3 }}>
                      {t.tag}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reserve CTA */}
        <div style={{ padding: '24px 20px 0' }}>
          <button style={{
            width: '100%', background: '#0D4C63', color: '#fff', border: 0,
            padding: '16px', borderRadius: 18, fontWeight: 700, fontSize: 15,
            fontFamily: "'Nunito', system-ui, sans-serif",
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <span>+</span> Reservar clase
          </button>
        </div>
      </div>
      <AppTabBar active={1} />
    </IOSDevice>
  );
}

// ─────────────────────────────────────────────────────────
// Progress — child progress detail
// ─────────────────────────────────────────────────────────
function AppProgress() {
  const milestones = [
    { name: 'Burbujas', state: 'done', date: 'mar 2025' },
    { name: 'Flotación dorsal', state: 'done', date: 'jul 2025' },
    { name: 'Patada estilo libre', state: 'done', date: 'oct 2025' },
    { name: 'Brazada completa', state: 'current', date: 'En progreso' },
    { name: 'Clavado de salida', state: 'next', date: 'Próximo' },
    { name: 'Estilo mariposa', state: 'next', date: 'Locked' },
  ];

  return (
    <IOSDevice>
      <div style={{
        minHeight: '100%', background: '#fff',
        fontFamily: "'Nunito', system-ui, sans-serif",
        paddingBottom: 100,
      }}>
        {/* Header with child */}
        <div style={{ padding: '4px 20px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 50, height: 50, borderRadius: 16,
              background: 'linear-gradient(160deg, #FFE38A, #FFC20E)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
            }}>🦈</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
                fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: '#0D4C63' }}>
                Mateo
              </div>
              <div style={{ fontSize: 12, color: '#7D96A4' }}>5 años · 8 meses con Peskids</div>
            </div>
            <button style={{ background: '#E6F6FB', border: '1px solid #E4ECF0',
              borderRadius: 12, padding: '8px 12px', fontSize: 12, fontWeight: 600,
              color: '#3D6679' }}>Cambiar</button>
          </div>
        </div>

        {/* Level card */}
        <div style={{ padding: '0 20px' }}>
          <div style={{
            background: 'linear-gradient(150deg, #0D4C63 0%, #1B607E 100%)',
            color: '#fff', borderRadius: 24, padding: 22, position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 140, opacity: 0.08 }}>🐬</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              letterSpacing: '0.22em', textTransform: 'uppercase', color: '#A8DDE3' }}>
              Nivel 3 de 6
            </div>
            <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
              fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em', marginTop: 4 }}>
              Delfines 🐬
            </div>
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: "'Nunito', system-ui, sans-serif",
                fontSize: 36, fontWeight: 700, color: '#FFC20E',
                fontVariantNumeric: 'tabular-nums' }}>62</span>
              <span style={{ fontSize: 14, opacity: 0.8 }}>%</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.7 }}>3 logros por desbloquear</span>
            </div>
            <div style={{ marginTop: 8, height: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: '62%', height: '100%', background: 'linear-gradient(90deg, #2DB7B0, #FFC20E)' }} />
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ padding: '18px 20px 0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <StatCard num="48" label="Clases tomadas" />
          <StatCard num="6" label="Logros" tone="sun" />
          <StatCard num="94%" label="Asistencia" tone="success" />
        </div>

        {/* Milestone list */}
        <div style={{ padding: '24px 20px 0' }}>
          <SectionTitle>Logros del nivel</SectionTitle>
          <div style={{ marginTop: 12, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 15, top: 18, bottom: 18, width: 2, background: '#E4ECF0' }} />
            {milestones.map((m,i)=>{
              const done = m.state === 'done';
              const curr = m.state === 'current';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', position: 'relative' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 999, position: 'relative', zIndex: 1,
                    background: done ? '#2DB7B0' : curr ? '#FFC20E' : '#fff',
                    border: '2px solid ' + (done ? '#2DB7B0' : curr ? '#FFC20E' : '#E4ECF0'),
                    color: done ? '#fff' : curr ? '#0D4C63' : '#7D96A4',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700,
                  }}>{done ? '✓' : curr ? '●' : '○'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
                      fontSize: 15, fontWeight: 700, color: done || curr ? '#0D4C63' : '#7D96A4',
                      letterSpacing: '-0.01em' }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: '#7D96A4', marginTop: 1 }}>{m.date}</div>
                  </div>
                  {curr && <Pill tone="sun">En progreso</Pill>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <AppTabBar active={2} />
    </IOSDevice>
  );
}

// ─────────────────────────────────────────────────────────
// Payments — billing & receipts
// ─────────────────────────────────────────────────────────
function AppPayments() {
  const txs = [
    { date: '01 May 26', concept: 'Mensualidad · Mayo', amt: 320000, status: 'pagada' },
    { date: '01 Abr 26', concept: 'Mensualidad · Abril', amt: 320000, status: 'pagada' },
    { date: '10 Mar 26', concept: 'Inscripción torneo', amt: 65000, status: 'pagada' },
    { date: '01 Mar 26', concept: 'Mensualidad · Marzo', amt: 320000, status: 'pagada' },
  ];
  const fmt = n => '$' + n.toLocaleString('es-CO');
  return (
    <IOSDevice>
      <div style={{
        minHeight: '100%', background: '#fff',
        fontFamily: "'Nunito', system-ui, sans-serif",
        paddingBottom: 100,
      }}>
        <div style={{ padding: '4px 20px 12px' }}>
          <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
            fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: '#0D4C63' }}>
            Pagos
          </div>
        </div>

        {/* Status hero */}
        <div style={{ padding: '0 20px' }}>
          <div style={{
            border: '1px solid #E4ECF0', borderRadius: 22, padding: 22,
            background: 'linear-gradient(135deg, #E6F6FB 0%, #D4F0EE 100%)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 999, background: '#22C55E' }} />
              <div style={{ fontSize: 11, color: '#1E6E3D', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.14em',
                fontFamily: "'JetBrains Mono', monospace" }}>Al día</div>
            </div>
            <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
              fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: '#0D4C63', marginTop: 6 }}>
              Próximo cobro
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <span style={{ fontFamily: "'Nunito', system-ui, sans-serif",
                fontSize: 28, fontWeight: 700, color: '#0D4C63',
                fontVariantNumeric: 'tabular-nums' }}>{fmt(320000)}</span>
              <span style={{ fontSize: 13, color: '#3D6679' }}>· 1 de junio</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button style={{
                flex: 1, background: '#2DB7B0', color: '#fff', border: 0,
                padding: '12px', borderRadius: 14, fontWeight: 700, fontSize: 13,
                fontFamily: "'Nunito', system-ui, sans-serif",
              }}>Pagar ahora</button>
              <button style={{
                background: '#fff', color: '#0D4C63', border: '1px solid #E4ECF0',
                padding: '12px 16px', borderRadius: 14, fontWeight: 600, fontSize: 13,
                fontFamily: "'Nunito', system-ui, sans-serif",
              }}>Programar</button>
            </div>
          </div>
        </div>

        {/* Payment methods */}
        <div style={{ padding: '24px 20px 0' }}>
          <SectionTitle>Método de pago</SectionTitle>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12,
            border: '1px solid #E4ECF0', borderRadius: 16, padding: '12px 14px' }}>
            <div style={{ width: 40, height: 28, borderRadius: 6,
              background: 'linear-gradient(120deg, #0D4C63, #1B607E)', color: '#FFC20E',
              fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>VISA</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#0D4C63' }}>•••• 4821</div>
              <div style={{ fontSize: 11, color: '#7D96A4' }}>Camila R.</div>
            </div>
            <button style={{ background: 'transparent', border: 0, color: '#0D4C63',
              fontWeight: 700, fontSize: 12 }}>Cambiar</button>
          </div>
        </div>

        {/* History */}
        <div style={{ padding: '24px 20px 0' }}>
          <SectionTitle>Historial</SectionTitle>
          <div style={{ marginTop: 10, border: '1px solid #E4ECF0', borderRadius: 16, overflow: 'hidden' }}>
            {txs.map((t,i)=>(
              <div key={i} style={{
                padding: '14px 14px',
                borderTop: i === 0 ? 'none' : '1px solid #E4ECF0',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 12, background: '#E6F6FB',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#0D4C63', fontWeight: 700, fontSize: 12,
                }}>✓</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#0D4C63' }}>{t.concept}</div>
                  <div style={{ fontSize: 11, color: '#7D96A4',
                    fontFamily: "'JetBrains Mono', monospace" }}>{t.date}</div>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13, fontWeight: 700, color: '#0D4C63',
                  fontVariantNumeric: 'tabular-nums' }}>{fmt(t.amt)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <AppTabBar active={4} />
    </IOSDevice>
  );
}

// ─────────────────────────────────────────────────────────
// Messages — chat with teacher
// ─────────────────────────────────────────────────────────
function AppMessages() {
  const msgs = [
    { from: 't', text: 'Hola Camila! Mateo estuvo increíble hoy 💪', time: '2:14 pm' },
    { from: 't', text: 'Logró completar brazada coordinada en 25m. Subimos al check del logro 🏆', time: '2:14 pm' },
    { from: 'me', text: '¡Qué emoción! ¿Puedo entrar a verlo el sábado?', time: '2:31 pm' },
    { from: 't', text: 'Por supuesto. Te dejo cupo en la ventana de visita 10:30 am.', time: '2:35 pm' },
    { from: 'me', text: 'Perfecto, ahí estaremos 🌊', time: '2:36 pm' },
  ];

  return (
    <IOSDevice>
      <div style={{
        minHeight: '100%', background: '#E6F6FB',
        fontFamily: "'Nunito', system-ui, sans-serif",
        paddingBottom: 100, display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '4px 16px 14px', display: 'flex', alignItems: 'center', gap: 12,
          background: '#fff', borderBottom: '1px solid #E4ECF0',
        }}>
          <button style={{ background: 'none', border: 0, color: '#3D6679', fontSize: 22, padding: 0 }}>‹</button>
          <div style={{
            width: 40, height: 40, borderRadius: 999, background: '#D4F0EE',
            color: '#0D4C63', fontWeight: 700, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>SR</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
              fontSize: 16, fontWeight: 700, color: '#0D4C63', letterSpacing: '-0.01em' }}>
              Prof. Santiago
            </div>
            <div style={{ fontSize: 11, color: '#22C55E', fontWeight: 600 }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 999,
                background: '#22C55E', marginRight: 5 }} />
              En línea
            </div>
          </div>
        </div>

        {/* Day chip */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
          <span style={{
            background: '#fff', border: '1px solid #E4ECF0', color: '#7D96A4',
            padding: '5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600,
          }}>Hoy</span>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {msgs.map((m,i)=>{
            const me = m.from === 'me';
            return (
              <div key={i} style={{
                alignSelf: me ? 'flex-end' : 'flex-start',
                maxWidth: '75%',
              }}>
                <div style={{
                  background: me ? '#2DB7B0' : '#fff',
                  color: me ? '#fff' : '#0D4C63',
                  padding: '10px 14px', borderRadius: 18,
                  borderBottomRightRadius: me ? 6 : 18,
                  borderBottomLeftRadius: me ? 18 : 6,
                  fontSize: 14, lineHeight: 1.35,
                  border: me ? 'none' : '1px solid #E4ECF0',
                }}>{m.text}</div>
                <div style={{ fontSize: 10, color: '#7D96A4',
                  textAlign: me ? 'right' : 'left', marginTop: 2, padding: '0 6px' }}>{m.time}</div>
              </div>
            );
          })}
        </div>

        {/* Composer */}
        <div style={{ padding: '8px 12px 18px', background: '#fff', borderTop: '1px solid #E4ECF0' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#E6F6FB', border: '1px solid #E4ECF0', borderRadius: 999, padding: '4px 4px 4px 14px',
          }}>
            <input placeholder="Escribir mensaje…" style={{
              flex: 1, border: 0, outline: 0, background: 'transparent',
              fontSize: 14, fontFamily: "'Nunito', system-ui, sans-serif", padding: '8px 0',
            }} />
            <button style={{
              width: 36, height: 36, borderRadius: 999, background: '#2DB7B0',
              color: '#fff', border: 0, fontSize: 16,
            }}>↑</button>
          </div>
        </div>
      </div>
      <AppTabBar active={3} />
    </IOSDevice>
  );
}

// ─────────────────────────────────────────────────────────
// Booking sheet — picker
// ─────────────────────────────────────────────────────────
function AppBooking() {
  const slots = [
    { t: '7:00 am', avail: 'free' },
    { t: '8:00 am', avail: 'full' },
    { t: '10:30 am', avail: 'free' },
    { t: '3:30 pm', avail: 'free', selected: true },
    { t: '5:00 pm', avail: 'low' },
    { t: '6:30 pm', avail: 'free' },
  ];
  return (
    <IOSDevice>
      <div style={{
        minHeight: '100%', background: '#0D4C63',
        fontFamily: "'Nunito', system-ui, sans-serif", color: '#fff',
        paddingBottom: 100, position: 'relative',
      }}>
        <div style={{ padding: '4px 20px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <button style={{ background: 'rgba(255,255,255,0.1)', border: 0,
            color: '#fff', width: 36, height: 36, borderRadius: 999, fontSize: 18 }}>✕</button>
          <div>
            <div style={{ fontSize: 11, color: '#A8DDE3',
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.2em', textTransform: 'uppercase' }}>Nueva reserva</div>
            <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
              fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Mateo · Delfines</div>
          </div>
        </div>

        {/* Date strip */}
        <div style={{ padding: '0 20px 18px' }}>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
            {[
              { d: 'Hoy', date: 21, sel: false },
              { d: 'Vie', date: 22, sel: false },
              { d: 'Sáb', date: 23, sel: true },
              { d: 'Dom', date: 24, sel: false },
              { d: 'Lun', date: 25, sel: false },
              { d: 'Mar', date: 26, sel: false },
              { d: 'Mié', date: 27, sel: false },
            ].map((c,i)=>(
              <div key={i} style={{
                minWidth: 54, padding: '10px 0', borderRadius: 14, textAlign: 'center',
                background: c.sel ? '#FFC20E' : 'rgba(255,255,255,0.08)',
                color: c.sel ? '#0D4C63' : '#fff',
              }}>
                <div style={{ fontSize: 10, opacity: c.sel ? 0.7 : 0.6,
                  textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{c.d}</div>
                <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
                  fontSize: 18, fontWeight: 700, marginTop: 2 }}>{c.date}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Slots */}
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase',
            color: '#A8DDE3', marginBottom: 12 }}>Horarios disponibles · Sáb 23</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {slots.map((s,i)=>{
              const colors = {
                free: { fg: '#fff', bg: 'rgba(255,255,255,0.08)', tag: 'Libre', tagFg: '#A8DDE3' },
                low:  { fg: '#fff', bg: 'rgba(240,178,43,0.15)',   tag: '2 cupos', tagFg: '#FFC20E' },
                full: { fg: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.04)', tag: 'Lleno', tagFg: 'rgba(255,255,255,0.4)' },
              }[s.avail];
              const sel = s.selected;
              return (
                <div key={i} style={{
                  borderRadius: 16, padding: '14px 16px',
                  background: sel ? '#2DB7B0' : colors.bg,
                  color: sel ? '#fff' : colors.fg,
                  border: sel ? '1px solid #2DB7B0' : '1px solid rgba(255,255,255,0.08)',
                  opacity: s.avail === 'full' ? 0.6 : 1,
                }}>
                  <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
                    fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>{s.t}</div>
                  <div style={{ fontSize: 11, fontWeight: 600,
                    color: sel ? 'rgba(255,255,255,0.92)' : colors.tagFg, marginTop: 2 }}>
                    {sel ? '✓ Seleccionado' : colors.tag}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer CTA */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          padding: '14px 20px 32px',
          background: 'linear-gradient(180deg, rgba(11,42,74,0) 0%, #0D4C63 30%)',
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 14,
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 12,
              background: '#D4F0EE', color: '#0D4C63', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>SR</div>
            <div style={{ flex: 1, fontSize: 13 }}>
              <div style={{ fontWeight: 700 }}>Sáb 23 · 3:30 pm</div>
              <div style={{ opacity: 0.7, fontSize: 12 }}>Santiago · Piscina 1 · 45 min</div>
            </div>
          </div>
          <button style={{
            width: '100%', background: '#FFC20E', color: '#0D4C63', border: 0,
            padding: '16px', borderRadius: 18, fontWeight: 700, fontSize: 15,
            fontFamily: "'Nunito', system-ui, sans-serif",
          }}>Confirmar reserva</button>
        </div>
      </div>
    </IOSDevice>
  );
}

// ─────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────
function RoundBtn({ children }) {
  return (
    <button style={{
      width: 32, height: 32, borderRadius: 999, background: '#E6F6FB',
      border: '1px solid #E4ECF0', color: '#0D4C63', fontSize: 16,
    }}>{children}</button>
  );
}

function StatCard({ num, label, tone = 'teal' }) {
  const t = {
    teal:    { bg: '#D4F0EE', fg: '#0D4C63' },
    sun:     { bg: '#FFF1C2', fg: '#8B6A00' },
    success: { bg: '#DBF5E3', fg: '#1E6E3D' },
  }[tone];
  return (
    <div style={{
      borderRadius: 16, padding: '14px 12px',
      background: t.bg, color: t.fg, textAlign: 'left',
    }}>
      <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
        fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums' }}>{num}</div>
      <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.85, marginTop: 2 }}>{label}</div>
    </div>
  );
}

Object.assign(window, { AppSchedule, AppProgress, AppPayments, AppMessages, AppBooking });
