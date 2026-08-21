"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function FolderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export default function Topbar() {
  const router = useRouter();
  const supabase = createClient();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  async function handleSignOut() {
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <div style={styles.topbar}>
      <div style={styles.brandWrap} onClick={() => router.push("/dashboard")}>
        <img src="/icons/icon.png" alt="Galaxium" style={styles.brandIconImg} />
        <span style={styles.brandInlineText}>
          Galaxium <span className="rainbow-v2" style={styles.rainbowV2}>V2</span>
        </span>
      </div>

      <div style={styles.menuWrap} ref={menuRef}>
        <button
          type="button"
          className="topbar-avatar-btn"
          style={styles.avatarBtn}
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Open menu"
        >
          <img src="/icons/icon.png" alt="" style={styles.avatarImg} />
        </button>

        {menuOpen && (
          <div className="topbar-dropdown" style={styles.dropdown}>
            <button
              type="button"
              className="topbar-menu-item"
              style={styles.menuItem}
              onClick={() => {
                setMenuOpen(false);
                router.push("/dashboard");
              }}
            >
              <FolderIcon />
              Projects
            </button>
            <button type="button" className="topbar-menu-item" style={styles.menuItem}>
              <GearIcon />
              Settings
            </button>
            <div style={styles.divider} />
            <button
              type="button"
              className="topbar-menu-item topbar-menu-item-danger"
              style={styles.menuItem}
              onClick={handleSignOut}
            >
              <SignOutIcon />
              Sign Out
            </button>
          </div>
        )}
      </div>

      <style>{`
        .topbar-avatar-btn {
          transition: box-shadow 0.15s ease, border-color 0.15s ease;
        }
        .topbar-avatar-btn:hover {
          border-color: rgba(139,92,246,0.5);
          box-shadow: 0 0 0 3px rgba(139,92,246,0.15);
        }
        .topbar-dropdown {
          animation: topbarDropdownIn 0.12s ease;
        }
        @keyframes topbarDropdownIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .topbar-menu-item {
          transition: background 0.12s ease, color 0.12s ease;
        }
        .topbar-menu-item:hover {
          background: rgba(255,255,255,0.06);
          color: #c4b5fd;
        }
        .topbar-menu-item-danger:hover {
          background: rgba(248,113,113,0.08);
          color: #f87171;
        }
      `}</style>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  topbar: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 24px",
    background: "rgba(10,10,10,0.75)",
    backdropFilter: "blur(16px) saturate(140%)",
    WebkitBackdropFilter: "blur(16px) saturate(140%)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  brandWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
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
  menuWrap: {
    position: "relative",
  },
  avatarBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
    padding: 0,
    borderRadius: "50%",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    cursor: "pointer",
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    minWidth: 200,
    background: "linear-gradient(160deg, rgba(20,20,22,0.98) 0%, rgba(8,8,10,0.98) 100%)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 6,
    zIndex: 200,
    display: "flex",
    flexDirection: "column",
    gap: 2,
    boxShadow: "0 12px 32px -8px rgba(0,0,0,0.7)",
  },
  menuItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "transparent",
    border: "none",
    color: "#e5e5ea",
    borderRadius: 8,
    padding: "9px 10px",
    fontSize: 13.5,
    fontWeight: 500,
    textAlign: "left",
    cursor: "pointer",
  },
  divider: {
    height: 1,
    background: "rgba(255,255,255,0.08)",
    margin: "4px 2px",
  },
};
