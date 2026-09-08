/* global React, PortalChrome */
// Portal onboarding — steps 4-6.

/* ─────────────────────────────────────────────────────────────────
   STEP 4 — RESUMABLE SESSIONS
   Recovery-focused. Checkpoint as a safety net.
   ───────────────────────────────────────────────────────────────── */

const sessions = [
  {
    name: "claude-code-review",
    agent: "Claude",
    agentColor: "var(--ops-cyan)",
    duration: "45m",
    paused: "2h ago",
    status: "checkpoint",
    branch: "feature/new-dashboard",
    progress: "Reviewing UserProfile.tsx",
    progressDone: 3, progressTotal: 5,
    note: "3 issues flagged, 2 improvements queued",
    recent: true,
  },
  {
    name: "copilot-test-generation",
    agent: "Copilot",
    agentColor: "var(--ops-blue)",
    duration: "22m",
    paused: "1d ago",
    status: "snapshot",
    branch: "bugfix/auth-flow",
    progress: "Generated tests",
    progressDone: 8, progressTotal: 12,
    note: "8 cases · 142 assertions",
    recent: false,
  },
  {
    name: "opencode-refactor",
    agent: "OpenCode",
    agentColor: "var(--ops-magenta)",
    duration: "1h 30m",
    paused: "3d ago",
    status: "stale",
    branch: "feat/payment-processing",
    progress: "Refactored modules",
    progressDone: 5, progressTotal: 8,
    note: "8% perf improvement (synthetic bench)",
    recent: false,
  },
];

function PortalStep4() {
  return (
    <PortalChrome step={4} footerMeta={`${sessions.length} resumable · 1 fresh checkpoint`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, height: "100%" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ font: "700 22px/1.2 var(--font-sans-portal)", margin: 0 }}>Pick up where you left off</h1>
            <p style={{ font: "400 13px/1.5 var(--font-sans-portal)", color: "var(--fg-3)", margin: "6px 0 0" }}>
              We found <span className="fg-1">3 agent sessions</span> with recoverable checkpoints. Resume,
              or start fresh and we'll archive them.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button className="btn btn-default btn-sm">Resume all fresh</button>
            <button className="btn btn-ghost btn-sm" style={{ color: "var(--fg-3)" }}>Archive all</button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "auto", paddingRight: 4 }}>
          {sessions.map((s, i) => <SessionCard key={i} session={s} />)}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 14px", border: "1px dashed var(--ops-border)", borderRadius: 8 }}>
          <span style={{ width: 28, height: 28, borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.3)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ops-green)" strokeWidth="2"><path d="M21 12a9 9 0 11-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--fg-1)", fontWeight: 600 }}>Checkpoints are stored locally</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2 }}>~/.opsly/checkpoints &nbsp; · &nbsp; 4.2 MB used &nbsp; · &nbsp; encrypted at rest</div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ color: "var(--fg-3)" }}>View storage →</button>
        </div>
      </div>
    </PortalChrome>
  );
}

