"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";
import { StudioIcon } from "@/components/studio-icon";
import { parseGalaxiumResponse } from "@/lib/ai/rules";
import type { GalaxiumResponse, RobloxInstanceNode } from "@/lib/ai/rules";
import streamingMessages from "@/data/streaming-messages.json";

interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

type FeedbackType = "like" | "dislike";

const FREE_PROMPT_LIMIT = 3;

function isTruncatedJson(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed.startsWith("{")) return false;
  try {
    JSON.parse(trimmed);
    return false;
  } catch {
    return true;
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const LUA_KEYWORDS = new Set([
  "and", "break", "do", "else", "elseif", "end", "false", "for", "function",
  "goto", "if", "in", "local", "nil", "not", "or", "repeat", "return", "then",
  "true", "until", "while", "type", "export", "continue",
]);

const LUA_BUILTINS = new Set([
  "game", "script", "workspace", "Instance", "Vector3", "Vector2", "CFrame",
  "Color3", "wait", "task", "print", "warn", "error", "pairs", "ipairs",
  "pcall", "xpcall", "typeof", "Enum", "UDim2", "UDim", "BrickColor",
  "Random", "tick", "os", "string", "table", "math", "select", "unpack",
  "require", "spawn", "delay", "coroutine",
]);

function highlightLua(code: string): string {
  const escaped = escapeHtml(code);
  const tokenRegex =
    /(--\[\[[\s\S]*?\]\])|(--[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+\.?\d*\b)|(\b[A-Za-z_][A-Za-z0-9_]*\b)/gm;

  return escaped.replace(tokenRegex, (match, blockComment, lineComment, str, num, word) => {
    if (blockComment || lineComment) {
      return `<span style="color:#6a6f81;">${match}</span>`;
    }
    if (str) {
      return `<span style="color:#8ee9b6;">${match}</span>`;
    }
    if (num) {
      return `<span style="color:#f2ba2a;">${match}</span>`;
    }
    if (word) {
      if (LUA_KEYWORDS.has(word)) {
        return `<span style="color:#eb7973;">${match}</span>`;
      }
      return match;
    }
    return match;
  });
}

function flattenInstances(
  nodes: RobloxInstanceNode[]
): RobloxInstanceNode[] {
  const out: RobloxInstanceNode[] = [];
  for (const node of nodes) {
    out.push(node);
    if (node.children && node.children.length) {
      out.push(...flattenInstances(node.children));
    }
  }
  return out;
}

function buildGreeting(name: string): string {
  const hour = new Date().getHours();

  const timePool =
    hour < 5
      ? [`Up late, ${name}?`, `Burning the midnight oil, ${name}?`, `Good evening, ${name}`]
      : hour < 12
      ? [`Good morning, ${name}`, `Rise and shine, ${name}`, `Need a coffee, ${name}?`]
      : hour < 18
      ? [`Good afternoon, ${name}`, `Hey ${name}, ready to build?`, `Welcome back, ${name}`]
      : [`Good evening, ${name}`, `Burning the midnight oil, ${name}?`, `Welcome back, ${name}`];

  const universalPool = [
    `Let's build something, ${name}`,
    `What are we making today, ${name}?`,
    `Hey ${name}, what's the plan?`,
  ];

  const pool = [...timePool, ...universalPool];
  return pool[Math.floor(Math.random() * pool.length)];
}

function ThumbUpIcon({ filled }: { filled?: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 22h-2a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h2M7 22V11m0 11h9.14a3 3 0 0 0 2.97-2.58l1.24-8A3 3 0 0 0 17.38 9H14l1-6c.16-1.1-.63-2-1.75-2-.83 0-1.55.55-1.78 1.34L9.5 9.66" />
    </svg>
  );
}

function ThumbDownIcon({ filled }: { filled?: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 2h2a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-2M17 2v11m0-11H7.86a3 3 0 0 0-2.97 2.58l-1.24 8A3 3 0 0 0 6.62 15H10l-1 6c-.16 1.1.63 2 1.75 2 .83 0 1.55-.55 1.78-1.34L14.5 14.34" />
    </svg>
  );
}

function RetryIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function MessageFeedbackBar({
  messageId,
  projectId,
  supabase,
  toast,
  feedback,
  onFeedbackChange,
  onRetry,
  disabled,
}: {
  messageId: string;
  projectId: string;
  supabase: ReturnType<typeof createClient>;
  toast: ReturnType<typeof useToast>;
  feedback?: FeedbackType;
  onFeedbackChange: (id: string, type: FeedbackType) => void;
  onRetry: () => void;
  disabled: boolean;
}) {
  const [dislikeOpen, setDislikeOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    if (!dislikeOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDislikeOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dislikeOpen]);

  async function saveFeedback(type: FeedbackType, reasonText: string | null) {
    const { error } = await supabase.from("message_feedback").upsert(
      {
        message_id: messageId,
        project_id: projectId,
        feedback_type: type,
        reason: reasonText,
      },
      { onConflict: "message_id,user_id" }
    );
    return !error;
  }

  async function handleLike() {
    if (feedback === "like" || liking) return;
    setLiking(true);
    const ok = await saveFeedback("like", null);
    setLiking(false);
    if (ok) {
      onFeedbackChange(messageId, "like");
      toast.success("Thanks for your feedback!");
    } else {
      toast.error("Couldn't save your feedback.");
    }
  }

  async function handleDislikeSubmit() {
    setSubmitting(true);
    const ok = await saveFeedback("dislike", reason.trim() || null);
    setSubmitting(false);
    if (ok) {
      onFeedbackChange(messageId, "dislike");
      setDislikeOpen(false);
      setReason("");
      toast.success("Thanks for your feedback!");
    } else {
      toast.error("Couldn't save your feedback.");
    }
  }

  return (
    <>
      <div style={styles.feedbackRow}>
        <button
          type="button"
          className="feedback-btn"
          onClick={handleLike}
          disabled={liking}
          aria-label="Good response"
          aria-pressed={feedback === "like"}
          style={{
            ...styles.feedbackBtn,
            ...(feedback === "like" ? styles.feedbackBtnLikeActive : {}),
          }}
        >
          <ThumbUpIcon filled={feedback === "like"} />
        </button>
        <button
          type="button"
          className="feedback-btn"
          onClick={() => setDislikeOpen(true)}
          aria-label="Bad response"
          aria-pressed={feedback === "dislike"}
          style={{
            ...styles.feedbackBtn,
            ...(feedback === "dislike" ? styles.feedbackBtnDislikeActive : {}),
          }}
        >
          <ThumbDownIcon filled={feedback === "dislike"} />
        </button>
        <button
          type="button"
          className="feedback-btn"
          onClick={onRetry}
          disabled={disabled}
          aria-label="Retry"
          style={styles.feedbackBtn}
        >
          <RetryIcon />
        </button>
      </div>

      {dislikeOpen ? (
        <div style={styles.modalOverlay} className="modal-overlay-in" onClick={() => setDislikeOpen(false)}>
          <div style={styles.modalCard} className="modal-card-in" onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>What went wrong?</span>
              <button
                style={styles.modalCloseBtn}
                onClick={() => setDislikeOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div style={styles.dislikeBody}>
              <textarea
                autoFocus
                rows={4}
                placeholder="Tell us what wasn't right (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={styles.dislikeTextarea}
              />
              <button
                type="button"
                className="send-btn"
                onClick={handleDislikeSubmit}
                disabled={submitting}
                style={styles.dislikeSubmitBtn}
              >
                {submitting ? "Submitting…" : "Submit feedback"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ScriptPreviewModal({
  node,
  onClose,
}: {
  node: RobloxInstanceNode;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const hasSource = typeof node.source === "string" && node.source.trim().length > 0;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleCopy() {
    if (!node.source) return;
    try {
      await navigator.clipboard.writeText(node.source);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
    }
  }

  return (
    <div style={styles.modalOverlay} className="modal-overlay-in" onClick={onClose}>
      <div style={styles.modalCard} className="modal-card-in" onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div style={styles.modalHeaderLeft}>
            <StudioIcon className={node.className} size={18} style={{ marginRight: 2 }} />
            <span style={styles.modalTitle}>{node.name}</span>
          </div>
          <div style={styles.modalHeaderRight}>
            {hasSource ? (
              <button style={styles.copyBtn} onClick={handleCopy}>
                {copied ? "Copied ✓" : "Copy"}
              </button>
            ) : null}
            <button style={styles.modalCloseBtn} onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        </div>
        {node.parent ? <div style={styles.modalParent}>{node.parent}</div> : null}
        {hasSource ? (
          <pre style={styles.modalSourceBlock}>
            <code dangerouslySetInnerHTML={{ __html: highlightLua(node.source ?? "") }} />
          </pre>
        ) : (
          <div style={styles.modalTypeWrap}>
            <div style={styles.modalTypeBubble}>
              <StudioIcon className={node.className} size={20} />
              <span>{node.className}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GalaxiumMessageView({ response }: { response: GalaxiumResponse }) {
  const [activeScript, setActiveScript] = useState<RobloxInstanceNode | null>(null);
  const flat = useMemo(() => flattenInstances(response.instances), [response.instances]);

  return (
    <div style={styles.galaxiumMessage}>
      <p style={styles.explanationText}>{response.explanation}</p>

      {flat.length > 0 ? (
        <div style={styles.createdSection}>
          <div style={styles.createdLabel}>Created ({flat.length})</div>
          <div style={styles.createdGrid}>
            {flat.map((node, i) => {
              const hasSource = typeof node.source === "string" && node.source.trim().length > 0;
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (hasSource) setActiveScript(node);
                  }}
                  className="created-item-script created-item-in"
                  style={{
                    ...styles.createdItem,
                    ...styles.createdItemScript,
                    animationDelay: `${Math.min(i * 45, 360)}ms`,
                  }}
                >
                  <StudioIcon className={node.className} size={16} />
                  <span className="created-item-name" style={styles.createdItemName}>{node.name}</span>
                  <span className="created-item-hint" aria-label={hasSource ? "View source" : "View details"}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14" />
                      <path d="M13 6l6 6-6 6" />
                    </svg>
                  </span>
                  <span className="created-item-tooltip">{node.className}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {response.followUp ? (
        <p className="followup-gradient" style={styles.followUpText}>{response.followUp}</p>
      ) : null}

      {activeScript ? (
        <ScriptPreviewModal node={activeScript} onClose={() => setActiveScript(null)} />
      ) : null}
    </div>
  );
}

function LimitReachedToast({
  pluginConnected,
}: {
  pluginConnected: boolean;
}) {
  return (
    <div className="limit-toast-in" style={styles.limitToast}>
      <div className="limit-toast-sheen" style={styles.limitToastSheen} />
      <div style={styles.limitToastHeader}>
        <span className="limit-toast-icon-in" style={styles.limitToastIconWrap}>
          <LockIcon />
        </span>
        <span style={styles.limitToastTitle}>Prompt limit reached</span>
      </div>
      <p style={styles.limitToastText}>
        Hey stranger, looks like you've used your {FREE_PROMPT_LIMIT} free prompts for this
        project. Connect the Roblox Studio plugin to keep chatting with Galaxium.
      </p>
      <div style={styles.limitToastStatus}>
        <span
          className={pluginConnected ? undefined : "limit-toast-dot-pulse"}
          style={{
            ...styles.presenceDot,
            ...(pluginConnected ? styles.presenceDotOn : styles.presenceDotOff),
          }}
        />
        <span style={styles.limitToastStatusText}>
          {pluginConnected ? "Plugin connected — you're all set" : "Waiting for plugin connection…"}
        </span>
      </div>
    </div>
  );
}

export default function ProjectChatPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [pluginConnected, setPluginConnected] = useState(false);

  const [displayName, setDisplayName] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageFeedback, setMessageFeedback] = useState<Record<string, FeedbackType>>({});
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingMsgIndex, setStreamingMsgIndex] = useState(0);
  const [showLimitToast, setShowLimitToast] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesListRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadProject() {
      setLoading(true);
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, created_at, updated_at")
        .eq("id", params.id)
        .maybeSingle();
      if (!isMounted) return;

      if (error) {
        toast.error("Couldn't load this project.");
        router.replace("/dashboard");
        return;
      }
      if (!data) {
        toast.error("That project doesn't exist, or you don't have access.");
        router.replace("/dashboard");
        return;
      }

      setProject(data as Project);
      setLoading(false);
    }
    loadProject();
    return () => { isMounted = false; };
  }, [params.id, supabase, router, toast]);

  useEffect(() => {
    let isMounted = true;
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      if (!isMounted) return;
      const user = data.user;
      const name =
        (user?.user_metadata?.full_name as string | undefined) ||
        (user?.user_metadata?.name as string | undefined) ||
        (user?.user_metadata?.username as string | undefined) ||
        user?.email?.split("@")[0] ||
        "there";
      setDisplayName(name);
    }
    loadUser();
    return () => { isMounted = false; };
  }, [supabase]);

  const greeting = useMemo(() => buildGreeting(displayName ?? "there"), [displayName]);

  useEffect(() => {
    if (!project) return;
    let isMounted = true;
    async function loadMessages() {
      setMessagesLoading(true);
      const { data, error } = await supabase
        .from("messages")
        .select("id, role, content, created_at")
        .eq("project_id", params.id)
        .order("created_at", { ascending: true });
      if (!isMounted) return;
      if (error) {
        toast.error("Couldn't load messages.");
      } else {
        setMessages((data ?? []) as Message[]);
      }

      const { data: feedbackRows, error: feedbackError } = await supabase
        .from("message_feedback")
        .select("message_id, feedback_type")
        .eq("project_id", params.id);
      if (isMounted && !feedbackError && feedbackRows) {
        const map: Record<string, FeedbackType> = {};
        for (const row of feedbackRows as { message_id: string; feedback_type: FeedbackType }[]) {
          map[row.message_id] = row.feedback_type;
        }
        setMessageFeedback(map);
      }

      setMessagesLoading(false);
    }
    loadMessages();
    return () => { isMounted = false; };
  }, [params.id, project, supabase]);

  useEffect(() => {
    if (!project) return;
    let isMounted = true;

    async function checkPresence() {
      const { data } = await supabase
        .from("plugin_presence")
        .select("last_seen_at")
        .eq("project_id", project!.id)
        .maybeSingle();

      if (!isMounted) return;

      if (data) {
        const secondsAgo = (Date.now() - new Date(data.last_seen_at).getTime()) / 1000;
        setPluginConnected(secondsAgo < 20);
      } else {
        setPluginConnected(false);
      }
    }

    checkPresence();
    const interval = setInterval(checkPresence, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [project, supabase]);

  // Once the plugin connects, the limit no longer applies — dismiss the toast automatically.
  useEffect(() => {
    if (pluginConnected) {
      setShowLimitToast(false);
    }
  }, [pluginConnected]);

  useEffect(() => {
    if (!isNearBottomRef.current) return;
    bottomRef.current?.scrollIntoView({ behavior: streaming ? "auto" : "smooth" });
  }, [messages, streaming]);

  function handleMessagesScroll() {
    const el = messagesListRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceFromBottom < 96;
  }

  useEffect(() => {
    if (!streaming) return;
    setStreamingMsgIndex(Math.floor(Math.random() * streamingMessages.length));
    const interval = setInterval(() => {
      setStreamingMsgIndex((prev) => {
        if (streamingMessages.length <= 1) return prev;
        let next = Math.floor(Math.random() * streamingMessages.length);
        while (next === prev) {
          next = Math.floor(Math.random() * streamingMessages.length);
        }
        return next;
      });
    }, 1800);
    return () => clearInterval(interval);
  }, [streaming]);

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }

  const handleFeedbackChange = useCallback((messageId: string, type: FeedbackType) => {
    setMessageFeedback((prev) => ({ ...prev, [messageId]: type }));
  }, []);

  const userPromptCount = useMemo(
    () => messages.filter((m) => m.role === "user").length,
    [messages]
  );
  const limitReached = userPromptCount >= FREE_PROMPT_LIMIT && !pluginConnected;

  const streamAssistantReply = useCallback(
    async (
      history: { role: string; content: string }[],
      assistantId: string,
      signal: AbortSignal
    ) => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, projectId: params.id }),
        signal,
      });

      if (!res.ok || !res.body) {
        const errorText = await res.text().catch(() => "");
        throw new Error(errorText || "Stream failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";
      let streamDone = false;

      const appendDelta = (delta: string) => {
        fullContent += delta;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: fullContent } : m))
        );
      };

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          const data = event
            .split("\n")
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trim())
            .join("\n");

          if (!data) continue;
          if (data === "[DONE]") {
            streamDone = true;
            break;
          }

          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta.length > 0) {
            appendDelta(delta);
          }
        }
      }

      const tail = buffer.trim();
      if (tail.startsWith("data:") && tail.slice(5).trim() !== "[DONE]") {
        const parsed = JSON.parse(tail.slice(5).trim());
        const delta = parsed.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta.length > 0) {
          appendDelta(delta);
        }
      }

      if (!fullContent.trim()) {
        throw new Error("The AI returned an empty response.");
      }

      return fullContent;
    },
    [params.id]
  );

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;

    if (userPromptCount >= FREE_PROMPT_LIMIT && !pluginConnected) {
      setShowLimitToast(true);
      return;
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    isNearBottomRef.current = true;
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setStreaming(true);

    const { error: userInsertError } = await supabase.from("messages").insert({
      id: userMsg.id,
      project_id: params.id,
      role: "user",
      content: trimmed,
    });

    if (userInsertError) {
      toast.error("Couldn't save your message.");
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      setStreaming(false);
      return;
    }

    const history = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", created_at: new Date().toISOString() },
    ]);

    try {
      abortRef.current = new AbortController();

      const fullContent = await streamAssistantReply(history, assistantId, abortRef.current.signal);

      const { error: assistantInsertError } = await supabase.from("messages").insert({
        id: assistantId,
        project_id: params.id,
        role: "assistant",
        content: fullContent,
      });

      if (assistantInsertError) {
        toast.error("Reply sent, but couldn't save it.");
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
      } else {
        toast.error("Something went wrong. Try again.");
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [input, streaming, messages, params.id, supabase, toast, streamAssistantReply, userPromptCount, pluginConnected]);

  const retryMessage = useCallback(
    async (assistantMessageId: string) => {
      if (streaming) return;

      const idx = messages.findIndex((m) => m.id === assistantMessageId);
      if (idx === -1) return;

      const toRemove = messages.slice(idx);
      const history = messages.slice(0, idx).map((m) => ({ role: m.role, content: m.content }));

      if (history.length === 0 || history[history.length - 1].role !== "user") {
        toast.error("Can't retry this message.");
        return;
      }

      const { error: deleteError } = await supabase
        .from("messages")
        .delete()
        .in("id", toRemove.map((m) => m.id));

      if (deleteError) {
        toast.error("Couldn't retry — try again.");
        return;
      }

      setMessages(messages.slice(0, idx));
      setMessageFeedback((prev) => {
        const next = { ...prev };
        for (const m of toRemove) delete next[m.id];
        return next;
      });

      const newAssistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: newAssistantId, role: "assistant", content: "", created_at: new Date().toISOString() },
      ]);
      setStreaming(true);

      try {
        abortRef.current = new AbortController();
        const fullContent = await streamAssistantReply(history, newAssistantId, abortRef.current.signal);

        const { error: insertError } = await supabase.from("messages").insert({
          id: newAssistantId,
          project_id: params.id,
          role: "assistant",
          content: fullContent,
        });

        if (insertError) {
          toast.error("Reply sent, but couldn't save it.");
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
        } else {
          toast.error("Something went wrong. Try again.");
          setMessages((prev) => prev.filter((m) => m.id !== newAssistantId));
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, streaming, supabase, params.id, toast, streamAssistantReply]
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function stopStreaming() {
    abortRef.current?.abort();
  }

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Fira+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; }
        textarea::placeholder { color: #6b6b74; }
        textarea:focus { outline: none; }

        .back-link { transition: color 0.2s ease, border-color 0.2s ease, transform 0.15s ease; }
        .back-link:hover { color: #c4b5fd !important; border-color: rgba(139,92,246,0.35) !important; }
        .back-link:active { transform: scale(0.92); }

        .send-btn { transition: filter 0.2s ease, transform 0.15s cubic-bezier(0.16, 1, 0.3, 1); }
        .send-btn:hover:not(:disabled) { filter: brightness(1.15); transform: translateY(-1px); }
        .send-btn:active:not(:disabled) { transform: translateY(0) scale(0.96); }
        .send-btn:disabled { opacity: 0.45; cursor: default; }

        .stop-btn { transition: border-color 0.2s ease, color 0.2s ease, transform 0.15s ease; }
        .stop-btn:hover { border-color: rgba(248,113,113,0.5) !important; color: #fca5a5 !important; }
        .stop-btn:active { transform: scale(0.96); }

        .feedback-btn { transition: color 0.2s ease, background-color 0.2s ease, transform 0.15s cubic-bezier(0.16, 1, 0.3, 1); }
        .feedback-btn:hover:not(:disabled) { color: #c4b5fd !important; background: rgba(139,92,246,0.1) !important; transform: translateY(-1px); }
        .feedback-btn:active:not(:disabled) { transform: translateY(0) scale(0.9); }
        .feedback-btn:disabled { opacity: 0.4; cursor: default; }

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

        .msg-assistant { animation: msgIn 0.32s cubic-bezier(0.16, 1, 0.3, 1); }
        .msg-user { animation: msgUserIn 0.28s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes msgUserIn {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .content-fade-in { animation: contentFadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes contentFadeIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .page-fade-in { animation: pageFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes pageFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .topbar-fade-in { animation: topbarFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes topbarFadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .input-fade-in { animation: inputFadeIn 0.55s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: 0.1s; }
        @keyframes inputFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .greeting-fade-in { animation: greetingFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes greetingFadeIn {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .greeting-sub-in { animation: greetingFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: 0.08s; }

        .modal-overlay-in { animation: modalOverlayIn 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes modalOverlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .modal-card-in { animation: modalCardIn 0.28s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes modalCardIn {
          from { opacity: 0; transform: scale(0.94) translateY(6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        .limit-toast-in { animation: limitToastIn 0.55s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes limitToastIn {
          from { opacity: 0; transform: translateX(420px); }
          60%  { opacity: 1; }
          to   { opacity: 1; transform: translateX(0); }
        }

        .limit-toast-icon-in { animation: limitToastIconIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: 0.18s; }
        @keyframes limitToastIconIn {
          from { opacity: 0; transform: scale(0.6) rotate(-8deg); }
          to   { opacity: 1; transform: scale(1) rotate(0deg); }
        }

        .limit-toast-dot-pulse { animation: limitToastDotPulse 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes limitToastDotPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.3); }
        }

        .limit-toast-sheen {
          animation: limitToastSheenMove 3.2s ease-in-out infinite;
        }
        @keyframes limitToastSheenMove {
          0%   { opacity: 0.5; }
          50%  { opacity: 1; }
          100% { opacity: 0.5; }
        }

        .generating-text-shimmer {
          background: linear-gradient(90deg, #9a9aa5 0%, #f0f0f5 50%, #9a9aa5 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: generatingShimmer 1.6s ease-in-out infinite;
        }
        @keyframes generatingShimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .followup-gradient {
          background: linear-gradient(90deg, #6d28d9, #a78bfa, #7c3aed, #4c1d95, #6d28d9);
          background-size: 300% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: followupShimmer 4s linear infinite;
        }
        @keyframes followupShimmer {
          0%   { background-position: 0% 50%; }
          100% { background-position: 300% 50%; }
        }

        .node-row { transition: background-color 0.2s ease; }
        .node-row:hover { background: rgba(255,255,255,0.03); }
        .source-toggle { transition: color 0.2s ease, border-color 0.2s ease; }
        .source-toggle:hover { color: #c4b5fd !important; border-color: rgba(139,92,246,0.4) !important; }

        .created-item-in {
          animation: createdItemIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes createdItemIn {
          from { opacity: 0; transform: translateY(8px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .created-item-script {
          background: rgba(255,255,255,0.03) !important;
          border-color: rgba(255,255,255,0.09) !important;
          transition: background-color 0.22s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.22s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .created-item-script:hover {
          background: rgba(139,92,246,0.08) !important;
          border-color: rgba(139,92,246,0.28) !important;
          transform: translateY(-1px);
        }
        .created-item-script:active {
          transform: translateY(0) scale(0.98);
        }
        .created-item-name { color: #a8a8b0; transition: color 0.2s ease; }
        .created-item-script:hover .created-item-name { color: #e4e4e8; }
        .created-item-hint { display: inline-flex; align-items: center; color: #6a6a74; margin-left: 2px; transition: color 0.2s ease; }
        .created-item-script:hover .created-item-hint { color: #a78bfa; }
        .created-item-tooltip {
          position: absolute;
          top: calc(100% + 6px);
          left: 50%;
          transform: translateX(-50%) translateY(-4px);
          background: #000000;
          border: 1px solid rgba(255,255,255,0.1);
          color: #c4b5fd;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 9px;
          border-radius: 6px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1), transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 20;
        }
        .created-item-script:hover .created-item-tooltip {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }

        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 99px; transition: background-color 0.2s ease; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.16); }
      `}</style>

      <header className="topbar-fade-in" style={styles.topbar}>
        <div style={styles.topbarSide} />
        <div style={styles.topbarCenter}>
          {project ? (
            <span style={styles.projectNameRow}>
              <span
                style={{
                  ...styles.presenceDot,
                  ...(pluginConnected ? styles.presenceDotOn : styles.presenceDotOff),
                }}
                aria-label={pluginConnected ? "Plugin connected" : "Plugin not connected"}
                title={pluginConnected ? "Roblox Studio plugin connected" : "Roblox Studio plugin not connected"}
              />
              <span style={styles.projectName}>{project.name}</span>
            </span>
          ) : null}
        </div>
        <div style={styles.topbarSide}>
          <button
            className="back-link"
            style={styles.backBtn}
            onClick={() => router.push("/dashboard")}
            aria-label="Back to dashboard"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M11 18l-6-6 6-6" />
            </svg>
          </button>
        </div>
      </header>

      {loading ? (
        <div style={styles.centerState}>
          <p style={styles.mutedText}>Loading project…</p>
        </div>
      ) : (
        <div className="page-fade-in" style={styles.chatLayout}>
          <div style={styles.messagesList} ref={messagesListRef} onScroll={handleMessagesScroll}>
            {messagesLoading ? (
              <div style={styles.centerInChat}>
                <p style={styles.mutedText}>Loading messages…</p>
              </div>
            ) : messages.length === 0 ? (
              <div style={styles.centerInChat}>
                <p className="greeting-fade-in" style={styles.emptyTitle}>{greeting}</p>
                <p className="greeting-sub-in" style={styles.emptySubtitle}>
                  Message Galaxium to get started
                </p>
              </div>
            ) : (
              <div style={styles.messagesInner}>
                {messages.map((msg) => {
                  const isLast = msg.id === messages[messages.length - 1]?.id;
                  const isStreamingThis = msg.role === "assistant" && streaming && isLast;
                  let parsed: GalaxiumResponse | null = null;
                  if (msg.role === "assistant" && !isStreamingThis) {
                    parsed = parseGalaxiumResponse(msg.content);
                    if (!parsed && msg.content.trim().startsWith("{")) {
                      console.warn(
                        "[Galaxium] Failed to parse assistant message as GalaxiumResponse. " +
                          "Check that rules.ts exports parseGalaxiumResponse/GalaxiumResponse and that this page.tsx matches the current schema.",
                        msg.content
                      );
                    }
                  }

                  return (
                    <div
                      key={msg.id}
                      className={msg.role === "assistant" ? "msg-assistant" : "msg-user"}
                      style={msg.role === "user" ? styles.userRow : styles.assistantRow}
                    >
                      {msg.role === "user" ? (
                        <div style={styles.userBubble}>{msg.content}</div>
                      ) : (
                        <div style={styles.assistantColumn}>
                          <div style={styles.assistantBubble}>
                            {isStreamingThis ? (
                              <span style={styles.generatingRow}>
                                <span className="generating-text-shimmer" style={styles.generatingText}>
                                  {streamingMessages[streamingMsgIndex]}
                                </span>
                              </span>
                            ) : (
                              <div className="content-fade-in">
                                {parsed ? (
                                  <GalaxiumMessageView response={parsed} />
                                ) : msg.content.trim().startsWith("{") && isTruncatedJson(msg.content) ? (
                                  <div style={styles.truncatedWrap}>
                                    <p style={styles.truncatedText}>
                                      This response got cut off before it finished generating.
                                    </p>
                                    <button
                                      type="button"
                                      className="send-btn"
                                      style={styles.truncatedRetryBtn}
                                      onClick={() => retryMessage(msg.id)}
                                      disabled={streaming}
                                    >
                                      Retry
                                    </button>
                                  </div>
                                ) : msg.content.trim().startsWith("{") ? (
                                  <div style={styles.rawFallbackWrap}>
                                    <div style={styles.sourceHeader}>
                                      <span style={styles.sourceLang}>Unparsed response</span>
                                    </div>
                                    <pre style={styles.sourceBlock}>
                                      <code>{msg.content}</code>
                                    </pre>
                                  </div>
                                ) : (
                                  msg.content
                                )}
                              </div>
                            )}
                          </div>
                          {!isStreamingThis ? (
                            <MessageFeedbackBar
                              messageId={msg.id}
                              projectId={params.id as string}
                              supabase={supabase}
                              toast={toast}
                              feedback={messageFeedback[msg.id]}
                              onFeedbackChange={handleFeedbackChange}
                              onRetry={() => retryMessage(msg.id)}
                              disabled={streaming}
                            />
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <div className="input-fade-in" style={styles.inputArea}>
            <div className="glass-sheen" style={styles.inputCard}>
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder={limitReached ? "Connect the plugin to keep chatting" : "Message Galaxium"}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                style={styles.textarea}
                disabled={streaming}
              />
              {streaming ? (
                <button className="stop-btn" style={styles.stopBtn} onClick={stopStreaming}>
                  ◼ Stop
                </button>
              ) : (
                <button
                  className="send-btn"
                  style={styles.sendBtn}
                  onClick={sendMessage}
                  disabled={!input.trim() || streaming}
                >
                  Send ↑
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showLimitToast ? (
        <LimitReachedToast pluginConnected={pluginConnected} />
      ) : null}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    height: "100vh",
    width: "100%",
    background: "#0a0a0a",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  topbar: {
    height: 58,
    width: "100%",
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    padding: "0 24px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(10,10,10,0.82)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  topbarCenter: {
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  topbarSide: {
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  projectNameRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  presenceDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
    transition: "background-color 0.3s ease, box-shadow 0.3s ease",
  },
  presenceDotOn: {
    background: "#4ade80",
  },
  presenceDotOff: {
    background: "#4a4a52",
    boxShadow: "none",
  },
  projectName: {
    color: "#d4d4dc",
    fontSize: 13.5,
    fontWeight: 600,
    letterSpacing: "-0.01em",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 320,
  },
  backBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
    background: "none",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    color: "#9a9aa5",
    cursor: "pointer",
    padding: 0,
  },
  centerState: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  mutedText: {
    color: "#9a9aa5",
    fontSize: 14,
    margin: 0,
  },
  chatLayout: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    maxWidth: 780,
    width: "100%",
    margin: "0 auto",
    padding: "0 20px",
    minHeight: 0,
  },
  messagesList: {
    flex: 1,
    overflowY: "auto",
    paddingTop: 32,
    paddingBottom: 16,
    display: "flex",
    flexDirection: "column",
  },
  centerInChat: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingBottom: 60,
  },
  emptyIcon: {
    fontSize: 28,
    color: "#8b5cf6",
    opacity: 0.7,
  },
  emptyTitle: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: 600,
    margin: 0,
    letterSpacing: "-0.01em",
  },
  emptySubtitle: {
    color: "#9a9aa5",
    fontSize: 13.5,
    margin: 0,
    textAlign: "center",
  },
  messagesInner: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  userRow: {
    display: "flex",
    justifyContent: "flex-end",
  },
  assistantRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
  },
  assistantColumn: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
  },
  assistantAvatar: {
    flexShrink: 0,
    width: 28,
    height: 28,
    borderRadius: 8,
    background: "rgba(139,92,246,0.15)",
    border: "1px solid rgba(139,92,246,0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    color: "#a78bfa",
    marginTop: 2,
  },
  userBubble: {
    maxWidth: "72%",
    background: "linear-gradient(160deg, rgba(124,77,225,0.75) 0%, rgba(91,33,182,0.7) 100%)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "16px 4px 16px 16px",
    padding: "11px 15px",
    color: "#ffffff",
    fontSize: 14,
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  assistantBubble: {
    maxWidth: "100%",
    color: "#e4e4e8",
    fontSize: 14,
    lineHeight: 1.75,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    padding: "2px 0",
  },
  generatingRow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  generatingText: {
    color: "#9a9aa5",
    fontStyle: "italic",
  },
  galaxiumMessage: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    whiteSpace: "normal",
  },
  explanationText: {
    margin: 0,
    color: "#e4e4e8",
    fontSize: 14,
    lineHeight: 1.7,
  },
  followUpText: {
    margin: 0,
    fontSize: 13.5,
    fontWeight: 600,
    fontStyle: "italic",
  },
  createdSection: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  createdLabel: {
    color: "#7a7a85",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  createdGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  createdItem: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 10px",
    borderRadius: 9,
    fontFamily: "inherit",
    textAlign: "left",
  },
  createdItemScript: {
    border: "1px solid rgba(255,255,255,0.09)",
    cursor: "pointer",
  },
  createdItemName: {
    fontSize: 13,
    fontWeight: 500,
  },
  rawFallbackWrap: {
    background: "rgba(0,0,0,0.4)",
    border: "1px solid rgba(248,113,113,0.2)",
    borderRadius: 8,
    overflow: "hidden",
  },
  sourceHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 10px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(255,255,255,0.02)",
  },
  sourceLang: {
    color: "#7a7a85",
    fontSize: 10.5,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  copyBtn: {
    background: "none",
    border: "none",
    color: "#9a9aa5",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    padding: "2px 6px",
  },
  sourceBlock: {
    padding: "10px 12px",
    margin: 0,
    overflowX: "auto",
    fontSize: "10pt",
    fontWeight: 400,
    lineHeight: 1.6,
    color: "#d4d4dc",
    fontFamily: "'Fira Mono', 'Fira Code', monospace",
  },
  truncatedWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    background: "rgba(248,113,113,0.06)",
    border: "1px solid rgba(248,113,113,0.2)",
    borderRadius: 10,
    padding: "12px 14px",
  },
  truncatedText: {
    margin: 0,
    color: "#e4a5a5",
    fontSize: 13,
    lineHeight: 1.6,
  },
  truncatedRetryBtn: {
    flexShrink: 0,
    padding: "6px 14px",
    fontSize: 12.5,
  },
  feedbackRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  feedbackBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 26,
    height: 26,
    background: "transparent",
    border: "none",
    borderRadius: 6,
    color: "#7a7a85",
    cursor: "pointer",
    padding: 0,
  },
  feedbackBtnLikeActive: {
    color: "#4ade80",
  },
  feedbackBtnDislikeActive: {
    color: "#f87171",
  },
  dislikeBody: {
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  dislikeTextarea: {
    width: "100%",
    resize: "vertical",
    minHeight: 90,
    background: "rgba(0,0,0,0.4)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 8,
    color: "#e4e4e8",
    fontSize: 13.5,
    lineHeight: 1.6,
    padding: "10px 12px",
    fontFamily: "inherit",
  },
  dislikeSubmitBtn: {
    alignSelf: "flex-end",
    padding: "7px 14px",
    fontSize: 12.5,
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 680,
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    background: "linear-gradient(160deg, rgba(16,16,18,0.98) 0%, rgba(8,8,10,0.98) 100%)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 14,
    boxShadow: "0 24px 64px -12px rgba(0,0,0,0.7)",
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
  },
  modalHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  modalHeaderRight: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 14.5,
    fontWeight: 600,
  },
  modalCloseBtn: {
    background: "none",
    border: "none",
    color: "#9a9aa5",
    fontSize: 14,
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: 6,
  },
  modalParent: {
    color: "#5a5a64",
    fontSize: 11.5,
    fontFamily: "'Fira Mono', 'Fira Code', monospace",
    padding: "8px 14px 0",
  },
  modalSourceBlock: {
    margin: "10px 14px 14px",
    padding: "12px 14px",
    background: "rgba(0,0,0,0.4)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 8,
    overflow: "auto",
    fontSize: "10pt",
    fontWeight: 400,
    lineHeight: 1.65,
    color: "#d4d4dc",
    fontFamily: "'Fira Mono', 'Fira Code', monospace",
  },
  modalTypeWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "28px 14px 32px",
  },
  modalTypeBubble: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 18px",
    background: "#000000",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 999,
    color: "#c4b5fd",
    fontSize: 13.5,
    fontWeight: 600,
  },
  inputArea: {
    paddingBottom: 20,
    paddingTop: 6,
  },
  inputCard: {
    position: "relative",
    display: "flex",
    alignItems: "flex-end",
    gap: 8,
    background: "linear-gradient(160deg, rgba(12,12,14,0.8) 0%, rgba(0,0,0,0.75) 50%, rgba(6,6,8,0.8) 100%)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 14,
    backdropFilter: "blur(24px) saturate(140%)",
    WebkitBackdropFilter: "blur(24px) saturate(140%)",
    boxShadow: "0 8px 32px -8px rgba(0,0,0,0.7)",
    padding: "9px 9px 9px 12px",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  },
  textarea: {
    flex: 1,
    minWidth: 0,
    background: "transparent",
    border: "none",
    resize: "none",
    color: "#ffffff",
    fontSize: 14,
    lineHeight: 1.5,
    padding: "6px 4px",
    minHeight: 20,
    maxHeight: 120,
    overflowY: "auto",
  },
  sendBtn: {
    flexShrink: 0,
    background: "linear-gradient(160deg, rgba(124,77,225,0.85) 0%, rgba(91,33,182,0.85) 100%)",
    color: "#ffffff",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 7,
    padding: "6px 12px",
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(91,33,182,0.4), inset 0 0.5px 0 rgba(255,255,255,0.2)",
  },
  stopBtn: {
    flexShrink: 0,
    background: "transparent",
    color: "#f87171",
    border: "1px solid rgba(248,113,113,0.25)",
    borderRadius: 7,
    padding: "6px 12px",
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
  },
  limitToast: {
    position: "fixed",
    bottom: 20,
    right: 20,
    width: 320,
    maxWidth: "calc(100vw - 40px)",
    background: "linear-gradient(150deg, rgba(45,24,90,0.55) 0%, rgba(16,16,20,0.95) 38%, rgba(6,6,8,0.97) 100%)",
    border: "1px solid rgba(139,92,246,0.28)",
    borderRadius: 16,
    boxShadow: "0 24px 56px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(139,92,246,0.06), 0 0 40px -8px rgba(124,58,237,0.35)",
    backdropFilter: "blur(20px) saturate(150%)",
    WebkitBackdropFilter: "blur(20px) saturate(150%)",
    padding: 16,
    zIndex: 200,
    overflow: "hidden",
  },
  limitToastSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
    background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 100%)",
    pointerEvents: "none",
  },
  limitToastHeader: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    marginBottom: 8,
  },
  limitToastIconWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 26,
    height: 26,
    borderRadius: 8,
    background: "rgba(139,92,246,0.18)",
    border: "1px solid rgba(139,92,246,0.3)",
    color: "#c4b5fd",
    flexShrink: 0,
  },
  limitToastTitle: {
    color: "#ffffff",
    fontSize: 13.5,
    fontWeight: 600,
  },
  limitToastText: {
    margin: "0 0 12px",
    color: "#b4b4bd",
    fontSize: 12.5,
    lineHeight: 1.6,
  },
  limitToastStatus: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  limitToastStatusText: {
    color: "#9a9aa5",
    fontSize: 12,
    fontWeight: 500,
  },
};