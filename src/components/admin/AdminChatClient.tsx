"use client";

import { useState, useEffect, useRef } from "react";

type Conversation = {
  id: string;
  sessionId: string;
  userName: string | null;
  userEmail: string | null;
  status: "OPEN" | "CLOSED";
  lastMessage: string | null;
  updatedAt: string;
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
  user: { name: string | null; email: string | null } | null;
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

  function formatDate(d: string) {
    return new Date(d).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function renderConversationPanel(conv: ConversationDetail, isCompare = false) {
    return (
      <div className="flex-1 bg-white rounded-2xl border border-surface-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-surface-200 flex items-center justify-between bg-surface-50 shrink-0">
          <div>
            <span className="font-bold text-sm text-surface-800">
              {conv.user?.name || conv.user?.email || "Anonymous Visitor"}
            </span>
            {conv.user?.email && (
              <span className="text-xs text-surface-500 ml-2">{conv.user.email}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                conv.status === "OPEN"
                  ? "bg-green-100 text-green-700"
                  : "bg-surface-200 text-surface-500"
              }`}
            >
              {conv.status}
            </span>
            {!isCompare && (
              <button
                onClick={() =>
                  toggleStatus(conv.id, conv.status === "OPEN" ? "CLOSED" : "OPEN")
                }
                className="text-xs px-3 py-1 rounded-lg bg-surface-100 hover:bg-surface-200 text-surface-600 font-medium transition-colors"
              >
                {conv.status === "OPEN" ? "Close" : "Reopen"}
              </button>
            )}
            {isCompare && (
              <button
                onClick={() => { setCompareWith(null); setCompareMode(false); }}
                className="text-xs px-3 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-medium transition-colors"
              >
                ✕ Close
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {conv.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "USER" ? "justify-end" : "justify-start"}`}
            >
              <div className="max-w-[70%]">
                {msg.role === "ADMIN" && (
                  <div className="text-[10px] text-blue-600 font-bold mb-0.5 ml-1">Admin Reply</div>
                )}
                {msg.role === "ASSISTANT" && (
                  <div className="text-[10px] text-surface-400 font-medium mb-0.5 ml-1">AI</div>
                )}
                <div
                  className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
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
                  className={`text-[10px] text-surface-400 mt-0.5 ${
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
                placeholder="Type admin reply..."
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
            <p className="text-[10px] text-surface-400 mt-1">This reply will appear in the user&apos;s chat widget</p>
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
            {conversations.map((c) => (
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
                    : "border-surface-200 bg-white hover:border-surface-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-surface-800 truncate max-w-[180px]">
                    {c.user?.name || c.user?.email || `Visitor`}
                  </span>
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
                <p className="text-xs text-surface-500 truncate">{c.lastMessage || "No messages"}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-surface-400">{formatDate(c.updatedAt)}</span>
                  <span className="text-[10px] text-surface-400">{c._count.messages} msgs</span>
                </div>
              </button>
            ))}
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
  );
}
