/* global React, AdminShell */
// Mission Control — main dashboard view.

const activeSessions = [
  { name: "code-review-main",   agent: "Claude",   agentC: "cyan",     status: "running", branch: "feat/dash",      spend: 2.34, cap: 5,  pct: 64, files: "5 files", checkpoint: "2m ago" },
  { name: "test-gen-api",       agent: "Copilot",  agentC: "blue",     status: "paused",  branch: "bugfix/auth",    spend: 1.12, cap: 3,  pct: 38, files: "8 / 12 tests", checkpoint: "1h ago" },
  { name: "refactor-llm-gw",    agent: "OpenCode", agentC: "magenta",  status: "idle",    branch: "refact/core",    spend: 0.00, cap: 10, pct: 0,  files: "5 / 8 modules", checkpoint: "3h ago" },
  { name: "deploy-staging",     agent: "Claude",   agentC: "cyan",     status: "running", branch: "main",           spend: 4.56, cap: 5,  pct: 91, files: "12 manifests", checkpoint: "30s ago" },
  { name: "audit-security",     agent: "Claude",   agentC: "cyan",     status: "queued",  branch: "—",              spend: 0.00, cap: 5,  pct: 0,  files: "waiting for worker", checkpoint: "—" },
];

const statusPill = {
  running: { cls: "pill-green", icon: "▶" },
  paused:  { cls: "pill-blue",  icon: "⏸" },
  idle:    { cls: "pill-gray",  icon: "○" },
  queued:  { cls: "pill-yellow", icon: "◌" },
  failed:  { cls: "pill-red",   icon: "✕" },
};
const agentColor = { cyan: "var(--ops-cyan)", blue: "var(--ops-blue)", magenta: "var(--ops-magenta)", green: "var(--ops-green)" };

