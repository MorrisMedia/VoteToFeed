"use client";

import { useState, useEffect, useCallback } from "react";

/* ─── Types ────────────────────────────────────────────── */
type EmailStats = {
  stats: { total: number; today: number; last7d: number; last30d: number };
  byType: Array<{ type: string; count: number }>;
  byTypeToday: Array<{ type: string; count: number }>;
  recentLogs: Array<{
    id: string;
    emailType: string;
    sentAt: string;
    userName: string;
    userEmail: string | null;
    contestName: string;
  }>;
  byDay: Array<{ day: string; count: number }>;
};

type SavedTemplate = {
  id: string;
  name: string;
  subject: string;
  html: string;
  prompt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Contest = {
  id: string;
  name: string;
  entryCount: number;
  hasEnded: boolean;
  hasStarted: boolean;
  daysLeft: number;
};

/* ─── Constants ────────────────────────────────────────── */
const EMAIL_TYPE_LABELS: Record<string, { label: string; emoji: string; description: string; category: string }> = {
  daily_rank: { label: "Daily Rank Update", emoji: "📈", description: "Daily position update with tips, prize info, and votes-to-#1", category: "Daily" },
  countdown_7d: { label: "7-Day Countdown", emoji: "⏰", description: "Sent 7 days before contest ends", category: "Countdown" },
  countdown_3d: { label: "3-Day Countdown", emoji: "⏰", description: "Sent 3 days before contest ends", category: "Countdown" },
  countdown_24h: { label: "24-Hour Countdown", emoji: "🔥", description: "Sent 24 hours before contest ends", category: "Countdown" },
  close_race: { label: "Close Race Alert", emoji: "⚡", description: "Pet is within 1-10 votes of moving up a rank — recommends vote package", category: "Engagement" },
  no_votes_nudge: { label: "No Votes Nudge", emoji: "😟", description: "Pet received 0 votes today — nudges to share or buy $0.99 pack", category: "Engagement" },
  final_hours_push: { label: "Final Hours Push", emoji: "🚨", description: "Contest ends tomorrow — last-chance sales push with specific package", category: "Engagement" },
  reentry: { label: "Auto-Added Notification", emoji: "✅", description: "Notifies users their pet was auto-added to the next contest", category: "Post-Contest" },
  almost_won: { label: "Almost Won", emoji: "😢", description: "Pet was 4th-10th and close to top 3 — encourages next contest entry", category: "Post-Contest" },
  winner_1: { label: "Winner — 1st Place", emoji: "🥇", description: "Congratulations + prize fulfillment details", category: "Winner" },
  winner_2: { label: "Winner — 2nd Place", emoji: "🥈", description: "Congratulations + prize fulfillment details", category: "Winner" },
  winner_3: { label: "Winner — 3rd Place", emoji: "🥉", description: "Congratulations + prize fulfillment details", category: "Winner" },
  winner_random: { label: "Random Winner", emoji: "🎲", description: "Lucky random winner notification + prize details", category: "Winner" },
};

const BUILTIN_TEMPLATE_IDS = [
  "daily_rank", "close_race", "no_votes_nudge", "final_hours_push",
  "countdown_3d", "reentry", "almost_won", "winner_1",
];

const CATEGORIES = ["Daily", "Countdown", "Engagement", "Post-Contest", "Winner"];

type Tab = "overview" | "preview" | "generate" | "saved" | "send" | "contest" | "logs";

type ContestEmailType = {
  type: string;
  label: string;
  emoji: string;
  description: string;
  totalRecipients: number;
  alreadySent: number;
  remaining: number;
  available: boolean;
};

type ContestEmailInfo = {
  contest: { id: string; name: string; hasEnded: boolean; daysLeft: number; entryCount: number; petType: string };
  emailTypes: ContestEmailType[];
};

/* ─── Helpers ──────────────────────────────────────────── */
function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
      <p className="text-sm font-medium text-surface-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-surface-900">{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-surface-400 mt-1">{sub}</p>}
    </div>
  );
}

