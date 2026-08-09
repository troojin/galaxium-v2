"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const toast = useToast();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace("/dashboard");
        return;
      }
      setCheckingSession(false);
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanUsername = username.trim();
    const cleanEmail = email.trim();

    if (!cleanUsername) {
      toast.error("Please enter a username.");
      return;
    }

    if (!cleanEmail) {
      toast.error("Please enter an email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (!password) {
      toast.error("Please enter a password.");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (!confirmPassword) {
      toast.error("Please confirm your password.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords don't match.");
      return;
    }

    if (!agreed) {
      toast.error("You must agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { username: cleanUsername },
      },
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data.user && data.user.identities && data.user.identities.length === 0) {
      toast.error("An account with this email already exists. Try signing in instead.");
      return;
    }

    toast.success("Account created");
    router.replace("/dashboard");
  };

  if (checkingSession) {
    return <div style={styles.page} />;
  }

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; }
        input::placeholder { color: #6b6b74; }
        input:focus { outline: none; border-color: #8b5cf6 !important; box-shadow: 0 0 0 3px rgba(139,92,246,0.25); }
        .primary-btn:hover { filter: brightness(1.12); }
        .primary-btn:disabled { cursor: default; filter: none; opacity: 0.7; }
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
        .checkbox-wrap input[type="checkbox"] {
          appearance: none;
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 5px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(0,0,0,0.35);
          cursor: pointer;
          position: relative;
          flex-shrink: 0;
          transition: background 0.15s, border-color 0.15s;
        }
        .checkbox-wrap input[type="checkbox"]:checked {
          background: linear-gradient(160deg, rgba(124,77,225,0.9) 0%, rgba(91,33,182,0.9) 100%);
          border-color: rgba(139,92,246,0.6);
        }
        .checkbox-wrap input[type="checkbox"]:checked::after {
          content: '';
          position: absolute;
          left: 5px;
          top: 1px;
          width: 5px;
          height: 9px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }
      `}</style>

      <div className="glass-sheen" style={styles.card}>
        <h1 style={styles.title}>Create your account</h1>
        <p style={styles.subtitle}>Get started in just a minute</p>

        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              placeholder="troojin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              disabled={loading}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              disabled={loading}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.passwordWrap}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...styles.input, paddingRight: 44 }}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                style={styles.eyeBtn}
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={loading}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Confirm password</label>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={styles.input}
              disabled={loading}
            />
          </div>

          <label className="checkbox-wrap" style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              disabled={loading}
            />
            <span style={styles.checkboxLabel}>
              I agree to the <a href="#" style={styles.link}>Terms of Service</a> and{" "}
              <a href="#" style={styles.link}>Privacy Policy</a>
            </span>
          </label>

          <button
            type="submit"
            className="primary-btn"
            style={styles.submitBtn}
            disabled={loading}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p style={{ ...styles.footerText, marginTop: 24 }}>
          Already have an account? <a href="/login" style={styles.link}>Sign in</a>
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
    maxWidth: 400,
    width: "100%",
    background: "linear-gradient(160deg, rgba(12,12,14,0.7) 0%, rgba(0,0,0,0.65) 50%, rgba(6,6,8,0.7) 100%)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 24,
    padding: "40px 32px",
    backdropFilter: "blur(40px) saturate(140%)",
    WebkitBackdropFilter: "blur(40px) saturate(140%)",
    boxShadow: "0 24px 60px -12px rgba(0,0,0,0.8), 0 4px 16px rgba(0,0,0,0.5)",
    overflow: "hidden",
  },
  title: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: 700,
    textAlign: "center",
    margin: "0 0 6px",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    color: "#9a9aa5",
    fontSize: 14,
    textAlign: "center",
    margin: "0 0 28px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    color: "#d4d4dc",
    fontSize: 13,
    fontWeight: 500,
  },
  input: {
    background: "rgba(0,0,0,0.35)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: "12px 14px",
    color: "#ffffff",
    fontSize: 14,
    width: "100%",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  passwordWrap: {
    position: "relative",
  },
  eyeBtn: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: 15,
    opacity: 0.8,
  },
  checkboxRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    marginTop: -4,
    cursor: "pointer",
  },
  checkboxLabel: {
    color: "#9a9aa5",
    fontSize: 13,
    lineHeight: 1.5,
  },
  link: {
    color: "#a78bfa",
    fontSize: 13,
    textDecoration: "none",
    fontWeight: 500,
  },
  submitBtn: {
    marginTop: 6,
    background: "linear-gradient(160deg, rgba(124,77,225,0.85) 0%, rgba(91,33,182,0.85) 100%)",
    color: "#ffffff",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: "13px 0",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    boxShadow: "0 4px 16px rgba(91,33,182,0.4), inset 0 0.5px 0 rgba(255,255,255,0.2)",
    transition: "filter 0.2s",
  },
  footerText: {
    textAlign: "center",
    color: "#9a9aa5",
    fontSize: 13,
    marginTop: 22,
    marginBottom: 0,
  },
};