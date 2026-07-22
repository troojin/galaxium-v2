"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
  duration: number;
  leaving: boolean;
}

interface ToastContextValue {
  success: (message: string, durationMs?: number) => void;
  error: (message: string, durationMs?: number) => void;
  info: (message: string, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 3800;
const EXIT_DURATION = 320;

const VARIANT_STYLES: Record<
  ToastVariant,
  { border: string; glow: string; iconColor: string; barColor: string }
> = {
  success: {
    border: "rgba(139,92,246,0.4)",
    glow: "0 8px 32px -8px rgba(139,92,246,0.45)",
    iconColor: "#c4b5fd",
    barColor: "linear-gradient(90deg, #8b5cf6, #a78bfa)",
  },
  error: {
    border: "rgba(248,113,113,0.4)",
    glow: "0 8px 32px -8px rgba(248,113,113,0.4)",
    iconColor: "#f87171",
    barColor: "linear-gradient(90deg, #ef4444, #f87171)",
  },
  info: {
    border: "rgba(255,255,255,0.16)",
    glow: "0 8px 32px -8px rgba(0,0,0,0.6)",
    iconColor: "#9a9aa5",
    barColor: "linear-gradient(90deg, #6b6b74, #9a9aa5)",
  },
};

function VariantIcon({ variant, color }: { variant: ToastVariant; color: string }) {
  if (variant === "success") {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 12.5L9.5 18L20 6"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="toast-check-path"
        />
      </svg>
    );
  }
  if (variant === "error") {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <path d="M12 5v9" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <circle cx="12" cy="18" r="1.6" fill={color} />
      </svg>
    );
  }
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="7.2" r="1.6" fill={color} />
      <path d="M12 11v8" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const timers = useRef<Map<number, { timeout: number; startedAt: number; remaining: number }>>(
    new Map()
  );

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    timers.current.delete(id);
  }, []);

  const startExit = useCallback(
    (id: number) => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
      window.setTimeout(() => remove(id), EXIT_DURATION);
    },
    [remove]
  );

  const armTimer = useCallback(
    (id: number, ms: number) => {
      const timeout = window.setTimeout(() => startExit(id), ms);
      timers.current.set(id, { timeout, startedAt: Date.now(), remaining: ms });
    },
    [startExit]
  );

  const pause = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (!t) return;
    window.clearTimeout(t.timeout);
    const elapsed = Date.now() - t.startedAt;
    t.remaining = Math.max(t.remaining - elapsed, 400);
  }, []);

  const resume = useCallback(
    (id: number) => {
      const t = timers.current.get(id);
      if (!t) return;
      armTimer(id, t.remaining);
    },
    [armTimer]
  );

  const push = useCallback(
    (message: string, variant: ToastVariant, durationMs = DEFAULT_DURATION) => {
      const id = idRef.current++;
      setToasts((prev) => [...prev, { id, message, variant, duration: durationMs, leaving: false }]);
      armTimer(id, durationMs);
    },
    [armTimer]
  );

  const value: ToastContextValue = {
    success: (message, durationMs) => push(message, "success", durationMs),
    error: (message, durationMs) => push(message, "error", durationMs),
    info: (message, durationMs) => push(message, "info", durationMs),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      <style>{`
        @keyframes toastIn {
          0% { opacity: 0; transform: translateY(22px) scale(0.9); filter: blur(4px); }
          55% { opacity: 1; transform: translateY(-3px) scale(1.015); filter: blur(0); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes toastOut {
          0% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
          100% { opacity: 0; transform: translateY(14px) scale(0.92); filter: blur(3px); }
        }
        @keyframes toastBarShrink {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
        @keyframes toastIconPop {
          0% { transform: scale(0); }
          60% { transform: scale(1.25); }
          100% { transform: scale(1); }
        }
        @keyframes toastCheckDraw {
          from { stroke-dasharray: 24; stroke-dashoffset: 24; }
          to { stroke-dasharray: 24; stroke-dashoffset: 0; }
        }
        .toast-item {
          animation: toastIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease, border-color 0.25s ease;
        }
        .toast-item:hover {
          transform: translateY(-2px) scale(1.015);
        }
        .toast-item.leaving {
          animation: toastOut 0.32s cubic-bezier(0.4, 0, 1, 1) both;
        }
        .toast-icon-circle {
          animation: toastIconPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.08s both;
        }
        .toast-check-path {
          stroke-dasharray: 24;
          stroke-dashoffset: 24;
          animation: toastCheckDraw 0.35s ease-out 0.28s forwards;
        }
        .toast-bar-fill {
          transform-origin: left center;
        }
      `}</style>

      <div style={styles.wrap} aria-live="polite">
        {toasts.map((t) => {
          const v = VARIANT_STYLES[t.variant];
          return (
            <div
              key={t.id}
              className={`toast-item${t.leaving ? " leaving" : ""}`}
              style={{
                ...styles.toast,
                borderColor: v.border,
                boxShadow: `${v.glow}, inset 0 0.5px 0 rgba(255,255,255,0.15)`,
              }}
              onClick={() => startExit(t.id)}
              onMouseEnter={() => pause(t.id)}
              onMouseLeave={() => resume(t.id)}
              role="status"
            >
              <div style={styles.row}>
                <span
                  className="toast-icon-circle"
                  style={{ ...styles.icon, borderColor: v.border }}
                >
                  <VariantIcon variant={t.variant} color={v.iconColor} />
                </span>
                <span style={styles.message}>{t.message}</span>
              </div>

              <div
                className="toast-bar-fill"
                style={{
                  ...styles.barFill,
                  background: v.barColor,
                  animation: t.leaving
                    ? "none"
                    : `toastBarShrink ${t.duration}ms linear forwards`,
                }}
              />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

const styles: { [key: string]: React.CSSProperties } = {
  wrap: {
    position: "fixed",
    bottom: 28,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    flexDirection: "column-reverse",
    alignItems: "center",
    gap: 10,
    zIndex: 2000,
    pointerEvents: "none",
  },
  toast: {
    pointerEvents: "auto",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: 0,
    maxWidth: "min(420px, 88vw)",
    background:
      "linear-gradient(160deg, rgba(16,16,18,0.94) 0%, rgba(4,4,6,0.94) 50%, rgba(8,8,10,0.94) 100%)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: "12px 16px",
    backdropFilter: "blur(20px) saturate(140%)",
    WebkitBackdropFilter: "blur(20px) saturate(140%)",
    cursor: "pointer",
    fontFamily: "'Inter', -apple-system, sans-serif",
    overflow: "hidden",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  icon: {
    flexShrink: 0,
    width: 19,
    height: 19,
    borderRadius: "50%",
    border: "1px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    color: "#ffffff",
    fontSize: 13.5,
    fontWeight: 500,
    lineHeight: 1.4,
  },
  barFill: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    width: "100%",
  },
};