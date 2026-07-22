"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";

// Project detail page — app/project/[id]/page.tsx
// Matches dashboard styling: black/white/purple, Inter font, glass cards.

interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const toast = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProject() {
      setLoading(true);
      setNotFound(false);

      const { data, error } = await supabase
        .from("projects")
        .select("id, name, created_at, updated_at")
        .eq("id", params.id)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        toast.error("Couldn't load this project.");
      } else if (!data) {
        setNotFound(true);
      } else {
        setProject(data as Project);
      }
      setLoading(false);
    }

    loadProject();

    return () => {
      isMounted = false;
    };
  }, [supabase, params.id]);

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; }
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
        .back-link:hover { color: #c4b5fd !important; }
      `}</style>

      <div style={styles.container}>
        <button
          className="back-link"
          style={styles.backLink}
          onClick={() => router.push("/dashboard")}
        >
          ← Back to projects
        </button>

        {loading ? (
          <div className="glass-sheen" style={styles.card}>
            <p style={styles.loadingText}>Loading project…</p>
          </div>
        ) : notFound ? (
          <div className="glass-sheen" style={styles.card}>
            <h1 style={styles.title}>Project not found</h1>
            <p style={styles.subtitle}>
              This project doesn't exist, or you don't have access to it.
            </p>
          </div>
        ) : project ? (
          <div className="glass-sheen" style={styles.card}>
            <h1 style={styles.title}>{project.name}</h1>
            <div style={styles.metaRow}>
              <span style={styles.metaItem}>
                Created {new Date(project.created_at).toLocaleDateString()}
              </span>
              <span style={styles.metaDot}>•</span>
              <span style={styles.metaItem}>
                Updated {new Date(project.updated_at).toLocaleDateString()}
              </span>
            </div>

            <div style={styles.placeholderBlock}>
              <p style={styles.placeholderText}>
                This is where your project's content will go.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background: "#0a0a0a",
    padding: "48px 24px",
  },
  container: {
    maxWidth: 800,
    margin: "0 auto",
  },
  backLink: {
    background: "none",
    border: "none",
    color: "#9a9aa5",
    fontSize: 13.5,
    fontWeight: 500,
    cursor: "pointer",
    padding: 0,
    marginBottom: 24,
    transition: "color 0.15s ease",
  },
  card: {
    position: "relative",
    background: "linear-gradient(160deg, rgba(12,12,14,0.7) 0%, rgba(0,0,0,0.65) 50%, rgba(6,6,8,0.7) 100%)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 16,
    backdropFilter: "blur(24px) saturate(140%)",
    WebkitBackdropFilter: "blur(24px) saturate(140%)",
    boxShadow: "0 12px 32px -12px rgba(0,0,0,0.7)",
    padding: "32px 32px 36px",
  },
  loadingText: {
    color: "#9a9aa5",
    fontSize: 14,
    margin: 0,
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
    margin: 0,
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 28,
  },
  metaItem: {
    color: "#6b6b74",
    fontSize: 13,
  },
  metaDot: {
    color: "#3a3a42",
    fontSize: 13,
  },
  placeholderBlock: {
    border: "1px dashed rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: "40px 20px",
    textAlign: "center",
  },
  placeholderText: {
    color: "#6b6b74",
    fontSize: 13.5,
    margin: 0,
  },
};