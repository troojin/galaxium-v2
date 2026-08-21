"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Topbar() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <div style={styles.topbar}>
      <div style={styles.brandWrap}>
        <img src="/icons/icon.png" alt="Galaxium" style={styles.brandIconImg} />
        <span style={styles.brandInlineText}>
          Galaxium <span className="rainbow-v2" style={styles.rainbowV2}>V2</span>
        </span>
      </div>

      <div style={styles.actions}>
        <button
          type="button"
          className="topbar-btn"
          style={styles.navBtn}
          onClick={() => router.push("/dashboard")}
        >
          Projects
        </button>
        <button type="button" className="topbar-btn" style={styles.navBtn}>
          Settings
        </button>
        <button
          type="button"
          className="topbar-btn"
          style={styles.signOutBtn}
          onClick={handleSignOut}
        >
          Sign Out
        </button>
      </div>

      <style>{`
        .topbar-btn {
          transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
        }
        .topbar-btn:hover {
          border-color: rgba(139,92,246,0.35);
          color: #c4b5fd;
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
  actions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  navBtn: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#e5e5ea",
    borderRadius: 8,
    padding: "7px 14px",
    fontSize: 13.5,
    fontWeight: 500,
    cursor: "pointer",
  },
  signOutBtn: {
    background: "transparent",
    border: "1px solid rgba(248,113,113,0.3)",
    color: "#f87171",
    borderRadius: 8,
    padding: "7px 14px",
    fontSize: 13.5,
    fontWeight: 500,
    cursor: "pointer",
  },
};
