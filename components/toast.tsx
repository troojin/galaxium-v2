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
}

interface ToastContextValue {
  success: (message: string, durationMs?: number) => void;
  error: (message: string, durationMs?: number) => void;
  info: (message: string, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 3500;

const VARIANT_STYLES: Record<
  ToastVariant,
  { border: string; glow: string; icon: string; iconColor: string }
> = {
  success: {
    border: "rgba(139,92,246,0.35)",
    glow: "0 8px 32px -8px rgba(139,92,246,0.35)",
    icon: "✓",
    iconColor: "#c4b5fd",
  },
  error: {
    border: "rgba(248,113,113,0.35)",
    glow: "0 8px 32px -8px rgba(248,113,113,0.3)",
    icon: "!",
    iconColor: "#f87171",
  },
  info: {
    border: "rgba(255,255,255,0.14)",
    glow: "0 8px 32px -8px rgba(0,0,0,0.6)",
    icon: "i",
    iconColor: "#9a9aa5",
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, variant: ToastVariant, durationMs = DEFAULT_DURATION) => {
      const id = idRef.current++;
      setToasts((prev) => [...prev, { id, message, variant }]);
      window.setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss]
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
          from { opacity: 0; transform: translateY(10px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(6px) scale(0.98); }
        }
        .toast-item {
          animation: toastIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>

      <div style={styles.wrap} aria-live="polite">
        {toasts.map((t) => {
          const v = VARIANT_STYLES[t.variant];
          return (
            <div
              key={t.id}
              className="toast-item"
              style={{
                ...styles.toast,
                borderColor: v.border,
                boxShadow: `${v.glow}, inset 0 0.5px 0 rgba(255,255,255,0.15)`,
              }}
              onClick={() => dismiss(t.id)}
              role="status"
            >
              <span style={{ ...styles.icon, color: v.iconColor, borderColor: v.border }}>
                {v.icon}
              </span>
              <span style={styles.message}>{t.message}</span>
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
    display: "flex",
    alignItems: "center",
    gap: 10,
    maxWidth: "min(420px, 88vw)",
    background:
      "linear-gradient(160deg, rgba(16,16,18,0.92) 0%, rgba(4,4,6,0.92) 50%, rgba(8,8,10,0.92) 100%)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: "12px 16px",
    backdropFilter: "blur(20px) saturate(140%)",
    WebkitBackdropFilter: "blur(20px) saturate(140%)",
    cursor: "pointer",
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  icon: {
    flexShrink: 0,
    width: 18,
    height: 18,
    borderRadius: "50%",
    border: "1px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 700,
  },
  message: {
    color: "#ffffff",
    fontSize: 13.5,
    fontWeight: 500,
    lineHeight: 1.4,
  },
};