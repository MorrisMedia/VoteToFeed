"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

type Message = {
  role: "user" | "assistant" | "admin";
  content: string;
};

// Markdown to HTML renderer for chat messages
function renderMarkdown(text: string): string {
  const lines = text.split("\n");
  const html: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Numbered list block — also skip blank lines between consecutive items
    if (/^\d+\.\s+/.test(line)) {
      html.push('<ol class="my-1.5 space-y-0.5 pl-4 list-decimal">');
      while (i < lines.length) {
        if (/^\d+\.\s+/.test(lines[i])) {
          const content = lines[i].replace(/^\d+\.\s+/, "");
          html.push(`<li>${applyInline(content)}</li>`);
          i++;
        } else if (lines[i].trim() === "" && i + 1 < lines.length && /^\d+\.\s+/.test(lines[i + 1])) {
          // blank line followed by another numbered item — skip it
          i++;
        } else {
          break;
        }
      }
      html.push("</ol>");
      continue;
    }

    // Bullet list block — also skip blank lines between consecutive items
    if (/^[-•]\s+/.test(line)) {
      html.push('<ul class="my-1.5 space-y-0.5 pl-4 list-disc">');
      while (i < lines.length) {
        if (/^[-•]\s+/.test(lines[i])) {
          const content = lines[i].replace(/^[-•]\s+/, "");
          html.push(`<li>${applyInline(content)}</li>`);
          i++;
        } else if (lines[i].trim() === "" && i + 1 < lines.length && /^[-•]\s+/.test(lines[i + 1])) {
          i++;
        } else {
          break;
        }
      }
      html.push("</ul>");
      continue;
    }

    // Empty line → small gap
    if (line.trim() === "") {
      html.push('<div class="h-1"></div>');
      i++;
      continue;
    }

    // Normal paragraph line
    html.push(`<p>${applyInline(line)}</p>`);
    i++;
  }

  return html.join("");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function applyInline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
}

function getSessionId() {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("vtf-chat-session");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("vtf-chat-session", id);
  }
  return id;
}

export function ChatWidget() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const user = session?.user as { name?: string; email?: string; id?: string } | undefined;

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Load history on first open
  useEffect(() => {
    if (open && !loaded) {
      const sessionId = getSessionId();
      if (sessionId) {
        fetch(`/api/chat?sessionId=${encodeURIComponent(sessionId)}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.messages?.length) {
              setMessages(data.messages);
            }
          })
          .catch(() => {});
      }
      setLoaded(true);
    }
  }, [open, loaded]);

  // Poll for new messages (admin replies) every 5 seconds while open
  useEffect(() => {
    if (open && loaded) {
      pollRef.current = setInterval(() => {
        const sessionId = getSessionId();
        if (!sessionId) return;
        fetch(`/api/chat?sessionId=${encodeURIComponent(sessionId)}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.messages?.length) {
              setMessages((prev) => {
                if (data.messages.length > prev.length) {
                  return data.messages;
                }
                return prev;
              });
            }
          })
          .catch(() => {});
      }, 10000);
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [open, loaded]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const sessionId = getSessionId();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionId,
          userName: user?.name || null,
          userEmail: user?.email || null,
          userId: user?.id || null,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        const errMsg = errData?.error || "Something went wrong. Please try again.";
        setMessages((prev) => [...prev, { role: "assistant", content: errMsg }]);
        return;
      }
      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Chat Bubble Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-brand-500 text-white shadow-lg hover:bg-brand-600 transition-all flex items-center justify-center hover:scale-105 active:scale-95"
        aria-label={open ? "Close chat" : "Open chat"}
      >
        {open ? (
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[360px] max-w-[calc(100vw-40px)] h-[500px] max-h-[calc(100vh-120px)] bg-white rounded-2xl shadow-2xl border border-surface-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="bg-brand-500 text-white px-4 py-3 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-sm">VoteToFeed Support</div>
              <div className="text-[11px] text-white/70">AI-powered • Typically instant</div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && !loading && (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">🐾</div>
                <p className="text-sm font-semibold text-surface-700">
                  {user?.name ? `Hey ${user.name.split(" ")[0]}! 👋` : "Welcome to VoteToFeed!"}
                </p>
                <p className="text-xs text-surface-500 mt-1">
                  Ask me anything about contests, voting, prizes, or shelter support.
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div>
                  {msg.role === "admin" && (
                    <div className="text-[10px] text-blue-600 font-semibold mb-0.5 ml-1">Admin</div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-brand-500 text-white rounded-br-md"
                        : msg.role === "admin"
                        ? "bg-blue-50 text-surface-800 rounded-bl-md border border-blue-200"
                        : "bg-surface-100 text-surface-800 rounded-bl-md"
                    }`}
                    {...(msg.role !== "user"
                      ? { dangerouslySetInnerHTML: { __html: renderMarkdown(msg.content) } }
                      : { children: msg.content }
                    )}
                  />
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-surface-100 rounded-2xl rounded-bl-md px-4 py-2.5">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-surface-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 bg-surface-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-surface-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-surface-200 px-3 py-2 shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type your message..."
                maxLength={1000}
                rows={1}
                className="flex-1 resize-none rounded-xl border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 bg-surface-50 max-h-24"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-xl bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
