"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";

export const runtime = 'edge';

interface RecentProject {
  id: string;
  name: string;
}

export default function ConnectPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const supabase = createClient();
  const toast = useToast();

  const [phase, setPhase] = useState<"checking" | "loggedOut" | "confirming" | "done" | "error">(
    "checking"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [recentProject, setRecentProject] = useState<RecentProject | null>(null);

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        setPhase("loggedOut");
        return;
      }

      setPhase("confirming");

      try {
        const res = await fetch("/api/plugin/auth/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const result = await res.json();

        if (!res.ok) {
          setErrorMessage(result.error ?? "Something went wrong");
          setPhase("error");
          return;
        }

          const { data: projectData } = await supabase
          .from("projects")
          .select("id, name")
          .eq("user_id", data.session.user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (projectData) {
          setRecentProject(projectData);
        }

        setPhase("done");
      } catch {
        setErrorMessage("Network error — try again");
        setPhase("error");
      }
    };

    run();
  }, [sessionId]);

  const goToLogin = () => {
    router.push(`/login?next=/connect/${sessionId}`);
  };

  const goToSignup = () => {
    router.push(`/signup?next=/connect/${sessionId}`);
  };

  const goToDashboard = () => {
    if (recentProject) {
      router.push(`/project/${recentProject.id}`);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
        * { box-sizing: border-box; font-family: 'Roboto', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .primary-btn:hover { background: #6d28d9; }
        .link:hover { text-decoration: underline; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          width: 20px; height: 20px;
          border: 2px solid #e5ddfa;
          border-top-color: #7c3aed;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          margin: 0 auto 20px;
        }
      `}</style>

      <div style={styles.card}>
        {phase === "checking" && (
          <>
            <div className="spinner" />
            <p style={styles.subtitle}>Checking your session...</p>
          </>
        )}

        {phase === "confirming" && (
          <>
            <div className="spinner" />
            <p style={styles.subtitle}>Connecting your Studio plugin...</p>
          </>
        )}

        {phase === "loggedOut" && (
          <>
            <h1 style={styles.title}>Connect Studio plugin</h1>
            <p style={styles.subtitle}>
              Log in to your Galaxium account to finish connecting the plugin.
            </p>
            <button className="primary-btn" style={styles.submitBtn} onClick={goToLogin}>
              Log in
            </button>
            <p style={styles.footerText}>
              Don&apos;t have an account?{" "}
              <a className="link" style={styles.link} onClick={goToSignup}>
                Sign up
              </a>
            </p>
          </>
        )}

        {phase === "done" && (
          <>
            <h1 style={styles.title}>Plugin connected</h1>
            <p style={styles.subtitle}>
              You can close this tab and go back to Roblox Studio.
            </p>
            <button className="primary-btn" style={styles.submitBtn} onClick={goToDashboard}>
              {recentProject ? `Return to ${recentProject.name}` : "Go to dashboard"}
            </button>
          </>
        )}

        {phase === "error" && (
          <>
            <h1 style={styles.title}>Couldn&apos;t connect</h1>
            <p style={{ ...styles.subtitle, color: "#e11d48" }}>{errorMessage}</p>
          </>
        )}
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
    padding: 24,
  },
  card: {
    maxWidth: 360,
    width: "100%",
    textAlign: "center",
  },
  title: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: 600,
    margin: "0 0 8px",
  },
  subtitle: {
    color: "#a1a1a1",
    fontSize: 14,
    margin: "0 0 24px",
    lineHeight: 1.5,
  },
  submitBtn: {
    width: "100%",
    background: "#7c3aed",
    color: "#ffffff",
    border: "none",
    borderRadius: 6,
    padding: "12px 0",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    transition: "background 0.15s",
  },
  footerText: {
    textAlign: "center",
    color: "#a1a1a1",
    fontSize: 13,
    marginTop: 16,
    marginBottom: 0,
  },
  link: {
    color: "#7c3aed",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
};