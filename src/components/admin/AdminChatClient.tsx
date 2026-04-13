"use client";

import { useState, useEffect, useRef } from "react";

type Conversation = {
  id: string;
  sessionId: string;
  userName: string | null;
  userEmail: string | null;
  status: "OPEN" | "CLOSED";
  aiPaused: boolean;
  lastMessage: string | null;
  updatedAt: string;
  createdAt: string;
  user: { name: string | null; email: string | null } | null;
  _count: { messages: number };
};

type ChatMsg = {
  id: string;
  role: "USER" | "ASSISTANT" | "ADMIN";
  content: string;
  createdAt: string;
};

type ConversationDetail = {
  id: string;
  sessionId: string;
  status: "OPEN" | "CLOSED";
  aiPaused: boolean;
  user: { name: string | null; email: string | null } | null;
  userName: string | null;
  userEmail: string | null;
  messages: ChatMsg[];
  createdAt: string;
};

export function AdminChatClient() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<ConversationDetail | null>(null);
  const [compareWith, setCompareWith] = useState<ConversationDetail | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [filter, setFilter] = useState<"all" | "OPEN" | "CLOSED">("all");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, [filter]);

  // Auto-refresh conversation list every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations();
    }, 15000);
    return () => clearInterval(interval);
  }, [filter]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages]);

  async function loadConversations() {
    setLoadingList(true);
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const res = await fetch(`/api/admin/chat${params}`);
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {
      setConversations([]);
    } finally {
      setLoadingList(false);
    }
  }

  async function openConversation(id: string, forCompare = false) {
    if (!forCompare) setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/chat?conversationId=${id}`);
      const data = await res.json();
      const conv = data.conversation || null;
      if (forCompare) {
        setCompareWith(conv);
      } else {
        setSelected(conv);
        setReplyText("");
      }
    } catch {
      if (forCompare) setCompareWith(null);
      else setSelected(null);
    } finally {
      if (!forCompare) setLoadingDetail(false);
    }
  }

  async function toggleStatus(convId: string, newStatus: "OPEN" | "CLOSED") {
    await fetch("/api/admin/chat", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: convId, status: newStatus }),
    });
    loadConversations();
    if (selected?.id === convId) {
      setSelected((prev) => prev ? { ...prev, status: newStatus } : null);
    }
  }

  async function sendAdminReply(convId: string) {
    if (!replyText.trim() || sendingReply) return;
    setSendingReply(true);
    setReplyError(null);
    try {
      const res = await fetch("/api/admin/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convId, message: replyText.trim() }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        setReplyError(errData?.error || "Failed to send reply. Please try again.");
        return;
      }
      setReplyText("");
      // Reload the conversation to see the new message
      await openConversation(convId);
      loadConversations();
    } catch {
      setReplyError("Network error. Please check your connection and try again.");
    } finally {
      setSendingReply(false);
    }
  }

  async function toggleAiPause(convId: string, pause: boolean) {
    try {
      await fetch("/api/admin/chat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convId, aiPaused: pause }),
      });
      if (selected?.id === convId) {
        setSelected((prev) => prev ? { ...prev, aiPaused: pause } : null);
      }
      loadConversations();
    } catch {
      // silent fail
    }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function renderConversationPanel(conv: ConversationDetail, isCompare = false) {
    const needsHuman = conv.messages.some(
      (m) => m.role === "ASSISTANT" && m.content.includes("5-10 minutes")
    ) || conversations.find((c) => c.id === conv.id)?.lastMessage?.includes("⚡ NEEDS HUMAN SUPPORT");

    return (
      <div className="flex-1 bg-white rounded-2xl border border-surface-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-surface-200 bg-surface-50 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-surface-800">
                {conv.user?.name || conv.userName || "Anonymous Visitor"}
              </span>
              {(conv.userEmail || conv.user?.email) && (
                <span className="text-xs text-surface-500">{conv.userEmail || conv.user?.email}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {needsHuman && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 animate-pulse">
                  ⚡ Needs Help
                </span>
              )}
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  conv.status === "OPEN"
                    ? "bg-green-100 text-green-700"
                    : "bg-surface-200 text-surface-500"
                }`}
              >
                {conv.status}
              </span>
            </div>
          </div>

          {/* AI Status + Actions row */}
          {!isCompare && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  conv.aiPaused
                    ? "bg-orange-100 text-orange-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${conv.aiPaused ? "bg-orange-500" : "bg-emerald-500"}`} />
                  {conv.aiPaused ? "AI Paused — You're handling" : "AI Active"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => toggleAiPause(conv.id, !conv.aiPaused)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    conv.aiPaused
                      ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                      : "bg-orange-50 hover:bg-orange-100 text-orange-700"
                  }`}
                >
                  {conv.aiPaused ? "🤖 Resume AI" : "🙋 Take Over"}
                </button>
                <button
                  onClick={() =>
                    toggleStatus(conv.id, conv.status === "OPEN" ? "CLOSED" : "OPEN")
                  }
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-surface-100 hover:bg-surface-200 text-surface-600 font-semibold transition-colors"
                >
                  {conv.status === "OPEN" ? "✕ Close Case" : "↻ Reopen"}
                </button>
              </div>
            </div>
          )}
          {isCompare && (
            <div className="flex justify-end">
              <button
                onClick={() => { setCompareWith(null); setCompareMode(false); }}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-semibold transition-colors"
              >
                ✕ Close Compare
              </button>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-2 space-y-1">
          {conv.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "USER" ? "justify-end" : "justify-start"}`}
            >
              <div className="max-w-[80%]">
                {msg.role === "ADMIN" && (
                  <div className="text-[9px] text-blue-600 font-bold mb-px ml-1">Admin</div>
                )}
                {msg.role === "ASSISTANT" && (
                  <div className="text-[9px] text-surface-400 font-medium mb-px ml-1">AI</div>
                )}
                <div
                  className={`rounded-2xl px-3 py-1.5 text-[13px] leading-snug whitespace-pre-wrap ${
                    msg.role === "USER"
                      ? "bg-brand-500 text-white rounded-br-md"
                      : msg.role === "ADMIN"
                      ? "bg-blue-50 text-surface-800 rounded-bl-md border border-blue-200"
                      : "bg-surface-100 text-surface-800 rounded-bl-md"
                  }`}
                >
                  {msg.content}
                </div>
                <div
                  className={`text-[9px] text-surface-300 mt-px ${
                    msg.role === "USER" ? "text-right" : "text-left"
                  }`}
                >
                  {formatDate(msg.createdAt)}
                </div>
              </div>
            </div>
          ))}
          <div ref={!isCompare ? messagesEndRef : undefined} />
        </div>

        {/* Admin Reply Input (only for primary panel) */}
        {!isCompare && (
          <div className="border-t border-surface-200 px-4 py-3 bg-surface-50 shrink-0">
            {conv.aiPaused && (
              <div className="mb-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-[11px] text-orange-700 font-semibold">🙋 AI is paused — the user won&apos;t get AI replies until you close this case or resume AI.</p>
              </div>
            )}
            <div className="flex gap-2 items-end">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendAdminReply(conv.id);
                  }
                }}
                placeholder="Type your reply... (Enter to send, Shift+Enter for new line)"
                rows={2}
                className="flex-1 resize-none rounded-xl border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
              <button
                onClick={() => sendAdminReply(conv.id)}
                disabled={sendingReply || !replyText.trim()}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sendingReply ? "..." : "Send"}
              </button>
            </div>
            <p className="text-[10px] text-surface-400 mt-1">Reply sent to user&apos;s chat + notified via email</p>
            {replyError && (
              <p className="text-[11px] text-red-600 mt-1 font-medium">{replyError}</p>
            )}
          </div>
        )}

        {/* Footer info */}
        <div className="px-5 py-2 border-t border-surface-200 bg-surface-50 shrink-0">
          <p className="text-[11px] text-surface-400">
            Session: {conv.sessionId.slice(0, 8)}... •{" "}
            Started {formatDate(conv.createdAt)} •{" "}
            {conv.messages.length} messages
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: "Total",
            value: conversations.length,
            color: "bg-surface-100 text-surface-700",
          },
          {
            label: "Open",
            value: conversations.filter((c) => c.status === "OPEN").length,
            color: "bg-green-50 text-green-700",
          },
          {
            label: "Needs Help",
            value: conversations.filter((c) => c.lastMessage?.includes("⚡ NEEDS HUMAN SUPPORT")).length,
            color: "bg-red-50 text-red-700",
          },
          {
            label: "AI Paused",
            value: conversations.filter((c) => c.aiPaused).length,
            color: "bg-orange-50 text-orange-700",
          },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl px-4 py-3 ${s.color}`}>
            <div className="text-2xl font-black">{s.value}</div>
            <div className="text-[11px] font-semibold opacity-80">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-6 min-h-[600px]">
        {/* Conversations List */}
        <div className="w-80 shrink-0">
          <div className="flex gap-1 mb-4">
            {(["all", "OPEN", "CLOSED"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  filter === f
                    ? "bg-brand-500 text-white"
                    : "bg-surface-100 text-surface-600 hover:bg-surface-200"
                }`}
              >
                {f === "all" ? "All" : f === "OPEN" ? "Open" : "Closed"}
              </button>
            ))}
            <button
              onClick={() => loadConversations()}
              className="ml-1 px-2 py-1.5 text-xs font-semibold rounded-lg bg-surface-100 text-surface-600 hover:bg-surface-200 transition-colors"
              title="Refresh"
            >
              ↻
            </button>
            <button
              onClick={() => {
                setCompareMode(!compareMode);
                if (compareMode) setCompareWith(null);
              }}
              className={`ml-auto px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                compareMode
                  ? "bg-purple-500 text-white"
                  : "bg-surface-100 text-surface-600 hover:bg-surface-200"
              }`}
            >
              {compareMode ? "✕ Compare" : "⇔ Compare"}
            </button>
          </div>

          {loadingList ? (
            <div className="text-sm text-surface-500 py-8 text-center">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="text-sm text-surface-500 py-8 text-center">No conversations yet</div>
          ) : (
            <div className="space-y-2 max-h-[560px] overflow-y-auto">
              {/* Sort: needs-human first, then open, then closed */}
              {[...conversations]
                .sort((a, b) => {
                  const aPriority = a.lastMessage?.includes("⚡ NEEDS HUMAN SUPPORT") ? 0 : a.status === "OPEN" ? 1 : 2;
                  const bPriority = b.lastMessage?.includes("⚡ NEEDS HUMAN SUPPORT") ? 0 : b.status === "OPEN" ? 1 : 2;
                  if (aPriority !== bPriority) return aPriority - bPriority;
                  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
                })
                .map((c) => {
                  const needsHelp = c.lastMessage?.includes("⚡ NEEDS HUMAN SUPPORT");
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        if (compareMode && selected && selected.id !== c.id) {
                          openConversation(c.id, true);
                        } else {
                          openConversation(c.id);
                        }
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        selected?.id === c.id
                          ? "border-brand-400 bg-brand-50 shadow-sm"
                          : compareWith?.id === c.id
                          ? "border-purple-400 bg-purple-50 shadow-sm"
                          : needsHelp
                          ? "border-red-300 bg-red-50 hover:border-red-400 hover:shadow-sm"
                          : "border-surface-200 bg-white hover:border-surface-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-surface-800 truncate max-w-[140px]">
                          {c.user?.name || c.userName || c.user?.email || "Visitor"}
                        </span>
                        <div className="flex items-center gap-1">
                          {needsHelp && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 animate-pulse">⚡</span>
                          )}
                          {c.aiPaused && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">🙋</span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              c.status === "OPEN"
                                ? "bg-green-100 text-green-700"
                                : "bg-surface-200 text-surface-500"
                            }`}
                          >
                            {c.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-surface-500 truncate">
                        {c.lastMessage?.replace("[⚡ NEEDS HUMAN SUPPORT] ", "") || "No messages"}
                      </p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-surface-400">{formatDate(c.updatedAt)}</span>
                        <span className="text-[10px] text-surface-400">{c._count.messages} msgs</span>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
        </div>

      {/* Conversation Detail / Compare */}
      {!selected && !loadingDetail ? (
        <div className="flex-1 bg-white rounded-2xl border border-surface-200 flex items-center justify-center text-surface-400 text-sm">
          Select a conversation to view
        </div>
      ) : loadingDetail ? (
        <div className="flex-1 bg-white rounded-2xl border border-surface-200 flex items-center justify-center text-surface-400 text-sm">
          Loading...
        </div>
      ) : selected ? (
        <div className={`flex gap-4 flex-1 ${compareWith ? "" : ""}`}>
          {renderConversationPanel(selected)}
          {compareWith && renderConversationPanel(compareWith, true)}
        </div>
      ) : null}
      </div>
    </div>
  );
}
