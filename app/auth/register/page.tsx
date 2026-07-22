"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Signup page — matches app/login/page.tsx styling: black/white/purple, Inter font.

export default function SignupPage() {
  const supabase = createClient();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError("An account with this email already exists. Try signing in instead.");
      return;
    }

    setSubmitted(true);
  };

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

        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.85); }
          70% { opacity: 1; transform: scale(1.03); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes badgeFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .confirm-wrap {
          animation: fadeSlideUp 0.45s ease-out;
        }
        .confirm-icon {
          animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .protected-badge-anim {
          animation: badgeFadeIn 0.5s ease-out 0.35s both;
        }
      `}</style>

      <div className="glass-sheen" style={styles.card}>
        {submitted ? (
          <div className="confirm-wrap">
            <div className="confirm-icon" style={styles.confirmIconWrap}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="11" fill="rgba(139,92,246,0.15)" stroke="#8b5cf6" strokeWidth="1.5" />
                <path d="M7 12.5L10.2 15.5L17 8.5" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <h1 style={styles.title}>Check your email</h1>
            <p style={{ ...styles.subtitle, marginBottom: 0 }}>
              We sent a confirmation link to <strong style={{ color: "#d4d4dc" }}>{email}</strong>.
              Click it to activate your account.
            </p>

            <div className="protected-badge-anim" style={styles.protectedBadge}>
              <svg width="14" height="14" viewBox="0 0 109 113" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M63.7076 110.284C61.8481 112.648 58.0453 111.412 57.9438 108.435L56.9633 51.8974H109L63.7076 110.284Z" fill="#3ECF8E" />
                <path d="M45.317 2.07103C47.1765 -0.293 50.9793 0.943 51.0808 3.92L52.0613 60.4826H0.0246L45.317 2.07103Z" fill="#3ECF8E" />
              </svg>
              <span style={styles.protectedText}>Protected by Supabase</span>
            </div>
          </div>
        ) : (
          <>
            <h1 style={styles.title}>Create your account</h1>
            <p style={styles.subtitle}>Get started in just a minute</p>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Username</label>
                <input
                  type="text"
                  placeholder="troojin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={styles.input}
                  required
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
                  required
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
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    style={styles.eyeBtn}
                    aria-label={showPassword ? "Hide password" : "Show password"}
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
                  required
                  minLength={8}
                />
              </div>

              <label className="checkbox-wrap" style={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  required
                />
                <span style={styles.checkboxLabel}>
                  I agree to the <a href="#" style={styles.link}>Terms of Service</a> and{" "}
                  <a href="#" style={styles.link}>Privacy Policy</a>
                </span>
              </label>

              {error && <p style={styles.errorText}>{error}</p>}

              <button
                type="submit"
                className="primary-btn"
                style={styles.submitBtn}
                disabled={loading || !agreed}
              >
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>

            <p style={{ ...styles.footerText, marginTop: 24 }}>
              Already have an account? <a href="/login" style={styles.link}>Sign in</a>
            </p>
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
    background: "linear-gradient(160deg, rgba(12,12,14,0.7) 0%, rgba(0,0,0,0.65) 50%, rgba(6,6,8,0.7) 100%)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 24,
    padding: "40px 32px",
    backdropFilter: "blur(40px) saturate(140%)",
    WebkitBackdropFilter: "blur(40px) saturate(140%)",
    boxShadow: "0 24px 60px -12px rgba(0,0,0,0.8), 0 4px 16px rgba(0,0,0,0.5)",
    overflow: "hidden",
  },
  confirmIconWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 16,
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
  errorText: {
    color: "#f87171",
    fontSize: 13,
    margin: "-6px 0 0",
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
  protectedBadge: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 20,
  },
  protectedText: {
    color: "#6b6b74",
    fontSize: 11.5,
    fontWeight: 500,
    letterSpacing: "0.01em",
  },
};