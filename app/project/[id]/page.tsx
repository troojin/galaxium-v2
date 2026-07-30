"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";

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

export default function ProjectChatPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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
      if (error) toast.error("Couldn't load this project.");
      else if (!data) setNotFound(true);
      else setProject(data as Project);
      setLoading(false);
    }
    loadProject();
    return () => { isMounted = false; };
  }, [params.id, supabase]);

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
        .rainbow-v2 {
          background: linear-gradient(90deg, #ff5f6d, #ffc371, #a8e063, #56ccf2, #8b5cf6, #ff5f6d);
          background-size: 300% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          animation: rainbowShift 4s linear infinite;
        }
        @keyframes rainbowShift {
          0% { background-position: 0% 50%; }
          100% { background-position: 300% 50%; }
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
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 99px; }
      `}</style>

      <div style={styles.topbar}>
        <div style={styles.topbarLeft}>
          <span style={styles.brandText}>
            Galaxium <span className="rainbow-v2" style={{ fontWeight: 800 }}>V2</span>
          </span>
        </div>
        {project && (
          <div style={styles.topbarCenter}>
            <span style={styles.projectName}>{project.name}</span>
          </div>
        )}
        <div style={styles.topbarRight}>
          <button
            className="back-link"
            style={styles.backBtn}
            onClick={() => router.push("/dashboard")}
          >
            ← Dashboard
          </button>
        </div>
      </div>

      {loading ? (
        <div style={styles.centerState}>
          <p style={styles.mutedText}>Loading project…</p>
        </div>
      ) : notFound ? (
        <div style={styles.centerState}>
          <div className="glass-sheen" style={styles.notFoundCard}>
            <h1 style={styles.notFoundTitle}>Project not found</h1>
            <p style={styles.mutedText}>This project doesn&apos;t exist, or you don&apos;t have access.</p>
          </div>
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
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={msg.role === "assistant" ? "msg-assistant" : undefined}
                    style={msg.role === "user" ? styles.userRow : styles.assistantRow}
                  >
                    <div
                      style={msg.role === "user" ? styles.userBubble : styles.assistantBubble}
                      className={
                        msg.role === "assistant" &&
                        streaming &&
                        msg.id === messages[messages.length - 1]?.id
                          ? "cursor-blink"
                          : undefined
                      }
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
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
    position: "sticky",
    top: 0,
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 24px",
    background: "rgba(10,10,10,0.75)",
    backdropFilter: "blur(16px) saturate(140%)",
    WebkitBackdropFilter: "blur(16px) saturate(140%)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    gap: 16,
  },
  topbarLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
    flex: "0 0 auto",
  },
  brandText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: "-0.01em",
    whiteSpace: "nowrap",
  },
  topbarCenter: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    minWidth: 0,
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
  topbarRight: {
    flex: "0 0 auto",
    display: "flex",
    alignItems: "center",
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
  notFoundCard: {
    position: "relative",
    background: "linear-gradient(160deg, rgba(12,12,14,0.7) 0%, rgba(0,0,0,0.65) 50%, rgba(6,6,8,0.7) 100%)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 16,
    backdropFilter: "blur(24px) saturate(140%)",
    WebkitBackdropFilter: "blur(24px) saturate(140%)",
    padding: "32px 36px",
    textAlign: "center",
  },
  notFoundTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: 700,
    margin: "0 0 8px",
    letterSpacing: "-0.02em",
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