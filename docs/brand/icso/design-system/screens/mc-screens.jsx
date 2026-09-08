/* global React, AdminShell */
// Mission Control — Sessions tab (detail), Approvals queue, Costs dashboard.

/* ─────────────────────────────────────────────────────────────────
   SESSIONS DETAIL TAB
   Expanded cards: status, branch, progress, output, token bar,
   checkpoint metadata, action row.
   ───────────────────────────────────────────────────────────────── */

const sessionsDetail = [
  {
    name: "claude-code-review-dashboard",
    agent: "Claude", agentC: "cyan",
    status: "running",
    durTotal: "2h 34m",
    branch: "feat/new-dashboard",
    progressLabel: "UserProfile.tsx",
    progressDone: 3, progressTotal: 5,
    output: '"3 issues found, 2 improvements queued. The component re-renders on every parent state change — recommend useMemo."',
    spend: 4.23, cap: 10.00,
    checkpoint: "8 min ago", recoverable: true,
    queued: 2,
    tokensIn: "142k", tokensOut: "28k",
    model: "claude-3.5-sonnet",
    expanded: true,
  },
  {
    name: "copilot-test-generation-api",
    agent: "Copilot", agentC: "blue",
    status: "paused",
    durTotal: "22m",
    pausedAgo: "1h ago",
    branch: "bugfix/auth-flow",
    progressLabel: "User tests",
    progressDone: 8, progressTotal: 12,
    output: '"8 comprehensive test cases created covering happy path + 6 edge cases. Coverage est. 87% (was 62%)."',
    spend: 2.10, cap: 3.00,
    checkpoint: "1h ago", recoverable: true,
    queued: 0,
    tokensIn: "84k", tokensOut: "22k",
    model: "gpt-4o",
  },
  {
    name: "opencode-refactor-core",
    agent: "OpenCode", agentC: "magenta",
    status: "idle",
    durTotal: "1h",
    idleAgo: "3h 20m",
    branch: "refactor/core-modules",
    progressLabel: "Core modules",
    progressDone: 5, progressTotal: 8,
    output: '"5 modules optimized, 8% perf improvement on synthetic bench. Waiting for approval before touching `payment/`."',
    spend: 0.00, cap: 10.00,
    checkpoint: "3h 20m ago", recoverable: true,
    queued: 0,
    tokensIn: "—", tokensOut: "—",
    model: "opencode-v0.42",
  },
];

function SessionsDetail() {
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
      active="sessions"
      crumbs={["OPSLY", "ADMIN", "MISSION", "SESSIONS"]}
      tabs={tabs} activeTab="sessions"
    >
      {/* Filter row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 4px 14px" }}>
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, letterSpacing: ".05em", color: "#fff" }}>Sessions</h1>
        <span className="mono" style={{ fontSize: 11, color: "var(--fg-muted)" }}>· 5 visible · 23 archived</span>
        <span style={{ flex: 1 }} />
        <FilterChip on label="All" count={5} />
        <FilterChip label="Running" count={2} color="green" />
        <FilterChip label="Paused" count={1} color="blue" />
        <FilterChip label="Idle" count={1} color="gray" />
        <FilterChip label="Queued" count={1} color="yellow" />
        <span style={{ width: 1, height: 18, background: "var(--ops-admin-border)", margin: "0 4px" }} />
        <button className="btn btn-default btn-sm">⏏ Archive all idle</button>
        <button className="btn btn-primary btn-sm">+ New session</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {sessionsDetail.map((s, i) => <SessionCardAdmin key={i} session={s} />)}
        {/* footer info */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 16px", border: "1px dashed var(--ops-admin-border)", borderRadius: 8, color: "var(--fg-3)", fontSize: 12 }}>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--ops-cyan)", letterSpacing: ".14em", textTransform: "uppercase", fontSize: 10 }}>tip</span>
          <span>Drag a session row onto a worker in <span className="cyan">Workers</span> tab to reassign. Or use <span className="mono" style={{ color: "var(--ops-green)" }}>opsly session move &lt;id&gt; --worker claude-3.5</span></span>
        </div>
      </div>
    </AdminShell>
  );
}

