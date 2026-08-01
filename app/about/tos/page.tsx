"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function TermsPage() {
  const router = useRouter();

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; }
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
        .back-btn:hover { filter: brightness(1.15); }
      `}</style>

      <div className="glass-sheen" style={styles.card}>
        <div style={styles.headerRow}>
          <button onClick={() => router.push("/about")} style={styles.backBtn} className="back-btn">
            ← Back to About
          </button>
          <span style={styles.badge}>Legal</span>
        </div>

        <h1 style={styles.title}>Terms of Service</h1>
        <p style={styles.subtitle}>Last updated: August 1, 2026</p>

        <div style={styles.contentScroll}>
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>1. Acceptance of Terms</h2>
            <p style={styles.paragraph}>
              By creating an account or accessing our services, you agree to be bound by these Terms of Service. If you do not agree to all terms, please discontinue use immediately.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>2. Account Responsibilities</h2>
            <p style={styles.paragraph}>
              You are responsible for maintaining the confidentiality of your credentials and for all actions performed under your account. Notify us immediately of any unauthorized access.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>3. Acceptable Use</h2>
            <p style={styles.paragraph}>
              You agree not to exploit, disrupt, or attempt unauthorized access to our platform infrastructure, database systems, or underlying APIs.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>4. Account Termination</h2>
            <p style={styles.paragraph}>
              We reserve the right to suspend or terminate accounts that violate our terms or engage in behavior harmful to other users or our platform ecosystem.
            </p>
          </section>
        </div>

        <p style={styles.footerText}>
          Have questions? <a href="/about" style={styles.link}>Learn more about us</a>
        </p>
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
    maxWidth: 520,
    width: "100%",
    background: "linear-gradient(160deg, rgba(12,12,14,0.7) 0%, rgba(0,0,0,0.65) 50%, rgba(6,6,8,0.7) 100%)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 24,
    padding: "36px 32px",
    backdropFilter: "blur(40px) saturate(140%)",
    WebkitBackdropFilter: "blur(40px) saturate(140%)",
    boxShadow: "0 24px 60px -12px rgba(0,0,0,0.8), 0 4px 16px rgba(0,0,0,0.5)",
    overflow: "hidden",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backBtn: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#a78bfa",
    padding: "6px 14px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "filter 0.2s",
  },
  badge: {
    color: "#6b6b74",
    fontSize: 12,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  title: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: 700,
    margin: "0 0 6px",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    color: "#9a9aa5",
    fontSize: 13,
    margin: "0 0 24px",
  },
  contentScroll: {
    maxHeight: 320,
    overflowY: "auto",
    paddingRight: 8,
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  sectionTitle: {
    color: "#d4d4dc",
    fontSize: 14,
    fontWeight: 600,
    margin: 0,
  },
  paragraph: {
    color: "#9a9aa5",
    fontSize: 13,
    lineHeight: 1.6,
    margin: 0,
  },
  link: {
    color: "#a78bfa",
    fontSize: 13,
    textDecoration: "none",
    fontWeight: 500,
  },
  footerText: {
    textAlign: "center",
    color: "#9a9aa5",
    fontSize: 13,
    marginTop: 24,
    marginBottom: 0,
  },
};
