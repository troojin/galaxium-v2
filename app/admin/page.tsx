"use client";

import React, { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MessageRecord {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface ProjectRecord {
  id: string;
  name: string;
  created_at: string;
}

interface FeedbackRecord {
  id: string;
  feedback_type: "like" | "dislike";
  reason: string | null;
  created_at: string;
}

interface PluginInsertRecord {
  id: string;
  status: "pending" | "applied";
  created_at: string;
}

interface AuthSessionRecord {
  code: string;
  status: "pending" | "approved";
  created_at: string;
}

interface ApiKeyRecord {
  id: string;
  created_at: string;
}

interface AdminData {
  messages: {
    total: number;
    user: number;
    assistant: number;
    recent: MessageRecord[];
  };
  projects: {
    total: number;
    recent: ProjectRecord[];
  };
  feedback: {
    total: number;
    likes: number;
    dislikes: number;
    recent: FeedbackRecord[];
  };
  plugin_inserts: {
    total: number;
    pending: number;
    applied: number;
    recent: PluginInsertRecord[];
  };
  auth_sessions: {
    total: number;
    pending: number;
    approved: number;
    recent: AuthSessionRecord[];
  };
  api_keys: {
    total: number;
    recent: ApiKeyRecord[];
  };
  presence: {
    active: number;
  };
}

type Page = "overview" | "messages" | "feedback" | "projects" | "plugins" | "keys";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ADMIN_PASSWORD = "troojin";

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString();
}

function getMockData(): AdminData {
  const iso = (hoursAgo: number) =>
    new Date(Date.now() - hoursAgo * 3_600_000).toISOString();
  return {
    messages: {
      total: 1547,
      user: 812,
      assistant: 735,
      recent: [
        { id: "1", role: "user", content: "Can you help me debug this function?", created_at: iso(0.2) },
        { id: "2", role: "assistant", content: "Sure! Looking at your code, the issue is on line 14…", created_at: iso(0.21) },
        { id: "3", role: "user", content: "What is the best way to structure this API?", created_at: iso(1) },
        { id: "4", role: "assistant", content: "I would recommend a RESTful approach with…", created_at: iso(1.01) },
        { id: "5", role: "user", content: "Write a haiku about debugging.", created_at: iso(2) },
      ],
    },
    projects: {
      total: 63,
      recent: [
        { id: "a", name: "Product roadmap assistant", created_at: iso(1) },
        { id: "b", name: "Code review bot", created_at: iso(18) },
        { id: "c", name: "Customer support agent", created_at: iso(27) },
        { id: "d", name: "Data analysis helper", created_at: iso(48) },
        { id: "e", name: "Writing assistant", created_at: iso(72) },
      ],
    },
    feedback: {
      total: 418,
      likes: 341,
      dislikes: 77,
      recent: [
        { id: "f1", feedback_type: "like", reason: "Very helpful and accurate", created_at: iso(0.5) },
        { id: "f2", feedback_type: "dislike", reason: "Response was too long", created_at: iso(1.5) },
        { id: "f3", feedback_type: "like", reason: null, created_at: iso(2) },
        { id: "f4", feedback_type: "like", reason: "Solved my problem instantly", created_at: iso(7) },
        { id: "f5", feedback_type: "dislike", reason: "Missed the context", created_at: iso(9) },
      ],
    },
    plugin_inserts: {
      total: 204,
      pending: 12,
      applied: 192,
      recent: [
        { id: "pi1", status: "applied", created_at: iso(0.1) },
        { id: "pi2", status: "pending", created_at: iso(0.15) },
        { id: "pi3", status: "applied", created_at: iso(1) },
        { id: "pi4", status: "applied", created_at: iso(2) },
        { id: "pi5", status: "pending", created_at: iso(16) },
      ],
    },
    auth_sessions: {
      total: 87,
      pending: 3,
      approved: 84,
      recent: [
        { code: "gx_abc123", status: "approved", created_at: iso(0.2) },
        { code: "gx_def456", status: "pending", created_at: iso(0.4) },
        { code: "gx_ghi789", status: "approved", created_at: iso(1) },
        { code: "gx_jkl012", status: "approved", created_at: iso(20) },
        { code: "gx_mno345", status: "pending", created_at: iso(18) },
      ],
    },
    api_keys: {
      total: 29,
      recent: [
        { id: "k1", created_at: iso(8) },
        { id: "k2", created_at: iso(32) },
        { id: "k3", created_at: iso(56) },
        { id: "k4", created_at: iso(80) },
        { id: "k5", created_at: iso(104) },
      ],
    },
    presence: { active: 7 },
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div style={s.metricCard}>
      <p style={s.metricLabel}>{label}</p>
      <p style={s.metricValue}>{value}</p>
      {sub && <p style={s.metricSub}>{sub}</p>}
    </div>
  );
}

function Badge({ text, type }: { text: string; type: string }) {
  const map: Record<string, React.CSSProperties> = {
    like: { background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" },
    dislike: { background: "rgba(248,113,113,0.12)", color: "#f87171", border: "1px solid rgba(248,113,113,0.25)" },
    pending: { background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" },
    applied: { background: "rgba(139,92,246,0.12)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.25)" },
    approved: { background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" },
    user: { background: "rgba(139,92,246,0.12)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.25)" },
    assistant: { background: "rgba(96,165,250,0.12)", color: "#93c5fd", border: "1px solid rgba(96,165,250,0.25)" },
  };
  return (
    <span style={{ ...s.badge, ...(map[type] ?? map.pending) }}>{text}</span>
  );
}

function Bar({ pct, color = "rgba(124,77,225,0.85)" }: { pct: number; color?: string }) {
  return (
    <div style={s.barBg}>
      <div style={{ ...s.barFill, width: `${pct}%`, background: color }} />
    </div>
  );
}

function SectionCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ ...s.sectionCard, ...style }}>
      {children}
    </div>
  );
}

