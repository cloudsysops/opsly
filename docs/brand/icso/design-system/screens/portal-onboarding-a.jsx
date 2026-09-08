/* global React */
// Portal onboarding — steps 1-3. Restrained terminal aesthetic.
// Width 1024, height 720. Near-black canvas, green caret, mono detail.

const PortalChrome = ({ step, children, footerLeft, footerRight, footerMeta }) => {
  const stepLabels = [
    { n: 1, lab: "Detect" },
    { n: 2, lab: "Repos" },
    { n: 3, lab: "Branches" },
    { n: 4, lab: "Sessions" },
    { n: 5, lab: "Workspace" },
    { n: 6, lab: "Launch" },
  ];
  return (
    <div className="surface-portal" style={{ padding: "32px 40px", display: "flex", flexDirection: "column" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span className="ops-mark">OPSLY</span>
          <span style={{ width: 1, height: 16, background: "var(--ops-border)" }} />
          <span className="eyebrow">Runtime · Onboarding</span>
        </div>
        <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="pill pill-green"><span className="ddot pulse-dot" style={{ background: "var(--ops-green)" }} /> agent online</span>
          <span className="mono" style={{ fontSize: 11, color: "var(--fg-4)" }}>10/05/2026&nbsp;·&nbsp;14:32:01</span>
        </div>
      </header>

      {/* Stepper */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 26 }}>
        {stepLabels.map((s, i) => {
          const done = s.n < step;
          const active = s.n === step;
          const stateColor = done ? "var(--ops-green)" : active ? "var(--ops-green)" : "var(--fg-4)";
          return (
            <React.Fragment key={s.n}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: active ? "#fff" : done ? "var(--ops-green)" : "var(--fg-4)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase" }}>
                <span style={{
                  width: 22, height: 22, borderRadius: "50%",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10,
                  background: done ? "rgba(34,197,94,.15)" : active ? "rgba(34,197,94,.18)" : "var(--ops-surface)",
                  border: `1px solid ${done || active ? "var(--ops-green)" : "var(--ops-border)"}`,
                  color: stateColor,
                  boxShadow: active ? "0 0 0 4px rgba(34,197,94,.08)" : "none",
                }}>{done ? "✓" : s.n}</span>
                <span>{s.lab}</span>
              </div>
              {i < stepLabels.length - 1 && (
                <span style={{ flex: 1, height: 1, background: s.n < step ? "var(--ops-green)" : "var(--ops-border)", margin: "0 12px" }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <main style={{ flex: 1, minHeight: 0 }}>{children}</main>

      <footer style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20 }}>
        <div>{footerLeft || <button className="btn btn-ghost">← Back</button>}</div>
        <div className="mono" style={{ fontSize: 11, color: "var(--fg-4)" }}>
          {footerMeta || `Step ${step} of 6 · about 30s remaining`}
        </div>
        <div>{footerRight || <button className="btn btn-primary btn-lg">Continue →</button>}</div>
      </footer>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   STEP 1 — ENVIRONMENT DETECTION
   "Scanning your runtime…" — terminal list with cyan checks.
   ───────────────────────────────────────────────────────────────── */

const detectionItems = [
  { name: "Docker", state: "running", detail: "3 containers · 24.0.7", meta: "/var/run/docker.sock" },
  { name: "Colima", state: "running", detail: "2 GB / 4 CPU", meta: "lima-rosetta · arm64" },
  { name: "tmux", state: "running", detail: "4 active sessions", meta: "v3.4 · /tmp/tmux-501" },
  { name: "Claude API", state: "configured", detail: "ANTHROPIC_API_KEY", meta: "sk-ant-… · claude-3.5-sonnet" },
  { name: "OpenCode", state: "installed", detail: "v0.42.1", meta: "/usr/local/bin/opencode" },
  { name: "GitHub Copilot", state: "authenticated", detail: "VSCode · CLI", meta: "github.com/camila" },
  { name: "Git", state: "running", detail: "v2.43.0", meta: "12 repos discovered" },
  { name: "Node", state: "installed", detail: "v22.4.1 · pnpm 9.4", meta: "via nvm" },
];

function PortalStep1() {
  return (
    <PortalChrome step={1} footerLeft={<span />} footerMeta="Scan complete · 1.2s">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, height: "100%" }}>
        {/* Left column — scan output */}
        <div className="card-portal" style={{ position: "relative", overflow: "hidden", padding: 28 }}>
          {/* terminal scan bar */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 1,
            background: "linear-gradient(90deg, transparent, var(--ops-green), transparent)",
            opacity: .6,
          }} />
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
            <h1 style={{ font: "700 22px/1.2 var(--font-sans-portal)", margin: 0, letterSpacing: "-.01em" }}>
              Scanning your runtime<span className="caret" />
            </h1>
            <span className="eyebrow">8 / 8 · ok</span>
          </div>
          <p style={{ font: "400 13px/1.5 var(--font-sans-portal)", color: "var(--fg-3)", margin: "0 0 22px" }}>
            We probed local sockets, $PATH and config dirs. Nothing was modified — read-only.
          </p>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {detectionItems.map((it, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "20px 1fr auto", alignItems: "center",
                padding: "9px 0", borderBottom: i < detectionItems.length - 1 ? "1px solid rgba(255,255,255,.04)" : "0",
                gap: 14,
              }}>
                <span style={{
                  width: 16, height: 16, borderRadius: 3,
                  border: "1px solid rgba(34,197,94,.4)",
                  background: "rgba(34,197,94,.12)",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  color: "var(--ops-green)", fontFamily: "var(--font-mono)", fontSize: 11,
                }}>✓</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                  <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 13, color: "var(--fg-1)" }}>{it.name}</span>
                    <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{it.detail}</span>
                  </span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--fg-4)" }}>{it.meta}</span>
                </div>
                <span className={`pill ${it.state === "running" ? "pill-green" : it.state === "configured" ? "pill-cyan" : "pill-gray"}`}>
                  {it.state === "running" && <span className="ddot pulse-dot" style={{ background: "var(--ops-green)" }} />}
                  {it.state}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right column — summary cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card-portal" style={{ padding: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Capabilities detected</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <CapRow icon="container" label="Containerized runtime" value="Docker + Colima" />
              <CapRow icon="session" label="Multiplexed sessions" value="tmux × 4" />
              <CapRow icon="model" label="LLM providers" value="Claude · OpenCode" />
              <CapRow icon="cli" label="Agent CLIs" value="3 found" />
            </div>
          </div>

          <div className="card-portal" style={{ padding: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Recommendation</div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.55, color: "var(--fg-2)" }}>
              You can run a <span className="green">local-first</span> workspace. Cloud fallback available
              if a session exceeds 8 GB of memory.
            </div>
            <div className="hr" style={{ margin: "14px 0" }} />
            <div className="mono" style={{ fontSize: 11, color: "var(--fg-4)", lineHeight: 1.7 }}>
              <div>system: darwin · arm64</div>
              <div>kernel: 24.6.0</div>
              <div>shell: zsh · 5.9</div>
            </div>
          </div>

          <div style={{ padding: "10px 0", marginTop: "auto" }}>
            <div className="mono" style={{ fontSize: 11, color: "var(--fg-4)" }}>
              <span className="green">opsly</span> <span style={{ color: "var(--ops-magenta)" }}>·</span> 0 warnings <span style={{ color: "var(--ops-magenta)" }}>·</span> 0 errors
            </div>
          </div>
        </div>
      </div>
    </PortalChrome>
  );
}

function CapRow({ icon, label, value }) {
  const icons = {
    container: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 8h16M4 12h16M4 16h16M6 4v16M18 4v16" /></svg>),
    session: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M8 9l3 3-3 3M12 15h5" /></svg>),
    model: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" /></svg>),
    cli: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6l4 4-4 4M12 14h8" /></svg>),
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ color: "var(--ops-green)", display: "inline-flex" }}>{icons[icon]}</span>
      <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--fg-2)", flex: 1 }}>{label}</span>
      <span className="mono" style={{ fontSize: 12, color: "var(--fg-1)" }}>{value}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   STEP 2 — REPOSITORY DETECTION
   ───────────────────────────────────────────────────────────────── */

