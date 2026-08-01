"use client";

import React from "react";

export default function TermsPage() {
  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; }
      `}</style>

      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>Terms of Service</h1>
          <p style={styles.subtitle}>Last updated: August 1, 2026</p>
        </header>

        <main style={styles.content}>
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
        </main>

        <footer style={styles.footer}>
          <p style={styles.footerText}>
            Have questions? <a href="/about" style={styles.link}>Learn more about us</a>
          </p>
        </footer>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background: "#0a0a0a",
    color: "#ffffff",
    display: "flex",
    justifyContent: "center",
    padding: "60px 24px",
  },
  container: {
    maxWidth: 800,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 40,
  },
  header: {
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    paddingBottom: 24,
  },
  title: {
    color: "#ffffff",
    fontSize: 36,
    fontWeight: 800,
    margin: "0 0 8px",
    letterSpacing: "-0.025em",
  },
  subtitle: {
    color: "#9a9aa5",
    fontSize: 14,
    margin: 0,
  },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: 28,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  sectionTitle: {
    color: "#d4d4dc",
    fontSize: 18,
    fontWeight: 600,
    margin: 0,
    letterSpacing: "-0.01em",
  },
  paragraph: {
    color: "#9a9aa5",
    fontSize: 15,
    lineHeight: 1.7,
    margin: 0,
  },
  footer: {
    borderTop: "1px solid rgba(255,255,255,0.08)",
    paddingTop: 24,
  },
  footerText: {
    color: "#9a9aa5",
    fontSize: 14,
    margin: 0,
  },
  link: {
    color: "#a78bfa",
    textDecoration: "none",
    fontWeight: 500,
  },
};
