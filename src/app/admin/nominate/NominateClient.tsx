"use client";

import { useEffect, useRef, useState } from "react";

type Contest = {
  id: string;
  name: string;
  petType: string;
  endDate: string;
  hasEnded: boolean;
};

type Nomination = {
  id: string;
  email: string;
  name: string;
  petName: string | null;
  status: string;
  sentAt: string | null;
  createdAt: string;
  contest: { id: string; name: string };
  sentBy: { id: string; name: string };
};

type Recipient = {
  id: number;
  name: string;
  email: string;
  petName: string;
};

type PetOwner = {
  id: string;
  name: string | null;
  email: string | null;
  pets: { id: string; name: string; type: string }[];
};

type SendJob = {
  id?: string; // DB row id — present after creation
  contestId: string;
  contestName: string;
  recipients: Array<{ email: string; name: string; petName?: string }>;
  total: number;
  sent: number;
  failed: number;
  status: "running" | "paused" | "stopped" | "done";
  startedAt: number | string; // number when created locally, ISO string when from DB
};

let nextId = 1;

function emptyRecipient(): Recipient {
  return { id: nextId++, name: "", email: "", petName: "" };
}

type Tab = "manual" | "existing" | "autoadd";

export function NominateClient() {
  const [tab, setTab] = useState<Tab>("manual");
  const [contests, setContests] = useState<Contest[]>([]);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendJob, setSendJob] = useState<SendJob | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const stopRef = useRef(false);
  const pauseRef = useRef(false);
  const loopActiveRef = useRef(false);

  // Manual form state
  const [contestId, setContestId] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>([emptyRecipient()]);

  // Existing users state
  const [existContestId, setExistContestId] = useState("");
  const [filterPetType, setFilterPetType] = useState<string>("");
  const [petOwners, setPetOwners] = useState<PetOwner[]>([]);
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<Set<string>>(new Set());
  const [loadingOwners, setLoadingOwners] = useState(false);

  // Auto-Add state
  const [autoContestId, setAutoContestId] = useState("");
  const [autoPetType, setAutoPetType] = useState<string>("");
  const [autoOwners, setAutoOwners] = useState<PetOwner[]>([]);
  const [autoSelectedIds, setAutoSelectedIds] = useState<Set<string>>(new Set());
  const [autoLoadingOwners, setAutoLoadingOwners] = useState(false);
  const [autoSendEmail, setAutoSendEmail] = useState(true);
  const [autoAdding, setAutoAdding] = useState(false);
  const [autoResult, setAutoResult] = useState<{ added: number; emailsSent: number; emailsFailed: number; totalUsers: number } | null>(null);

  useEffect(() => {
    fetchContests();
    fetchNominations();
  }, []);

  // Restore persisted send job on mount (survives page refresh) — reads from DB
  useEffect(() => {
    fetch("/api/admin/nominations/send-job")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data?.job) return;
        const job = data.job as SendJob & { id: string };
        // If server shows it was running when page closed, mark as paused
        if (job.status === "running") {
          const restored = { ...job, status: "paused" as const };
          setSendJob(restored);
          fetch("/api/admin/nominations/send-job", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: job.id, status: "paused" }),
          });
        } else {
          setSendJob(job);
        }
      })
      .catch(() => null);
  }, []);

  // Fetch pet owners when contest + pet type are selected
  useEffect(() => {
    if (filterPetType) {
      fetchPetOwners();
    } else {
      setPetOwners([]);
      setSelectedOwnerIds(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterPetType, existContestId]);

  // Auto-Add: fetch pet owners when contest + pet type selected
  useEffect(() => {
    if (autoContestId && autoPetType) {
      fetchAutoOwners();
    } else {
      setAutoOwners([]);
      setAutoSelectedIds(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoContestId, autoPetType]);

  async function fetchContests() {
    try {
      const res = await fetch("/api/contests?includeEnded=false");
      if (res.ok) {
        const data = await res.json();
        setContests(data);
      } else {
        setMessage({ type: "error", text: "Failed to load contests" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to load contests — check your connection" });
    }
  }

  async function fetchNominations() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/nominations");
      if (res.ok) {
        const data = await res.json();
        setNominations(data);
      } else {
        setMessage({ type: "error", text: "Failed to load nomination history" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to load nomination history — check your connection" });
    } finally {
      setLoading(false);
    }
  }

  async function fetchPetOwners() {
    setLoadingOwners(true);
    setPetOwners([]);
    setSelectedOwnerIds(new Set());
    try {
      const params = new URLSearchParams({ petType: filterPetType });
      if (existContestId) params.set("contestId", existContestId);
      const res = await fetch(`/api/admin/nominations/pet-owners?${params}`);
      if (res.ok) {
        const data: PetOwner[] = await res.json();
        setPetOwners(data);
        // Select all by default
        setSelectedOwnerIds(new Set(data.map((u) => u.id)));
      } else {
        setMessage({ type: "error", text: "Failed to load pet owners" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to load pet owners — check your connection" });
    } finally {
      setLoadingOwners(false);
    }
  }

  // CSV import
  const [csvText, setCsvText] = useState("");

  // Auto-Add: fetch eligible pet owners (reuse pet-owners endpoint)
  async function fetchAutoOwners() {
    setAutoLoadingOwners(true);
    setAutoOwners([]);
    setAutoSelectedIds(new Set());
    setAutoResult(null);
    try {
      const params = new URLSearchParams({ petType: autoPetType });
      if (autoContestId) params.set("contestId", autoContestId);
      const res = await fetch(`/api/admin/nominations/pet-owners?${params}`);
      if (res.ok) {
        const data: PetOwner[] = await res.json();
        setAutoOwners(data);
        setAutoSelectedIds(new Set(data.map((u) => u.id)));
      }
    } catch { /* ignore */ }
    finally { setAutoLoadingOwners(false); }
  }

  async function handleAutoAdd() {
    if (!autoContestId || autoSelectedIds.size === 0) return;
    setAutoAdding(true);
    setAutoResult(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/nominations/auto-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contestId: autoContestId,
          petType: autoPetType || undefined,
          userIds: Array.from(autoSelectedIds),
          sendEmail: autoSendEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setAutoResult(data);
      // Refresh list (added users will be excluded now)
      fetchAutoOwners();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Auto-add failed" });
    } finally {
      setAutoAdding(false);
    }
  }

  function toggleAutoOwner(id: string) {
    setAutoSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAutoAll() {
    if (autoSelectedIds.size === autoOwners.length) {
      setAutoSelectedIds(new Set());
    } else {
      setAutoSelectedIds(new Set(autoOwners.map((u) => u.id)));
    }
  }

  function parseCSV(text: string): Recipient[] {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const parsed: Recipient[] = [];
    for (const line of lines) {
      // Support comma or tab separated
      const parts = line.includes("\t") ? line.split("\t") : line.split(",");
      const clean = parts.map((p) => p.trim().replace(/^["']|["']$/g, ""));
      // Skip header row
      if (parsed.length === 0 && /^(name|email)/i.test(clean[0])) continue;
      const [name, email, petName] = clean;
      if (name && email) {
        parsed.push({ id: nextId++, name, email, petName: petName || "" });
      }
    }
    return parsed;
  }

  function handleCSVImport() {
    const rows = parseCSV(csvText);
    if (rows.length === 0) {
      setMessage({ type: "error", text: "No valid rows found. Format: name, email, pet name (optional)" });
      return;
    }
    // Replace empty default row or append
    const hasData = recipients.some((r) => r.name.trim() || r.email.trim());
    setRecipients(hasData ? [...recipients, ...rows] : rows);
    setCsvText("");
    setMessage({ type: "success", text: `Imported ${rows.length} recipient${rows.length > 1 ? "s" : ""} from CSV` });
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length === 0) {
        setMessage({ type: "error", text: "No valid rows in file. Format: name, email, pet name (optional)" });
        return;
      }
      const hasData = recipients.some((r) => r.name.trim() || r.email.trim());
      setRecipients(hasData ? [...recipients, ...rows] : rows);
      setMessage({ type: "success", text: `Imported ${rows.length} recipient${rows.length > 1 ? "s" : ""} from file` });
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // Manual form helpers
  function updateRecipient(id: number, field: keyof Recipient, value: string) {
    setRecipients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }

  function addRecipient() {
    setRecipients((prev) => [...prev, emptyRecipient()]);
  }

  function removeRecipient(id: number) {
    setRecipients((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.id !== id)));
  }

  // Existing users helpers
  function toggleOwner(id: string) {
    setSelectedOwnerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedOwnerIds.size === petOwners.length) {
      setSelectedOwnerIds(new Set());
    } else {
      setSelectedOwnerIds(new Set(petOwners.map((u) => u.id)));
    }
  }

  // ─── Send Job helpers ───────────────────────────────────────────────────────
  function updateJobState(updates: Partial<SendJob & { id: string }>, dbJobId?: string) {
    setSendJob((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      const id = dbJobId ?? (prev as SendJob & { id?: string }).id;
      if (id) {
        fetch("/api/admin/nominations/send-job", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            sent: next.sent,
            failed: next.failed,
            status: next.status,
          }),
        }).catch(() => null);
      }
      return next;
    });
  }

  function clearJob() {
    const id = (sendJob as (SendJob & { id?: string }) | null)?.id;
    if (id) {
      fetch(`/api/admin/nominations/send-job?id=${id}`, { method: "DELETE" }).catch(() => null);
    }
    setSendJob(null);
  }

  // Send nominations (shared logic) — supports stop / pause / resume
  async function sendNominations(
    targetContestId: string,
    recipientList: Array<{ email: string; name: string; petName?: string }>,
    resumeFrom = 0,
    resumeJob?: SendJob
  ) {
    setMessage(null);
    stopRef.current = false;
    pauseRef.current = false;
    loopActiveRef.current = true;

    const contestName = contests.find((c) => c.id === targetContestId)?.name ?? "";
    const batchSize = 50;

    let dbJobId: string | undefined;

    if (resumeJob) {
      // Resuming an existing job — update its status to running
      const existing = resumeJob as SendJob & { id?: string };
      dbJobId = existing.id;
      if (dbJobId) {
        await fetch("/api/admin/nominations/send-job", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: dbJobId, status: "running" }),
        }).catch(() => null);
      }
      const running = { ...resumeJob, status: "running" as const };
      setSendJob(running);
    } else {
      // New job — create in DB
      const createRes = await fetch("/api/admin/nominations/send-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contestId: targetContestId,
          contestName,
          recipients: recipientList,
          total: recipientList.length,
        }),
      });
      if (createRes.ok) {
        const { job } = await createRes.json();
        dbJobId = job.id;
        setSendJob({ ...job, recipients: recipientList });
      } else {
        // Fallback — proceed without DB tracking
        setSendJob({
          contestId: targetContestId,
          contestName,
          recipients: recipientList,
          total: recipientList.length,
          sent: 0,
          failed: 0,
          status: "running",
          startedAt: Date.now(),
        });
      }
    }

    setSending(true);

    let totalSent = resumeJob ? resumeJob.sent : 0;
    let totalFailed = resumeJob ? resumeJob.failed : 0;

    for (let i = resumeFrom; i < recipientList.length; i += batchSize) {
      // Check stop
      if (stopRef.current) {
        updateJobState({ sent: totalSent, failed: totalFailed, status: "stopped" }, dbJobId);
        setSending(false);
        loopActiveRef.current = false;
        return;
      }

      // Check pause — wait by polling until unpaused or stopped
      if (pauseRef.current) {
        updateJobState({ sent: totalSent, failed: totalFailed, status: "paused" }, dbJobId);
        setSending(false);
        await new Promise<void>((resolve) => {
          const check = setInterval(() => {
            if (!pauseRef.current || stopRef.current) {
              clearInterval(check);
              resolve();
            }
          }, 300);
        });
        if (stopRef.current) {
          updateJobState({ sent: totalSent, failed: totalFailed, status: "stopped" }, dbJobId);
          loopActiveRef.current = false;
          return;
        }
        setSending(true);
        updateJobState({ sent: totalSent, failed: totalFailed, status: "running" }, dbJobId);
      }

      const batch = recipientList.slice(i, i + batchSize);
      try {
        const res = await fetch("/api/admin/nominations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contestId: targetContestId, recipients: batch }),
        });
        const data = await res.json();
        if (res.ok) {
          totalSent += data.sent ?? 0;
          totalFailed += data.failed ?? 0;
        } else {
          totalFailed += batch.length;
        }
      } catch {
        totalFailed += batch.length;
      }

      updateJobState({ sent: totalSent, failed: totalFailed, status: "running" }, dbJobId);
    }

    // All batches done
    updateJobState({ sent: totalSent, failed: totalFailed, status: "done" }, dbJobId);
    setSending(false);
    loopActiveRef.current = false;

    const total = totalSent + totalFailed;
    const msg =
      totalFailed > 0
        ? `Sent ${totalSent}/${total} nominations. ${totalFailed} failed.`
        : `All ${totalSent} nomination${totalSent > 1 ? "s" : ""} sent successfully!`;
    setMessage({ type: totalFailed > 0 ? "error" : "success", text: msg });
    fetchNominations();
  }

  function handleResume() {
    if (!sendJob || !sendJob.recipients.length) return;
    const resumeFrom = sendJob.sent + sendJob.failed;
    sendNominations(sendJob.contestId, sendJob.recipients, resumeFrom, sendJob);
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valid = recipients.filter((r) => r.email.trim() && r.name.trim());
    if (valid.length === 0) {
      setMessage({ type: "error", text: "Add at least one recipient with name and email" });
      return;
    }
    await sendNominations(
      contestId,
      valid.map((r) => ({
        email: r.email.trim(),
        name: r.name.trim(),
        petName: r.petName.trim() || undefined,
      }))
    );
    setRecipients([emptyRecipient()]);
    setContestId("");
  }

  async function handleExistingSubmit(e: React.FormEvent) {
    e.preventDefault();
    const selected = petOwners.filter((u) => selectedOwnerIds.has(u.id) && u.email);
    if (selected.length === 0) {
      setMessage({ type: "error", text: "Select at least one user" });
      return;
    }
    const recipientList = selected.map((u) => ({
      email: u.email!,
      name: u.name || u.email!,
      petName: u.pets[0]?.name,
    }));
    await sendNominations(existContestId, recipientList);
    // Re-fetch to update the list (they'll now be excluded)
    fetchPetOwners();
  }

  const selectedContest = contests.find((c) => c.id === contestId);
  const existSelectedContest = contests.find((c) => c.id === existContestId);

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-800",
      SENT: "bg-blue-100 text-blue-800",
      SIGNED_UP: "bg-green-100 text-green-800",
      ENTERED: "bg-purple-100 text-purple-800",
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-800"}`}>
        {status}
      </span>
    );
  };

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
      tab === t
        ? "border-red-500 text-red-600 bg-white"
        : "border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300"
    }`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Nominate</h1>
        <p className="mt-1 text-sm text-surface-500">
          Send nomination emails to get pet owners into contests. Choose manual entry or invite existing users.
        </p>
      </div>

      {/* ─── Global Send Progress Panel ─── */}
      {sendJob && (
        <div className={`rounded-xl border shadow-sm p-4 ${
          sendJob.status === "done" ? "bg-green-50 border-green-200"
          : sendJob.status === "stopped" ? "bg-red-50 border-red-200"
          : sendJob.status === "paused" ? "bg-amber-50 border-amber-200"
          : "bg-blue-50 border-blue-200"
        }`}>
          {/* Header row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {sendJob.status === "running" && (
                <svg className="animate-spin h-4 w-4 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              <span className={`text-sm font-semibold ${
                sendJob.status === "done" ? "text-green-800"
                : sendJob.status === "stopped" ? "text-red-800"
                : sendJob.status === "paused" ? "text-amber-800"
                : "text-blue-800"
              }`}>
                {sendJob.status === "done" ? "✅ Sending complete"
                  : sendJob.status === "stopped" ? "⛔ Sending stopped"
                  : sendJob.status === "paused" ? "⏸ Sending paused"
                  : "📤 Sending nominations..."}
              </span>
              <span className="text-xs text-surface-500">{sendJob.contestName}</span>
            </div>
            {(sendJob.status === "done" || sendJob.status === "stopped") && (
              <button
                onClick={clearJob}
                className="text-xs text-surface-400 hover:text-surface-600 transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full bg-white/60 rounded-full h-2.5 mb-3 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-300 ${
                sendJob.status === "done" ? "bg-green-500"
                : sendJob.status === "stopped" ? "bg-red-400"
                : sendJob.status === "paused" ? "bg-amber-400"
                : "bg-blue-500"
              }`}
              style={{ width: `${sendJob.total > 0 ? (Math.min((sendJob.sent + sendJob.failed) / sendJob.total, 1) * 100) : 0}%` }}
            />
          </div>

          {/* Counts + controls row */}
          <div className="flex items-center justify-between">
            <div className="flex gap-4 text-xs">
              <span className="text-surface-600">
                Sent: <strong className="text-green-700">{sendJob.sent}</strong>
              </span>
              {sendJob.failed > 0 && (
                <span className="text-surface-600">
                  Failed: <strong className="text-red-600">{sendJob.failed}</strong>
                </span>
              )}
              <span className="text-surface-500">
                Total: <strong>{sendJob.total}</strong>
              </span>
              {sendJob.status !== "done" && sendJob.status !== "stopped" && (
                <span className="text-surface-400">
                  {sendJob.total - sendJob.sent - sendJob.failed} remaining
                </span>
              )}
            </div>

            {/* Control buttons */}
            <div className="flex gap-2">
              {sendJob.status === "running" && (
                <>
                  <button
                    onClick={() => { pauseRef.current = true; }}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                  >
                    ⏸ Pause
                  </button>
                  <button
                    onClick={() => { stopRef.current = true; pauseRef.current = false; }}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                  >
                    ⛔ Stop
                  </button>
                </>
              )}
              {sendJob.status === "paused" && (
                <>
                  <button
                    onClick={() => {
                      if (loopActiveRef.current) {
                        // Loop is alive (in-session pause) — just unpause it
                        pauseRef.current = false;
                      } else {
                        // Loop is dead (page was refreshed) — restart from saved offset
                        handleResume();
                      }
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                  >
                    ▶ Resume
                  </button>
                  <button
                    onClick={() => { stopRef.current = true; pauseRef.current = false; updateJobState({ status: "stopped" }); }}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                  >
                    ⛔ Stop
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-200">
        <button type="button" className={tabClass("manual")} onClick={() => { setTab("manual"); setMessage(null); }}>
          Manual Entry
        </button>
        <button type="button" className={tabClass("existing")} onClick={() => { setTab("existing"); setMessage(null); }}>
          Existing Users
        </button>
        <button type="button" className={tabClass("autoadd")} onClick={() => { setTab("autoadd"); setMessage(null); }}>
          ⚡ Auto-Add to Contest
        </button>
      </div>

      {/* ─── Manual Tab ─── */}
      {tab === "manual" && (
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-surface-900 mb-4">Send Nominations</h2>
          <form onSubmit={handleManualSubmit} className="space-y-5">
            {/* Contest selector */}
            <div className="max-w-md">
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Contest <span className="text-red-500">*</span>
              </label>
              <select
                value={contestId}
                onChange={(e) => setContestId(e.target.value)}
                required
                className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              >
                <option value="">Select a contest...</option>
                {contests.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.petType})
                  </option>
                ))}
              </select>
              {selectedContest && (
                <p className="mt-1.5 text-xs text-surface-400">
                  Ends {new Date(selectedContest.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>

            {/* CSV Import */}
            <div className="rounded-lg border border-dashed border-surface-300 p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-surface-700">Import from CSV</label>
                <label className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors cursor-pointer">
                  <input type="file" accept=".csv,.txt,.tsv" onChange={handleFileUpload} className="hidden" />
                  Upload file
                </label>
              </div>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={"Paste CSV here — one per line:\nJohn Doe, john@email.com, Buddy\nJane Smith, jane@email.com"}
                rows={3}
                className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-y"
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-surface-400">Format: name, email, pet name (optional). Headers auto-skipped.</p>
                <button
                  type="button"
                  onClick={handleCSVImport}
                  disabled={!csvText.trim()}
                  className="text-xs font-medium text-red-500 hover:text-red-600 disabled:text-surface-300 disabled:cursor-not-allowed transition-colors"
                >
                  Import rows
                </button>
              </div>
            </div>

            {/* Recipients */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-surface-700">
                  Recipients <span className="text-surface-400">({recipients.length})</span>
                </label>
                <button
                  type="button"
                  onClick={addRecipient}
                  className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
                >
                  + Add another
                </button>
              </div>
              <div className="space-y-2">
                {recipients.map((r, idx) => (
                  <div key={r.id} className="flex items-center gap-2">
                    <span className="text-xs text-surface-400 w-5 text-right shrink-0">{idx + 1}.</span>
                    <input
                      type="text"
                      value={r.name}
                      onChange={(e) => updateRecipient(r.id, "name", e.target.value)}
                      placeholder="Name"
                      className="flex-1 min-w-0 rounded-lg border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    />
                    <input
                      type="email"
                      value={r.email}
                      onChange={(e) => updateRecipient(r.id, "email", e.target.value)}
                      placeholder="Email"
                      className="flex-1 min-w-0 rounded-lg border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    />
                    <input
                      type="text"
                      value={r.petName}
                      onChange={(e) => updateRecipient(r.id, "petName", e.target.value)}
                      placeholder="Pet name (optional)"
                      className="flex-1 min-w-0 rounded-lg border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeRecipient(r.id)}
                      className="shrink-0 p-1.5 text-surface-400 hover:text-red-500 transition-colors"
                      title="Remove"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-surface-400">No recipient limit — auto-batched in groups of 50 with 2s delay between emails.</p>
            </div>

            {message && tab === "manual" && (
              <div className={`rounded-lg px-4 py-3 text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={sending || !contestId || recipients.filter((r) => r.email.trim() && r.name.trim()).length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  Send {recipients.filter((r) => r.email.trim() && r.name.trim()).length > 1
                    ? `${recipients.filter((r) => r.email.trim() && r.name.trim()).length} Nominations`
                    : "Nomination"}
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ─── Existing Users Tab ─── */}
      {tab === "existing" && (
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-surface-900 mb-1">Invite Existing Pet Owners</h2>
          <p className="text-sm text-surface-500 mb-5">
            Select a pet type to load all users with that pet. Users already entered or nominated for this contest are excluded.
          </p>
          <form onSubmit={handleExistingSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              {/* Contest */}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Contest <span className="text-red-500">*</span>
                </label>
                <select
                  value={existContestId}
                  onChange={(e) => setExistContestId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                >
                  <option value="">Select a contest...</option>
                  {contests.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.petType})
                    </option>
                  ))}
                </select>
                {existSelectedContest && (
                  <p className="mt-1.5 text-xs text-surface-400">
                    Ends {new Date(existSelectedContest.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </div>
              {/* Pet Type */}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Pet Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={filterPetType}
                  onChange={(e) => setFilterPetType(e.target.value)}
                  required
                  className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                >
                  <option value="">Select type...</option>
                  <option value="DOG">Dogs</option>
                  <option value="CAT">Cats</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            {/* Users list */}
            {loadingOwners && (
              <div className="flex items-center gap-2 text-sm text-surface-400 py-4">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading pet owners...
              </div>
            )}

            {!loadingOwners && filterPetType && petOwners.length === 0 && (
              <div className="rounded-lg bg-surface-50 px-4 py-3 text-sm text-surface-500">
                No eligible users found. They may already be entered or nominated for this contest.
              </div>
            )}

            {!loadingOwners && petOwners.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-surface-700">
                    {selectedOwnerIds.size} of {petOwners.length} users selected
                  </span>
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
                  >
                    {selectedOwnerIds.size === petOwners.length ? "Deselect all" : "Select all"}
                  </button>
                </div>
                <div className="border border-surface-200 rounded-lg max-h-72 overflow-y-auto divide-y divide-surface-100">
                  {petOwners.map((u) => (
                    <label
                      key={u.id}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-surface-50 transition-colors ${
                        selectedOwnerIds.has(u.id) ? "bg-red-50/40" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedOwnerIds.has(u.id)}
                        onChange={() => toggleOwner(u.id)}
                        className="h-4 w-4 rounded border-surface-300 text-red-500 focus:ring-red-500/20"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-surface-900">{u.name || "No name"}</span>
                        <span className="text-sm text-surface-400 ml-2">{u.email}</span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {u.pets.map((p) => (
                          <span
                            key={p.id}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-100 text-surface-600"
                          >
                            {p.name}
                          </span>
                        ))}
                      </div>
                    </label>
                  ))}
                </div>
                {petOwners.length > 50 && (
                  <p className="mt-2 text-xs text-amber-600">
                    {petOwners.length} users selected — will be sent in batches of 50 with 2s delay between each.
                  </p>
                )}
              </div>
            )}

            {message && tab === "existing" && (
              <div className={`rounded-lg px-4 py-3 text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={sending || selectedOwnerIds.size === 0 || !existContestId}
              className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  Invite {selectedOwnerIds.size} User{selectedOwnerIds.size !== 1 ? "s" : ""} to Contest
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ─── Auto-Add Tab ─── */}
      {tab === "autoadd" && (
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-surface-900 mb-1">⚡ Auto-Add Pets to Contest</h2>
          <p className="text-sm text-surface-500 mb-5">
            Select users and automatically add their pets into a contest. They&apos;ll get a notification email telling them they&apos;re in!
          </p>

          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              {/* Contest */}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Contest <span className="text-red-500">*</span>
                </label>
                <select
                  value={autoContestId}
                  onChange={(e) => setAutoContestId(e.target.value)}
                  className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                >
                  <option value="">Select a contest...</option>
                  {contests.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.petType})
                    </option>
                  ))}
                </select>
                {contests.find((c) => c.id === autoContestId) && (
                  <p className="mt-1.5 text-xs text-surface-400">
                    Ends {new Date(contests.find((c) => c.id === autoContestId)!.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </div>
              {/* Pet Type */}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Pet Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={autoPetType}
                  onChange={(e) => setAutoPetType(e.target.value)}
                  className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                >
                  <option value="">Select type...</option>
                  <option value="DOG">Dogs</option>
                  <option value="CAT">Cats</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            {/* Send Email toggle */}
            <label className="flex items-center gap-2 text-sm text-surface-600 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSendEmail}
                onChange={(e) => setAutoSendEmail(e.target.checked)}
                className="h-4 w-4 rounded border-surface-300 text-red-500 focus:ring-red-500/20"
              />
              Send notification email to users when adding them
            </label>

            {/* Loading */}
            {autoLoadingOwners && (
              <div className="flex items-center gap-2 text-sm text-surface-400 py-4">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading eligible users...
              </div>
            )}

            {/* No users */}
            {!autoLoadingOwners && autoContestId && autoPetType && autoOwners.length === 0 && (
              <div className="rounded-lg bg-surface-50 px-4 py-3 text-sm text-surface-500">
                No eligible users found. All users with that pet type are already entered in this contest.
              </div>
            )}

            {/* Users list */}
            {!autoLoadingOwners && autoOwners.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-surface-700">
                    {autoSelectedIds.size} of {autoOwners.length} users selected
                  </span>
                  <button
                    type="button"
                    onClick={toggleAutoAll}
                    className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
                  >
                    {autoSelectedIds.size === autoOwners.length ? "Deselect all" : "Select all"}
                  </button>
                </div>
                <div className="border border-surface-200 rounded-lg max-h-72 overflow-y-auto divide-y divide-surface-100">
                  {autoOwners.map((u) => (
                    <label
                      key={u.id}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-surface-50 transition-colors ${
                        autoSelectedIds.has(u.id) ? "bg-green-50/40" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={autoSelectedIds.has(u.id)}
                        onChange={() => toggleAutoOwner(u.id)}
                        className="h-4 w-4 rounded border-surface-300 text-green-500 focus:ring-green-500/20"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-surface-900">{u.name || "No name"}</span>
                        <span className="text-sm text-surface-400 ml-2">{u.email}</span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {u.pets.map((p) => (
                          <span
                            key={p.id}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700"
                          >
                            {p.name}
                          </span>
                        ))}
                      </div>
                    </label>
                  ))}
                </div>
                {autoOwners.length > 50 && (
                  <p className="mt-2 text-xs text-amber-600">
                    {autoOwners.length} users — emails will be sent in batches with rate limiting.
                  </p>
                )}
              </div>
            )}

            {/* Messages */}
            {message && tab === "autoadd" && (
              <div className={`rounded-lg px-4 py-3 text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}>
                {message.text}
              </div>
            )}

            {/* Result */}
            {autoResult && (
              <div className={`rounded-lg px-4 py-3 border ${autoResult.emailsFailed > 0 ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"}`}>
                <p className={`text-sm font-semibold ${autoResult.emailsFailed > 0 ? "text-yellow-700" : "text-green-700"}`}>
                  ✅ Auto-Add Complete
                </p>
                <div className="flex flex-wrap gap-4 mt-2 text-sm">
                  <span className="text-surface-600">Pets Added: <strong>{autoResult.added}</strong></span>
                  <span className="text-green-600">Emails Sent: <strong>{autoResult.emailsSent}</strong></span>
                  {autoResult.emailsFailed > 0 && <span className="text-red-600">Failed: <strong>{autoResult.emailsFailed}</strong></span>}
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="button"
              onClick={handleAutoAdd}
              disabled={autoAdding || !autoContestId || autoSelectedIds.size === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {autoAdding ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Adding &amp; Emailing...
                </>
              ) : (
                <>
                  ⚡ Add {autoSelectedIds.size} User{autoSelectedIds.size !== 1 ? "s" : ""} to Contest {autoSendEmail ? "& Notify" : ""}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Nominations History */}
      <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-100">
          <h2 className="text-lg font-semibold text-surface-900">Nomination History</h2>
          <p className="text-sm text-surface-500 mt-0.5">{nominations.length} nominations sent</p>
        </div>
        {loading ? (
          <div className="p-8 text-center text-surface-400">Loading...</div>
        ) : nominations.length === 0 ? (
          <div className="p-8 text-center text-surface-400">No nominations yet. Send your first one above!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-50 text-surface-500 text-left">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Pet</th>
                  <th className="px-4 py-3 font-medium">Contest</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {nominations.map((n) => (
                  <tr key={n.id} className="hover:bg-surface-50/50">
                    <td className="px-4 py-3 font-medium text-surface-900">{n.name}</td>
                    <td className="px-4 py-3 text-surface-600">{n.email}</td>
                    <td className="px-4 py-3 text-surface-600">{n.petName || "—"}</td>
                    <td className="px-4 py-3 text-surface-600">{n.contest.name}</td>
                    <td className="px-4 py-3">{statusBadge(n.status)}</td>
                    <td className="px-4 py-3 text-surface-400">
                      {n.sentAt
                        ? new Date(n.sentAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