const repos = [
  { name: "opsly", main: true, path: "~/dev/opsly", branches: 12, lastCommit: "2h ago", status: { mod: 3, untracked: 2 }, langs: ["TypeScript", "Rust"], selected: true, primary: true },
  { name: "api-gateway", path: "~/dev/api-gateway", branches: 4, lastCommit: "1d ago", status: { mod: 0, untracked: 0 }, langs: ["Go"], selected: true },
  { name: "dashboard", path: "~/dev/dashboard", branches: 8, lastCommit: "30m ago", status: { mod: 7, untracked: 1 }, langs: ["TypeScript"], selected: true },
  { name: "smiletripcare-web", path: "~/clients/smiletripcare/web", branches: 6, lastCommit: "3d ago", status: { mod: 0, untracked: 0 }, langs: ["TypeScript", "Python"], selected: false },
  { name: "internal-scripts", path: "~/dev/scratch/internal-scripts", branches: 2, lastCommit: "21d ago", status: { mod: 0, untracked: 0 }, langs: ["Bash"], selected: false, stale: true },
];

function PortalStep2() {
  const selected = repos.filter(r => r.selected).length;
  return (
    <PortalChrome
      step={2}
      footerMeta={`${selected} of 5 repositories selected`}
      footerRight={<button className="btn btn-primary btn-lg">Continue → <span className="mono" style={{ opacity: .6, marginLeft: 4 }}>{selected}</span></button>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18, height: "100%" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ font: "700 22px/1.2 var(--font-sans-portal)", margin: 0 }}>
              Found <span className="green">5 repositories</span> on your machine
            </h1>
            <p style={{ font: "400 13px/1.5 var(--font-sans-portal)", color: "var(--fg-3)", margin: "6px 0 0" }}>
              Select the ones Opsly should index. You can always add more later from Settings.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button className="btn btn-default btn-sm">+ Add path</button>
            <button className="btn btn-ghost btn-sm" style={{ color: "var(--fg-3)" }}>Select all</button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, overflow: "auto", paddingRight: 4 }}>
          {repos.map((r, i) => (
            <RepoCard key={i} repo={r} />
          ))}
        </div>

        <div className="mono" style={{ fontSize: 11, color: "var(--fg-4)" }}>
          <span style={{ color: "var(--ops-magenta)" }}>tip</span> · We never read file contents during discovery — only metadata from <span className="green">git rev-parse</span> and <span className="green">git log --since=now</span>.
        </div>
      </div>
    </PortalChrome>
  );
}