function SessionCard({ session }) {
  const { name, agent, agentColor, duration, paused, status, branch, progress, progressDone, progressTotal, note, recent } = session;
  const pct = (progressDone / progressTotal) * 100;
  const statusMeta = {
    checkpoint: { label: "checkpoint ready", cls: "pill-green", color: "var(--ops-green)" },
    snapshot:   { label: "snapshot saved",   cls: "pill-cyan",  color: "var(--ops-cyan)" },
    stale:      { label: "stale · recoverable", cls: "pill-yellow", color: "var(--ops-yellow)" },
  }[status];
  return (
    <div className="card-portal" style={{ padding: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 16, alignItems: "start" }}>
        {/* Agent avatar */}
        <div style={{ width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,.03)", border: `1px solid ${agentColor}40`, color: agentColor, fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, letterSpacing: ".04em" }}>
          {agent[0]}
        </div>

        {/* Content */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
            <span className="mono" style={{ fontSize: 14, color: "var(--fg-1)", fontWeight: 500 }}>{name}</span>
            <span className={`pill ${statusMeta.cls}`}>{statusMeta.label}</span>
            {recent && <span className="pill pill-magenta" style={{ textTransform: "uppercase", fontSize: 9, letterSpacing: ".12em" }}>recent</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12, fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--fg-3)" }}>
            <span><span style={{ color: agentColor }}>{agent}</span></span>
            <span style={{ color: "var(--ops-magenta)" }}>·</span>
            <span><span className="mono fg-1">{duration}</span> session</span>
            <span style={{ color: "var(--ops-magenta)" }}>·</span>
            <span>paused <span className="fg-1">{paused}</span></span>
            <span style={{ color: "var(--ops-magenta)" }}>·</span>
            <span>on <span className="mono fg-1">{branch}</span></span>
          </div>

          {/* Progress row */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--fg-2)" }}>{progress}</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--fg-4)" }}>{progressDone} / {progressTotal}</span>
            <span style={{ flex: 1 }} />
          </div>
          <div className="prog" style={{ marginBottom: 6 }}>
            <i style={{ width: `${pct}%`, background: statusMeta.color }} />
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--fg-4)" }}>{note}</div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "stretch" }}>
          <button className="btn btn-primary" style={{ minWidth: 130 }}>Resume session</button>
          <button className="btn btn-default btn-sm">View checkpoint</button>
          <button className="btn btn-ghost btn-sm" style={{ color: "var(--fg-4)" }}>Archive</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   STEP 5 — WORKSPACE SETUP
   Form-driven. Permissions + budget defaults.
   ───────────────────────────────────────────────────────────────── */

function PortalStep5() {
  return (
    <PortalChrome step={5} footerRight={<button className="btn btn-primary btn-lg">Create workspace →</button>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 28, height: "100%" }}>
        {/* Left — form */}
        <div className="card-portal" style={{ padding: 28, overflow: "auto" }}>
          <h1 style={{ font: "700 22px/1.2 var(--font-sans-portal)", margin: "0 0 6px" }}>Initialize your workspace</h1>
          <p style={{ font: "400 13px/1.5 var(--font-sans-portal)", color: "var(--fg-3)", margin: "0 0 22px" }}>
            One workspace = one team's runtime. You can have several; everything's scoped to the slug.
          </p>

          <Label>Workspace name</Label>
          <div className="input" style={{ marginBottom: 14 }}>
            <input defaultValue="Acme Studios" />
          </div>

          <Label>Workspace slug</Label>
          <div className="input" style={{ marginBottom: 6 }}>
            <span className="pre">opsly.io/</span>
            <input defaultValue="acme-studios" />
            <span className="post green">✓ available</span>
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--fg-4)", marginBottom: 18 }}>
            URLs become <span className="green">https://acme-studios.opsly.io</span> · cannot be changed later.
          </div>

          <Label>Primary runtime</Label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
            <RuntimeOption selected title="Local" sub="Docker / tmux on this machine" detail="0 cost · low latency" />
            <RuntimeOption title="Cloud" sub="Managed by Opsly · VPS" detail="$0.04 / agent-hour" />
            <RuntimeOption title="Hybrid" sub="Local + cloud fallback" detail="Auto-spill at 80% RAM" />
          </div>

          <Label>Session permissions</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
            <PermRow on label="Allow sessions to modify branches" hint="They can push to non-protected branches." />
            <PermRow on label="Allow sessions to open pull requests" hint="Drafts only; never auto-merged." />
            <PermRow on label="Require approval for merges to" extra={<span className="mono pill pill-gray" style={{ marginLeft: 8 }}>main, release/*</span>} />
            <PermRow label="Allow sessions to invoke external APIs" hint="Off · enable per-tool in Settings." />
          </div>

          <Label>Cost limit</Label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="input" style={{ flex: 1 }}>
              <span className="pre">$</span>
              <input defaultValue="100" />
              <span className="post mono" style={{ fontSize: 11 }}>/ month · LLM + compute</span>
            </div>
            <div className="mono" style={{ fontSize: 11, color: "var(--fg-4)" }}>resets 1st</div>
          </div>
        </div>

        {/* Right — summary preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card-portal" style={{ padding: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>What gets provisioned</div>
            <ProvRow done label="Tenant namespace" value="acme-studios" />
            <ProvRow done label="Traefik route" value="acme-studios.opsly.io" />
            <ProvRow now label="Docker Compose stack" value="orchestrator · llm-gateway · sessions-store" />
            <ProvRow pending label="Secret store" value="age-keyring · local" />
            <ProvRow pending label="Webhook signing key" value="generated on create" />
          </div>

          <div className="card-portal" style={{ padding: 18, background: "rgba(34,197,94,.03)", borderColor: "rgba(34,197,94,.25)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span className="dot g" />
              <span className="eyebrow green">Zero-Trust by default</span>
            </div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, lineHeight: 1.6, color: "var(--fg-2)" }}>
              Sessions can't reach the public internet or sibling workspaces unless explicitly allow-listed.
              All actions are signed with a per-session ephemeral key.
            </div>
          </div>

          <div className="mono" style={{ fontSize: 11, color: "var(--fg-4)", marginTop: "auto", textAlign: "right" }}>
            est. provision time · <span className="fg-1">~38s</span>
          </div>
        </div>
      </div>
    </PortalChrome>
  );
}

function Label({ children }) {
  return <div className="eyebrow" style={{ margin: "10px 0 6px" }}>{children}</div>;
}

function RuntimeOption({ selected, title, sub, detail }) {
  return (
    <div style={{
      position: "relative",
      border: `1px solid ${selected ? "var(--ops-green)" : "var(--ops-border)"}`,
      background: selected ? "rgba(34,197,94,.05)" : "var(--ops-bg)",
      borderRadius: 8, padding: "12px 14px", cursor: "pointer",
    }}>
      {selected && <span style={{ position: "absolute", top: 8, right: 10, color: "var(--ops-green)", fontSize: 12 }}>●</span>}
      <div style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 13, color: selected ? "var(--ops-green)" : "var(--fg-1)", marginBottom: 4 }}>{title}</div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--fg-3)", lineHeight: 1.5, marginBottom: 6 }}>{sub}</div>
      <div className="mono" style={{ fontSize: 10, color: "var(--fg-4)" }}>{detail}</div>
    </div>
  );
}

function PermRow({ on, label, hint, extra }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div className={`check ${on ? "on" : ""}`}>
        <span className="box" />
      </div>
      <div style={{ flex: 1, fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--fg-1)" }}>
        {label}{extra}
        {hint && <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2 }}>{hint}</div>}
      </div>
    </div>
  );
}

function ProvRow({ done, now, pending, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,.03)" }}>
      <span style={{ width: 12, fontSize: 11 }}>
        {done && <span className="green">✓</span>}
        {now && <span className="yellow">●</span>}
        {pending && <span style={{ color: "var(--fg-4)" }}>·</span>}
      </span>
      <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--fg-2)", flex: "0 0 130px" }}>{label}</span>
      <span className="mono" style={{ fontSize: 11, color: done ? "var(--fg-1)" : "var(--fg-3)" }}>{value}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   STEP 6 — MISSION CONTROL LAUNCH
   Operational first-view inside the portal, restrained terminal aesthetic.
   Runtime status + active sessions + queued + approvals.
   The full admin Mission Control is a separate, denser, cyber-themed view.
   ───────────────────────────────────────────────────────────────── */

const launchSessions = [
  { name: "claude-code-review", agent: "Claude",   agentC: "var(--ops-cyan)",    status: "running", progress: "Review 4/5 files", branch: "feat/new-dashboard" },
  { name: "test-gen-api",       agent: "Copilot",  agentC: "var(--ops-blue)",    status: "paused",  progress: "Gen 8/12 tests",   branch: "bugfix/auth-flow" },
  { name: "refactor-core",      agent: "OpenCode", agentC: "var(--ops-magenta)", status: "idle",    progress: "Ready to resume",  branch: "refactor/core-modules" },
];

function PortalStep6() {
  return (
    <PortalChrome
      step={6}
      footerLeft={<button className="btn btn-ghost">← Back</button>}
      footerMeta="Onboarding complete · welcome aboard"
      footerRight={
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-default">Open dashboard →</button>
          <button className="btn btn-primary btn-lg" style={{ boxShadow: "0 0 14px rgba(34,197,94,.3)" }}>+ New session</button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14, height: "100%" }}>
        {/* Header strip — Mission Control title + workspace */}
        <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ font: "700 22px/1.2 var(--font-sans-portal)", margin: 0 }}>Mission Control</h1>
            <p style={{ font: "400 13px/1.5 var(--font-sans-portal)", color: "var(--fg-3)", margin: "6px 0 0" }}>
              Workspace <span className="mono" style={{ color: "var(--ops-green)" }}>acme-studios</span> · everything an agent's up to lives here.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-default btn-sm">⚙ Settings</button>
            <button className="btn btn-default btn-sm" style={{ borderColor: "rgba(255,0,255,.3)" }}>
              <span className="magenta">⚠</span>&nbsp;Approve 1
            </button>
          </div>
        </div>

        {/* Runtime status */}
        <div className="card-portal" style={{ padding: "14px 18px" }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Runtime status</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            <RuntimeStatusItem label="Local runtime"  detail="Docker · 3 containers"  state="healthy" extra="49% CPU · 76% RAM" />
            <RuntimeStatusItem label="Orchestrator"    detail="opsly-orch · 5 min uptime" state="running" extra="0 errors" />
            <RuntimeStatusItem label="LLM gateway"     detail="claude · copilot · local"  state="ready"   extra="p95 · 0.21s" />
            <RuntimeStatusItem label="Session store"   detail="local · encrypted"         state="healthy" extra="42 sessions · 4.2 MB" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 14, flex: 1, minHeight: 0 }}>
          {/* Active sessions */}
          <div className="card-portal" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--ops-border)" }}>
              <span className="eyebrow">Active sessions</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>3 of 3 · auto-refresh on</span>
            </div>
            <div style={{ padding: 0 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 80px 90px 1fr auto", gap: 12, padding: "8px 16px", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: ".14em", borderBottom: "1px solid rgba(255,255,255,.03)" }}>
                <span>session</span><span>agent</span><span>status</span><span>progress</span><span></span>
              </div>
              {launchSessions.map((s, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1.4fr 80px 90px 1fr auto", gap: 12, alignItems: "center", padding: "12px 16px", borderBottom: i < launchSessions.length - 1 ? "1px solid rgba(255,255,255,.03)" : "0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.agentC, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div className="mono" style={{ fontSize: 13, color: "var(--fg-1)", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
                      <div className="mono" style={{ fontSize: 10, color: "var(--fg-4)", marginTop: 2 }}>{s.branch}</div>
                    </div>
                  </div>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: s.agentC }}>{s.agent}</span>
                  <span className={`pill ${s.status === "running" ? "pill-green" : s.status === "paused" ? "pill-blue" : "pill-gray"}`}>
                    {s.status === "running" && <span className="ddot pulse-dot" style={{ background: "var(--ops-green)" }} />}
                    {s.status}
                  </span>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--fg-2)" }}>{s.progress}</span>
                  <span style={{ color: "var(--ops-green)", cursor: "pointer", fontSize: 16 }}>→</span>
                </div>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid var(--ops-border)" }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--fg-4)" }}>2 queued · 1 idle · 0 failed</span>
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--fg-3)" }}>View all sessions →</button>
            </div>
          </div>

          {/* Right column — queued + approvals */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
            <div className="card-portal" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--ops-border)" }}>
                <span className="eyebrow">Queued tasks</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>2 waiting</span>
              </div>
              <div>
                {[
                  { name: "code-audit",    reason: "waiting for agent slot",   icon: "↻", c: "var(--ops-yellow)" },
                  { name: "deploy-script", reason: "waiting for your approval", icon: "⚠", c: "var(--ops-magenta)" },
                ].map((t, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center", padding: "12px 16px", borderBottom: i === 0 ? "1px solid rgba(255,255,255,.03)" : "0" }}>
                    <span style={{ color: t.c, fontSize: 13 }}>{t.icon}</span>
                    <div>
                      <div className="mono" style={{ fontSize: 13, color: "var(--fg-1)" }}>{t.name}</div>
                      <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>{t.reason}</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ color: "var(--fg-3)" }}>→</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-portal" style={{ padding: 0, overflow: "hidden", borderColor: "rgba(255,0,255,.25)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(255,0,255,.15)", background: "rgba(255,0,255,.04)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="magenta" style={{ fontSize: 14 }}>⚠</span>
                  <span className="eyebrow magenta">Approval queue</span>
                </span>
                <span className="mono" style={{ fontSize: 11, color: "var(--ops-magenta)" }}>1 pending</span>
              </div>
              <div style={{ padding: "14px 16px" }}>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--fg-1)", fontWeight: 600, marginBottom: 4 }}>
                  Merge <span className="mono" style={{ color: "var(--ops-green)" }}>feat/new-runtime</span> → <span className="mono" style={{ color: "var(--ops-green)" }}>main</span>
                </div>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--fg-3)", lineHeight: 1.5, marginBottom: 12 }}>
                  Touches <span className="magenta">auth/, schema/, infra/</span> · 342 tests pass · session <span className="mono">code-review</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }}>Approve</button>
                  <button className="btn btn-default btn-sm">Review</button>
                  <button className="btn btn-ghost btn-sm" style={{ color: "var(--fg-3)" }}>Hold</button>
                </div>
              </div>
            </div>

            <div className="mono" style={{ fontSize: 11, color: "var(--fg-4)", padding: "0 4px", marginTop: "auto" }}>
              <span className="green">⌘K</span> opens the command palette · <span className="green">opsly help</span>
            </div>
          </div>
        </div>
      </div>
    </PortalChrome>
  );
}

function RuntimeStatusItem({ label, detail, state, extra }) {
  const stateColor = {
    healthy: "var(--ops-green)",
    running: "var(--ops-green)",
    ready:   "var(--ops-green)",
    degraded:"var(--ops-yellow)",
    down:    "var(--ops-red)",
  }[state];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span className="dot g" style={{ background: stateColor, boxShadow: `0 0 8px ${stateColor}55` }} />
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--fg-1)", fontWeight: 600 }}>{label}</span>
        <span className={`pill ${state === "degraded" ? "pill-yellow" : "pill-green"}`} style={{ marginLeft: "auto" }}>{state}</span>
      </div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--fg-3)", marginLeft: 16 }}>{detail}</div>
      <div className="mono" style={{ fontSize: 10, color: "var(--fg-4)", marginLeft: 16, marginTop: 2 }}>{extra}</div>
    </div>
  );
}

Object.assign(window, { PortalStep4, PortalStep5, PortalStep6 });