function BarChart({ data }: { data: Array<{ day: string; count: number }> }) {
  if (data.length === 0) return <p className="text-sm text-surface-400">No data yet</p>;
  const max = Math.max(...data.map((d) => d.count), 1);
  const sorted = [...data].sort((a, b) => a.day.localeCompare(b.day));
  return (
    <div className="flex items-end gap-1.5 h-32">
      {sorted.map((d) => {
        const pct = Math.max((d.count / max) * 100, 4);
        const dayLabel = new Date(d.day + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return (
          <div key={d.day} className="flex flex-col items-center flex-1 min-w-0">
            <span className="text-[10px] font-semibold text-surface-600 mb-1">{d.count}</span>
            <div className="w-full rounded-t bg-red-500 transition-all" style={{ height: `${pct}%`, minHeight: 4 }} />
            <span className="text-[10px] text-surface-400 mt-1 truncate w-full text-center">{dayLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

function timeAgo(dateStr: string) {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

function Btn({
  children, onClick, variant = "primary", disabled, className = "",
}: {
  children: React.ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "danger" | "ghost"; disabled?: boolean; className?: string;
}) {
  const base = "px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const v = {
    primary: "bg-red-500 text-white hover:bg-red-600",
    secondary: "bg-surface-100 text-surface-700 hover:bg-surface-200",
    danger: "bg-red-100 text-red-700 hover:bg-red-200",
    ghost: "text-surface-500 hover:text-surface-700 hover:bg-surface-50",
  };
  return <button onClick={onClick} disabled={disabled} className={`${base} ${v[variant]} ${className}`}>{children}</button>;
}

/* ─── Main Component ───────────────────────────────────── */
export function AdminEmailsClient() {
  const [data, setData] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  // Preview state
  const [previewTemplateId, setPreviewTemplateId] = useState("");
  const [previewContestId, setPreviewContestId] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewSubject, setPreviewSubject] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewContestInfo, setPreviewContestInfo] = useState<{ contestName: string; totalEntries: number; daysLeft: number; prizeDescription: string } | null>(null);

  // AI Generate state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiIncludeImage, setAiIncludeImage] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ subject: string; html: string; prompt: string } | null>(null);
  const [aiError, setAiError] = useState("");

  // Saved Templates state
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [savedPreviewHtml, setSavedPreviewHtml] = useState("");
  const [savedPreviewSubject, setSavedPreviewSubject] = useState("");

  // Test Send state
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState("");

  // Contest Emails state
  const [ceContestId, setCeContestId] = useState("");
  const [ceInfo, setCeInfo] = useState<ContestEmailInfo | null>(null);
  const [ceLoading, setCeLoading] = useState(false);
  const [ceSending, setCeSending] = useState<string | null>(null);
  const [ceResults, setCeResults] = useState<Record<string, { sent: number; skipped: number; failed: number }>>({}); 

  // Broadcast state
  const [contests, setContests] = useState<Contest[]>([]);
  const [broadcastSource, setBroadcastSource] = useState<"builtin" | "saved" | "ai">("saved");
  const [broadcastTemplateId, setBroadcastTemplateId] = useState("");
  const [broadcastContestId, setBroadcastContestId] = useState("");
  const [broadcastSendToAll, setBroadcastSendToAll] = useState(false);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{ total: number; sent: number; failed: number } | null>(null);
  const [broadcastConfirm, setBroadcastConfirm] = useState(false);
  const [broadcastHtml, setBroadcastHtml] = useState("");
  const [broadcastSubject, setBroadcastSubject] = useState("");

  /* ─── Data Fetching ──────────────────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/emails");
      if (!res.ok) throw new Error("Failed to load email stats");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSavedTemplates = useCallback(async () => {
    setSavedLoading(true);
    try {
      const res = await fetch("/api/admin/emails/templates");
      if (res.ok) setSavedTemplates(await res.json());
    } finally {
      setSavedLoading(false);
    }
  }, []);

  const fetchContests = useCallback(async () => {
    try {
      const res = await fetch("/api/contests");
      if (res.ok) {
        const json = await res.json();
        setContests(Array.isArray(json) ? json : json.contests || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (tab === "saved") fetchSavedTemplates(); }, [tab, fetchSavedTemplates]);
  useEffect(() => { if (tab === "send" || tab === "preview" || tab === "contest") { fetchContests(); } }, [tab, fetchContests]);
  useEffect(() => { if (tab === "send") fetchSavedTemplates(); }, [tab, fetchSavedTemplates]);

  /* ─── Actions ────────────────────────────────────────── */
  async function handlePreview(templateId: string, contestId?: string) {
    setPreviewLoading(true);
    setPreviewHtml("");
    setPreviewSubject("");
    setPreviewContestInfo(null);
    try {
      const body: Record<string, string> = { templateId };
      if (contestId) body.contestId = contestId;
      const res = await fetch("/api/admin/emails/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Preview failed");
      const json = await res.json();
      setPreviewHtml(json.html);
      setPreviewSubject(json.subject);
      if (json.contestData) setPreviewContestInfo(json.contestData);
    } catch {
      setPreviewHtml("<p style='padding:20px;color:red;'>Failed to load preview</p>");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleGenerate() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError("");
    setAiResult(null);
    try {
      const res = await fetch("/api/admin/emails/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, includeImage: aiIncludeImage }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Generation failed");
      }
      setAiResult(await res.json());
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSaveTemplate(name: string, subject: string, html: string, prompt?: string) {
    if (!name.trim()) return;
    const res = await fetch("/api/admin/emails/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, subject, html, prompt }),
    });
    if (res.ok) {
      await fetchSavedTemplates();
      setSaveName("");
      setTestResult("Template saved!");
      setTimeout(() => setTestResult(""), 3000);
    }
  }

  async function handleDeleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    await fetch("/api/admin/emails/templates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchSavedTemplates();
  }

  async function handleTestSend(subject: string, html: string) {
    if (!testEmail.trim()) { setTestResult("Enter an email address"); return; }
    setTestSending(true);
    setTestResult("");
    try {
      const res = await fetch("/api/admin/emails/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail, subject, html }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Send failed");
      setTestResult("Test email sent!");
    } catch (err) {
      setTestResult(err instanceof Error ? err.message : "Failed");
    } finally {
      setTestSending(false);
      setTimeout(() => setTestResult(""), 5000);
    }
  }

  async function fetchContestEmails(cId: string) {
    if (!cId) { setCeInfo(null); return; }
    setCeLoading(true);
    setCeInfo(null);
    setCeResults({});
    try {
      const res = await fetch(`/api/admin/emails/contest-send?contestId=${cId}`);
      if (!res.ok) throw new Error("Failed");
      setCeInfo(await res.json());
    } catch { setCeInfo(null); }
    finally { setCeLoading(false); }
  }

  async function handleContestSend(emailType: string) {
    if (!ceContestId || ceSending) return;
    setCeSending(emailType);
    try {
      const res = await fetch("/api/admin/emails/contest-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contestId: ceContestId, emailType }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const result = await res.json();
      setCeResults((prev) => ({ ...prev, [emailType]: result }));
      // Refresh to update counts
      await fetchContestEmails(ceContestId);
      fetchData();
    } catch (err) {
      setCeResults((prev) => ({ ...prev, [emailType]: { sent: 0, skipped: 0, failed: -1 } }));
    } finally {
      setCeSending(null);
    }
  }

  async function handleBroadcast() {
    if (!broadcastSubject || !broadcastHtml) return;
    setBroadcastLoading(true);
    setBroadcastResult(null);
    try {
      const res = await fetch("/api/admin/emails/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: broadcastSubject,
          html: broadcastHtml,
          contestId: broadcastSendToAll ? undefined : broadcastContestId || undefined,
          sendToAll: broadcastSendToAll,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Broadcast failed");
      setBroadcastResult(await res.json());
      setBroadcastConfirm(false);
    } catch (err) {
      setTestResult(err instanceof Error ? err.message : "Broadcast failed");
    } finally {
      setBroadcastLoading(false);
    }
  }

  /* ─── Render ─────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-surface-300 border-t-red-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 font-medium">{error || "Failed to load"}</p>
        <button onClick={fetchData} className="mt-3 text-sm text-surface-500 underline">Retry</button>
      </div>
    );
  }

  const todayMap = new Map(data.byTypeToday.map((t) => [t.type, t.count]));

  // Helper: get the currently "active" html/subject for test send or broadcast
  function getActiveContent(): { subject: string; html: string } | null {
    if (tab === "preview" && previewHtml) return { subject: previewSubject, html: previewHtml };
    if (tab === "generate" && aiResult) return { subject: aiResult.subject, html: aiResult.html };
    if (tab === "saved" && savedPreviewHtml) return { subject: savedPreviewSubject, html: savedPreviewHtml };
    return null;
  }

  const TABS: Array<{ id: Tab; label: string }> = [
    { id: "overview", label: "📊 Dashboard" },
    { id: "preview", label: "👁️ Preview" },
    { id: "generate", label: "🤖 AI Generate" },
    { id: "saved", label: "💾 Templates" },
    { id: "send", label: "📨 Broadcast" },
    { id: "contest", label: "🎯 Contest Emails" },
    { id: "logs", label: "📋 Logs" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Email Management</h1>
          <p className="text-sm text-surface-500 mt-1">Preview, generate, manage &amp; broadcast emails</p>
        </div>
        <button onClick={fetchData} className="rounded-lg bg-surface-100 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-200 transition-colors">↻ Refresh</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Emails Today" value={data.stats.today} sub="Since midnight UTC" />
        <StatCard label="Last 7 Days" value={data.stats.last7d} />
        <StatCard label="Last 30 Days" value={data.stats.last30d} />
        <StatCard label="All Time" value={data.stats.total} />
      </div>

      {/* Chart */}
      {data.byDay.length > 0 && (
        <div className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-surface-700 mb-4">Emails per Day (Last 7 Days)</h3>
          <BarChart data={data.byDay} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-100 rounded-lg p-1 w-fit flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.id ? "bg-white text-surface-900 shadow-sm" : "text-surface-500 hover:text-surface-700"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════ TAB: OVERVIEW / DASHBOARD ═══════ */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* By Type table */}
          <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50">
                  <th className="text-left px-5 py-3 font-semibold text-surface-600">Email Type</th>
                  <th className="text-right px-5 py-3 font-semibold text-surface-600">Today</th>
                  <th className="text-right px-5 py-3 font-semibold text-surface-600">All Time</th>
                </tr>
              </thead>
              <tbody>
                {data.byType.map((row) => {
                  const info = EMAIL_TYPE_LABELS[row.type];
                  const todayCount = todayMap.get(row.type) || 0;
                  return (
                    <tr key={row.type} className="border-b border-surface-50 hover:bg-surface-50/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{info?.emoji || "📩"}</span>
                          <div>
                            <p className="font-medium text-surface-800">{info?.label || row.type}</p>
                            <p className="text-xs text-surface-400">{info?.description || ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={`font-semibold ${todayCount > 0 ? "text-red-500" : "text-surface-400"}`}>{todayCount}</span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-surface-700">{row.count}</td>
                    </tr>
                  );
                })}
                {data.byType.length === 0 && (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-surface-400">No emails sent yet</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Schedule + Rules */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-surface-700 mb-3">📅 Email Schedule</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3 py-2 border-b border-surface-50">
                  <span className="bg-blue-100 text-blue-700 font-mono text-xs px-2 py-1 rounded">10:00 AM UTC</span>
                  <span className="text-surface-700 font-medium">Morning: Daily Rank + Countdown</span>
                </div>
                <div className="flex items-center gap-3 py-2 border-b border-surface-50">
                  <span className="bg-orange-100 text-orange-700 font-mono text-xs px-2 py-1 rounded">6:00 PM UTC</span>
                  <span className="text-surface-700 font-medium">Evening: Close Race + No Votes + Final Hours</span>
                </div>
                <div className="flex items-center gap-3 py-2">
                  <span className="bg-purple-100 text-purple-700 font-mono text-xs px-2 py-1 rounded">11:00 PM UTC</span>
                  <span className="text-surface-700 font-medium">Night: Contest closes + auto-add (emails sent manually)</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-surface-700 mb-3">🛡️ Safety Rules</h3>
              <ul className="text-sm text-surface-600 space-y-1.5">
                <li>• <strong>Max 1 engagement email</strong> per user per contest per day</li>
                <li>• <strong>Priority:</strong> Final Hours &gt; Close Race &gt; No Votes</li>
                <li>• <strong>Countdown</strong> sent once per milestone — never duplicated</li>
                <li>• All emails deduped via ContestEmailLog</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ TAB: PREVIEW BUILT-IN TEMPLATES ═══════ */}
      {tab === "preview" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-surface-700 mb-3">Preview Built-in Templates</h3>
            <p className="text-xs text-surface-400 mb-4">Select a template and optionally a contest to preview with real data (prizes, entries, rankings).</p>

            {/* Contest selector */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-surface-600 block mb-2">Contest (optional — uses real data)</label>
              <select
                value={previewContestId}
                onChange={(e) => {
                  setPreviewContestId(e.target.value);
                  if (previewTemplateId) handlePreview(previewTemplateId, e.target.value || undefined);
                }}
                className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm focus:border-red-300 outline-none"
              >
                <option value="">Sample data (no contest)</option>
                {contests.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.entryCount} entries ({c.hasEnded ? "Ended" : c.hasStarted ? `${c.daysLeft}d left` : "Upcoming"})
                  </option>
                ))}
              </select>
            </div>

            {previewContestInfo && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                <strong>Using real data from:</strong> {previewContestInfo.contestName} · {previewContestInfo.totalEntries} entries · {previewContestInfo.daysLeft}d left
                {previewContestInfo.prizeDescription && <span className="block mt-1 text-blue-600">Prizes: {previewContestInfo.prizeDescription}</span>}
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {BUILTIN_TEMPLATE_IDS.map((id) => {
                const info = EMAIL_TYPE_LABELS[id];
                return (
                  <button
                    key={id}
                    onClick={() => { setPreviewTemplateId(id); handlePreview(id, previewContestId || undefined); }}
                    className={`text-left p-3 rounded-lg border transition-colors ${previewTemplateId === id ? "border-red-300 bg-red-50" : "border-surface-200 hover:border-surface-300"}`}
                  >
                    <span className="text-xl">{info?.emoji || "📩"}</span>
                    <p className="text-xs font-semibold text-surface-700 mt-1">{info?.label || id}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {previewLoading && (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-3 border-surface-300 border-t-red-500" />
            </div>
          )}

          {previewHtml && !previewLoading && (
            <div className="space-y-3">
              <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm">
                <p className="text-xs text-surface-400 mb-1">Subject Line:</p>
                <p className="font-semibold text-surface-800">{previewSubject}</p>
              </div>
              <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
                <div className="bg-surface-50 px-4 py-2 border-b border-surface-100 flex items-center justify-between">
                  <span className="text-xs text-surface-500">Email Preview</span>
                  <div className="flex gap-2">
                    <Btn variant="ghost" onClick={() => { setTestEmail(""); setTestResult(""); }}>
                      ✉️ Test Send
                    </Btn>
                  </div>
                </div>
                <iframe
                  srcDoc={previewHtml}
                  className="w-full border-0"
                  style={{ minHeight: 600 }}
                  sandbox="allow-same-origin"
                  title="Email preview"
                />
              </div>

              {/* Test Send inline */}
              <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm">
                <h4 className="text-sm font-semibold text-surface-700 mb-2">Send Test Email</h4>
                <div className="flex gap-2 items-center">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 px-3 py-2 rounded-lg border border-surface-200 text-sm focus:border-red-300 focus:ring-1 focus:ring-red-200 outline-none"
                  />
                  <Btn onClick={() => handleTestSend(previewSubject, previewHtml)} disabled={testSending}>
                    {testSending ? "Sending..." : "Send Test"}
                  </Btn>
                </div>
                {testResult && <p className={`text-xs mt-2 ${testResult.includes("sent") ? "text-green-600" : "text-red-500"}`}>{testResult}</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ TAB: AI GENERATE ═══════ */}
      {tab === "generate" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-surface-700 mb-1">AI Email Generator</h3>
            <p className="text-xs text-surface-400 mb-4">Describe what you want and Gemini will generate a complete email with your branding.</p>
            <div className="space-y-3">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. Generate an email announcing a new contest &quot;Summer Paws 2025&quot; with $500 in prizes, exciting tone, include a CTA to enter now..."
                rows={4}
                className="w-full px-4 py-3 rounded-lg border border-surface-200 text-sm focus:border-red-300 focus:ring-1 focus:ring-red-200 outline-none resize-none"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-surface-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiIncludeImage}
                    onChange={(e) => setAiIncludeImage(e.target.checked)}
                    className="rounded border-surface-300 text-red-500 focus:ring-red-200"
                  />
                  Include AI-generated banner image (slower)
                </label>
                <Btn onClick={handleGenerate} disabled={aiLoading || !aiPrompt.trim()}>
                  {aiLoading ? "Generating..." : "🤖 Generate Email"}
                </Btn>
              </div>
            </div>
            {aiError && <p className="text-red-500 text-sm mt-3">{aiError}</p>}
          </div>

          {aiLoading && (
            <div className="flex items-center justify-center py-10 gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-3 border-surface-300 border-t-red-500" />
              <span className="text-sm text-surface-500">{aiIncludeImage ? "Generating text + image..." : "Generating..."}</span>
            </div>
          )}

          {aiResult && !aiLoading && (
            <div className="space-y-3">
              <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm">
                <p className="text-xs text-surface-400 mb-1">Generated Subject:</p>
                <p className="font-semibold text-surface-800">{aiResult.subject}</p>
              </div>

              <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
                <div className="bg-surface-50 px-4 py-2 border-b border-surface-100">
                  <span className="text-xs text-surface-500">Generated Email Preview</span>
                </div>
                <iframe
                  srcDoc={aiResult.html}
                  className="w-full border-0"
                  style={{ minHeight: 600 }}
                  sandbox="allow-same-origin"
                  title="AI generated email preview"
                />
              </div>

              {/* Actions: Save, Test Send, Regenerate */}
              <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Btn variant="secondary" onClick={handleGenerate} disabled={aiLoading}>🔄 Regenerate</Btn>
                  <Btn variant="ghost" onClick={() => { setAiPrompt(aiResult.prompt || aiPrompt); }}>📝 Edit Prompt</Btn>
                </div>

                {/* Save as template */}
                <div>
                  <p className="text-xs font-semibold text-surface-600 mb-2">Save as Template</p>
                  <div className="flex gap-2">
                    <input
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      placeholder="Template name..."
                      className="flex-1 px-3 py-2 rounded-lg border border-surface-200 text-sm focus:border-red-300 focus:ring-1 focus:ring-red-200 outline-none"
                    />
                    <Btn onClick={() => handleSaveTemplate(saveName, aiResult.subject, aiResult.html, aiResult.prompt)} disabled={!saveName.trim()}>
                      💾 Save
                    </Btn>
                  </div>
                </div>

                {/* Test send */}
                <div>
                  <p className="text-xs font-semibold text-surface-600 mb-2">Test Send</p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="flex-1 px-3 py-2 rounded-lg border border-surface-200 text-sm focus:border-red-300 focus:ring-1 focus:ring-red-200 outline-none"
                    />
                    <Btn onClick={() => handleTestSend(aiResult.subject, aiResult.html)} disabled={testSending}>
                      {testSending ? "Sending..." : "✉️ Send Test"}
                    </Btn>
                  </div>
                  {testResult && <p className={`text-xs mt-2 ${testResult.includes("sent") || testResult.includes("saved") ? "text-green-600" : "text-red-500"}`}>{testResult}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ TAB: SAVED TEMPLATES ═══════ */}
      {tab === "saved" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-surface-700">Saved Templates</h3>
                <p className="text-xs text-surface-400">Custom email templates you&apos;ve saved from AI generation or built-in previews.</p>
              </div>
              <Btn variant="secondary" onClick={fetchSavedTemplates} disabled={savedLoading}>↻ Refresh</Btn>
            </div>

            {savedLoading && (
              <div className="flex items-center justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-3 border-surface-300 border-t-red-500" />
              </div>
            )}

            {!savedLoading && savedTemplates.length === 0 && (
              <div className="text-center py-10">
                <p className="text-surface-400 text-sm">No saved templates yet.</p>
                <p className="text-surface-400 text-xs mt-1">Use the AI Generator tab to create and save templates.</p>
              </div>
            )}

            {!savedLoading && savedTemplates.length > 0 && (
              <div className="space-y-3">
                {savedTemplates.map((t) => (
                  <div key={t.id} className={`border rounded-xl p-4 transition-colors ${savedPreviewHtml && savedPreviewSubject === t.subject ? "border-red-300 bg-red-50/30" : "border-surface-200 hover:border-surface-300"}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-surface-800">{t.name}</p>
                        <p className="text-xs text-surface-500 mt-0.5">Subject: {t.subject}</p>
                        {t.prompt && <p className="text-xs text-surface-400 mt-1 truncate">Prompt: {t.prompt}</p>}
                        <p className="text-[11px] text-surface-400 mt-1">Saved {new Date(t.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-1 shrink-0 ml-3">
                        <Btn variant="ghost" onClick={() => { setSavedPreviewHtml(t.html); setSavedPreviewSubject(t.subject); }}>👁️ Preview</Btn>
                        <Btn variant="ghost" onClick={() => { setBroadcastSource("saved"); setBroadcastTemplateId(t.id); setBroadcastSubject(t.subject); setBroadcastHtml(t.html); setTab("send"); }}>📨</Btn>
                        <Btn variant="danger" onClick={() => handleDeleteTemplate(t.id)}>🗑️</Btn>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Saved template preview */}
          {savedPreviewHtml && (
            <div className="space-y-3">
              <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-surface-400 mb-1">Subject:</p>
                    <p className="font-semibold text-surface-800">{savedPreviewSubject}</p>
                  </div>
                  <Btn variant="ghost" onClick={() => { setSavedPreviewHtml(""); setSavedPreviewSubject(""); }}>✕ Close</Btn>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
                <iframe
                  srcDoc={savedPreviewHtml}
                  className="w-full border-0"
                  style={{ minHeight: 600 }}
                  sandbox="allow-same-origin"
                  title="Saved template preview"
                />
              </div>
              {/* Test send */}
              <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm">
                <h4 className="text-sm font-semibold text-surface-700 mb-2">Send Test Email</h4>
                <div className="flex gap-2 items-center">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 px-3 py-2 rounded-lg border border-surface-200 text-sm focus:border-red-300 focus:ring-1 focus:ring-red-200 outline-none"
                  />
                  <Btn onClick={() => handleTestSend(savedPreviewSubject, savedPreviewHtml)} disabled={testSending}>
                    {testSending ? "Sending..." : "Send Test"}
                  </Btn>
                </div>
                {testResult && <p className={`text-xs mt-2 ${testResult.includes("sent") || testResult.includes("saved") ? "text-green-600" : "text-red-500"}`}>{testResult}</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ TAB: BROADCAST / SEND ═══════ */}
      {tab === "send" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-surface-700 mb-1">Broadcast Email</h3>
            <p className="text-xs text-surface-400 mb-4">Send an email to all users or filter by contest participants.</p>

            {/* Source selection */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-surface-600 block mb-2">Email Source</label>
                <div className="flex gap-2 flex-wrap">
                  {(["saved", "builtin", "ai"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => { setBroadcastSource(s); setBroadcastHtml(""); setBroadcastSubject(""); setBroadcastTemplateId(""); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${broadcastSource === s ? "border-red-300 bg-red-50 text-red-700" : "border-surface-200 text-surface-500 hover:border-surface-300"}`}
                    >
                      {s === "saved" ? "💾 Saved Template" : s === "builtin" ? "📧 Built-in Template" : "🤖 Last AI Generation"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template selector for saved */}
              {broadcastSource === "saved" && (
                <div>
                  <label className="text-xs font-semibold text-surface-600 block mb-2">Select Template</label>
                  <select
                    value={broadcastTemplateId}
                    onChange={(e) => {
                      const t = savedTemplates.find((t) => t.id === e.target.value);
                      if (t) { setBroadcastTemplateId(t.id); setBroadcastSubject(t.subject); setBroadcastHtml(t.html); }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm focus:border-red-300 outline-none"
                  >
                    <option value="">Choose a saved template...</option>
                    {savedTemplates.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.subject}</option>)}
                  </select>
                </div>
              )}

              {/* Built-in template selector */}
              {broadcastSource === "builtin" && (
                <div>
                  <label className="text-xs font-semibold text-surface-600 block mb-2">Select Template</label>
                  <select
                    value={broadcastTemplateId}
                    onChange={async (e) => {
                      const id = e.target.value;
                      setBroadcastTemplateId(id);
                      if (id) {
                        const res = await fetch("/api/admin/emails/preview", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ templateId: id }),
                        });
                        if (res.ok) {
                          const j = await res.json();
                          setBroadcastSubject(j.subject);
                          setBroadcastHtml(j.html);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm focus:border-red-300 outline-none"
                  >
                    <option value="">Choose a built-in template...</option>
                    {BUILTIN_TEMPLATE_IDS.map((id) => {
                      const info = EMAIL_TYPE_LABELS[id];
                      return <option key={id} value={id}>{info?.emoji} {info?.label || id}</option>;
                    })}
                  </select>
                </div>
              )}

              {/* AI: use last generated */}
              {broadcastSource === "ai" && (
                <div>
                  {aiResult ? (
                    <div className="bg-surface-50 rounded-lg p-3 border border-surface-200">
                      <p className="text-xs text-surface-400">Using last AI-generated email:</p>
                      <p className="text-sm font-semibold text-surface-800 mt-1">{aiResult.subject}</p>
                      <Btn variant="ghost" className="mt-2" onClick={() => { setBroadcastSubject(aiResult.subject); setBroadcastHtml(aiResult.html); }}>
                        ✓ Use This Email
                      </Btn>
                    </div>
                  ) : (
                    <p className="text-xs text-surface-400">No AI-generated email yet. Go to the AI Generate tab first.</p>
                  )}
                </div>
              )}

              {/* Audience */}
              <div>
                <label className="text-xs font-semibold text-surface-600 block mb-2">Audience</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-surface-600 cursor-pointer">
                    <input
                      type="radio"
                      name="audience"
                      checked={!broadcastSendToAll}
                      onChange={() => setBroadcastSendToAll(false)}
                      className="text-red-500 focus:ring-red-200"
                    />
                    By Contest
                  </label>
                  {!broadcastSendToAll && (
                    <select
                      value={broadcastContestId}
                      onChange={(e) => setBroadcastContestId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm focus:border-red-300 outline-none ml-6"
                    >
                      <option value="">Select a contest...</option>
                      {contests.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.hasEnded ? "Ended" : c.hasStarted ? `${c.daysLeft}d left` : "Upcoming"}) — {c.entryCount} entries
                        </option>
                      ))}
                    </select>
                  )}
                  <label className="flex items-center gap-2 text-sm text-surface-600 cursor-pointer">
                    <input
                      type="radio"
                      name="audience"
                      checked={broadcastSendToAll}
                      onChange={() => setBroadcastSendToAll(true)}
                      className="text-red-500 focus:ring-red-200"
                    />
                    All Users with Email
                  </label>
                </div>
              </div>

              {/* Preview what will be sent */}
              {broadcastHtml && (
                <div className="border border-surface-200 rounded-xl overflow-hidden">
                  <div className="bg-surface-50 px-4 py-2 border-b border-surface-100">
                    <p className="text-xs text-surface-500">Preview: <strong className="text-surface-700">{broadcastSubject}</strong></p>
                  </div>
                  <iframe
                    srcDoc={broadcastHtml}
                    className="w-full border-0"
                    style={{ minHeight: 400 }}
                    sandbox="allow-same-origin"
                    title="Broadcast preview"
                  />
                </div>
              )}

              {/* Send button */}
              <div className="pt-2">
                {!broadcastConfirm ? (
                  <Btn
                    onClick={() => setBroadcastConfirm(true)}
                    disabled={!broadcastHtml || !broadcastSubject || (!broadcastSendToAll && !broadcastContestId)}
                  >
                    📨 Prepare Broadcast
                  </Btn>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-red-700 mb-2">
                      ⚠️ Confirm Broadcast
                    </p>
                    <p className="text-xs text-red-600 mb-3">
                      This will send &quot;<strong>{broadcastSubject}</strong>&quot; to{" "}
                      {broadcastSendToAll ? "ALL users with an email address" : `participants of the selected contest`}.
                      This action cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <Btn onClick={handleBroadcast} disabled={broadcastLoading}>
                        {broadcastLoading ? "Sending..." : "✓ Confirm & Send"}
                      </Btn>
                      <Btn variant="secondary" onClick={() => setBroadcastConfirm(false)}>Cancel</Btn>
                    </div>
                  </div>
                )}
              </div>

              {broadcastResult && (
                <div className={`rounded-xl p-4 border ${broadcastResult.failed > 0 ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"}`}>
                  <p className={`text-sm font-semibold ${broadcastResult.failed > 0 ? "text-yellow-700" : "text-green-700"}`}>
                    Broadcast Complete
                  </p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="text-surface-600">Total: <strong>{broadcastResult.total}</strong></span>
                    <span className="text-green-600">Sent: <strong>{broadcastResult.sent}</strong></span>
                    {broadcastResult.failed > 0 && <span className="text-red-600">Failed: <strong>{broadcastResult.failed}</strong></span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ TAB: CONTEST EMAILS ═══════ */}
      {tab === "contest" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-surface-700 mb-1">Send Contest Emails</h3>
            <p className="text-xs text-surface-400 mb-4">Select a contest and choose which emails to send. Emails adapt to each participant&apos;s pet and contest data.</p>

            <div className="mb-4">
              <label className="text-xs font-semibold text-surface-600 block mb-2">Select Contest</label>
              <select
                value={ceContestId}
                onChange={(e) => { setCeContestId(e.target.value); fetchContestEmails(e.target.value); }}
                className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm focus:border-red-300 outline-none"
              >
                <option value="">Choose a contest...</option>
                {contests.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.entryCount} entries ({c.hasEnded ? "Ended" : c.hasStarted ? `${c.daysLeft}d left` : "Upcoming"})
                  </option>
                ))}
              </select>
            </div>

            {ceLoading && (
              <div className="flex items-center justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-3 border-surface-300 border-t-red-500" />
              </div>
            )}

            {ceInfo && !ceLoading && (
              <div className="space-y-3">
                {/* Contest info banner */}
                <div className={`rounded-lg p-3 text-xs border ${ceInfo.contest.hasEnded ? "bg-surface-50 border-surface-200 text-surface-600" : "bg-green-50 border-green-200 text-green-700"}`}>
                  <strong>{ceInfo.contest.name}</strong> · {ceInfo.contest.entryCount} entries · {ceInfo.contest.petType}
                  {ceInfo.contest.hasEnded ? " · Ended" : ` · ${ceInfo.contest.daysLeft}d left`}
                </div>

                {ceInfo.emailTypes.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-surface-400 text-sm">No emails available for this contest.</p>
                    <p className="text-surface-400 text-xs mt-1">Contest may need entries or prizes assigned first.</p>
                  </div>
                )}

                {ceInfo.emailTypes.map((et) => {
                  const result = ceResults[et.type];
                  return (
                    <div key={et.type} className={`border rounded-xl p-4 transition-colors ${et.available ? "border-surface-200 hover:border-surface-300" : "border-surface-100 bg-surface-50/50 opacity-60"}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{et.emoji}</span>
                          <div>
                            <p className="font-semibold text-surface-800">{et.label}</p>
                            <p className="text-xs text-surface-400 mt-0.5">{et.description}</p>
                            <div className="flex gap-3 mt-1 text-xs">
                              <span className="text-surface-500">Total: <strong>{et.totalRecipients}</strong></span>
                              {et.alreadySent > 0 && <span className="text-green-600">Sent: <strong>{et.alreadySent}</strong></span>}
                              <span className={et.remaining > 0 ? "text-red-500 font-semibold" : "text-surface-400"}>Remaining: <strong>{et.remaining}</strong></span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          {result && (
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${result.failed === -1 ? "bg-red-100 text-red-700" : result.sent > 0 ? "bg-green-100 text-green-700" : "bg-surface-100 text-surface-500"}`}>
                              {result.failed === -1 ? "Error" : `${result.sent} sent${result.skipped > 0 ? `, ${result.skipped} skipped` : ""}${result.failed > 0 ? `, ${result.failed} failed` : ""}`}
                            </span>
                          )}
                          <button
                            onClick={() => handleContestSend(et.type)}
                            disabled={!et.available || ceSending !== null}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                          >
                            {ceSending === et.type ? "Sending..." : `Send ${et.remaining}`}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ TAB: LOGS ═══════ */}
      {tab === "logs" && (
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-100 bg-surface-50">
            <p className="text-sm font-semibold text-surface-600">Last 50 Emails Sent</p>
          </div>
          <div className="divide-y divide-surface-50 max-h-[600px] overflow-y-auto">
            {data.recentLogs.map((log) => {
              const info = EMAIL_TYPE_LABELS[log.emailType];
              return (
                <div key={log.id} className="px-5 py-3 flex items-center gap-3 hover:bg-surface-50/50">
                  <span className="text-lg shrink-0">{info?.emoji || "📩"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-800 truncate">{info?.label || log.emailType}</p>
                    <p className="text-xs text-surface-400 truncate">
                      {log.userName} {log.userEmail ? `(${log.userEmail})` : ""} · {log.contestName}
                    </p>
                  </div>
                  <span className="text-xs text-surface-400 whitespace-nowrap shrink-0">{timeAgo(log.sentAt)}</span>
                </div>
              );
            })}
            {data.recentLogs.length === 0 && (
              <div className="px-5 py-8 text-center text-surface-400 text-sm">No emails sent yet</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