function RepoCard({ repo }) {
  const { name, main, path, branches, lastCommit, status, langs, selected, primary, stale } = repo;
  return (
    <div className="card-portal" style={{
      padding: 16, display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 16, alignItems: "center",
      borderColor: selected ? "rgba(34,197,94,.4)" : "var(--ops-border)",
      background: selected ? "rgba(34,197,94,.03)" : "var(--ops-surface)",
    }}>
      <div className={`check ${selected ? "on" : ""}`}>
        <span className="box" />
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
          <span style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 15, color: "var(--fg-1)" }}>{name}</span>
          {primary && <span className="pill pill-green" style={{ textTransform: "uppercase", fontSize: 9, letterSpacing: ".1em" }}>main</span>}
          {stale && <span className="pill pill-gray" style={{ textTransform: "uppercase", fontSize: 9, letterSpacing: ".1em" }}>stale</span>}
          <span className="mono" style={{ fontSize: 11, color: "var(--fg-4)" }}>{path}</span>
        </div>
        <div className="mono" style={{ fontSize: 11, color: "var(--fg-3)", display: "flex", alignItems: "center", gap: 14 }}>
          <span><span style={{ color: "var(--fg-1)" }}>{branches}</span> branches</span>
          <span style={{ color: "var(--ops-magenta)" }}>·</span>
          <span>last commit <span style={{ color: "var(--fg-1)" }}>{lastCommit}</span></span>
          <span style={{ color: "var(--ops-magenta)" }}>·</span>
          <span>
            {status.mod === 0 && status.untracked === 0 ? (
              <span className="green">working tree clean</span>
            ) : (
              <>
                {status.mod > 0 && <span className="yellow">{status.mod} modified</span>}
                {status.mod > 0 && status.untracked > 0 && " "}
                {status.untracked > 0 && <span className="muted-2">{status.untracked} untracked</span>}
              </>
            )}
          </span>
          <span style={{ color: "var(--ops-magenta)" }}>·</span>
          <span>{langs.join(" / ")}</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button className="btn btn-ghost btn-sm" style={{ color: "var(--fg-3)" }}>Inspect →</button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   STEP 3 — BRANCH HEALTH
   ───────────────────────────────────────────────────────────────── */

