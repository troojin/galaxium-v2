"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";
import LoadingScreen from "@/components/loading";

interface Project {
  id: string;
  name: string;
  updated_at: string;
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const toast = useToast();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Card menu (3-dot) state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Rename modal state
  const [renameTarget, setRenameTarget] = useState<Project | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  // Delete confirm modal state
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const brandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (!data.session) {
        router.replace("/auth/login");
        return;
      }
      setCheckingAuth(false);
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (checkingAuth) return;

    let isMounted = true;

    async function loadProjects() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("projects")
        .select("id, name, updated_at")
        .order("updated_at", { ascending: false });

      if (!isMounted) return;

      if (error) {
        setError(error.message);
        toast.error("Couldn't load your projects.");
      } else {
        setProjects(data ?? []);
      }
      setLoading(false);
    }

    loadProjects();

    return () => {
      isMounted = false;
    };
  }, [checkingAuth, supabase]);

  // Close the 3-dot menu on outside click / Escape
  useEffect(() => {
    if (!openMenuId) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenuId(null);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openMenuId]);

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  function openModal() {
    setNewName("");
    setModalError(null);
    setShowModal(true);
  }

  function closeModal() {
    if (creating) return;
    setShowModal(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setModalError("Give your project a name.");
      return;
    }

    setCreating(true);
    setModalError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setModalError("You need to be signed in to create a project.");
      setCreating(false);
      return;
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({ name: trimmed, user_id: user.id })
      .select("id, name, updated_at")
      .single();

    setCreating(false);

    if (error) {
      setModalError(error.message);
      toast.error("Couldn't create the project.");
      return;
    }

    setProjects((prev) => [data as Project, ...prev]);
    setShowModal(false);
    toast.success(`"${trimmed}" created`);
  }

  function handleCardMenuToggle(e: React.MouseEvent, projectId: string) {
    e.stopPropagation();
    setOpenMenuId((prev) => (prev === projectId ? null : projectId));
  }

  function openRenameModal(e: React.MouseEvent, project: Project) {
    e.stopPropagation();
    setOpenMenuId(null);
    setRenameTarget(project);
    setRenameValue(project.name);
    setRenameError(null);
  }

  function closeRenameModal() {
    if (renaming) return;
    setRenameTarget(null);
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!renameTarget) return;

    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenameError("Give your project a name.");
      return;
    }

    if (trimmed === renameTarget.name) {
      setRenameTarget(null);
      return;
    }

    setRenaming(true);
    setRenameError(null);

    const { data, error } = await supabase
      .from("projects")
      .update({ name: trimmed })
      .eq("id", renameTarget.id)
      .select("id, name, updated_at")
      .single();

    setRenaming(false);

    if (error) {
      setRenameError(error.message);
      toast.error("Couldn't rename the project.");
      return;
    }

    setProjects((prev) =>
      prev.map((p) => (p.id === renameTarget.id ? (data as Project) : p))
    );
    setRenameTarget(null);
    toast.success(`Renamed to "${trimmed}"`);
  }

  function openDeleteModal(e: React.MouseEvent, project: Project) {
    e.stopPropagation();
    setOpenMenuId(null);
    setDeleteTarget(project);
    setDeleteError(null);
  }

  function closeDeleteModal() {
    if (deleting) return;
    setDeleteTarget(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    setDeleteError(null);

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", deleteTarget.id);

    setDeleting(false);

    if (error) {
      setDeleteError(error.message);
      toast.error("Couldn't delete the project.");
      return;
    }

    setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast.success(`"${deleteTarget.name}" deleted`);
  }

  if (checkingAuth) {
    return <div style={styles.page} />;
  }

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
        .card-menu-btn {
          transition: background 0.15s ease, color 0.15s ease;
        }
        .card-menu-btn:hover {
          background: rgba(255,255,255,0.08) !important;
          color: #ffffff !important;
        }
        .card-menu-item {
          transition: background 0.12s ease;
        }
        .card-menu-item:hover {
          background: rgba(255,255,255,0.06);
        }
        .card-menu-item.danger:hover {
          background: rgba(248,113,113,0.1);
        }
        .modal-overlay {
          animation: fadeIn 0.15s ease;
        }
        .modal-card {
          animation: modalIn 0.18s ease;
        }
        .card-dropdown {
          animation: dropdownIn 0.12s ease;
        }
        .rainbow-v2 {
          background: linear-gradient(90deg, #ff5f6d, #ffc371, #a8e063, #56ccf2, #8b5cf6, #ff5f6d);
          background-size: 300% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          animation: rainbowShift 4s linear infinite;
        }
        @keyframes rainbowShift {
          0% { background-position: 0% 50%; }
          100% { background-position: 300% 50%; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div style={styles.topbar}>
        <div ref={brandRef} style={styles.brandWrap}>
          <img src="/icons/icon.png" alt="Galaxium" style={styles.brandIconImg} />
          <span style={styles.brandInlineText}>
            Galaxium <span className="rainbow-v2" style={styles.rainbowV2}>V2</span>
          </span>
        </div>
      </div>

      <div style={styles.container}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>Projects</h1>
            <p style={styles.subtitle}>
              {loading
                ? "Loading your projects…"
                : `${projects.length} project${projects.length === 1 ? "" : "s"} across your organization`}
            </p>
          </div>
          <button className="primary-btn" style={styles.newProjectBtn} onClick={openModal}>
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

        {error && (
          <div className="glass-sheen" style={{ ...styles.emptyState, marginBottom: 20 }}>
            <p style={{ ...styles.emptyText, color: "#f87171" }}>
              Couldn&apos;t load projects: {error}
            </p>
          </div>
        )}

        <div style={{ position: "relative", minHeight: loading ? 240 : undefined }}>
          {loading ? (
            <LoadingScreen fullScreen={false} message="Loading projects…" />
          ) : !error && filtered.length === 0 && projects.length > 0 ? (
            <div className="glass-sheen" style={styles.emptyState}>
              <p style={styles.emptyText}>No projects match &quot;{query}&quot;</p>
            </div>
          ) : view === "grid" ? (
            <div style={styles.grid}>
              {filtered.map((project) => (
                <div
                  key={project.id}
                  className="glass-sheen project-card"
                  style={{
                    ...styles.card,
                    zIndex: openMenuId === project.id ? 20 : 1,
                  }}
                  onClick={() => router.push(`/project/${project.id}`)}
                >
                  <div style={styles.cardBody}>
                    <div style={styles.cardTopRow}>
                      <h3 style={styles.cardName}>{project.name}</h3>
                      <div style={styles.menuWrap} ref={openMenuId === project.id ? menuRef : null}>
                        <button
                          className="card-menu-btn"
                          style={styles.cardMenuBtn}
                          onClick={(e) => handleCardMenuToggle(e, project.id)}
                          aria-label="Project options"
                        >
                          ⋯
                        </button>
                        {openMenuId === project.id && (
                          <div
                            className="card-dropdown"
                            style={styles.cardDropdown}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              className="card-menu-item"
                              style={styles.cardMenuItem}
                              onClick={(e) => openRenameModal(e, project)}
                            >
                              Rename
                            </button>
                            <button
                              className="card-menu-item danger"
                              style={{ ...styles.cardMenuItem, color: "#f87171" }}
                              onClick={(e) => openDeleteModal(e, project)}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <p style={styles.cardUpdated}>Updated {timeAgo(project.updated_at)}</p>
                  </div>
                </div>
              ))}
              <div className="new-project-card" style={styles.newProjectCard} onClick={openModal}>
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
                    position: "relative",
                    zIndex: openMenuId === project.id ? 20 : 1,
                  }}
                  onClick={() => router.push(`/project/${project.id}`)}
                >
                  <div style={styles.listLeft}>
                    <p style={styles.listName}>{project.name}</p>
                  </div>
                  <div style={styles.listRight}>
                    <span style={styles.listUpdated}>{timeAgo(project.updated_at)}</span>
                    <div style={styles.menuWrap} ref={openMenuId === project.id ? menuRef : null}>
                      <button
                        className="card-menu-btn"
                        style={styles.cardMenuBtn}
                        onClick={(e) => handleCardMenuToggle(e, project.id)}
                        aria-label="Project options"
                      >
                        ⋯
                      </button>
                      {openMenuId === project.id && (
                        <div
                          className="card-dropdown"
                          style={{ ...styles.cardDropdown, right: 0, left: "auto" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="card-menu-item"
                            style={styles.cardMenuItem}
                            onClick={(e) => openRenameModal(e, project)}
                          >
                            Rename
                          </button>
                          <button
                            className="card-menu-item danger"
                            style={{ ...styles.cardMenuItem, color: "#f87171" }}
                            onClick={(e) => openDeleteModal(e, project)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div
                className="new-project-card"
                style={{ ...styles.newProjectCard, borderRadius: 0, borderTop: "1px solid rgba(255,255,255,0.06)", border: "none", borderTopWidth: 1 }}
                onClick={openModal}
              >
                <span style={styles.newProjectPlus}>+</span>
                <span style={styles.newProjectLabel}>New project</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div
          className="modal-overlay"
          style={styles.modalOverlay}
          onClick={closeModal}
        >
          <div
            className="glass-sheen modal-card"
            style={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={styles.modalTitle}>New project</h2>
            <p style={styles.modalSubtitle}>Give your project a name to get started.</p>
            <form onSubmit={handleCreate}>
              <input
                autoFocus
                type="text"
                placeholder="my-awesome-project"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={styles.modalInput}
                disabled={creating}
              />
              {modalError && <p style={styles.modalError}>{modalError}</p>}
              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={styles.modalCancelBtn}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  style={styles.modalCreateBtn}
                  disabled={creating}
                >
                  {creating ? "Creating…" : "Create project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {renameTarget && (
        <div className="modal-overlay" style={styles.modalOverlay} onClick={closeRenameModal}>
          <div
            className="glass-sheen modal-card"
            style={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={styles.modalTitle}>Rename project</h2>
            <p style={styles.modalSubtitle}>Choose a new name for &quot;{renameTarget.name}&quot;.</p>
            <form onSubmit={handleRename}>
              <input
                autoFocus
                type="text"
                placeholder="my-awesome-project"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                style={styles.modalInput}
                disabled={renaming}
              />
              {renameError && <p style={styles.modalError}>{renameError}</p>}
              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={closeRenameModal}
                  style={styles.modalCancelBtn}
                  disabled={renaming}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  style={styles.modalCreateBtn}
                  disabled={renaming}
                >
                  {renaming ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" style={styles.modalOverlay} onClick={closeDeleteModal}>
          <div
            className="glass-sheen modal-card"
            style={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={styles.modalTitle}>Delete project</h2>
            <p style={styles.modalSubtitle}>
              Are you sure you want to delete &quot;{deleteTarget.name}&quot;? This can&apos;t be undone.
            </p>
            {deleteError && <p style={styles.modalError}>{deleteError}</p>}
            <div style={styles.modalActions}>
              <button
                type="button"
                onClick={closeDeleteModal}
                style={styles.modalCancelBtn}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                style={styles.modalDeleteBtn}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background: "#0a0a0a",
    padding: 0,
  },
  topbar: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: "14px 24px",
    background: "rgba(10,10,10,0.75)",
    backdropFilter: "blur(16px) saturate(140%)",
    WebkitBackdropFilter: "blur(16px) saturate(140%)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  brandWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  brandIconImg: {
    width: 22,
    height: 22,
    objectFit: "contain",
  },
  brandInlineText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: "-0.01em",
    whiteSpace: "nowrap",
  },
  rainbowV2: {
    fontWeight: 800,
  },
  container: {
    maxWidth: 1080,
    margin: "0 auto",
    padding: "48px 24px",
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
    overflow: "visible",
    display: "flex",
    flexDirection: "column",
  },
  cardBody: {
    padding: "18px 22px 22px",
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  cardTopRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  cardName: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: 600,
    margin: "0 0 8px",
  },
  cardUpdated: {
    color: "#6b6b74",
    fontSize: 12.5,
    margin: "auto 0 0",
    paddingTop: 10,
  },
  menuWrap: {
    position: "relative",
    flexShrink: 0,
  },
  cardMenuBtn: {
    background: "transparent",
    border: "none",
    color: "#6b6b74",
    borderRadius: 7,
    width: 28,
    height: 28,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    lineHeight: 1,
    cursor: "pointer",
  },
  cardDropdown: {
    position: "absolute",
    top: "calc(100% + 6px)",
    right: 0,
    left: "auto",
    minWidth: 150,
    background: "linear-gradient(160deg, rgba(20,20,22,0.98) 0%, rgba(8,8,10,0.98) 100%)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    boxShadow: "0 16px 40px -8px rgba(0,0,0,0.85)",
    padding: 5,
    zIndex: 50,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  cardMenuItem: {
    background: "transparent",
    border: "none",
    color: "#e5e5ea",
    borderRadius: 7,
    padding: "8px 10px",
    fontSize: 13.5,
    fontWeight: 500,
    textAlign: "left",
    cursor: "pointer",
  },
  newProjectCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    border: "1px dashed rgba(255,255,255,0.15)",
    borderRadius: 16,
    minHeight: 100,
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
    overflow: "visible",
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
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 20,
  },
  modalCard: {
    position: "relative",
    width: "100%",
    maxWidth: 420,
    background: "linear-gradient(160deg, rgba(16,16,18,0.95) 0%, rgba(4,4,6,0.95) 50%, rgba(8,8,10,0.95) 100%)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16,
    backdropFilter: "blur(24px) saturate(140%)",
    WebkitBackdropFilter: "blur(24px) saturate(140%)",
    boxShadow: "0 24px 64px -12px rgba(0,0,0,0.85)",
    padding: "28px 26px 24px",
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: 700,
    margin: "0 0 6px",
    letterSpacing: "-0.01em",
  },
  modalSubtitle: {
    color: "#9a9aa5",
    fontSize: 13.5,
    margin: "0 0 18px",
  },
  modalInput: {
    width: "100%",
    background: "rgba(0,0,0,0.35)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: "11px 14px",
    color: "#ffffff",
    fontSize: 14,
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  modalError: {
    color: "#f87171",
    fontSize: 12.5,
    margin: "10px 0 0",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 20,
  },
  modalCancelBtn: {
    background: "transparent",
    color: "#9a9aa5",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: "9px 16px",
    fontSize: 13.5,
    fontWeight: 500,
    cursor: "pointer",
  },
  modalCreateBtn: {
    background: "linear-gradient(160deg, rgba(124,77,225,0.85) 0%, rgba(91,33,182,0.85) 100%)",
    color: "#ffffff",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    padding: "9px 18px",
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(91,33,182,0.4), inset 0 0.5px 0 rgba(255,255,255,0.2)",
  },
  modalDeleteBtn: {
    background: "linear-gradient(160deg, rgba(220,38,38,0.85) 0%, rgba(153,27,27,0.85) 100%)",
    color: "#ffffff",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    padding: "9px 18px",
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(153,27,27,0.4), inset 0 0.5px 0 rgba(255,255,255,0.2)",
  },
};