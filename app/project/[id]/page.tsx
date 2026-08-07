"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";
import { StudioIcon } from "@/components/studio-icon";
import { parseGalaxiumResponse } from "@/lib/ai/rules";
import type { GalaxiumResponse, RobloxInstanceNode } from "@/lib/ai/rules";

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

function ScriptPreviewModal({
  node,
  onClose,
}: {
  node: RobloxInstanceNode;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

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
      // clipboard unavailable, ignore
    }
  }

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div style={styles.modalHeaderLeft}>
            <StudioIcon className={node.className} size={18} style={{ marginRight: 2 }} />
            <span style={styles.modalTitle}>{node.name}</span>
          </div>
          <div style={styles.modalHeaderRight}>
            <button style={styles.copyBtn} onClick={handleCopy}>
              {copied ? "Copied ✓" : "Copy"}
            </button>
            <button style={styles.modalCloseBtn} onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        </div>
        {node.parent ? <div style={styles.modalParent}>{node.parent}</div> : null}
        <pre style={styles.modalSourceBlock}>
          <code>{node.source}</code>
        </pre>
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

      <div style={styles.createdSection}>
        <div style={styles.createdLabel}>Created ({flat.length})</div>
        <div style={styles.createdGrid}>
          {flat.map((node, i) => {
            const hasSource = typeof node.source === "string" && node.source.trim().length > 0;
            return (
              <button
                key={i}
                onClick={() => hasSource && setActiveScript(node)}
                style={{
                  ...styles.createdItem,
                  ...(hasSource ? styles.createdItemScript : styles.createdItemPlain),
                }}
                disabled={!hasSource}
              >
                <StudioIcon className={node.className} size={16} />
                <span style={styles.createdItemName}>{node.name}</span>
                {hasSource ? <span style={styles.createdItemHint}>View →</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      {response.followUp ? <p style={styles.followUpText}>{response.followUp}</p> : null}

      {activeScript ? (
        <ScriptPreviewModal node={activeScript} onClose={() => setActiveScript(null)} />
      ) : null}
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

  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
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
      if (error) toast.error("Couldn't load messages.");
      else setMessages((data ?? []) as Message[]);
      setMessagesLoading(false);
    }
    loadMessages();
    return () => { isMounted = false; };
  }, [params.id, project, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
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

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, projectId: params.id }),
        signal: abortRef.current.signal,
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
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: fullContent } : m
          )
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
        // User cancelled
      } else {
        toast.error("Something went wrong. Try again.");
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [input, streaming, messages, params.id, supabase, toast]);

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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; }
        textarea::placeholder { color: #6b6b74; }
        textarea:focus { outline: none; }
        .back-link:hover { color: #c4b5fd !important; }
        .send-btn:hover:not(:disabled) { filter: brightness(1.15); }
        .send-btn:disabled { opacity: 0.45; cursor: default; }
        .stop-btn:hover { border-color: rgba(248,113,113,0.5) !important; color: #fca5a5 !important; }
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
        .msg-assistant { animation: msgIn 0.18s ease; }
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cursor-blink::after {
          content: '▍';
          display: inline-block;
          color: #8b5cf6;
          animation: blink 0.9s step-end infinite;
          margin-left: 1px;
          font-size: 0.85em;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; } 50% { opacity: 0; }
        }
        .node-row:hover { background: rgba(255,255,255,0.03); }
        .source-toggle:hover { color: #c4b5fd !important; border-color: rgba(139,92,246,0.4) !important; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 99px; }
      `}</style>

      <header style={styles.topbar}>
        <div style={styles.topbarSide} />
        <div style={styles.topbarCenter}>
          {project ? <span style={styles.projectName}>{project.name}</span> : null}
        </div>
        <div style={styles.topbarSide}>
          <button
            className="back-link"
            style={styles.backBtn}
            onClick={() => router.push("/dashboard")}
          >
            ← Dashboard
          </button>
        </div>
      </header>

      {loading ? (
        <div style={styles.centerState}>
          <p style={styles.mutedText}>Loading project…</p>
        </div>
      ) : (
        <div style={styles.chatLayout}>
          <div style={styles.messagesList}>
            {messagesLoading ? (
              <div style={styles.centerInChat}>
                <p style={styles.mutedText}>Loading messages…</p>
              </div>
            ) : messages.length === 0 ? (
              <div style={styles.centerInChat}>
                <p style={styles.emptyTitle}>Start a conversation</p>
                <p style={styles.emptySubtitle}>
                  Ask anything about <strong style={{ color: "#e4e4e8" }}>{project?.name}</strong>
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
                      className={msg.role === "assistant" ? "msg-assistant" : undefined}
                      style={msg.role === "user" ? styles.userRow : styles.assistantRow}
                    >
                      <div
                        style={msg.role === "user" ? styles.userBubble : styles.assistantBubble}
                        className={isStreamingThis ? "cursor-blink" : undefined}
                      >
                        {msg.role === "user" ? (
                          msg.content
                        ) : isStreamingThis ? (
                          <span style={styles.generatingText}>Building your Roblox instances…</span>
                        ) : parsed ? (
                          <GalaxiumMessageView response={parsed} />
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
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <div style={styles.inputArea}>
            <div className="glass-sheen" style={styles.inputCard}>
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder="Message the AI…"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                style={styles.textarea}
                disabled={streaming}
              />
              <div style={styles.inputActions}>
                <span style={styles.hintText}>↵ send · shift+↵ newline</span>
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
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background: "#0a0a0a",
    display: "flex",
    flexDirection: "column",
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
    background: "none",
    border: "none",
    color: "#9a9aa5",
    fontSize: 13.5,
    fontWeight: 500,
    cursor: "pointer",
    padding: 0,
    transition: "color 0.15s ease",
    whiteSpace: "nowrap",
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
    boxShadow: "0 4px 16px rgba(91,33,182,0.3)",
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
    color: "#a78bfa",
    fontSize: 13.5,
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
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 10px",
    borderRadius: 9,
    fontFamily: "inherit",
    textAlign: "left",
  },
  createdItemScript: {
    background: "rgba(139,92,246,0.08)",
    border: "1px solid rgba(139,92,246,0.28)",
    cursor: "pointer",
  },
  createdItemPlain: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    cursor: "default",
  },
  createdItemName: {
    color: "#e4e4e8",
    fontSize: 13,
    fontWeight: 500,
  },
  createdItemHint: {
    color: "#a78bfa",
    fontSize: 11,
    fontWeight: 600,
    marginLeft: 2,
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
    fontSize: 12.5,
    lineHeight: 1.6,
    color: "#d4d4dc",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
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
    fontFamily: "monospace",
    padding: "8px 14px 0",
  },
  modalSourceBlock: {
    margin: "10px 14px 14px",
    padding: "12px 14px",
    background: "rgba(0,0,0,0.4)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 8,
    overflow: "auto",
    fontSize: 12.5,
    lineHeight: 1.65,
    color: "#d4d4dc",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  },
  inputArea: {
    paddingBottom: 28,
    paddingTop: 8,
  },
  inputCard: {
    position: "relative",
    background: "linear-gradient(160deg, rgba(12,12,14,0.8) 0%, rgba(0,0,0,0.75) 50%, rgba(6,6,8,0.8) 100%)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 16,
    backdropFilter: "blur(24px) saturate(140%)",
    WebkitBackdropFilter: "blur(24px) saturate(140%)",
    boxShadow: "0 8px 32px -8px rgba(0,0,0,0.7)",
    padding: "14px 14px 10px",
  },
  textarea: {
    width: "100%",
    background: "transparent",
    border: "none",
    resize: "none",
    color: "#ffffff",
    fontSize: 14,
    lineHeight: 1.6,
    padding: "2px 4px",
    minHeight: 24,
    maxHeight: 160,
    overflowY: "auto",
  },
  inputActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTop: "1px solid rgba(255,255,255,0.05)",
  },
  hintText: {
    color: "#4a4a54",
    fontSize: 11.5,
  },
  sendBtn: {
    background: "linear-gradient(160deg, rgba(124,77,225,0.85) 0%, rgba(91,33,182,0.85) 100%)",
    color: "#ffffff",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8,
    padding: "7px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(91,33,182,0.4), inset 0 0.5px 0 rgba(255,255,255,0.2)",
    transition: "filter 0.15s ease",
  },
  stopBtn: {
    background: "transparent",
    color: "#f87171",
    border: "1px solid rgba(248,113,113,0.25)",
    borderRadius: 8,
    padding: "7px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "border-color 0.15s, color 0.15s",
  },
};