const branchesData = {
  summary: { healthy: 8, stale: 5, risky: 2 },
  stale: [
    { name: "feature/old-ui", commit: "45d ago", reason: "No open PRs · last author left 30d ago", safe: true, lastAuthor: "diego@" },
    { name: "bugfix/auth-flow", commit: "38d ago", reason: "1 PR · already merged into main", safe: true, lastAuthor: "camila@" },
    { name: "experiments/orbit-anim", commit: "62d ago", reason: "Spike branch · 0 reviews requested", safe: true, lastAuthor: "diego@" },
  ],
  risky: [
    { name: "feat/new-runtime", commit: "3h ago", reason: "47 commits ahead of main · active work · touches auth/, schema/", lastAuthor: "camila@" },
    { name: "refactor/llm-gateway", commit: "2d ago", reason: "12 commits ahead · paused session attached", lastAuthor: "diego@" },
  ],
};

function PortalStep3() {
  return (
    <PortalChrome step={3}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, height: "100%" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ font: "700 22px/1.2 var(--font-sans-portal)", margin: 0 }}>Branch health check</h1>
            <p style={{ font: "400 13px/1.5 var(--font-sans-portal)", color: "var(--fg-3)", margin: "6px 0 0" }}>
              You have <span className="fg-1">15 branches</span>. We grouped them by risk so you can clean up safely.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Stat label="Healthy" n={branchesData.summary.healthy} color="green" />
            <Stat label="Stale" n={branchesData.summary.stale} color="yellow" />
            <Stat label="Risky" n={branchesData.summary.risky} color="magenta" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, overflow: "hidden", flex: 1, minHeight: 0 }}>
          {/* STALE column */}
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span className="dot y" />
              <span className="yellow">Stale</span>
              <span style={{ color: "var(--fg-4)" }}>· older than 30d · safe to delete</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, overflow: "auto" }}>
              {branchesData.stale.map((b, i) => <BranchCard key={i} branch={b} kind="stale" />)}
            </div>
          </div>

          {/* RISKY column */}
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span className="dot m" />
              <span className="magenta">Risky</span>
              <span style={{ color: "var(--fg-4)" }}>· unmerged · active work — confirm before action</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, overflow: "auto" }}>
              {branchesData.risky.map((b, i) => <BranchCard key={i} branch={b} kind="risky" />)}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", border: "1px solid var(--ops-border)", borderRadius: 8, background: "rgba(255,255,255,.02)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ops-green)" strokeWidth="1.8"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--fg-2)" }}>
            Nothing is deleted yet. Selections become a single confirmable action on the next step.
          </span>
          <span style={{ marginLeft: "auto" }}>
            <button className="btn btn-ghost btn-sm" style={{ color: "var(--fg-3)" }}>Skip cleanup</button>
          </span>
        </div>
      </div>
    </PortalChrome>
  );
}

function Stat({ label, n, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: 64 }}>
      <span className={`mono ${color}`} style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums" }}>{n}</span>
      <span className="eyebrow" style={{ fontSize: 10 }}>{label}</span>
    </div>
  );
}

function BranchCard({ branch, kind }) {
  const { name, commit, reason, safe, lastAuthor } = branch;
  const borderC = kind === "risky" ? "rgba(255,0,255,.3)" : "var(--ops-border)";
  return (
    <div className="card-portal" style={{ padding: 14, borderColor: borderC, background: kind === "risky" ? "rgba(255,0,255,.03)" : "var(--ops-surface)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
          <span className="mono" style={{ fontSize: 13, color: "var(--fg-1)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
          <span className="mono" style={{ fontSize: 11, color: "var(--fg-4)" }}>· {commit}</span>
        </div>
        {kind === "stale" ? (
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-danger btn-sm">Delete</button>
            <button className="btn btn-ghost btn-sm">Keep</button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-default btn-sm">Keep</button>
            <button className="btn btn-ghost btn-sm" style={{ color: "var(--fg-3)" }}>Archive</button>
          </div>
        )}
      </div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--fg-3)", lineHeight: 1.5 }}>{reason}</div>
      <div className="mono" style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 4 }}>{lastAuthor}</div>
    </div>
  );
}

Object.assign(window, { PortalStep1, PortalStep2, PortalStep3, PortalChrome });