function DataRow({
  left,
  right,
  last = false,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div style={{ ...s.dataRow, borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.05)" }}>
      <span style={s.dataRowLeft}>{left}</span>
      <span style={s.dataRowRight}>{right}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

function OverviewPage({ data }: { data: AdminData }) {
  const likeRate = data.feedback.total
    ? Math.round((data.feedback.likes / data.feedback.total) * 100)
    : 0;
  const piRate = data.plugin_inserts.total
    ? Math.round((data.plugin_inserts.applied / data.plugin_inserts.total) * 100)
    : 0;
  const urPct = data.messages.total
    ? Math.round((data.messages.user / data.messages.total) * 100)
    : 0;

  return (
    <div>
      <h1 style={s.pageTitle}>Dashboard</h1>
      <p style={s.pageSubtitle}>
        {fmt(data.projects.total)} projects · {fmt(data.messages.total)} messages ·{" "}
        {fmt(data.feedback.total)} feedback items
      </p>

      <div style={{ ...s.metricsGrid, gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", marginBottom: 24 }}>
        <MetricCard label="Total messages" value={fmt(data.messages.total)} sub="all time" />
        <MetricCard label="Projects" value={fmt(data.projects.total)} sub="all time" />
        <MetricCard label="Feedback" value={fmt(data.feedback.total)} sub="all time" />
        <MetricCard label="API keys" value={fmt(data.api_keys.total)} sub="active" />
        <MetricCard label="Online now" value={fmt(data.presence.active)} sub="plugin presence" />
      </div>

      <div style={s.twoCol}>
        <SectionCard>
          <p style={s.cardTitle}>Feedback breakdown</p>
          <p style={{ ...s.cardSub, marginBottom: 16 }}>{likeRate}% positive</p>
          <div style={{ marginBottom: 12 }}>
            <div style={s.barLabelRow}>
              <span>Likes</span>
              <span style={{ color: "#4ade80" }}>{fmt(data.feedback.likes)}</span>
            </div>
            <Bar pct={likeRate} color="rgba(34,197,94,0.7)" />
          </div>
          <div>
            <div style={s.barLabelRow}>
              <span>Dislikes</span>
              <span style={{ color: "#f87171" }}>{fmt(data.feedback.dislikes)}</span>
            </div>
            <Bar pct={100 - likeRate} color="rgba(248,113,113,0.7)" />
          </div>
        </SectionCard>

        <SectionCard>
          <p style={s.cardTitle}>Plugin inserts</p>
          <p style={{ ...s.cardSub, marginBottom: 16 }}>{data.plugin_inserts.pending} pending</p>
          <DataRow
            left={<><Dot color="#4ade80" /> Applied</>}
            right={fmt(data.plugin_inserts.applied)}
          />
          <DataRow
            left={<><Dot color="#fbbf24" /> Pending</>}
            right={fmt(data.plugin_inserts.pending)}
            last
          />
          <div style={{ marginTop: 12 }}>
            <Bar pct={piRate} />
            <p style={{ fontSize: 11, color: "#6b6b74", marginTop: 4, textAlign: "right" }}>
              {piRate}% applied
            </p>
          </div>
        </SectionCard>
      </div>

      <SectionCard style={{ marginTop: 14 }}>
        <p style={{ ...s.cardTitle, marginBottom: 14 }}>Messages by role</p>
        <div style={{ marginBottom: 10 }}>
          <div style={s.barLabelRow}>
            <span>User</span>
            <span style={{ color: "#c4b5fd" }}>{fmt(data.messages.user)}</span>
          </div>
          <Bar pct={urPct} />
        </div>
        <div>
          <div style={s.barLabelRow}>
            <span>Assistant</span>
            <span style={{ color: "#93c5fd" }}>{fmt(data.messages.assistant)}</span>
          </div>
          <Bar pct={100 - urPct} color="rgba(96,165,250,0.7)" />
        </div>
      </SectionCard>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: color,
        marginRight: 6,
        verticalAlign: "middle",
      }}
    />
  );
}

function MessagesPage({ data }: { data: AdminData }) {
  return (
    <div>
      <h1 style={s.pageTitle}>Messages</h1>
      <div style={{ ...s.metricsGrid, gridTemplateColumns: "repeat(3,1fr)", marginBottom: 20 }}>
        <MetricCard label="Total" value={fmt(data.messages.total)} />
        <MetricCard label="User" value={fmt(data.messages.user)} />
        <MetricCard label="Assistant" value={fmt(data.messages.assistant)} />
      </div>
      <SectionCard>
        <p style={{ ...s.cardTitle, marginBottom: 14 }}>Recent messages</p>
        {data.messages.recent.map((m, i) => (
          <div
            key={m.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 0",
              borderBottom: i < data.messages.recent.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
            }}
          >
            <Badge text={m.role} type={m.role} />
            <span style={{ flex: 1, fontSize: 13, color: "#9a9aa5", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
              {m.content}
            </span>
            <span style={{ fontSize: 11.5, color: "#6b6b74", flexShrink: 0 }}>{timeAgo(m.created_at)}</span>
          </div>
        ))}
      </SectionCard>
    </div>
  );
}

function FeedbackPage({ data }: { data: AdminData }) {
  const likeRate = data.feedback.total
    ? Math.round((data.feedback.likes / data.feedback.total) * 100)
    : 0;
  return (
    <div>
      <h1 style={s.pageTitle}>Feedback</h1>
      <div style={{ ...s.metricsGrid, gridTemplateColumns: "repeat(3,1fr)", marginBottom: 20 }}>
        <MetricCard label="Likes" value={fmt(data.feedback.likes)} />
        <MetricCard label="Dislikes" value={fmt(data.feedback.dislikes)} />
        <MetricCard label="Like rate" value={`${likeRate}%`} />
      </div>
      <SectionCard>
        <p style={{ ...s.cardTitle, marginBottom: 14 }}>Recent feedback</p>
        {data.feedback.recent.map((f, i) => (
          <div
            key={f.id}
            style={{
              padding: "10px 0",
              borderBottom: i < data.feedback.recent.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Badge text={f.feedback_type === "like" ? "👍 like" : "👎 dislike"} type={f.feedback_type} />
              <span style={{ fontSize: 11.5, color: "#6b6b74" }}>{timeAgo(f.created_at)}</span>
            </div>
            <p style={{ fontSize: 12.5, color: "#6b6b74", fontStyle: "italic", margin: 0 }}>
              {f.reason ?? "No reason given"}
            </p>
          </div>
        ))}
      </SectionCard>
    </div>
  );
}

function ProjectsPage({ data }: { data: AdminData }) {
  return (
    <div>
      <h1 style={s.pageTitle}>Projects</h1>
      <div style={{ ...s.metricsGrid, gridTemplateColumns: "repeat(2,1fr)", marginBottom: 20 }}>
        <MetricCard label="Total projects" value={fmt(data.projects.total)} sub="all time" />
      </div>
      <SectionCard>
        <p style={{ ...s.cardTitle, marginBottom: 14 }}>Recent projects</p>
        {data.projects.recent.map((p, i) => (
          <DataRow
            key={p.id}
            left={<span style={{ color: "#e5e5ea", fontWeight: 500 }}>{p.name}</span>}
            right={<span style={{ fontSize: 11.5, color: "#6b6b74" }}>{timeAgo(p.created_at)}</span>}
            last={i === data.projects.recent.length - 1}
          />
        ))}
      </SectionCard>
    </div>
  );
}

function PluginsPage({ data }: { data: AdminData }) {
  return (
    <div>
      <h1 style={s.pageTitle}>Plugin activity</h1>
      <div style={{ ...s.metricsGrid, gridTemplateColumns: "repeat(4,1fr)", marginBottom: 20 }}>
        <MetricCard label="Inserts" value={fmt(data.plugin_inserts.total)} />
        <MetricCard label="Pending" value={fmt(data.plugin_inserts.pending)} />
        <MetricCard label="Applied" value={fmt(data.plugin_inserts.applied)} />
        <MetricCard label="Online" value={fmt(data.presence.active)} sub="presence" />
      </div>
      <div style={s.twoCol}>
        <SectionCard>
          <p style={{ ...s.cardTitle, marginBottom: 14 }}>Recent inserts</p>
          {data.plugin_inserts.recent.map((p, i) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: i < data.plugin_inserts.recent.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
              }}
            >
              <span style={{ fontSize: 12, color: "#9a9aa5", fontFamily: "monospace" }}>{p.id}</span>
              <Badge text={p.status} type={p.status} />
              <span style={{ fontSize: 11.5, color: "#6b6b74" }}>{timeAgo(p.created_at)}</span>
            </div>
          ))}
        </SectionCard>
        <SectionCard>
          <p style={{ ...s.cardTitle, marginBottom: 14 }}>Auth sessions</p>
          {data.auth_sessions.recent.map((a, i) => (
            <div
              key={a.code}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: i < data.auth_sessions.recent.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
              }}
            >
              <span style={{ fontSize: 12, color: "#9a9aa5", fontFamily: "monospace" }}>{a.code}</span>
              <Badge text={a.status} type={a.status} />
            </div>
          ))}
        </SectionCard>
      </div>
    </div>
  );
}

function KeysPage({ data }: { data: AdminData }) {
  return (
    <div>
      <h1 style={s.pageTitle}>API keys</h1>
      <div style={{ ...s.metricsGrid, gridTemplateColumns: "repeat(2,1fr)", marginBottom: 20 }}>
        <MetricCard label="Total API keys" value={fmt(data.api_keys.total)} sub="active" />
      </div>
      <SectionCard>
        <p style={{ ...s.cardTitle, marginBottom: 14 }}>Keys</p>
        {data.api_keys.recent.map((k, i) => (
          <DataRow
            key={k.id}
            left={<span style={{ fontSize: 12, color: "#9a9aa5", fontFamily: "monospace" }}>gx_****{k.id.slice(-4)}</span>}
            right={<span style={{ fontSize: 11.5, color: "#6b6b74" }}>{timeAgo(k.created_at)}</span>}
            last={i === data.api_keys.recent.length - 1}
          />
        ))}
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Nav item
// ---------------------------------------------------------------------------

function NavItem({
  label,
  page,
  activePage,
  onClick,
}: {
  label: string;
  page: Page;
  activePage: Page;
  onClick: (p: Page) => void;
}) {
  const active = activePage === page;
  return (
    <button
      onClick={() => onClick(page)}
      style={{
        ...s.navItem,
        ...(active ? s.navItemActive : {}),
      }}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Login screen
// ---------------------------------------------------------------------------

function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);

  function attempt() {
    if (pw === ADMIN_PASSWORD) {
      onSuccess();
    } else {
      setError("Incorrect password.");
    }
  }

  return (
    <div style={s.loginWrap}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; }
        input::placeholder { color: #6b6b74; }
        input:focus { outline: none; border-color: #8b5cf6 !important; box-shadow: 0 0 0 3px rgba(139,92,246,0.25); }
        .primary-btn:hover { filter: brightness(1.12); }
      `}</style>
      <div style={s.loginCard}>
        <div style={s.loginLogo}>
          <div style={s.logoMark}>✦</div>
          <span style={s.loginTitle}>Galaxium</span>
        </div>
        <p style={s.loginSub}>Sign in to the admin panel</p>
        <label style={s.fieldLabel}>Password</label>
        <input
          type="password"
          autoFocus
          placeholder="Enter admin password"
          value={pw}
          onChange={(e) => { setPw(e.target.value); setError(null); }}
          onKeyDown={(e) => e.key === "Enter" && attempt()}
          style={s.loginInput}
        />
        {error && <p style={s.loginErr}>{error}</p>}
        <button
          className="primary-btn"
          onClick={attempt}
          style={s.loginBtn}
        >
          Sign in
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [activePage, setActivePage] = useState<Page>("overview");
  const [data, setData] = useState<AdminData | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>("");

  useEffect(() => {
    if (!authed) return;
    setLastRefresh("Loading…");
    // In production replace this with real Supabase queries
    setTimeout(() => {
      setData(getMockData());
      setLastRefresh("Updated " + new Date().toLocaleTimeString());
    }, 600);
  }, [authed]);

  if (!authed) {
    return <LoginScreen onSuccess={() => setAuthed(true)} />;
  }

  const NAV: { label: string; page: Page }[] = [
    { label: "⬡  Dashboard", page: "overview" },
    { label: "◎  Messages", page: "messages" },
    { label: "◈  Feedback", page: "feedback" },
    { label: "⬚  Projects", page: "projects" },
    { label: "⟡  Activity", page: "plugins" },
    { label: "⊹  API keys", page: "keys" },
  ];

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; }
        .admin-nav-btn:hover { background: rgba(255,255,255,0.05) !important; color: #e5e5ea !important; }
        .admin-nav-btn-active { background: rgba(139,92,246,0.18) !important; color: #c4b5fd !important; }
        .primary-btn:hover { filter: brightness(1.12); }
      `}</style>

      {/* Topbar */}
      <div style={s.topbar}>
        <div style={s.topbarLeft}>
          <div style={s.topbarLogoMark}>✦</div>
          <span style={s.topbarName}>Galaxium</span>
          <span style={s.adminBadge}>Admin</span>
        </div>
        <div style={s.topbarRight}>
          {lastRefresh && <span style={s.refreshLabel}>{lastRefresh}</span>}
          <button onClick={() => setAuthed(false)} style={s.signOutBtn}>
            Sign out
          </button>
        </div>
      </div>

      <div style={s.body}>
        {/* Sidebar */}
        <aside style={s.sidebar}>
          <p style={s.navSection}>OVERVIEW</p>
          <NavItem label="⬡  Dashboard" page="overview" activePage={activePage} onClick={setActivePage} />
          <p style={s.navSection}>DATA</p>
          <NavItem label="◎  Messages" page="messages" activePage={activePage} onClick={setActivePage} />
          <NavItem label="◈  Feedback" page="feedback" activePage={activePage} onClick={setActivePage} />
          <NavItem label="⬚  Projects" page="projects" activePage={activePage} onClick={setActivePage} />
          <p style={s.navSection}>PLUGINS</p>
          <NavItem label="⟡  Activity" page="plugins" activePage={activePage} onClick={setActivePage} />
          <NavItem label="⊹  API keys" page="keys" activePage={activePage} onClick={setActivePage} />
        </aside>

        {/* Main content */}
        <main style={s.main}>
          {!data ? (
            <p style={{ color: "#9a9aa5", fontSize: 14 }}>Loading…</p>
          ) : activePage === "overview" ? (
            <OverviewPage data={data} />
          ) : activePage === "messages" ? (
            <MessagesPage data={data} />
          ) : activePage === "feedback" ? (
            <FeedbackPage data={data} />
          ) : activePage === "projects" ? (
            <ProjectsPage data={data} />
          ) : activePage === "plugins" ? (
            <PluginsPage data={data} />
          ) : (
            <KeysPage data={data} />
          )}
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s: Record<string, React.CSSProperties> = {
  // Login
  loginWrap: {
    minHeight: "100vh",
    width: "100%",
    background: "#0a0a0a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  loginCard: {
    position: "relative",
    width: "100%",
    maxWidth: 360,
    background: "#000000",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16,
    boxShadow: "0 24px 64px -12px rgba(0,0,0,0.85)",
    padding: "32px 28px",
  },
  loginLogo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: "rgba(124,77,225,0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    color: "#fff",
  },
  loginTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#fff",
    letterSpacing: "-0.02em",
  },
  loginSub: {
    color: "#9a9aa5",
    fontSize: 13.5,
    margin: "0 0 20px",
  },
  fieldLabel: {
    fontSize: 12.5,
    color: "#9a9aa5",
    display: "block",
    marginBottom: 6,
  },
  loginInput: {
    width: "100%",
    background: "rgba(0,0,0,0.35)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: "11px 14px",
    color: "#ffffff",
    fontSize: 14,
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  loginErr: {
    color: "#f87171",
    fontSize: 12.5,
    margin: "8px 0 0",
  },
  loginBtn: {
    width: "100%",
    height: 42,
    background: "rgba(124,77,225,0.85)",
    color: "#ffffff",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 12,
    transition: "filter 0.2s",
  },

  // Layout
  page: {
    minHeight: "100vh",
    width: "100%",
    background: "#0a0a0a",
    display: "flex",
    flexDirection: "column",
  },
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 24px",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    background: "#000000",
  },
  topbarLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  topbarLogoMark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    background: "rgba(124,77,225,0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    color: "#fff",
  },
  topbarName: {
    fontSize: 15,
    fontWeight: 700,
    color: "#fff",
    letterSpacing: "-0.01em",
  },
  adminBadge: {
    fontSize: 11,
    background: "rgba(139,92,246,0.18)",
    color: "#c4b5fd",
    padding: "3px 9px",
    borderRadius: 20,
    border: "1px solid rgba(139,92,246,0.3)",
  },
  topbarRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  refreshLabel: {
    fontSize: 11,
    color: "#6b6b74",
  },
  signOutBtn: {
    fontSize: 13,
    color: "#9a9aa5",
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    padding: "5px 12px",
    cursor: "pointer",
  },
  body: {
    display: "flex",
    flex: 1,
  },
  sidebar: {
    width: 190,
    flexShrink: 0,
    borderRight: "1px solid rgba(255,255,255,0.07)",
    padding: "12px 0",
    background: "#000000",
  },
  navSection: {
    fontSize: 10.5,
    color: "#6b6b74",
    padding: "12px 16px 4px",
    letterSpacing: "0.05em",
    margin: 0,
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    gap: 8,
    padding: "8px 16px",
    fontSize: 13,
    color: "#9a9aa5",
    cursor: "pointer",
    background: "transparent",
    border: "none",
    textAlign: "left",
    transition: "background 0.15s, color 0.15s",
  },
  navItemActive: {
    background: "rgba(139,92,246,0.18)",
    color: "#c4b5fd",
  },
  main: {
    flex: 1,
    padding: "32px 28px",
    overflowY: "auto",
    background: "#0a0a0a",
  },

  // Page content
  pageTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: "#fff",
    letterSpacing: "-0.02em",
    margin: "0 0 6px",
  },
  pageSubtitle: {
    fontSize: 13.5,
    color: "#9a9aa5",
    margin: "0 0 24px",
  },
  metricsGrid: {
    display: "grid",
    gap: 14,
  },
  metricCard: {
    background: "#000000",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 12,
    padding: 16,
  },
  metricLabel: {
    fontSize: 12,
    color: "#6b6b74",
    margin: "0 0 6px",
  },
  metricValue: {
    fontSize: 26,
    fontWeight: 700,
    color: "#fff",
    letterSpacing: "-0.02em",
    margin: 0,
  },
  metricSub: {
    fontSize: 11.5,
    color: "#6b6b74",
    margin: "3px 0 0",
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  },
  sectionCard: {
    background: "#000000",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: 20,
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: 600,
    color: "#e5e5ea",
    margin: 0,
  },
  cardSub: {
    fontSize: 11.5,
    color: "#6b6b74",
    margin: "4px 0 0",
  },
  barLabelRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 13,
    color: "#9a9aa5",
    marginBottom: 3,
  },
  barBg: {
    height: 5,
    background: "rgba(255,255,255,0.06)",
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
    transition: "width 0.4s ease",
  },
  dataRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 0",
  },
  dataRowLeft: {
    fontSize: 13,
    color: "#9a9aa5",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  dataRowRight: {
    fontSize: 13,
    color: "#e5e5ea",
  },
  badge: {
    fontSize: 11,
    padding: "2px 8px",
    borderRadius: 20,
    display: "inline-flex",
    alignItems: "center",
  },
};