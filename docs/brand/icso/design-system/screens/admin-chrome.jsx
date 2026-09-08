/* global React */
// Shared admin chrome — sidebar, topbar, atmosphere wrapper.
// Used by all four Mission Control screens.

const AdminSidebar = ({ active }) => {
  const groups = [
    {
      eyebrow: "Plataforma",
      items: [
        { key: "dashboard", icon: "dashboard", label: "Dashboard" },
        { key: "machines",  icon: "boxes",     label: "Machines" },
        { key: "tenants",   icon: "server",    label: "Tenants" },
        { key: "metrics",   icon: "chart",     label: "Metrics" },
      ],
    },
    {
      eyebrow: "Mission Control",
      items: [
        { key: "mission",   icon: "grid",      label: "Mission" },
        { key: "sessions",  icon: "activity",  label: "Sessions" },
        { key: "agents",    icon: "agents",    label: "Agents" },
        { key: "openclaw",  icon: "gavel",     label: "OpenClaw" },
        { key: "costs",     icon: "dollar",    label: "Costs" },
      ],
    },
    {
      eyebrow: "System",
      items: [
        { key: "approvals", icon: "shield-check", label: "Approvals" },
        { key: "defense",   icon: "shield-alert", label: "Defense" },
        { key: "settings",  icon: "settings",     label: "Settings" },
      ],
    },
  ];
  return (
    <aside style={{
      width: 224, flexShrink: 0,
      margin: "14px 0 14px 14px",
      borderRadius: 16, padding: "16px 12px",
      border: "1px solid transparent",
      background:
        "linear-gradient(rgba(16,23,52,.94), rgba(16,23,52,.94)) padding-box," +
        "linear-gradient(120deg, rgba(0,255,255,.7), rgba(255,0,255,.65), rgba(157,0,255,.7)) border-box",
      boxShadow: "0 0 0 1px rgba(0,255,255,.45), 0 0 20px rgba(0,255,255,.2), 0 0 40px rgba(157,0,255,.2)",
      display: "flex", flexDirection: "column",
      position: "relative", zIndex: 2,
    }}>
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px 14px", borderBottom: "1px solid rgba(34,48,100,.7)", marginBottom: 12 }}>
        <div>
          <div className="ops-mark">OPSLY</div>
          <div className="mono" style={{ fontSize: 9, letterSpacing: ".24em", textTransform: "uppercase", color: "var(--fg-muted)", marginTop: 2 }}>Admin · v1.4.0</div>
        </div>
      </div>
      {groups.map((g, gi) => (
        <React.Fragment key={gi}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: ".24em", textTransform: "uppercase", color: "var(--fg-muted)", padding: "10px 8px 4px" }}>{g.eyebrow}</div>
          {g.items.map(it => {
            const isActive = active === it.key;
            return (
              <div key={it.key} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "7px 10px", borderRadius: 6,
                fontSize: 12.5, fontFamily: "var(--font-sans-admin)",
                color: isActive ? "var(--ops-cyan)" : "var(--fg-2)",
                background: isActive ? "rgba(0,255,255,.10)" : "transparent",
                border: isActive ? "1px solid rgba(0,255,255,.4)" : "1px solid transparent",
                cursor: "pointer",
              }}>
                <AdminIcon name={it.icon} active={isActive} />
                <span>{it.label}</span>
                {it.key === "approvals" && active !== "approvals" && (
                  <span style={{ marginLeft: "auto", fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "rgba(255,0,255,.15)", color: "var(--ops-magenta)", border: "1px solid rgba(255,0,255,.3)", fontFamily: "var(--font-mono)" }}>3</span>
                )}
                {it.key === "sessions" && active !== "sessions" && (
                  <span style={{ marginLeft: "auto", fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "rgba(34,197,94,.15)", color: "var(--ops-green)", border: "1px solid rgba(34,197,94,.3)", fontFamily: "var(--font-mono)" }}>5</span>
                )}
              </div>
            );
          })}
        </React.Fragment>
      ))}
      <div style={{ flex: 1 }} />
      {/* User pin */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, borderTop: "1px solid rgba(34,48,100,.7)", marginTop: 12 }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: "linear-gradient(135deg, var(--ops-cyan), var(--ops-magenta))", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ops-admin-bg)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12 }}>CR</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-sans-admin)", fontSize: 12, color: "var(--fg-1)" }}>camila@acme</div>
          <div className="mono" style={{ fontSize: 10, color: "var(--fg-muted)" }}>owner · root</div>
        </div>
      </div>
    </aside>
  );
};