function MissionControlDash() {
  const tabs = [
    { key: "sessions",  label: "Sessions",  count: 5 },
    { key: "workers",   label: "Workers",   count: 8 },
    { key: "queues",    label: "Queues",    count: 2 },
    { key: "approvals", label: "Approvals", count: 2 },
    { key: "branches",  label: "Branches",  count: 15 },
    { key: "health",    label: "Health" },
  ];
  return (
    <AdminShell
      active="mission"
      crumbs={["OPSLY", "ADMIN", "MISSION CONTROL"]}
      tabs={tabs} activeTab="sessions"
      topbarRight={<span className="pill pill-magenta"><span className="ddot pulse-dot" style={{ background: "var(--ops-magenta)" }} /> 2 approvals pending</span>}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", margin: "0 4px 14px" }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, letterSpacing: ".05em", color: "#fff" }}>
            Mission Control
            <small style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".24em", color: "var(--ops-magenta)", textTransform: "uppercase", marginTop: 4 }}>RUNTIME ORCHESTRATION · 5 ACTIVE</small>
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-default btn-sm">⏸ Pause all</button>
          <button className="btn btn-default btn-sm">Resume paused</button>
          <button className="btn btn-primary btn-sm">+ New session</button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 14 }}>
        <KPI color="green"   label="Active sessions" value="5"     unit="/ 10 cap" delta="▲ 2"    deltaC="green" />
        <KPI color="cyan"    label="Worker pool"     value="8"     unit="/ 10 slots" delta="80%"   deltaC="cyan" />
        <KPI color="yellow"  label="Spend today"     value="$12.34" unit="/ $50 cap" delta="↑ 17%" deltaC="yellow" />
        <KPI color="magenta" label="Approvals"       value="2"     unit="pending"   delta="⚠ 1 risky" deltaC="magenta" />
        <KPI color="green"   label="LLM latency p95" value="0.21s" unit="" delta="▼ 12ms"  deltaC="green" />
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 14, marginBottom: 14 }}>
        {/* Active sessions */}
        <div className="card-admin">
          <div className="ch">
            <span className="t">Active sessions</span>
            <span className="a">5 active · 2 queued · sortable</span>
          </div>
          <div className="cb" style={{ padding: 0 }}>
            <table className="tbl-admin">
              <thead>
                <tr>
                  <th>session</th><th>agent</th><th>status</th><th>branch</th><th style={{ width: 130 }}>tokens (est)</th><th style={{ width: 100 }}>checkpoint</th><th></th>
                </tr>
              </thead>
              <tbody>
                {activeSessions.map((s, i) => {
                  const sp = statusPill[s.status];
                  return (
                    <tr key={i}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: agentColor[s.agentC] }} />
                          <span style={{ color: "#fff", fontWeight: 500 }}>{s.name}</span>
                        </div>
                        <div style={{ fontSize: 10, color: "var(--fg-4)", marginTop: 2, marginLeft: 14 }}>{s.files}</div>
                      </td>
                      <td><span style={{ color: agentColor[s.agentC] }}>{s.agent}</span></td>
                      <td><span className={`pill ${sp.cls}`}>{s.status === "running" && <span className="ddot pulse-dot" style={{ background: "var(--ops-green)" }} />}{s.status}</span></td>
                      <td style={{ color: s.branch === "—" ? "var(--fg-4)" : "var(--fg-2)" }}>{s.branch}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                            <span style={{ color: "#fff" }}>${s.spend.toFixed(2)}</span>
                            <span style={{ color: "var(--fg-4)" }}>/ ${s.cap}</span>
                          </div>
                          <div style={{ height: 3, background: "rgba(34,48,100,.6)", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ width: `${s.pct}%`, height: "100%", background: s.pct > 80 ? "var(--ops-yellow)" : s.pct > 50 ? "var(--ops-cyan)" : "var(--ops-green)" }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 11, color: s.checkpoint === "—" ? "var(--fg-4)" : "var(--fg-3)" }}>{s.checkpoint}</td>
                      <td><span style={{ color: "var(--ops-cyan)", cursor: "pointer" }}>→</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column — Worker pool */}
        <div className="card-admin">
          <div className="ch">
            <span className="t">Worker pool</span>
            <span className="a">8 / 10 slots · auto-scale on</span>
          </div>
          <div className="cb" style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 18, alignItems: "center" }}>
            <WorkerDonut />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <WorkerRow color="cyan"    name="claude-3.5"   count={3} max={5} />
              <WorkerRow color="blue"    name="gpt-4o"       count={2} max={3} />
              <WorkerRow color="magenta" name="opencode"     count={2} max={3} />
              <WorkerRow color="green"   name="copilot"      count={1} max={2} />
              <WorkerRow color="gray"    name="available"    count={1} max={1} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row — 3 cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        {/* Branch health */}
        <div className="card-admin">
          <div className="ch">
            <span className="t">Branch health</span>
            <span className="a">15 tracked</span>
          </div>
          <div className="cb" style={{ padding: "10px 0" }}>
            {[
              { name: "main",            state: "healthy", note: "342 / 342 tests · clean", c: "green" },
              { name: "feat/new-dashboard", state: "risky", note: "47 commits ahead · touches auth/", c: "magenta" },
              { name: "bugfix/auth-flow", state: "ok",     note: "review requested · -2 / +5 files", c: "green" },
              { name: "refactor/core",   state: "ok",      note: "2 commits ahead · CI green", c: "green" },
              { name: "staging",         state: "drifted", note: "behind main by 38 commits", c: "yellow" },
            ].map((b, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, padding: "8px 16px", alignItems: "center", borderBottom: i < 4 ? "1px solid rgba(34,48,100,.4)" : "0" }}>
                <div>
                  <div className="mono" style={{ fontSize: 12, color: "var(--fg-1)" }}>{b.name}</div>
                  <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 2 }}>{b.note}</div>
                </div>
                <span className={`pill pill-${b.c}`}>{b.state}</span>
                <span style={{ color: "var(--ops-cyan)", cursor: "pointer", fontSize: 16 }}>→</span>
              </div>
            ))}
          </div>
        </div>

        {/* Approval queue (preview) */}
        <div className="card-admin">
          <div className="ch">
            <span className="t">Approval queue</span>
            <span className="a">2 pending</span>
          </div>
          <div className="cb" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ padding: 12, borderRadius: 6, border: "1px solid rgba(255,0,255,.4)", background: "rgba(255,0,255,.04)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(45deg, transparent 0 6px, rgba(255,0,255,.04) 6px 7px)", pointerEvents: "none" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, position: "relative" }}>
                <span className="pill pill-magenta" style={{ fontSize: 10 }}>⚠ risky</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>2h 14m</span>
              </div>
              <div style={{ fontFamily: "var(--font-sans-admin)", fontSize: 13, color: "#fff", marginBottom: 6, position: "relative" }}>
                Merge <span className="mono">feat/new-runtime</span> → main
              </div>
              <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 10, position: "relative" }}>
                Touches <span className="magenta">auth/, schema/, infra/</span> · 342/342 tests passing
              </div>
              <div style={{ display: "flex", gap: 6, position: "relative" }}>
                <button className="btn btn-primary btn-sm">Approve</button>
                <button className="btn btn-default btn-sm">Request changes</button>
              </div>
            </div>
            <div style={{ padding: 12, borderRadius: 6, border: "1px solid var(--ops-admin-border)", background: "rgba(255,255,255,.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span className="pill pill-yellow" style={{ fontSize: 10 }}>🔄 normal</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>12m</span>
              </div>
              <div style={{ fontFamily: "var(--font-sans-admin)", fontSize: 13, color: "#fff", marginBottom: 6 }}>
                Deploy staging · est <span className="mono">$34.50</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 10 }}>
                Cost near $30 threshold · session <span className="mono">deploy-staging</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-primary btn-sm">Approve</button>
                <button className="btn btn-default btn-sm">Reduce</button>
                <button className="btn btn-ghost btn-sm">Postpone</button>
              </div>
            </div>
          </div>
        </div>

        {/* Runtime health */}
        <div className="card-admin">
          <div className="ch">
            <span className="t">Runtime health</span>
            <span className="a">12d 4h uptime</span>
          </div>
          <div className="cb" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              { name: "Orchestrator", value: "5 min uptime",   state: "ok", icon: "●" },
              { name: "LLM Gateway",  value: "p95 0.21s · 0 errs", state: "ok", icon: "●" },
              { name: "Session store",value: "42 sessions · 8 active", state: "ok", icon: "●" },
              { name: "Queue",        value: "3 pending · 0 stale", state: "ok", icon: "●" },
              { name: "Cost-cap",     value: "$487 of $1000 used",  state: "ok", icon: "●" },
              { name: "Webhooks",     value: "stripe lag 12s",      state: "warn", icon: "●" },
            ].map((r, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "center", padding: "9px 0", borderBottom: i < 5 ? "1px solid rgba(34,48,100,.4)" : "0" }}>
                <span style={{ color: r.state === "ok" ? "var(--ops-green)" : "var(--ops-yellow)", fontSize: 12 }}>{r.icon}</span>
                <div>
                  <div style={{ fontFamily: "var(--font-sans-admin)", fontSize: 12, color: "var(--fg-1)" }}>{r.name}</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 1 }}>{r.value}</div>
                </div>
                <span className="mono" style={{ fontSize: 10, color: "var(--fg-4)" }}>/healthz</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function KPI({ color, label, value, unit, delta, deltaC }) {
  const colors = { green: "var(--ops-green)", yellow: "var(--ops-yellow)", magenta: "var(--ops-magenta)", cyan: "var(--ops-cyan)", red: "var(--ops-red)" };
  return (
    <div style={{
      background: "rgba(16,23,52,.85)",
      border: "1px solid var(--ops-admin-border)",
      borderLeft: `3px solid ${colors[color]}`,
      borderRadius: 6, padding: "10px 14px",
    }}>
      <div style={{ fontFamily: "var(--font-sans-admin)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--fg-muted)" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
        <span className="mono" style={{ fontSize: 22, fontWeight: 500, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{value}</span>
        <span style={{ fontFamily: "var(--font-sans-admin)", fontSize: 10, color: "var(--fg-muted)" }}>{unit}</span>
        <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: colors[deltaC] }}>{delta}</span>
      </div>
    </div>
  );
}

function WorkerDonut() {
  const segments = [
    { v: 3,  c: "var(--ops-cyan)" },
    { v: 2,  c: "var(--ops-blue)" },
    { v: 2,  c: "var(--ops-magenta)" },
    { v: 1,  c: "var(--ops-green)" },
    { v: 1,  c: "rgba(148,163,184,.4)" }, // available
  ];
  const total = 10;
  const r = 44, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div style={{ position: "relative", width: 124, height: 124 }}>
      <svg width="124" height="124" viewBox="0 0 124 124" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="62" cy="62" r={r} fill="none" stroke="rgba(34,48,100,.5)" strokeWidth="10" />
        {segments.map((s, i) => {
          const len = (s.v / total) * c;
          const el = (
            <circle key={i} cx="62" cy="62" r={r} fill="none" stroke={s.c} strokeWidth="10"
              strokeDasharray={`${len} ${c}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span className="mono" style={{ fontSize: 24, fontWeight: 500, color: "#fff", textShadow: "0 0 12px rgba(0,255,255,.4)" }}>8</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: ".18em" }}>/ 10 in use</span>
      </div>
    </div>
  );
}

function WorkerRow({ color, name, count, max }) {
  const c = { cyan: "var(--ops-cyan)", blue: "var(--ops-blue)", magenta: "var(--ops-magenta)", green: "var(--ops-green)", gray: "rgba(148,163,184,.6)" }[color];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "10px 1fr auto", gap: 10, alignItems: "center", fontFamily: "var(--font-mono)", fontSize: 12 }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
      <span style={{ color: "var(--fg-2)" }}>{name}</span>
      <span style={{ color: "#fff", fontVariantNumeric: "tabular-nums" }}>{count}<span style={{ color: "var(--fg-4)" }}> / {max}</span></span>
    </div>
  );
}

Object.assign(window, { MissionControlDash, statusPill, agentColor });
