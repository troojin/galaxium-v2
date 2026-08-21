"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";
import LoadingScreen from "@/components/loading";

interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

type SortOption = "updated" | "name_asc" | "name_desc" | "created_desc" | "created_asc";

const SORT_LABELS: Record<SortOption, string> = {
  updated: "Last updated",
  name_asc: "Name (A–Z)",
  name_desc: "Name (Z–A)",
  created_desc: "Newest created",
  created_asc: "Oldest created",
};

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

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="1" y="1" width="6" height="6" rx="1.2" />
      <rect x="9" y="1" width="6" height="6" rx="1.2" />
      <rect x="1" y="9" width="6" height="6" rx="1.2" />
      <rect x="9" y="9" width="6" height="6" rx="1.2" />
    </svg>
  );
}

function ListViewIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="2" cy="4" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="2" cy="8" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="2" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <line x1="5.5" y1="4" x2="15" y2="4" />
      <line x1="5.5" y1="8" x2="15" y2="8" />
      <line x1="5.5" y1="12" x2="15" y2="12" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="8" cy="3" r="1.4" />
      <circle cx="8" cy="8" r="1.4" />
      <circle cx="8" cy="13" r="1.4" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function SelectCircle({ checked }: { checked: boolean }) {
  return (
    <span
      style={{
        ...styles.selectCircle,
        ...(checked ? styles.selectCircleChecked : {}),
      }}
    >
      {checked ? (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : null}
    </span>
  );
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

  const [sortOption, setSortOption] = useState<SortOption>("updated");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Selection mode — replaces the old per-card 3-dot menu with a single
  // global toggle. While active, clicking a card/row selects it instead
  // of navigating, and a bar exposes bulk rename/delete.
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Rename modal state (rename only ever targets a single project)
  const [renameTarget, setRenameTarget] = useState<Project | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  // Delete confirm modal state (supports one or many projects)
  const [deleteTargets, setDeleteTargets] = useState<Project[] | null>(null);
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
        .select("id, name, created_at, updated_at")
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

  // Close the sort menu on outside click / Escape
  useEffect(() => {
    if (!sortMenuOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setSortMenuOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setSortMenuOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [sortMenuOpen]);

  function sortProjects(list: Project[]): Project[] {
    const arr = [...list];
    switch (sortOption) {
      case "name_asc":
        arr.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name_desc":
        arr.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "created_desc":
        arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "created_asc":
        arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      default:
        arr.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }
    return arr;
  }

  const filtered = sortProjects(
    projects.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
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

    const nameTaken = projects.some(
      (p) => p.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (nameTaken) {
      setModalError("You already have a project with that name.");
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
      .select("id, name, created_at, updated_at")
      .single();

    setCreating(false);

    if (error) {
      if (error.code === "23505") {
        setModalError("You already have a project with that name.");
      } else {
        setModalError(error.message);
        toast.error("Couldn't create the project.");
      }
      return;
    }

    setProjects((prev) => [data as Project, ...prev]);
    setShowModal(false);
    toast.success(`"${trimmed}" created`);
  }

  function toggleSelectionMode() {
    setSelectionMode((prev) => {
      const next = !prev;
      if (!next) setSelectedIds(new Set());
      return next;
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleProjectClick(project: Project) {
    if (selectionMode) {
      toggleSelect(project.id);
    } else {
      router.push(`/project/${project.id}`);
    }
  }

  function openRenameForSelection() {
    if (selectedIds.size !== 1) return;
    const id = Array.from(selectedIds)[0];
    const project = projects.find((p) => p.id === id);
    if (!project) return;
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

    const nameTaken = projects.some(
      (p) => p.id !== renameTarget.id && p.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (nameTaken) {
      setRenameError("You already have a project with that name.");
      return;
    }

    setRenaming(true);
    setRenameError(null);

    const { data, error } = await supabase
      .from("projects")
      .update({ name: trimmed })
      .eq("id", renameTarget.id)
      .select("id, name, created_at, updated_at")
      .single();

    setRenaming(false);

    if (error) {
      if (error.code === "23505") {
        setRenameError("You already have a project with that name.");
      } else {
        setRenameError(error.message);
        toast.error("Couldn't rename the project.");
      }
      return;
    }

    setProjects((prev) =>
      prev.map((p) => (p.id === renameTarget.id ? (data as Project) : p))
    );
    setRenameTarget(null);
    setSelectedIds(new Set());
    setSelectionMode(false);
    toast.success(`Renamed to "${trimmed}"`);
  }

  function openDeleteForSelection() {
    const targets = projects.filter((p) => selectedIds.has(p.id));
    if (targets.length === 0) return;
    setDeleteTargets(targets);
    setDeleteError(null);
  }

  function closeDeleteModal() {
    if (deleting) return;
    setDeleteTargets(null);
  }

  async function handleDelete() {
    if (!deleteTargets || deleteTargets.length === 0) return;

    setDeleting(true);
    setDeleteError(null);

    const ids = deleteTargets.map((p) => p.id);
    const { error } = await supabase.from("projects").delete().in("id", ids);

    setDeleting(false);

    if (error) {
      setDeleteError(error.message);
      toast.error(`Couldn't delete the project${ids.length > 1 ? "s" : ""}.`);
      return;
    }

    const label =
      deleteTargets.length === 1 ? `"${deleteTargets[0].name}"` : `${deleteTargets.length} projects`;

    setProjects((prev) => prev.filter((p) => !ids.includes(p.id)));
    setDeleteTargets(null);
    setSelectedIds(new Set());
    setSelectionMode(false);
    toast.success(`${label} deleted`);
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
          transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
          cursor: pointer;
        }
        .project-card:hover {
          transform: translateY(-2px);
          border-color: rgba(139,92,246,0.35) !important;
        }
        .view-toggle-btn {
          transition: background 0.15s ease, color 0.15s ease;
        }
        .select-toggle-btn {
          transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }
        .select-toggle-btn:hover {
          border-color: rgba(139,92,246,0.35) !important;
          color: #c4b5fd !important;
        }
        .sort-btn:hover {
          border-color: rgba(139,92,246,0.35) !important;
        }
        .selection-action-btn:hover:not(:disabled) {
          border-color: rgba(139,92,246,0.4) !important;
          color: #c4b5fd !important;
        }
        .selection-delete-btn:hover:not(:disabled) {
          border-color: rgba(248,113,113,0.5) !important;
          background: rgba(248,113,113,0.08) !important;
        }
        .selection-action-btn:disabled, .selection-delete-btn:disabled {
          opacity: 0.4;
          cursor: default;
        }
        .card-menu-item {
          transition: background 0.12s ease;
        }
        .card-menu-item:hover {
          background: rgba(255,255,255,0.06);
        }
        .card-menu-item.active {
          color: #c4b5fd;
          background: rgba(139,92,246,0.1);
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

          <div style={styles.sortWrap} ref={sortMenuRef}>
            <button
              type="button"
              className="sort-btn"
              style={styles.sortBtn}
              onClick={() => setSortMenuOpen((prev) => !prev)}
            >
              <span>Sort: {SORT_LABELS[sortOption]}</span>
              <ChevronDownIcon />
            </button>
            {sortMenuOpen && (
              <div className="card-dropdown" style={styles.sortDropdown}>
                {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`card-menu-item${sortOption === opt ? " active" : ""}`}
                    style={styles.sortMenuItem}
                    onClick={() => {
                      setSortOption(opt);
                      setSortMenuOpen(false);
                    }}
                  >
                    {SORT_LABELS[opt]}
                  </button>
                ))}
              </div>
            )}
          </div>

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
              <GridIcon />
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
              <ListViewIcon />
            </button>
          </div>

          <button
            type="button"
            className="select-toggle-btn"
            style={{
              ...styles.selectToggleBtn,
              ...(selectionMode ? styles.selectToggleBtnActive : {}),
            }}
            onClick={toggleSelectionMode}
            aria-label={selectionMode ? "Exit selection" : "Select projects"}
            title={selectionMode ? "Exit selection" : "Select projects"}
          >
            {selectionMode ? <CloseIcon /> : <MoreIcon />}
          </button>
        </div>

        {selectionMode && (
          <div style={styles.selectionBar}>
            <span style={styles.selectionCount}>
              {selectedIds.size} selected
            </span>
            <div style={styles.selectionActions}>
              <button
                type="button"
                className="selection-action-btn"
                style={styles.selectionActionBtn}
                onClick={openRenameForSelection}
                disabled={selectedIds.size !== 1}
              >
                Rename
              </button>
              <button
                type="button"
                className="selection-delete-btn"
                style={styles.selectionDeleteBtn}
                onClick={openDeleteForSelection}
                disabled={selectedIds.size === 0}
              >
                Delete
              </button>
              <button
                type="button"
                style={styles.selectionCancelBtn}
                onClick={toggleSelectionMode}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

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
          ) : !error && projects.length === 0 ? (
            <p style={styles.emptyTextPlain}>No projects found</p>
          ) : !error && filtered.length === 0 ? (
            <p style={styles.emptyTextPlain}>No projects match &quot;{query}&quot;</p>
          ) : view === "grid" ? (
            <div style={styles.grid}>
              {filtered.map((project) => {
                const selected = selectedIds.has(project.id);
                return (
                  <div
                    key={project.id}
                    className="glass-sheen project-card"
                    style={{
                      ...styles.card,
                      ...(selected ? styles.cardSelected : {}),
                    }}
                    onClick={() => handleProjectClick(project)}
                  >
                    <div style={styles.cardBody}>
                      <div style={styles.cardTopRow}>
                        {selectionMode ? <SelectCircle checked={selected} /> : null}
                        <h3 style={styles.cardName}>{project.name}</h3>
                      </div>
                      <p style={styles.cardUpdated}>Updated {timeAgo(project.updated_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-sheen" style={styles.listWrap}>
              {filtered.map((project, i) => {
                const selected = selectedIds.has(project.id);
                return (
                  <div
                    key={project.id}
                    className="project-card"
                    style={{
                      ...styles.listRow,
                      ...(selected ? styles.listRowSelected : {}),
                      borderBottom:
                        i === filtered.length - 1 ? "none" : "1px solid rgba(255,255,255,0.06)",
                    }}
                    onClick={() => handleProjectClick(project)}
                  >
                    <div style={styles.listLeft}>
                      {selectionMode ? <SelectCircle checked={selected} /> : null}
                      <p style={styles.listName}>{project.name}</p>
                    </div>
                    <div style={styles.listRight}>
                      <span style={styles.listUpdated}>{timeAgo(project.updated_at)}</span>
                    </div>
                  </div>
                );
              })}
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

      {deleteTargets && (
        <div className="modal-overlay" style={styles.modalOverlay} onClick={closeDeleteModal}>
          <div
            className="glass-sheen modal-card"
            style={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={styles.modalTitle}>
              Delete project{deleteTargets.length > 1 ? "s" : ""}
            </h2>
            <p style={styles.modalSubtitle}>
              {deleteTargets.length === 1
                ? `Are you sure you want to delete "${deleteTargets[0].name}"? This can't be undone.`
                : `Are you sure you want to delete these ${deleteTargets.length} projects? This can't be undone.`}
            </p>
            {deleteTargets.length > 1 && (
              <ul style={styles.deleteList}>
                {deleteTargets.map((p) => (
                  <li key={p.id} style={styles.deleteListItem}>
                    {p.name}
                  </li>
                ))}
              </ul>
            )}
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
                {deleting ? "Deleting…" : `Delete project${deleteTargets.length > 1 ? "s" : ""}`}
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
    gap: 10,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  searchInput: {
    background: "rgba(0,0,0,0.35)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: "10px 14px",
    color: "#ffffff",
    fontSize: 14,
    flex: 1,
    minWidth: 160,
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  sortWrap: {
    position: "relative",
  },
  sortBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    height: "100%",
    background: "rgba(0,0,0,0.35)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: "10px 14px",
    color: "#e5e5ea",
    fontSize: 13.5,
    fontWeight: 500,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "border-color 0.15s ease",
  },
  sortDropdown: {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: 0,
    minWidth: 190,
    background: "linear-gradient(160deg, rgba(20,20,22,0.98) 0%, rgba(8,8,10,0.98) 100%)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: 5,
    zIndex: 50,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  sortMenuItem: {
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
  viewToggle: {
    display: "flex",
    background: "rgba(0,0,0,0.35)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  viewToggleBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    color: "#9a9aa5",
    borderRadius: 7,
    padding: "8px 12px",
    cursor: "pointer",
  },
  viewToggleBtnActive: {
    background: "rgba(139,92,246,0.18)",
    color: "#c4b5fd",
  },
  selectToggleBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 38,
    background: "rgba(0,0,0,0.35)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    color: "#9a9aa5",
    cursor: "pointer",
  },
  selectToggleBtnActive: {
    background: "rgba(139,92,246,0.18)",
    borderColor: "rgba(139,92,246,0.35)",
    color: "#c4b5fd",
  },
  selectionBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    background: "rgba(139,92,246,0.08)",
    border: "1px solid rgba(139,92,246,0.25)",
    borderRadius: 12,
    padding: "10px 16px",
    marginBottom: 20,
    flexWrap: "wrap",
  },
  selectionCount: {
    color: "#c4b5fd",
    fontSize: 13.5,
    fontWeight: 600,
  },
  selectionActions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  selectionActionBtn: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.14)",
    color: "#e5e5ea",
    borderRadius: 8,
    padding: "7px 14px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "border-color 0.15s ease, color 0.15s ease",
  },
  selectionDeleteBtn: {
    background: "transparent",
    border: "1px solid rgba(248,113,113,0.3)",
    color: "#f87171",
    borderRadius: 8,
    padding: "7px 14px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "border-color 0.15s ease, background 0.15s ease",
  },
  selectionCancelBtn: {
    background: "transparent",
    border: "none",
    color: "#9a9aa5",
    borderRadius: 8,
    padding: "7px 10px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
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
    overflow: "visible",
    display: "flex",
    flexDirection: "column",
  },
  cardSelected: {
    borderColor: "rgba(139,92,246,0.5)",
    background: "linear-gradient(160deg, rgba(139,92,246,0.08) 0%, rgba(0,0,0,0.65) 50%, rgba(6,6,8,0.7) 100%)",
  },
  cardBody: {
    padding: "18px 22px 22px",
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  cardTopRow: {
    display: "flex",
    alignItems: "center",
    gap: 4,
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
  selectCircle: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    border: "1.5px solid rgba(255,255,255,0.25)",
    background: "rgba(0,0,0,0.3)",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginBottom: 8,
  },
  selectCircleChecked: {
    background: "#8b5cf6",
    borderColor: "#8b5cf6",
  },
  listWrap: {
    position: "relative",
    background: "linear-gradient(160deg, rgba(12,12,14,0.7) 0%, rgba(0,0,0,0.65) 50%, rgba(6,6,8,0.7) 100%)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 16,
    backdropFilter: "blur(24px) saturate(140%)",
    WebkitBackdropFilter: "blur(24px) saturate(140%)",
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
  listRowSelected: {
    background: "rgba(139,92,246,0.08)",
  },
  listLeft: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  listName: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 600,
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
  emptyTextPlain: {
    color: "#9a9aa5",
    fontSize: 14,
    margin: 0,
    textAlign: "center",
    padding: "48px 20px",
  },
  deleteList: {
    margin: "0 0 16px",
    padding: "0 0 0 18px",
    maxHeight: 120,
    overflowY: "auto",
  },
  deleteListItem: {
    color: "#c8c8d0",
    fontSize: 13,
    lineHeight: 1.8,
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