function AdminIcon({ name, active }) {
  const c = active ? "var(--ops-cyan)" : "var(--fg-muted)";
  const common = { width: 16, height: 16, fill: "none", stroke: c, strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "dashboard": return <svg {...common}><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>;
    case "boxes": return <svg {...common}><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 13l9 5 9-5"/></svg>;
    case "server": return <svg {...common}><rect x="3" y="4" width="18" height="6" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/><circle cx="7" cy="7" r=".5" fill={c}/><circle cx="7" cy="17" r=".5" fill={c}/></svg>;
    case "chart": return <svg {...common}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>;
    case "grid": return <svg {...common}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
    case "activity": return <svg {...common}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>;
    case "agents": return <svg {...common}><circle cx="9" cy="8" r="3"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><circle cx="17" cy="8" r="2"/></svg>;
    case "gavel": return <svg {...common}><path d="M14 2l8 8-4 4-8-8 4-4z"/><path d="M3 21l9-9"/><path d="M2 22h10"/></svg>;
    case "dollar": return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v10M15 9.5C15 8 13.7 7 12 7s-3 1-3 2.5S10.3 12 12 12s3 1 3 2.5S13.7 17 12 17s-3-1-3-2.5"/></svg>;
    case "shield-check": return <svg {...common}><path d="M12 2l8 4v7c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-4z"/><path d="M9 12l2 2 4-4"/></svg>;
    case "shield-alert": return <svg {...common}><path d="M12 2l8 4v7c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-4z"/><path d="M12 8v4M12 16v.5"/></svg>;
    case "settings": return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.1-1l2-1.6-2-3.4-2.3.9a7 7 0 00-1.7-1l-.4-2.4h-4l-.4 2.4a7 7 0 00-1.7 1l-2.3-.9-2 3.4 2 1.6a7 7 0 00 0 2l-2 1.6 2 3.4 2.3-.9a7 7 0 001.7 1l.4 2.4h4l.4-2.4a7 7 0 001.7-1l2.3.9 2-3.4-2-1.6c.1-.3.1-.6.1-1z"/></svg>;
    default: return <svg {...common}><circle cx="12" cy="12" r="3"/></svg>;
  }
}

const AdminTopbar = ({ crumbs = ["OPSLY", "ADMIN", "MISSION"], rightExtra }) => (
  <header style={{
    position: "relative",
    margin: "14px 14px 0",
    borderRadius: 12, padding: "10px 16px",
    display: "flex", alignItems: "center", gap: 14,
    border: "1px solid transparent",
    background:
      "linear-gradient(rgba(10,14,39,.85), rgba(10,14,39,.85)) padding-box," +
      "linear-gradient(120deg, rgba(0,255,255,.55), rgba(255,0,255,.5), rgba(157,0,255,.55)) border-box",
    backdropFilter: "blur(8px)",
    zIndex: 5,
  }}>
    <span className="mono" style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--fg-muted)" }}>
      {crumbs.map((c, i) => (
        <React.Fragment key={i}>
          <span style={{ color: i === 0 ? "var(--ops-cyan)" : i === crumbs.length - 1 ? "#fff" : "var(--fg-muted)" }}>{c}</span>
          {i < crumbs.length - 1 && <span style={{ color: "var(--ops-magenta)", margin: "0 8px" }}>·</span>}
        </React.Fragment>
      ))}
    </span>

    {/* Command palette */}
    <div style={{ flex: 1, maxWidth: 360, marginLeft: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, background: "rgba(0,0,0,.3)", border: "1px solid var(--ops-admin-border)", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--fg-muted)" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <span style={{ flex: 1 }}>Run command, jump to session, deploy…</span>
        <span style={{ padding: "1px 5px", border: "1px solid var(--ops-admin-border)", borderRadius: 3, color: "var(--fg-muted)", fontSize: 10 }}>⌘K</span>
      </div>
    </div>

    <span style={{ flex: 1 }} />

    {rightExtra}

    <span className="pill pill-green">
      <span className="ddot pulse-dot" style={{ background: "var(--ops-green)" }} />
      orchestrator online
    </span>
    <span className="mono" style={{ fontSize: 11, color: "var(--fg-muted)" }}>
      ws · <span style={{ color: "var(--ops-cyan)" }}>acme-studios</span>
    </span>
    <span className="mono" style={{ fontSize: 11, color: "var(--fg-muted)" }}>
      <span style={{ color: "var(--fg-1)" }}>14:32:01</span>
    </span>
  </header>
);

const AdminTabs = ({ tabs, active }) => (
  <nav style={{ display: "flex", alignItems: "center", gap: 4, margin: "16px 18px 0", borderBottom: "1px solid rgba(34,48,100,.5)" }}>
    {tabs.map(t => {
      const isActive = active === t.key;
      return (
        <div key={t.key} style={{
          position: "relative", padding: "10px 14px",
          fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase",
          color: isActive ? "var(--ops-cyan)" : "var(--fg-muted)",
          cursor: "pointer",
        }}>
          <span>{t.label}</span>
          {t.count != null && <span style={{ marginLeft: 6, fontSize: 10, padding: "1px 5px", borderRadius: 3, background: isActive ? "rgba(0,255,255,.15)" : "rgba(255,255,255,.04)", color: isActive ? "var(--ops-cyan)" : "var(--fg-3)", border: `1px solid ${isActive ? "rgba(0,255,255,.3)" : "var(--ops-admin-border)"}` }}>{t.count}</span>}
          {isActive && <span style={{ position: "absolute", bottom: -1, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, var(--ops-cyan), var(--ops-magenta))" }} />}
        </div>
      );
    })}
    <span style={{ flex: 1 }} />
    <span className="mono" style={{ fontSize: 11, color: "var(--fg-muted)", marginRight: 8 }}>
      ↺ 1s ago · auto
    </span>
  </nav>
);

const AdminAtmosphere = () => (
  <>
    <div className="stage-bg" />
    <div className="grid-bg" />
    <div className="scan" />
  </>
);

function AdminShell({ active, crumbs, tabs, activeTab, topbarRight, children }) {
  return (
    <div className="surface-admin" style={{ display: "flex", height: "100%" }}>
      <AdminAtmosphere />
      <AdminSidebar active={active} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>
        <AdminTopbar crumbs={crumbs} rightExtra={topbarRight} />
        {tabs && <AdminTabs tabs={tabs} active={activeTab} />}
        <main style={{ flex: 1, minHeight: 0, padding: "18px", overflow: "auto" }}>{children}</main>
      </div>
    </div>
  );
}

Object.assign(window, { AdminShell, AdminSidebar, AdminTopbar, AdminTabs, AdminAtmosphere });
