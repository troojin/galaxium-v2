"use client";

import React from "react";
import Image from "next/image";

export default function Home() {
  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; }
        .primary-btn:hover { filter: brightness(1.12); transform: translateY(-1px); }
        .glass-sheen::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 60%;
          background: linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.008) 60%, rgba(255,255,255,0) 100%);
          border-radius: 24px 24px 0 0;
          pointer-events: none;
        }
        .glass-sheen::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 24px;
          box-shadow: inset 0 0.5px 0 rgba(255,255,255,0.25), inset 0 -0.5px 0 rgba(255,255,255,0.03);
          pointer-events: none;
        }
      `}</style>

      <div className="glass-sheen" style={styles.card}>
        <div style={styles.logoWrap}>
          <Image
            src="/icons/icon.png"
            alt="Logo"
            width={64}
            height={64}
            priority
            style={styles.logo}
          />
        </div>

        <h1 style={styles.title}>We&apos;re Almost Finished! 🚀</h1>
        <p style={styles.subtitle}>
          We&apos;re putting the final touches on everything. It won&apos;t be long now. Join our community for live updates and announcements.
        </p>

        <a
          href="https://dsc.gg/glxm"
          target="_blank"
          rel="noopener noreferrer"
          className="primary-btn"
          style={styles.submitBtn}
        >
          Join our Discord
        </a>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background: "#0a0a0a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    padding: 24,
  },
  card: {
    position: "relative",
    zIndex: 1,
    maxWidth: 440,
    width: "100%",
    background: "linear-gradient(160deg, rgba(12,12,14,0.7) 0%, rgba(0,0,0,0.65) 50%, rgba(6,6,8,0.7) 100%)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 24,
    padding: "40px 32px",
    backdropFilter: "blur(40px) saturate(140%)",
    WebkitBackdropFilter: "blur(40px) saturate(140%)",
    boxShadow: "0 24px 60px -12px rgba(0,0,0,0.8), 0 4px 16px rgba(0,0,0,0.5)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  logoWrap: {
    marginBottom: 20,
    display: "flex",
    justifyContent: "center",
  },
  logo: {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.1)",
  },
  title: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: 700,
    margin: "0 0 10px",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    color: "#9a9aa5",
    fontSize: 14,
    lineHeight: 1.6,
    margin: "0 0 28px",
  },
  submitBtn: {
    width: "100%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(160deg, rgba(124,77,225,0.85) 0%, rgba(91,33,182,0.85) 100%)",
    color: "#ffffff",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: "13px 0",
    fontSize: 15,
    fontWeight: 600,
    textDecoration: "none",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    boxShadow: "0 4px 16px rgba(91,33,182,0.4), inset 0 0.5px 0 rgba(255,255,255,0.2)",
    transition: "filter 0.2s, transform 0.2s",
  },
};
