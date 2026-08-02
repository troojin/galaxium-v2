"use client";

import React from "react";
import guidelines from "../../data/guidelines.json";

interface Section {
  title: string;
  paragraphs: string[];
  list?: string[];
}

interface Guidelines {
  lastUpdated: string;
  sections: Section[];
  footer: {
    text: string;
    linkText: string;
    linkUrl: string;
  };
}

const data = guidelines as Guidelines;

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
          <p style={styles.subtitle}>Last updated: {data.lastUpdated}</p>
        </header>

        <main style={styles.content}>
          {data.sections.map((section, i) => (
            <section key={i} style={styles.section}>
              <h2 style={styles.sectionTitle}>{section.title}</h2>
              {section.paragraphs.map((p, j) => (
                <p key={j} style={styles.paragraph}>
                  {p}
                </p>
              ))}
              {section.list && (
                <ul style={styles.list}>
                  {section.list.map((item, k) => (
                    <li key={k} style={styles.listItem}>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </main>

        <footer style={styles.footer}>
          <p style={styles.footerText}>
            {data.footer.text}{" "}
            <a
              href={data.footer.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.link}
            >
              {data.footer.linkText}
            </a>
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
  list: {
    margin: "4px 0 0",
    paddingLeft: 20,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  listItem: {
    color: "#9a9aa5",
    fontSize: 15,
    lineHeight: 1.7,
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