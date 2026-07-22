"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

// Projects dashboard — matches app/login & app/signup styling: black/white/purple, Inter font, glass cards.

interface Project {
  id: string;
  name: string;
  database: string;
  updatedAt: string;
  imageUrl?: string;
}

const SAMPLE_PROJECTS: Project[] = [
  {
    id: "proj_1",
    name: "acme-storefront",
    database: "Postgres 15",
    updatedAt: "2h ago",
  },
  {
    id: "proj_2",
    name: "internal-tools",
    database: "Postgres 15",
    updatedAt: "5h ago",
  },
  {
    id: "proj_3",
    name: "waitlist-mvp",
    database: "Postgres 15",
    updatedAt: "3d ago",
  },
  {
    id: "proj_4",
    name: "billing-service",
    database: "Postgres 14",
    updatedAt: "12m ago",
  },
  {
    id: "proj_5",
    name: "mobile-app-backend",
    database: "Postgres 15",
    updatedAt: "1d ago",
  },
];

function ProjectIcon({ name, large }: { name: string; large?: boolean }) {
  // Deterministic gradient seed per project name so each card gets a stable, distinct mark.
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return (
    <div
      style={{
        ...(large ? styles.projectIconLarge : styles.projectIcon),
        background: `linear-gradient(160deg, hsla(${hue}, 70%, 65%, 0.9) 0%, hsla(${(hue + 40) % 360}, 70%, 45%, 0.9) 100%)`,
      }}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  const filtered = SAMPLE_PROJECTS.filter((p) =>
    p.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; }
        input::placeholder { color: #6b6b74; }
        input:focus { outline: none; border-color: #8b5cf6 !important; box-shadow: 0 0 0 3px rgba(139,92,246,0.25); }
        .primary-btn:hover { filter: brightness(1.12); }
        .glass-sheen { position: relative; }
        .glass-sheen::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 60%;
          background: linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.008) 60%, rgba(255,255,255,0) 100%);
          border-radius: 16px 16px 0 0;
          pointer-events: none;
        }
        .glass-sheen::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 16px;
          box-shadow: inset 0 0.5px 0 rgba(255,255,255,0.25), inset 0 -0.5px 0 rgba(255,255,255,0.03);
          pointer-events: none;
        }
        .project-card {
          transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
          cursor: pointer;
        }
        .project-card:hover {
          transform: translateY(-2px);
          border-color: rgba(139,92,246,0.35) !important;
          box-shadow: 0 12px 32px -8px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,92,246,0.15) !important;
        }
        .new-project-card {
          transition: border-color 0.18s ease, background 0.18s ease;
          cursor: pointer;
        }
        .new-project-card:hover {
          border-color: rgba(139,92,246,0.4) !important;
          background: rgba(139,92,246,0.04) !important;
        }
        .view-toggle-btn {
          transition: background 0.15s ease, color 0.15s ease;
        }
      `}</style>

      <div style={styles.container}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>Projects</h1>
            <p style={styles.subtitle}>{SAMPLE_PROJECTS.length} projects across your organization</p>
          </div>
          <button
            className="primary-btn"
            style={styles.newProjectBtn}
            onClick={() => router.push("/new-project")}
          >
            + New project
          </button>
        </div>

        <div style={styles.controlsRow}>
          <input
            type="text"
            placeholder="Search projects…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={styles.searchInput}
          />
          <div style={styles.viewToggle}>
            <button
              className="view-toggle-btn"
              style={{
                ...styles.viewToggleBtn,
                ...(view === "grid" ? styles.viewToggleBtnActive : {}),
              }}
              onClick={() => setView("grid")}
              aria-label="Grid view"
            >
              ▦
            </button>
            <button
              className="view-toggle-btn"
              style={{
                ...styles.viewToggleBtn,
                ...(view === "list" ? styles.viewToggleBtnActive : {}),
              }}
              onClick={() => setView("list")}
              aria-label="List view"
            >
              ☰
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="glass-sheen" style={styles.emptyState}>
            <p style={styles.emptyText}>No projects match "{query}"</p>
          </div>
        ) : view === "grid" ? (
          <div style={styles.grid}>
            {filtered.map((project) => (
              <div key={project.id} className="glass-sheen project-card" style={styles.card}>
                <div style={styles.cardThumb}>
                  {project.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={project.imageUrl} alt="" style={styles.cardThumbImg} />
                  ) : (
                    <ProjectIcon name={project.name} large />
                  )}
                </div>
                <div style={styles.cardBody}>
                  <h3 style={styles.cardName}>{project.name}</h3>
                  <p style={styles.cardMeta}>
                    {project.region} · {project.database}
                  </p>
                  <p style={styles.cardUpdated}>Updated {project.updatedAt}</p>
                </div>
              </div>
            ))}
            <div
              className="new-project-card"
              style={styles.newProjectCard}
              onClick={() => router.push("/new-project")}
            >
              <span style={styles.newProjectPlus}>+</span>
              <span style={styles.newProjectLabel}>New project</span>
            </div>
          </div>
        ) : (
          <div className="glass-sheen" style={styles.listWrap}>
            {filtered.map((project, i) => (
              <div
                key={project.id}
                className="project-card"
                style={{
                  ...styles.listRow,
                  borderBottom:
                    i === filtered.length - 1 ? "none" : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={styles.listLeft}>
                  <ProjectIcon name={project.name} />
                  <div>
                    <p style={styles.listName}>{project.name}</p>
                    <p style={styles.listMeta}>
                      {project.region} · {project.database}
                    </p>
                  </div>
                </div>
                <div style={styles.listRight}>
                  <span style={styles.listUpdated}>{project.updatedAt}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background: "#0a0a0a",
    padding: "48px 24px",
  },
  container: {
    maxWidth: 1080,
    margin: "0 auto",
  },
  headerRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 28,
    flexWrap: "wrap",
    gap: 16,
  },
  title: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: 700,
    margin: "0 0 6px",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    color: "#9a9aa5",
    fontSize: 14,
    margin: 0,
  },
  newProjectBtn: {
    background: "linear-gradient(160deg, rgba(124,77,225,0.85) 0%, rgba(91,33,182,0.85) 100%)",
    color: "#ffffff",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(91,33,182,0.4), inset 0 0.5px 0 rgba(255,255,255,0.2)",
    transition: "filter 0.2s",
    whiteSpace: "nowrap",
  },
  controlsRow: {
    display: "flex",
    gap: 12,
    marginBottom: 28,
  },
  searchInput: {
    background: "rgba(0,0,0,0.35)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: "10px 14px",
    color: "#ffffff",
    fontSize: 14,
    flex: 1,
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  viewToggle: {
    display: "flex",
    background: "rgba(0,0,0,0.35)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  viewToggleBtn: {
    background: "transparent",
    border: "none",
    color: "#9a9aa5",
    borderRadius: 7,
    padding: "8px 12px",
    fontSize: 14,
    cursor: "pointer",
  },
  viewToggleBtnActive: {
    background: "rgba(139,92,246,0.18)",
    color: "#c4b5fd",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
    gap: 20,
  },
  card: {
    position: "relative",
    background: "linear-gradient(160deg, rgba(12,12,14,0.7) 0%, rgba(0,0,0,0.65) 50%, rgba(6,6,8,0.7) 100%)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 16,
    backdropFilter: "blur(24px) saturate(140%)",
    WebkitBackdropFilter: "blur(24px) saturate(140%)",
    boxShadow: "0 12px 32px -12px rgba(0,0,0,0.7)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  cardThumb: {
    position: "relative",
    width: "100%",
    height: 180,
    background: "rgba(255,255,255,0.03)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardThumbImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  cardBody: {
    padding: "18px 22px 22px",
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  projectIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 700,
    flexShrink: 0,
  },
  projectIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#ffffff",
    fontSize: 26,
    fontWeight: 700,
    flexShrink: 0,
  },
  cardName: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: 600,
    margin: "0 0 8px",
  },
  cardMeta: {
    color: "#9a9aa5",
    fontSize: 13.5,
    margin: "0 0 6px",
  },
  cardUpdated: {
    color: "#6b6b74",
    fontSize: 12.5,
    margin: "auto 0 0",
    paddingTop: 10,
  },
  newProjectCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    border: "1px dashed rgba(255,255,255,0.15)",
    borderRadius: 16,
    minHeight: 300,
    background: "rgba(255,255,255,0.01)",
  },
  newProjectPlus: {
    color: "#8b5cf6",
    fontSize: 22,
    fontWeight: 400,
    lineHeight: 1,
  },
  newProjectLabel: {
    color: "#9a9aa5",
    fontSize: 13,
    fontWeight: 500,
  },
  listWrap: {
    position: "relative",
    background: "linear-gradient(160deg, rgba(12,12,14,0.7) 0%, rgba(0,0,0,0.65) 50%, rgba(6,6,8,0.7) 100%)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 16,
    backdropFilter: "blur(24px) saturate(140%)",
    WebkitBackdropFilter: "blur(24px) saturate(140%)",
    boxShadow: "0 12px 32px -12px rgba(0,0,0,0.7)",
    overflow: "hidden",
  },
  listRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    gap: 16,
    flexWrap: "wrap",
  },
  listLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  listName: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 600,
    margin: "0 0 3px",
  },
  listMeta: {
    color: "#9a9aa5",
    fontSize: 12.5,
    margin: 0,
  },
  listRight: {
    display: "flex",
    alignItems: "center",
    gap: 20,
  },
  listUpdated: {
    color: "#6b6b74",
    fontSize: 12.5,
    minWidth: 56,
    textAlign: "right",
  },
  emptyState: {
    position: "relative",
    background: "linear-gradient(160deg, rgba(12,12,14,0.7) 0%, rgba(0,0,0,0.65) 50%, rgba(6,6,8,0.7) 100%)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: "48px 20px",
    textAlign: "center",
  },
  emptyText: {
    color: "#9a9aa5",
    fontSize: 14,
    margin: 0,
  },
};