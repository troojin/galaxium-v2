"use client";

import React, { useRef } from "react";

interface TopbarProps {
  /** Optional content centered in the bar (e.g. current project name) */
  center?: React.ReactNode;
  /** Optional content on the right (e.g. a back link or action button) */
  right?: React.ReactNode;
}

export default function Topbar({ center, right }: TopbarProps) {
  const brandRef = useRef<HTMLDivElement>(null);

  return (
    <div
      style={{
        ...styles.topbar,
        justifyContent: center || right ? "space-between" : "flex-start",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; }
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
      `}</style>

      <div ref={brandRef} style={styles.brandWrap}>
        <img src="/icons/icon.png" alt="Galaxium" style={styles.brandIconImg} />
        <span style={styles.brandInlineText}>
          Galaxium <span className="rainbow-v2" style={styles.rainbowV2}>V2</span>
        </span>
      </div>

      {center && <div style={styles.centerWrap}>{center}</div>}
      {right && <div style={styles.rightWrap}>{right}</div>}
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
    padding: "14px 24px",
    background: "rgba(10,10,10,0.75)",
    backdropFilter: "blur(16px) saturate(140%)",
    WebkitBackdropFilter: "blur(16px) saturate(140%)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    gap: 16,
  },
  brandWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 10,
    flex: "0 0 auto",
    minWidth: 0,
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
  centerWrap: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    minWidth: 0,
  },
  rightWrap: {
    flex: "0 0 auto",
    display: "flex",
    alignItems: "center",
  },
};