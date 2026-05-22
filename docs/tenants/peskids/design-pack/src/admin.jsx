// Admin portal for teachers / school staff.
// Light, dense, data-first. Multi-tenant feel but warm with Peskids brand.

function AdminPortal() {
  return (
    <div style={{
      width: 1280, height: 820, background: '#E6F6FB',
      fontFamily: "'Nunito', system-ui, sans-serif", color: '#0D4C63',
      display: 'flex', overflow: 'hidden',
    }}>
      {/* Sidebar */}
      <div style={{
        width: 220, background: '#0D4C63', color: '#fff',
        display: 'flex', flexDirection: 'column', padding: '20px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 6px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 14 }}>
          <PeskidsLogo size={32} />
          <div>
            <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
              fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>Peskids</div>
            <div style={{ fontSize: 10, opacity: 0.5, letterSpacing: '0.18em',
              textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>Admin</div>
          </div>
        </div>

        <div style={{ fontSize: 10, opacity: 0.5, letterSpacing: '0.18em', textTransform: 'uppercase',
          fontFamily: "'JetBrains Mono', monospace", padding: '4px 12px 8px' }}>OPERACIÓN</div>
        {[
          { ic: '🏠', label: 'Dashboard', active: true },
          { ic: '📅', label: 'Agenda' },
          { ic: '🏊', label: 'Clases' },
          { ic: '👶', label: 'Alumnos', count: 87 },
          { ic: '👨‍🏫', label: 'Profesores' },
        ].map((it,i)=>(
          <NavRow key={i} {...it} />
        ))}

        <div style={{ fontSize: 10, opacity: 0.5, letterSpacing: '0.18em', textTransform: 'uppercase',
          fontFamily: "'JetBrains Mono', monospace", padding: '20px 12px 8px' }}>NEGOCIO</div>
        {[
          { ic: '💳', label: 'Facturación' },
          { ic: '📊', label: 'Reportes' },
          { ic: '💬', label: 'Mensajes', count: 4 },
          { ic: '⚙️', label: 'Ajustes' },
        ].map((it,i)=>(
          <NavRow key={i} {...it} />
        ))}

        <div style={{ marginTop: 'auto', padding: '12px',
          background: 'rgba(76,184,176,0.12)',
          border: '1px solid rgba(76,184,176,0.25)',
          borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 999, background: '#2DB7B0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 13 }}>SR</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Santiago R.</div>
            <div style={{ fontSize: 10, opacity: 0.65 }}>Admin · Llanogrande</div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <div style={{
          height: 60, borderBottom: '1px solid #E4ECF0', background: '#fff',
          display: 'flex', alignItems: 'center', padding: '0 28px', gap: 14,
        }}>
          <div>
            <div style={{ fontSize: 11, color: '#7D96A4',
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.16em', textTransform: 'uppercase' }}>Dashboard</div>
            <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
              fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>
              Jueves 21 de mayo · 09:42
            </div>
          </div>
          <div style={{
            marginLeft: 24, display: 'flex', alignItems: 'center', gap: 8,
            border: '1px solid #E4ECF0', borderRadius: 10, padding: '6px 12px',
            background: '#E6F6FB', minWidth: 260,
          }}>
            <span style={{ color: '#7D96A4' }}>🔍</span>
            <span style={{ color: '#7D96A4', fontSize: 13 }}>Buscar alumno, profesor, clase…</span>
            <span style={{ marginLeft: 'auto', fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, color: '#7D96A4', background: '#fff', border: '1px solid #E4ECF0',
              padding: '2px 6px', borderRadius: 4 }}>⌘ K</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button style={{
              background: '#2DB7B0', color: '#fff', border: 0,
              padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: 13,
              fontFamily: "'Nunito', system-ui, sans-serif",
              display: 'flex', alignItems: 'center', gap: 6,
            }}>+ Nueva clase</button>
            <div style={{ position: 'relative' }}>
              <span style={{ fontSize: 18 }}>🔔</span>
              <div style={{ position: 'absolute', top: -2, right: -4,
                background: '#FF5A1F', color: '#fff', fontSize: 9, fontWeight: 700,
                padding: '1px 5px', borderRadius: 999 }}>3</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
            <KpiCard label="Alumnos activos" val="87" delta="+4" deltaTone="up" sub="Esta semana" />
            <KpiCard label="Clases hoy" val="12" delta="3 pendientes" deltaTone="warn" sub="2 canceladas" />
            <KpiCard label="Mensualidades" val="$24.8M" delta="92%" deltaTone="up" sub="Cobradas a tiempo" />
            <KpiCard label="Capacidad" val="78%" delta="9 cupos" deltaTone="muted" sub="Disponibles" />
          </div>

          {/* Two-col */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14 }}>
            {/* Today's classes table */}
            <div style={{
              background: '#fff', borderRadius: 16, border: '1px solid #E4ECF0', overflow: 'hidden',
            }}>
              <div style={{
                padding: '16px 20px', borderBottom: '1px solid #E4ECF0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
                    fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>Clases de hoy</div>
                  <div style={{ fontSize: 12, color: '#7D96A4' }}>12 sesiones · 3 profesores</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <TabChip active>Todas</TabChip>
                  <TabChip>Hoy</TabChip>
                  <TabChip>Mañana</TabChip>
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#E6F6FB' }}>
                    {['Hora','Clase','Profesor','Alumnos','Piscina','Estado'].map((h,i)=>(
                      <th key={i} style={{
                        textAlign: 'left', padding: '10px 14px',
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                        letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7D96A4',
                        fontWeight: 700,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { time: '08:00', name: 'Babyswim · 6m-1a',  prof: 'María L.',  count: '3/4', pool: 'P1', status: 'En curso' },
                    { time: '10:30', name: 'Burbujas · N1',     prof: 'María L.',  count: '4/4', pool: 'P1', status: 'Pendiente' },
                    { time: '14:00', name: 'Peces · N2',        prof: 'Carlos M.', count: '4/4', pool: 'P2', status: 'Pendiente' },
                    { time: '15:30', name: 'Delfines · N3',     prof: 'Santiago R.', count: '3/4', pool: 'P1', status: 'Pendiente', highlight: true },
                    { time: '17:00', name: 'Tiburones · N4',    prof: 'Santiago R.', count: '2/4', pool: 'P1', status: 'Cupos' },
                    { time: '18:30', name: 'Olímpicos · N5',    prof: 'Carlos M.', count: '4/4', pool: 'P2', status: 'Pendiente' },
                  ].map((r,i)=>(
                    <tr key={i} style={{
                      borderTop: '1px solid #F2F4F7',
                      background: r.highlight ? 'rgba(76,184,176,0.05)' : '#fff',
                    }}>
                      <td style={{ padding: '12px 14px', fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 700, color: r.highlight ? '#0D4C63' : '#0D4C63',
                        fontVariantNumeric: 'tabular-nums' }}>{r.time}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>{r.name}</td>
                      <td style={{ padding: '12px 14px', color: '#3D6679' }}>{r.prof}</td>
                      <td style={{ padding: '12px 14px',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontVariantNumeric: 'tabular-nums', color: '#3D6679' }}>{r.count}</td>
                      <td style={{ padding: '12px 14px',
                        fontFamily: "'JetBrains Mono', monospace",
                        color: '#7D96A4' }}>{r.pool}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <StatusPill status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Right col */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Pool capacity */}
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E4ECF0', padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
                      fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>Ocupación piscinas</div>
                    <div style={{ fontSize: 12, color: '#7D96A4' }}>Tiempo real</div>
                  </div>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: '#22C55E',
                    boxShadow: '0 0 0 4px rgba(34,197,94,0.2)' }} />
                </div>

                {[
                  { name: 'Piscina 1 · climatizada', pct: 75, of: '3/4', col: '#2DB7B0' },
                  { name: 'Piscina 2 · niños', pct: 50, of: '2/4', col: '#A8DDE3' },
                ].map((p,i)=>(
                  <div key={i} style={{ marginTop: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: '#3D6679', fontWeight: 600 }}>{p.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 700,
                        fontFamily: "'JetBrains Mono', monospace" }}>{p.of}</span>
                    </div>
                    <div style={{ height: 8, background: '#E6F6FB', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${p.pct}%`, height: '100%', background: p.col,
                        borderRadius: 999 }} />
                    </div>
                  </div>
                ))}

                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #E4ECF0',
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
                  <div>
                    <div style={{ color: '#7D96A4', fontSize: 11 }}>Temperatura</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 700, fontSize: 16 }}>31.2°C</div>
                  </div>
                  <div>
                    <div style={{ color: '#7D96A4', fontSize: 11 }}>Cloro libre</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 700, fontSize: 16 }}>1.4 ppm</div>
                  </div>
                </div>
              </div>

              {/* Recent activity */}
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E4ECF0', padding: 18 }}>
                <div style={{ fontFamily: "'Nunito', system-ui, sans-serif",
                  fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>Actividad reciente</div>
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { ic: '🏆', text: 'Mateo R. desbloqueó "Brazada completa"', time: 'hace 2 min', tone: 'sun' },
                    { ic: '💳', text: 'Pago recibido · Camila Restrepo · $320.000', time: 'hace 12 min', tone: 'success' },
                    { ic: '✕', text: 'Luna J. canceló clase de las 5:00 pm', time: 'hace 28 min', tone: 'muted' },
                    { ic: '✓', text: 'Nuevo alumno · Salomé Vélez (3 años)', time: 'hace 1 h', tone: 'teal' },
                  ].map((a,i)=>{
                    const c = {
                      sun:     { bg: '#FFF1C2', fg: '#8B6A00' },
                      success: { bg: '#DBF5E3', fg: '#1E6E3D' },
                      muted:   { bg: '#F2F4F7', fg: '#6F8398' },
                      teal:    { bg: '#D4F0EE', fg: '#0D4C63' },
                    }[a.tone];
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                          background: c.bg, color: c.fg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                          fontWeight: 700,
                        }}>{a.ic}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: '#0D4C63', lineHeight: 1.4 }}>{a.text}</div>
                          <div style={{ fontSize: 11, color: '#7D96A4', marginTop: 2 }}>{a.time}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavRow({ ic, label, active, count }) {
  return (
    <div style={{
      padding: '9px 12px', borderRadius: 10,
      background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
      display: 'flex', alignItems: 'center', gap: 10,
      fontSize: 13, fontWeight: active ? 700 : 500,
      color: active ? '#fff' : 'rgba(255,255,255,0.7)',
      marginBottom: 2, position: 'relative',
    }}>
      <span style={{ fontSize: 14, opacity: active ? 1 : 0.7 }}>{ic}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {count && (
        <span style={{ background: '#FF5A1F', color: '#fff', fontSize: 10,
          padding: '1px 7px', borderRadius: 999, fontWeight: 700 }}>{count}</span>
      )}
      {active && (
        <span style={{ position: 'absolute', left: -14, top: 8, bottom: 8, width: 3,
          background: '#2DB7B0', borderRadius: 999 }} />
      )}
    </div>
  );
}

function KpiCard({ label, val, delta, deltaTone, sub }) {
  const c = {
    up:    { bg: '#DBF5E3', fg: '#1E6E3D', ic: '↑' },
    warn:  { bg: '#FFF1C2', fg: '#8B6A00', ic: '·' },
    muted: { bg: '#F2F4F7', fg: '#6F8398', ic: '·' },
  }[deltaTone];
  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E4ECF0', padding: 18 }}>
      <div style={{ fontSize: 11, color: '#7D96A4',
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{
          fontFamily: "'Nunito', system-ui, sans-serif",
          fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em',
          fontVariantNumeric: 'tabular-nums',
        }}>{val}</span>
        <span style={{
          background: c.bg, color: c.fg,
          padding: '3px 9px', borderRadius: 999,
          fontSize: 11, fontWeight: 700,
        }}>{c.ic} {delta}</span>
      </div>
      <div style={{ fontSize: 11, color: '#7D96A4', marginTop: 6 }}>{sub}</div>
    </div>
  );
}

function StatusPill({ status }) {
  const t = {
    'En curso':    { bg: '#DCEEFB', fg: '#1F5A8A', dot: '#3388FF' },
    'Pendiente':   { bg: '#E6F6FB', fg: '#3D6679', dot: '#7D96A4' },
    'Cupos':       { bg: '#FFF1C2', fg: '#8B6A00', dot: '#FFC20E' },
    'Completada':  { bg: '#DBF5E3', fg: '#1E6E3D', dot: '#22C55E' },
  }[status] || { bg: '#E6F6FB', fg: '#3D6679', dot: '#7D96A4' };
  return (
    <span style={{
      background: t.bg, color: t.fg,
      padding: '4px 10px', borderRadius: 999,
      fontSize: 11, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', gap: 5,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: t.dot,
        boxShadow: status === 'En curso' ? `0 0 0 3px ${t.dot}33` : 'none' }} />
      {status}
    </span>
  );
}

function TabChip({ children, active }) {
  return (
    <span style={{
      padding: '6px 12px', fontSize: 12, fontWeight: 600, borderRadius: 8,
      background: active ? '#0D4C63' : 'transparent',
      color: active ? '#fff' : '#3D6679',
      cursor: 'pointer',
    }}>{children}</span>
  );
}

Object.assign(window, { AdminPortal });
