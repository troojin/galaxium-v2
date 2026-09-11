"use client";

import React from "react";

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export default function LoadingScreen({
  message = "Loading…",
  fullScreen = true,
}: LoadingScreenProps) {
  return (
    <div style={fullScreen ? styles.page : styles.pageInline}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; }

        .loader-ring {
          animation: spin 0.9s linear infinite;
        }
        .loader-glow {
          animation: pulseGlow 2.2s ease-in-out infinite;
        }
        .loader-dot {
          animation: dotPulse 1.4s ease-in-out infinite;
        }
        .loader-dot:nth-child(2) { animation-delay: 0.2s; }
        .loader-dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.06); }
        }
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-3px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      <div style={{ ...styles.content, animation: "fadeIn 0.25s ease" }}>
        <div style={styles.spinnerWrap}>
          <div className="loader-glow" style={styles.spinnerGlow} />
          <div className="loader-ring" style={styles.spinnerRing} />
        </div>

        <div style={styles.messageRow}>
          <span style={styles.messageText}>{message}</span>
          <span style={styles.dots}>
            <span className="loader-dot" style={styles.dot} />
            <span className="loader-dot" style={styles.dot} />
            <span className="loader-dot" style={styles.dot} />
          </span>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    position: "fixed",
    inset: 0,
    width: "100%",
    height: "100%",
    background: "rgba(10,10,10,0.55)",
    backdropFilter: "blur(14px) saturate(140%)",
    WebkitBackdropFilter: "blur(14px) saturate(140%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 24,
  },
  pageInline: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    background: "rgba(10,10,10,0.55)",
    backdropFilter: "blur(14px) saturate(140%)",
    WebkitBackdropFilter: "blur(14px) saturate(140%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    padding: 24,
  },
  content: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  spinnerWrap: {
    position: "relative",
    width: 56,
    height: 56,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  spinnerGlow: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(139,92,246,0.45) 0%, rgba(139,92,246,0) 70%)",
    filter: "blur(4px)",
  },
  spinnerRing: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    border: "3px solid rgba(255,255,255,0.08)",
    borderTopColor: "#a78bfa",
    borderRightColor: "#8b5cf6",
  },
  messageRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  messageText: {
    color: "#d4d4dc",
    fontSize: 14,
    fontWeight: 500,
  },
  dots: {
    display: "flex",
    gap: 3,
    marginLeft: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: "50%",
    background: "#a78bfa",
    display: "inline-block",
  },
};