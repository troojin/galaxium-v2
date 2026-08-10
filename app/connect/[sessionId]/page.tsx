"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";

export const runtime = 'edge';

export default function ConnectPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const supabase = createClient();
  const toast = useToast();

  const [phase, setPhase] = useState<"checking" | "loggedOut" | "confirming" | "done" | "error">(
    "checking"
  );
  const [errorMessage, setErrorMessage] = useState("");

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

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; }
        .primary-btn:hover { filter: brightness(1.12); }
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
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          width: 28px; height: 28px;
          border: 3px solid rgba(255,255,255,0.15);
          border-top-color: #a78bfa;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 16px;
        }
      `}</style>

      <div className="glass-sheen" style={styles.card}>
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
            <h1 style={styles.title}>Connect Studio Plugin</h1>
            <p style={styles.subtitle}>
              Log into your Galaxium account to finish connecting the plugin.
            </p>
            <button className="primary-btn" style={styles.submitBtn} onClick={goToLogin}>
              Log in
            </button>
            <p style={styles.footerText}>
              Don&apos;t have an account? <a style={styles.link} onClick={goToSignup}>Sign up</a>
            </p>
          </>
        )}

        {phase === "done" && (
          <>
            <h1 style={styles.title}>Plugin connected ✓</h1>
            <p style={styles.subtitle}>
              You can close this tab and go back to Roblox Studio.
            </p>
          </>
        )}

        {phase === "error" && (
          <>
            <h1 style={styles.title}>Couldn&apos;t connect</h1>
            <p style={{ ...styles.subtitle, color: "#f87171" }}>{errorMessage}</p>
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
    position: "relative",
    overflow: "hidden",
    padding: 24,
  },
  card: {
    position: "relative",
    zIndex: 1,
    maxWidth: 400,
    width: "100%",
    background:
      "linear-gradient(160deg, rgba(12,12,14,0.7) 0%, rgba(0,0,0,0.65) 50%, rgba(6,6,8,0.7) 100%)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 24,
    padding: "40px 32px",
    backdropFilter: "blur(40px) saturate(140%)",
    WebkitBackdropFilter: "blur(40px) saturate(140%)",
    boxShadow: "0 24px 60px -12px rgba(0,0,0,0.8), 0 4px 16px rgba(0,0,0,0.5)",
    overflow: "hidden",
    textAlign: "center",
  },
  title: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: 700,
    margin: "0 0 6px",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    color: "#9a9aa5",
    fontSize: 14,
    margin: "0 0 24px",
    lineHeight: 1.5,
  },
  submitBtn: {
    width: "100%",
    background:
      "linear-gradient(160deg, rgba(124,77,225,0.85) 0%, rgba(91,33,182,0.85) 100%)",
    color: "#ffffff",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: "13px 0",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow:
      "0 4px 16px rgba(91,33,182,0.4), inset 0 0.5px 0 rgba(255,255,255,0.2)",
    transition: "filter 0.2s",
  },
  footerText: {
    textAlign: "center",
    color: "#9a9aa5",
    fontSize: 13,
    marginTop: 18,
    marginBottom: 0,
  },
  link: {
    color: "#a78bfa",
    fontSize: 13,
    textDecoration: "none",
    fontWeight: 500,
    cursor: "pointer",
  },
};