function FilterChip({ on, label, count, color }) {
  const c = { green: "var(--ops-green)", blue: "var(--ops-blue)", gray: "var(--fg-muted)", yellow: "var(--ops-yellow)" }[color] || "var(--ops-cyan)";
  return (
    <button style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 10px", borderRadius: 4,
      border: `1px solid ${on ? "rgba(0,255,255,.4)" : "var(--ops-admin-border)"}`,
      background: on ? "rgba(0,255,255,.08)" : "rgba(255,255,255,.02)",
      fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".08em",
      color: on ? "var(--ops-cyan)" : "var(--fg-2)",
      textTransform: "uppercase", cursor: "pointer",
    }}>
      {!on && color && <span style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />}
      {label} <span style={{ color: "var(--fg-4)" }}>{count}</span>
    </button>
  );
}

function SessionCardAdmin({ session: s }) {
  const sp = statusPill[s.status];
  const pct = (s.spend / s.cap) * 100;
  const progPct = (s.progressDone / s.progressTotal) * 100;
  return (
    <div className="card-admin">
      <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(34,48,100,.7)", display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 14, alignItems: "center" }}>
        {/* Agent avatar */}
        <div style={{ width: 36, height: 36, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: `rgba(0,0,0,.3)`, border: `1px solid ${agentColor[s.agentC]}40`, color: agentColor[s.agentC], fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, letterSpacing: ".05em" }}>{s.agent[0]}</div>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className="mono" style={{ fontSize: 14, color: "#fff", fontWeight: 500 }}>{s.name}</span>
            <span className={`pill ${sp.cls}`}>{s.status === "running" && <span className="ddot pulse-dot" style={{ background: "var(--ops-green)" }} />}{s.status}</span>
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 4, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: agentColor[s.agentC] }}>{s.agent}</span>
            <span style={{ color: "var(--ops-magenta)" }}>·</span>
            <span>{s.model}</span>
            <span style={{ color: "var(--ops-magenta)" }}>·</span>
            <span>duration <span style={{ color: "#fff" }}>{s.durTotal}</span></span>
            {s.pausedAgo && <><span style={{ color: "var(--ops-magenta)" }}>·</span><span>paused {s.pausedAgo}</span></>}
            {s.idleAgo && <><span style={{ color: "var(--ops-magenta)" }}>·</span><span>idle {s.idleAgo}</span></>}
            <span style={{ color: "var(--ops-magenta)" }}>·</span>
            <span>branch <span style={{ color: "var(--ops-cyan)" }}>{s.branch}</span></span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {s.status === "running" && <button className="btn btn-warning btn-sm">⏸ Pause</button>}
          {s.status === "paused" && <button className="btn btn-primary btn-sm">▶ Resume</button>}
          {s.status === "idle" && <button className="btn btn-primary btn-sm">▶ Resume</button>}
          <button className="btn btn-default btn-sm">⤴ Archive</button>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-ghost btn-sm" style={{ color: "var(--ops-cyan)" }}>Details →</button>
        </div>
      </div>

      <div style={{ padding: 18, display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", gap: 24 }}>
        {/* Output / progress column */}
        <div>
          <div className="mono" style={{ fontSize: 10, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: ".18em", marginBottom: 8 }}>last output</div>
          <div style={{ padding: 12, background: "rgba(0,0,0,.3)", borderLeft: "2px solid var(--ops-cyan)", borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.6, color: "var(--fg-2)", marginBottom: 16 }}>
            <span style={{ color: "var(--ops-green)" }}>{`> `}</span>{s.output}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <span style={{ fontFamily: "var(--font-sans-admin)", fontSize: 12, color: "var(--fg-2)" }}>{s.progressLabel}</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--fg-4)" }}>{s.progressDone} / {s.progressTotal}</span>
            <span style={{ flex: 1 }} />
            <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{Math.round(progPct)}%</span>
          </div>
          <div style={{ height: 4, background: "rgba(34,48,100,.6)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: `${progPct}%`, height: "100%", background: "linear-gradient(90deg, var(--ops-cyan), var(--ops-magenta))" }} />
          </div>
        </div>

        {/* Tokens / spend column */}
        <div>
          <div className="mono" style={{ fontSize: 10, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: ".18em", marginBottom: 8 }}>tokens · budget</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 12 }}>
            <span className="mono" style={{ fontSize: 22, color: "#fff", fontVariantNumeric: "tabular-nums", textShadow: "0 0 8px rgba(0,255,255,.3)" }}>${s.spend.toFixed(2)}</span>
            <span className="mono" style={{ fontSize: 12, color: "var(--fg-3)" }}>/ ${s.cap.toFixed(2)} cap</span>
            <span style={{ flex: 1 }} />
            <span className="mono" style={{ fontSize: 11, color: pct > 80 ? "var(--ops-yellow)" : "var(--ops-green)" }}>{(s.cap - s.spend).toFixed(2)} left</span>
          </div>
          <div style={{ height: 4, background: "rgba(34,48,100,.6)", borderRadius: 2, overflow: "hidden", marginBottom: 10 }}>
            <div style={{ width: `${pct}%`, height: "100%", background: pct > 80 ? "var(--ops-yellow)" : "var(--ops-cyan)" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontFamily: "var(--font-mono)", fontSize: 11 }}>
            <div>
              <div style={{ color: "var(--fg-muted)" }}>in</div>
              <div style={{ color: "var(--fg-1)", marginTop: 2, fontSize: 13 }}>{s.tokensIn}</div>
            </div>
            <div>
              <div style={{ color: "var(--fg-muted)" }}>out</div>
              <div style={{ color: "var(--fg-1)", marginTop: 2, fontSize: 13 }}>{s.tokensOut}</div>
            </div>
          </div>
        </div>

        {/* Checkpoint column */}
        <div>
          <div className="mono" style={{ fontSize: 10, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: ".18em", marginBottom: 8 }}>checkpoint</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 6, border: "1px solid rgba(34,197,94,.3)", background: "rgba(34,197,94,.04)", marginBottom: 8 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ops-green)" strokeWidth="1.8"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
            <div>
              <div className="mono" style={{ fontSize: 12, color: "#fff" }}>{s.checkpoint}</div>
              <div style={{ fontSize: 10, color: "var(--fg-3)" }}>{s.recoverable ? "fully recoverable" : "partial state"}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button className="btn btn-default btn-sm" style={{ flex: 1 }}>View diff</button>
            <button className="btn btn-ghost btn-sm" style={{ color: "var(--ops-cyan)" }}>+ New cp</button>
          </div>
          {s.queued > 0 && (
            <div className="mono" style={{ fontSize: 10, color: "var(--ops-yellow)", marginTop: 10 }}>● {s.queued} approvals queued from this session</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   APPROVALS QUEUE
   Risk-first. Magenta scanlines on critical items. Risky / Normal split.
   ───────────────────────────────────────────────────────────────── */

function ApprovalsQueue() {
  const tabs = [
    { key: "all",     label: "All",      count: 5 },
    { key: "risky",   label: "Risky",    count: 3 },
    { key: "normal",  label: "Normal",   count: 2 },
    { key: "auto",    label: "Auto-approved", count: 47 },
    { key: "denied",  label: "Denied",   count: 2 },
  ];
  return (
    <AdminShell
      active="openclaw"
      crumbs={["OPSLY", "ADMIN", "OPENCLAW", "APPROVALS"]}
      tabs={tabs} activeTab="all"
    >
      <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", margin: "0 4px 16px" }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, letterSpacing: ".05em", color: "#fff" }}>
            OpenClaw governance
            <small style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".24em", color: "var(--ops-magenta)", textTransform: "uppercase", marginTop: 4 }}>HUMAN-IN-THE-LOOP · 5 PENDING</small>
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-default btn-sm">Policy →</button>
          <button className="btn btn-default btn-sm">Audit log →</button>
        </div>
      </div>

      {/* RISKY section */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{ width: 28, height: 28, borderRadius: 4, background: "rgba(255,0,255,.12)", border: "1px solid rgba(255,0,255,.5)", color: "var(--ops-magenta)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⚠</span>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "#fff", letterSpacing: ".06em", textTransform: "uppercase" }}>Risky · human review required</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>3 pending · oldest 2h 14m</div>
          </div>
          <span style={{ flex: 1 }} />
          <button className="btn btn-default btn-sm">Hold all</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <ApprovalCard
            kind="risky"
            action={<>Merge <span className="mono cyan">feat/new-runtime</span> → <span className="mono cyan">main</span></>}
            session="claude-code-review-dashboard"
            agent="Claude"
            risk="Touches auth/, schema/, infra/ — flagged as high-risk paths per workspace policy"
            metaRows={[
              { k: "tests",   v: <><span className="green">✓ 342 / 342 passing</span> · 0 flagged</> },
              { k: "review",  v: <>Copilot peer-reviewed · approved 1h ago</> },
              { k: "diff",    v: <><span className="green">+1,234</span> · <span className="red">−567</span> · 15 files · 3 modules</> },
              { k: "policy",  v: <><span className="mono yellow">workspace.merge.protected</span> · requires owner sign-off</> },
            ]}
            pendingFor="2h 14m"
            primary="Approve merge"
            secondary={["Request changes", "Hold"]}
          />
          <ApprovalCard
            kind="risky"
            action={<>Delete stale branch <span className="mono cyan">feature/old-ui</span></>}
            session="system-cleanup"
            agent="System"
            risk="Branch 60d old · 3 commits behind main · auto-cleanup policy fired"
            metaRows={[
              { k: "safety",  v: <><span className="green">No open PRs · no external refs · 0 webhooks</span></> },
              { k: "size",    v: <>2,341 commits · last touched 2026-03-12</> },
              { k: "policy",  v: <><span className="mono yellow">cleanup.auto.dry-run</span> · confirm to delete</> },
            ]}
            pendingFor="47m"
            primary="Approve delete"
            secondary={["Keep", "Archive instead"]}
          />
          <ApprovalCard
            kind="risky"
            action={<>Deploy to staging · estimated <span className="mono cyan">$34.50</span></>}
            session="deploy-staging"
            agent="Claude"
            risk="Cost approaches $30 single-action threshold — workspace budget headroom $478"
            metaRows={[
              { k: "estimate", v: <>1h 32m runtime · 3.2M tokens · 8 manifests</> },
              { k: "blast",    v: <>staging only · production isolated</> },
              { k: "approve",  v: <><span className="mono yellow">cost.action.over_30</span> · owner approval</> },
            ]}
            pendingFor="12m"
            primary="Approve deploy"
            secondary={["Reduce scope", "Postpone"]}
          />
        </div>
      </div>

      {/* NORMAL section */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{ width: 28, height: 28, borderRadius: 4, background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.4)", color: "var(--ops-green)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>↻</span>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "#fff", letterSpacing: ".06em", textTransform: "uppercase" }}>Auto-approved · logged for audit</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>2 in last 5 min · 47 in last 24h</div>
          </div>
          <span style={{ flex: 1 }} />
          <button className="btn btn-ghost btn-sm" style={{ color: "var(--fg-3)" }}>View all 47 →</button>
        </div>

        <div className="card-admin">
          <div className="cb" style={{ padding: 0 }}>
            {[
              { ts: "2m ago", action: "Create 5 unit tests for AuthGuard.ts", session: "test-gen-api", budget: "<$2", rule: "tests.add.allowed" },
              { ts: "4m ago", action: "Refactor UserProfile (no schema changes)", session: "code-review-main", budget: "<$1", rule: "refactor.local.allowed" },
            ].map((r,i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "70px 1fr auto auto", gap: 14, padding: "10px 16px", borderBottom: i === 0 ? "1px solid rgba(34,48,100,.4)" : "0", alignItems: "center" }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--fg-4)" }}>{r.ts}</span>
                <div>
                  <div style={{ fontFamily: "var(--font-sans-admin)", fontSize: 13, color: "var(--fg-1)" }}>{r.action}</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 2 }}>session <span className="cyan">{r.session}</span> · {r.budget}</div>
                </div>
                <span className="pill pill-green" style={{ fontSize: 10 }}>✓ auto-approved</span>
                <span className="mono" style={{ fontSize: 10, color: "var(--ops-magenta)" }}>{r.rule}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function ApprovalCard({ kind, action, session, agent, risk, metaRows, pendingFor, primary, secondary }) {
  const isRisky = kind === "risky";
  return (
    <div className="card-admin" style={{ position: "relative", overflow: "hidden" }}>
      {isRisky && (
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(45deg, transparent 0 9px, rgba(255,0,255,.03) 9px 10px)", pointerEvents: "none" }} />
      )}
      <div style={{ position: "relative", padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr auto", gap: 20, alignItems: "start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span className="pill pill-magenta" style={{ fontSize: 10 }}>{isRisky ? "⚠ RISKY" : "🔄 NORMAL"}</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>session <span style={{ color: "var(--ops-cyan)" }}>{session}</span></span>
            <span style={{ color: "var(--ops-magenta)" }}>·</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>agent <span style={{ color: "#fff" }}>{agent}</span></span>
            <span style={{ flex: 1 }} />
            <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>pending <span className={isRisky && pendingFor.includes("h") ? "red" : "yellow"}>{pendingFor}</span></span>
          </div>

          <div style={{ fontFamily: "var(--font-sans-admin)", fontSize: 18, color: "#fff", marginBottom: 12, lineHeight: 1.3 }}>{action}</div>

          <div style={{ display: "flex", alignItems: "start", gap: 8, padding: 10, background: "rgba(255,0,255,.06)", border: "1px solid rgba(255,0,255,.2)", borderRadius: 4, marginBottom: 14 }}>
            <span style={{ color: "var(--ops-magenta)", fontSize: 12, lineHeight: 1.5 }}>◆</span>
            <span style={{ fontFamily: "var(--font-sans-admin)", fontSize: 12, color: "var(--fg-2)", lineHeight: 1.55 }}>{risk}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px 24px", marginBottom: 16 }}>
            {metaRows.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 12 }}>
                <span className="mono" style={{ color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: ".1em", fontSize: 10, minWidth: 60 }}>{r.k}</span>
                <span style={{ color: "var(--fg-2)" }}>{r.v}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary">{primary}</button>
            {secondary.map((s, i) => (
              <button key={i} className="btn btn-default">{s}</button>
            ))}
            <span style={{ flex: 1 }} />
            <button className="btn btn-ghost btn-sm" style={{ color: "var(--fg-3)" }}>Open in dossier →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   COSTS & BUDGETS
   ───────────────────────────────────────────────────────────────── */

function CostsDashboard() {
  const tabs = [
    { key: "overview",   label: "Overview" },
    { key: "by-session", label: "By session" },
    { key: "by-driver",  label: "By driver" },
    { key: "invoices",   label: "Invoices" },
    { key: "alerts",     label: "Alerts" },
  ];
  return (
    <AdminShell
      active="costs"
      crumbs={["OPSLY", "ADMIN", "COSTS & BUDGETS"]}
      tabs={tabs} activeTab="overview"
    >
      <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", margin: "0 4px 18px" }}>
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, letterSpacing: ".05em", color: "#fff" }}>
          Costs & budgets
          <small style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".24em", color: "var(--ops-magenta)", textTransform: "uppercase", marginTop: 4 }}>WORKSPACE · ACME-STUDIOS · MAY 2026</small>
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-default btn-sm">📅 Last 30d</button>
          <button className="btn btn-default btn-sm">⤓ Export CSV</button>
          <button className="btn btn-primary btn-sm">⚙ Budget alerts</button>
        </div>
      </div>

      {/* Top headline */}
      <div className="card-admin" style={{ marginBottom: 14, position: "relative" }}>
        <div style={{ padding: "18px 22px", display: "grid", gridTemplateColumns: "auto auto auto 1fr auto", gap: 28, alignItems: "center" }}>
          <Headline label="Today"     value="$12.34"  sub="vs $14.21 yesterday"  delta="↓ 13%" deltaC="green" />
          <Headline label="MTD"       value="$342.16" sub="day 16 of 31"          delta="34%"   deltaC="cyan" highlight />
          <Headline label="Limit"     value="$1,000"  sub="$657.84 headroom"      delta="ok"    deltaC="green" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="mono" style={{ fontSize: 10, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: ".18em" }}>monthly budget · $1,000</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>burn rate <span className="cyan">$21.40</span> / day · forecast <span className={"yellow"}>$663</span></span>
            </div>
            <div style={{ height: 10, background: "rgba(34,48,100,.6)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
              <div style={{ width: "34%", height: "100%", background: "linear-gradient(90deg, var(--ops-cyan), var(--ops-magenta))" }} />
              {/* forecast dotted */}
              <div style={{ position: "absolute", left: "34%", top: 0, bottom: 0, width: "32%", background: "repeating-linear-gradient(90deg, rgba(0,255,255,.15) 0 4px, transparent 4px 8px)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-muted)" }}>
              <span>$0</span><span style={{ color: "var(--ops-green)" }}>$342 used</span><span style={{ color: "var(--ops-cyan)" }}>$663 forecast</span><span>$1,000</span>
            </div>
          </div>
          <div className="mono" style={{ fontSize: 11, lineHeight: 1.7, color: "var(--fg-3)", textAlign: "right" }}>
            <div>resets <span style={{ color: "#fff" }}>1 jun 2026</span></div>
            <div>plan <span className="cyan">BUSINESS</span></div>
            <div>seats <span style={{ color: "#fff" }}>4 / 10</span></div>
          </div>
        </div>
      </div>

      {/* By session + by driver */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14, marginBottom: 14 }}>
        <div className="card-admin">
          <div className="ch">
            <span className="t">Spend by session · MTD</span>
            <span className="a">5 active · top 5 of 9</span>
          </div>
          <div className="cb" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { name: "claude-code-review-dashboard", agent: "Claude", agentC: "cyan",     v: 123.45, pct: 36, status: "running" },
              { name: "test-gen-api",                  agent: "Copilot", agentC: "blue",     v: 87.23,  pct: 25, status: "paused" },
              { name: "refactor-core",                 agent: "OpenCode", agentC: "magenta", v: 54.10,  pct: 16, status: "idle" },
              { name: "deploy-staging",                agent: "Claude", agentC: "cyan",     v: 45.67,  pct: 13, status: "running" },
              { name: "other (5 sessions)",            agent: "mixed",  agentC: "green",    v: 31.71,  pct: 10, status: "—" },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems: "center", marginBottom: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: agentColor[s.agentC] || "var(--ops-green)" }} />
                    <span className="mono" style={{ fontSize: 12, color: "var(--fg-1)" }}>{s.name}</span>
                    <span style={{ fontFamily: "var(--font-sans-admin)", fontSize: 11, color: agentColor[s.agentC] || "var(--ops-green)" }}>{s.agent}</span>
                  </div>
                  <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)", fontVariantNumeric: "tabular-nums" }}>{s.pct}%</span>
                  <span className="mono" style={{ fontSize: 13, color: "#fff", fontVariantNumeric: "tabular-nums", minWidth: 72, textAlign: "right" }}>${s.v.toFixed(2)}</span>
                </div>
                <div style={{ height: 5, background: "rgba(34,48,100,.6)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: `${s.pct * 2}%`, height: "100%", background: `linear-gradient(90deg, ${agentColor[s.agentC] || "var(--ops-green)"} 0%, rgba(0,255,255,.5) 100%)` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-admin">
          <div className="ch">
            <span className="t">By cost driver</span>
            <span className="a">3 streams</span>
          </div>
          <div className="cb">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { name: "LLM tokens", note: "Claude · Copilot · OpenCode", v: 234.10, pct: 68, c: "var(--ops-cyan)" },
                { name: "Cloud runtime", note: "compute · vps fallback",     v: 87.05,  pct: 25, c: "var(--ops-magenta)" },
                { name: "Storage & API",  note: "checkpoints · webhooks",     v: 21.01,  pct: 7,  c: "var(--ops-green)" },
              ].map((d, i) => (
                <div key={i}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: d.c }} />
                    <span style={{ fontFamily: "var(--font-sans-admin)", fontSize: 13, color: "var(--fg-1)" }}>{d.name}</span>
                    <span style={{ flex: 1 }} />
                    <span className="mono" style={{ fontSize: 13, color: "#fff", fontVariantNumeric: "tabular-nums" }}>${d.v.toFixed(2)}</span>
                    <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)", minWidth: 36, textAlign: "right" }}>{d.pct}%</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--fg-3)", marginLeft: 18, marginBottom: 6 }}>{d.note}</div>
                  <div style={{ height: 4, background: "rgba(34,48,100,.6)", borderRadius: 2, overflow: "hidden", marginLeft: 18 }}>
                    <div style={{ width: `${d.pct}%`, height: "100%", background: d.c }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="hr" style={{ margin: "16px 0", background: "rgba(34,48,100,.7)" }} />

            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "#fff", letterSpacing: ".02em", fontVariantNumeric: "tabular-nums" }}>$342.16</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--fg-muted)" }}>MTD total · all drivers</span>
            </div>
          </div>
        </div>
      </div>

      {/* Savings + invoices */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
        <div className="card-admin" style={{ position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, background: "radial-gradient(circle, rgba(34,197,94,.15), transparent 70%)", pointerEvents: "none" }} />
          <div className="ch">
            <span className="t">Local-first savings</span>
            <span className="a">vs all-cloud pricing</span>
          </div>
          <div className="cb" style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, alignItems: "center" }}>
            <div>
              <div className="mono" style={{ fontSize: 10, color: "var(--ops-green)", textTransform: "uppercase", letterSpacing: ".18em", marginBottom: 6 }}>this month</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 44, fontWeight: 700, color: "var(--ops-green)", letterSpacing: ".02em", textShadow: "0 0 16px rgba(34,197,94,.4)", lineHeight: 1 }}>+$487</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 8 }}>saved by running 120h of compute on local Docker · est. <span className="green">$1.4k</span> annualized</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* mini sparkline */}
              <div>
                <div className="mono" style={{ fontSize: 10, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: ".18em", marginBottom: 4 }}>local vs cloud (last 14d)</div>
                <Spark />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, fontFamily: "var(--font-mono)" }}>
                <div>
                  <div style={{ fontSize: 10, color: "var(--fg-muted)" }}>local hours</div>
                  <div style={{ fontSize: 14, color: "#fff" }}>120 h</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--fg-muted)" }}>cloud hours</div>
                  <div style={{ fontSize: 14, color: "#fff" }}>14 h</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--fg-muted)" }}>next mo forecast</div>
                  <div style={{ fontSize: 14, color: "#fff" }}>$520</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card-admin">
          <div className="ch">
            <span className="t">Recent invoices</span>
            <span className="a">stripe · 4 visible</span>
          </div>
          <div className="cb" style={{ padding: 0 }}>
            <table className="tbl-admin">
              <thead><tr><th>period</th><th>amount</th><th>status</th><th></th></tr></thead>
              <tbody>
                {[
                  { p: "Apr 2026", v: "$487.00", s: "paid", c: "green" },
                  { p: "Mar 2026", v: "$412.55", s: "paid", c: "green" },
                  { p: "Feb 2026", v: "$398.10", s: "paid", c: "green" },
                  { p: "May 2026 (open)", v: "$342.16", s: "open", c: "yellow" },
                ].map((r,i) => (
                  <tr key={i}>
                    <td style={{ color: r.s === "open" ? "var(--fg-1)" : "var(--fg-2)" }}>{r.p}</td>
                    <td style={{ color: "#fff", fontVariantNumeric: "tabular-nums" }}>{r.v}</td>
                    <td><span className={`pill pill-${r.c}`}>{r.s}</span></td>
                    <td><span style={{ color: "var(--ops-cyan)", cursor: "pointer" }}>→</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function Headline({ label, value, sub, delta, deltaC, highlight }) {
  const colors = { green: "var(--ops-green)", yellow: "var(--ops-yellow)", cyan: "var(--ops-cyan)", magenta: "var(--ops-magenta)" };
  return (
    <div>
      <div className="mono" style={{ fontSize: 10, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: ".18em", marginBottom: 4 }}>{label}</div>
      <div style={{
        fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700,
        color: highlight ? "var(--ops-cyan)" : "#fff",
        letterSpacing: ".02em", textShadow: highlight ? "0 0 12px rgba(0,255,255,.4)" : "none",
        fontVariantNumeric: "tabular-nums", lineHeight: 1.1,
      }}>{value}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)" }}>{sub}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: colors[deltaC] }}>{delta}</span>
      </div>
    </div>
  );
}

function Spark() {
  // small 14-bar dual bar chart (local vs cloud)
  const local = [3, 5, 4, 6, 8, 7, 9, 10, 8, 12, 11, 13, 12, 14];
  const cloud = [2, 1, 2, 1, 2, 3, 1, 2, 2, 1, 1, 2, 1, 1];
  const max = 14;
  return (
    <svg width="100%" height="56" viewBox={`0 0 ${local.length * 12} 56`} preserveAspectRatio="none">
      {local.map((v, i) => (
        <rect key={`l${i}`} x={i*12 + 1} y={56 - (v/max)*48} width="5" height={(v/max)*48} fill="var(--ops-green)" opacity=".8" />
      ))}
      {cloud.map((v, i) => (
        <rect key={`c${i}`} x={i*12 + 6} y={56 - (v/max)*48} width="5" height={(v/max)*48} fill="var(--ops-magenta)" opacity=".7" />
      ))}
    </svg>
  );
}

Object.assign(window, { SessionsDetail, ApprovalsQueue, CostsDashboard });
