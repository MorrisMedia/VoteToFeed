"use client";

import { useState, useEffect, useCallback } from "react";

// ─── TYPES ───────────────────────────────────────────────

type PetInfo = {
  id: string;
  name: string;
  type: string;
  breed: string | null;
  photo: string | null;
  isActive: boolean;
  currentWeekVotes: number;
  currentWeekRank: number | null;
};

type DemoAccount = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  freeVotesRemaining: number;
  paidVoteBalance: number;
  createdAt: string;
  pets: PetInfo[];
  votesGiven: number;
  commentsGiven: number;
  scheduledComments: number;
};

type ScheduledVoteBatch = {
  id: string;
  petName: string;
  petType: string;
  seedEmail: string;
  votesAmount: number;
  scheduledFor: string;
};

type ScheduledVoteCounts = {
  pending: number;
  processing: number;
  processed: number;
  failed: number;
};

// ─── MAIN COMPONENT ─────────────────────────────────────

export function AdminEngagementManagement() {
  const [tab, setTab] = useState<"accounts" | "auto-vote" | "queue">("accounts");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Engagement Management</h1>
        <p className="text-sm text-surface-500 mt-1">Manage demo accounts, grant votes, and schedule auto-voting campaigns</p>
      </div>

      <div className="flex gap-2 border-b border-surface-200 pb-2">
        {(
          [
            { id: "accounts", label: "👤 Demo Accounts", desc: "View & manage" },
            { id: "auto-vote", label: "🗳️ Auto-Vote", desc: "Schedule campaigns" },
            { id: "queue", label: "📋 Vote Queue", desc: "Monitor scheduled" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? "bg-brand-600 text-white" : "text-surface-600 hover:bg-surface-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "accounts" && <AccountsTab />}
      {tab === "auto-vote" && <AutoVoteTab />}
      {tab === "queue" && <VoteQueueTab />}
    </div>
  );
}

// ─── ACCOUNTS TAB ────────────────────────────────────────

function AccountsTab() {
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEngagements, setTotalEngagements] = useState(0);
  const [grantModal, setGrantModal] = useState<{ account: DemoAccount; pet?: PetInfo } | null>(null);
  const [grantAmount, setGrantAmount] = useState(10);
  const [granting, setGranting] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/engagement/accounts");
      const data = await res.json();
      setAccounts(data.accounts || []);
      setTotalEngagements(data.totalEngagements || 0);
    } catch {
      setMsg("Failed to load accounts");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const grantVotes = async () => {
    if (!grantModal) return;
    setGranting(true);
    try {
      const res = await fetch("/api/admin/engagement/grant-votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: grantModal.account.id,
          petId: grantModal.pet?.id || undefined,
          amount: grantAmount,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(data.message);
        setGrantModal(null);
        fetchAccounts();
      } else {
        setMsg(data.error || "Failed");
      }
    } catch {
      setMsg("Request failed");
    }
    setGranting(false);
    setTimeout(() => setMsg(""), 4000);
  };

  if (loading) {
    return <div className="py-12 text-center text-surface-500">Loading demo accounts...</div>;
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`rounded-lg px-4 py-2 text-sm ${msg.includes("Failed") || msg.includes("failed") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {msg}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-surface-200 bg-white p-4">
          <div className="text-2xl font-bold text-surface-900">{accounts.length}</div>
          <div className="text-xs text-surface-500">Demo Accounts</div>
        </div>
        <div className="rounded-xl border border-surface-200 bg-white p-4">
          <div className="text-2xl font-bold text-surface-900">{accounts.reduce((s, a) => s + a.pets.length, 0)}</div>
          <div className="text-xs text-surface-500">Demo Pets</div>
        </div>
        <div className="rounded-xl border border-surface-200 bg-white p-4">
          <div className="text-2xl font-bold text-surface-900">{accounts.reduce((s, a) => s + a.votesGiven, 0)}</div>
          <div className="text-xs text-surface-500">Total Votes Given</div>
        </div>
        <div className="rounded-xl border border-surface-200 bg-white p-4">
          <div className="text-2xl font-bold text-surface-900">{totalEngagements}</div>
          <div className="text-xs text-surface-500">Total Engagements</div>
        </div>
      </div>

      {/* Account cards */}
      <div className="space-y-3">
        {accounts.map((account) => (
          <div key={account.id} className="rounded-xl border border-surface-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {account.image && (
                  <img src={account.image} alt="" className="h-10 w-10 rounded-full object-cover" />
                )}
                <div>
                  <div className="font-semibold text-surface-900">{account.name}</div>
                  <div className="text-xs text-surface-500">{account.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-surface-500">
                <span>❤️ {account.votesGiven}</span>
                <span>💬 {account.commentsGiven}</span>
                <button
                  onClick={() => {
                    setGrantModal({ account });
                    setGrantAmount(100);
                  }}
                  className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                >
                  💰 Grant Balance
                </button>
              </div>
            </div>

            {/* Pets */}
            {account.pets.length > 0 && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {account.pets.map((pet) => (
                  <div
                    key={pet.id}
                    className="flex items-center gap-3 rounded-lg bg-surface-50 p-3"
                  >
                    {pet.photo && (
                      <img src={pet.photo} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-surface-800 text-sm truncate">{pet.name}</span>
                        <span className="text-[10px] rounded-full px-1.5 py-0.5 bg-surface-200 text-surface-600">{pet.type}</span>
                        {!pet.isActive && <span className="text-[10px] rounded-full px-1.5 py-0.5 bg-red-100 text-red-600">Inactive</span>}
                      </div>
                      <div className="text-xs text-surface-500">
                        {pet.breed || "Unknown breed"} · {pet.currentWeekVotes} votes
                        {pet.currentWeekRank && ` · #${pet.currentWeekRank}`}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setGrantModal({ account, pet });
                        setGrantAmount(10);
                      }}
                      className="rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition-colors whitespace-nowrap"
                    >
                      🗳️ Grant Votes
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {accounts.length === 0 && (
          <div className="rounded-xl border border-surface-200 bg-white p-8 text-center text-surface-400">
            No demo accounts found. Go to Dashboard → Engagement tab → Seed Engagements to create them.
          </div>
        )}
      </div>

      {/* Grant Modal */}
      {grantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setGrantModal(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-surface-900">
              {grantModal.pet ? `Grant Votes to ${grantModal.pet.name}` : `Add Balance to ${grantModal.account.name}`}
            </h3>
            <p className="text-sm text-surface-500 mt-1">
              {grantModal.pet
                ? `Creates actual votes on this pet from ${grantModal.account.email}. Updates leaderboard.`
                : `Adds paid vote balance to this demo account.`}
            </p>

            <div className="mt-4">
              <label className="block text-xs font-medium text-surface-600 mb-1">Amount</label>
              <input
                type="number"
                min={1}
                max={10000}
                value={grantAmount}
                onChange={(e) => setGrantAmount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <div className="flex gap-2 mt-2">
                {[5, 10, 25, 50, 100, 500].map((n) => (
                  <button
                    key={n}
                    onClick={() => setGrantAmount(n)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      grantAmount === n ? "bg-brand-600 text-white" : "bg-surface-100 text-surface-600 hover:bg-surface-200"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={grantVotes}
                disabled={granting}
                className="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {granting ? "Granting..." : `Grant ${grantAmount} ${grantModal.pet ? "Votes" : "Balance"}`}
              </button>
              <button
                onClick={() => setGrantModal(null)}
                className="rounded-lg bg-surface-100 px-4 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AUTO-VOTE TAB ───────────────────────────────────────

type ContestOption = { id: string; name: string; petType: string | null; endDate: string };
type DemoPetItem = { id: string; name: string; type: string; breed: string | null; photo: string | null; weekVotes: number; weekRank: number | null };

function AutoVoteTab() {
  const [mode, setMode] = useState<"all_pets" | "demo_pets" | "specific_pets">("all_pets");
  const [totalVotes, setTotalVotes] = useState(100);
  const [spreadHours, setSpreadHours] = useState(24);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  // Contest filter (for all_pets and demo_pets modes)
  const [contests, setContests] = useState<ContestOption[]>([]);
  const [contestFilter, setContestFilter] = useState<string>(""); // "" = all contests

  // Demo pets list (for demo_pets mode with specific contest)
  const [demoPets, setDemoPets] = useState<DemoPetItem[]>([]);
  const [selectedDemoPetIds, setSelectedDemoPetIds] = useState<string[]>([]);
  const [loadingDemoPets, setLoadingDemoPets] = useState(false);

  // For specific_pets mode
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; type: string; ownerName: string }>>([]);
  const [selectedPets, setSelectedPets] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [searching, setSearching] = useState(false);

  // Load contests on mount
  useEffect(() => {
    fetch("/api/admin/engagement/auto-vote")
      .then((r) => r.json())
      .then((d) => setContests(d.contests || []))
      .catch(() => {});
  }, []);

  // When demo_pets mode + contestFilter changes, load demo pets for that contest
  useEffect(() => {
    if (mode !== "demo_pets") return;
    setLoadingDemoPets(true);
    const url = contestFilter
      ? `/api/admin/engagement/auto-vote?contestId=${contestFilter}`
      : "/api/admin/engagement/auto-vote";
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        const pets: DemoPetItem[] = d.pets || [];
        setDemoPets(pets);
        setSelectedDemoPetIds(pets.map((p) => p.id)); // select all by default
      })
      .catch(() => {})
      .finally(() => setLoadingDemoPets(false));
  }, [mode, contestFilter]);

  const searchPets = async () => {
    if (searchQuery.length < 2) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/pets?search=${encodeURIComponent(searchQuery)}&limit=10`);
      const data = await res.json();
      setSearchResults(
        (data.pets || []).map((p: { id: string; name: string; type: string; ownerName: string }) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          ownerName: p.ownerName,
        })),
      );
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  };

  const toggleDemoPet = (id: string) => {
    setSelectedDemoPetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const scheduleVotes = async () => {
    setSubmitting(true);
    setResult(null);
    try {
      // For demo_pets mode: if contest selected, send selected pet IDs (specific_pets)
      // For all_pets/demo_pets without selection filtering, pass contestId
      let body: Record<string, unknown>;
      if (mode === "demo_pets" && demoPets.length > 0) {
        body = {
          mode: "specific_pets",
          targetPetIds: selectedDemoPetIds,
          totalVotes,
          spreadHours,
        };
      } else {
        body = {
          mode,
          targetPetIds: mode === "specific_pets" ? selectedPets.map((p) => p.id) : undefined,
          totalVotes,
          spreadHours,
          contestId: (mode === "all_pets" || mode === "demo_pets") && contestFilter ? contestFilter : undefined,
        };
      }

      const res = await fetch("/api/admin/engagement/auto-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(JSON.stringify(data, null, 2));
        setMsg(`Scheduled ${data.totalScheduled} votes across ${data.targetPetsCount} pets!`);
      } else {
        setMsg(data.error || "Failed to schedule");
      }
    } catch {
      setMsg("Request failed");
    }
    setSubmitting(false);
    setTimeout(() => setMsg(""), 5000);
  };

  const isDisabled =
    submitting ||
    (mode === "specific_pets" && selectedPets.length === 0) ||
    (mode === "demo_pets" && demoPets.length > 0 && selectedDemoPetIds.length === 0);

  const selectedContest = contests.find((c) => c.id === contestFilter);

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`rounded-lg px-4 py-2 text-sm ${msg.includes("Failed") || msg.includes("failed") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {msg}
        </div>
      )}

      <div className="rounded-xl border border-surface-200 bg-white p-6 space-y-5">
        <div>
          <h3 className="text-lg font-bold text-surface-900">Schedule Auto-Vote Campaign</h3>
          <p className="text-sm text-surface-500 mt-1">
            Demo accounts will gradually vote on target pets over the specified time window. Votes are processed every 5 minutes by cron.
          </p>
        </div>

        {/* Mode */}
        <div>
          <label className="block text-xs font-semibold text-surface-700 mb-2">Target Mode</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(
              [
                { id: "all_pets", label: "🌍 All Real Pets", desc: "Vote on all non-demo pets" },
                { id: "demo_pets", label: "🤖 Demo Pets Only", desc: "Boost demo account pets" },
                { id: "specific_pets", label: "🎯 Specific Pets", desc: "Pick exact pets to boost" },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setMode(m.id);
                  setContestFilter("");
                  setDemoPets([]);
                  setSelectedDemoPetIds([]);
                }}
                className={`rounded-xl border-2 p-3 text-left transition-all ${
                  mode === m.id
                    ? "border-brand-500 bg-brand-50"
                    : "border-surface-200 bg-white hover:border-surface-300"
                }`}
              >
                <div className="font-semibold text-sm text-surface-900">{m.label}</div>
                <div className="text-xs text-surface-500 mt-0.5">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Contest filter — shown for all_pets and demo_pets modes */}
        {(mode === "all_pets" || mode === "demo_pets") && (
          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-2">
              Filter by Contest
            </label>
            <select
              value={contestFilter}
              onChange={(e) => setContestFilter(e.target.value)}
              className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="">🌐 All Contests</option>
              {contests.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.petType ? ` (${c.petType})` : ""} — ends {new Date(c.endDate).toLocaleDateString()}
                </option>
              ))}
            </select>
            {selectedContest && (
              <p className="text-xs text-surface-500 mt-1.5">
                Contest: <span className="font-medium text-surface-700">{selectedContest.name}</span>
                {selectedContest.petType && <span className="ml-1 text-surface-400">· {selectedContest.petType}</span>}
              </p>
            )}
          </div>
        )}

        {/* Demo Pets checklist — shown when demo_pets mode */}
        {mode === "demo_pets" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-surface-700">
                Demo Pets{contestFilter ? " in Contest" : ""}{" "}
                <span className="font-normal text-surface-400">({demoPets.length} total)</span>
              </label>
              {demoPets.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedDemoPetIds(demoPets.map((p) => p.id))}
                    className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                  >
                    Select All
                  </button>
                  <span className="text-surface-300">·</span>
                  <button
                    onClick={() => setSelectedDemoPetIds([])}
                    className="text-xs text-surface-500 hover:text-red-600 font-medium"
                  >
                    Deselect All
                  </button>
                </div>
              )}
            </div>

            {loadingDemoPets ? (
              <div className="py-6 text-center text-sm text-surface-400">Loading pets...</div>
            ) : demoPets.length === 0 ? (
              <div className="rounded-lg border border-surface-200 p-4 text-center text-sm text-surface-400">
                {contestFilter ? "No demo pets in this contest." : "No active demo pets found."}
              </div>
            ) : (
              <div className="rounded-lg border border-surface-200 divide-y divide-surface-100 max-h-64 overflow-y-auto">
                {demoPets.map((pet) => {
                  const selected = selectedDemoPetIds.includes(pet.id);
                  return (
                    <button
                      key={pet.id}
                      onClick={() => toggleDemoPet(pet.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                        selected ? "bg-brand-50" : "hover:bg-surface-50"
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`flex-shrink-0 h-4 w-4 rounded border-2 flex items-center justify-center ${
                        selected ? "border-brand-500 bg-brand-500" : "border-surface-300"
                      }`}>
                        {selected && (
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                            <path d="M10 3L5 8.5 2 5.5"/>
                          </svg>
                        )}
                      </div>
                      {/* Photo */}
                      {pet.photo ? (
                        <img src={pet.photo} alt="" className="h-8 w-8 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-surface-200 flex-shrink-0" />
                      )}
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-sm text-surface-800 truncate">{pet.name}</span>
                          <span className="text-[10px] rounded-full px-1.5 py-0.5 bg-surface-100 text-surface-500 flex-shrink-0">{pet.type}</span>
                        </div>
                        {pet.breed && <div className="text-xs text-surface-400 truncate">{pet.breed}</div>}
                      </div>
                      {/* Votes */}
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-semibold text-surface-800">{pet.weekVotes}</div>
                        <div className="text-[10px] text-surface-400">votes</div>
                      </div>
                      {pet.weekRank && (
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs font-bold text-brand-600">#{pet.weekRank}</div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {demoPets.length > 0 && (
              <p className="text-xs text-surface-500 mt-1.5">
                {selectedDemoPetIds.length} of {demoPets.length} pets selected
              </p>
            )}
          </div>
        )}

        {/* Specific pets picker */}
        {mode === "specific_pets" && (
          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-2">Search & Select Pets</label>
            <div className="flex gap-2 mb-2">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchPets()}
                placeholder="Search by pet name..."
                className="flex-1 rounded-lg border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                onClick={searchPets}
                disabled={searching || searchQuery.length < 2}
                className="rounded-lg bg-surface-100 px-4 py-2 text-sm font-medium text-surface-600 hover:bg-surface-200 disabled:opacity-50"
              >
                {searching ? "..." : "Search"}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="rounded-lg border border-surface-200 divide-y divide-surface-100 mb-3">
                {searchResults
                  .filter((p) => !selectedPets.find((sp) => sp.id === p.id))
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPets((prev) => [...prev, { id: p.id, name: p.name, type: p.type }]);
                        setSearchResults([]);
                        setSearchQuery("");
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-50 text-left"
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="text-[10px] rounded-full px-1.5 py-0.5 bg-surface-100 text-surface-500">{p.type}</span>
                      <span className="text-xs text-surface-400 ml-auto">by {p.ownerName}</span>
                    </button>
                  ))}
              </div>
            )}

            {selectedPets.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedPets.map((p) => (
                  <span
                    key={p.id}
                    className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
                  >
                    {p.name} ({p.type})
                    <button
                      onClick={() => setSelectedPets((prev) => prev.filter((sp) => sp.id !== p.id))}
                      className="text-brand-400 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Votes & spread */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1">Total Votes</label>
            <input
              type="number"
              min={1}
              max={50000}
              value={totalVotes}
              onChange={(e) => setTotalVotes(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <div className="flex gap-2 mt-2">
              {[50, 100, 250, 500, 1000, 5000].map((n) => (
                <button
                  key={n}
                  onClick={() => setTotalVotes(n)}
                  className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                    totalVotes === n ? "bg-brand-600 text-white" : "bg-surface-100 text-surface-600 hover:bg-surface-200"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1">Spread Over (hours)</label>
            <input
              type="number"
              min={1}
              max={168}
              value={spreadHours}
              onChange={(e) => setSpreadHours(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <div className="flex gap-2 mt-2">
              {[
                { label: "1h", value: 1 },
                { label: "6h", value: 6 },
                { label: "12h", value: 12 },
                { label: "24h", value: 24 },
                { label: "48h", value: 48 },
                { label: "7d", value: 168 },
              ].map((n) => (
                <button
                  key={n.value}
                  onClick={() => setSpreadHours(n.value)}
                  className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                    spreadHours === n.value ? "bg-brand-600 text-white" : "bg-surface-100 text-surface-600 hover:bg-surface-200"
                  }`}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          <strong>Preview:</strong>{" "}
          {totalVotes} votes distributed across{" "}
          {mode === "specific_pets"
            ? `${selectedPets.length} selected pets`
            : mode === "demo_pets"
              ? demoPets.length > 0
                ? `${selectedDemoPetIds.length} selected demo pets`
                : "all demo pets"
              : contestFilter
                ? `all real pets in "${selectedContest?.name ?? "contest"}"`
                : "all real pets"}
          {", "}spread gradually over {spreadHours}h. Demo accounts will vote in random batches of 1-5 every 5 minutes.
        </div>

        <button
          onClick={scheduleVotes}
          disabled={isDisabled}
          className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Scheduling..." : "🚀 Schedule Auto-Vote Campaign"}
        </button>
      </div>

      {result && (
        <details open className="rounded-xl border border-surface-200 bg-white">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-surface-700">Campaign Result</summary>
          <pre className="px-4 py-2 text-xs text-surface-600 overflow-x-auto max-h-60">{result}</pre>
        </details>
      )}
    </div>
  );
}

// ─── VOTE QUEUE TAB ──────────────────────────────────────

function VoteQueueTab() {
  const [counts, setCounts] = useState<ScheduledVoteCounts>({ pending: 0, processing: 0, processed: 0, failed: 0 });
  const [pendingTotal, setPendingTotal] = useState(0);
  const [batches, setBatches] = useState<ScheduledVoteBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/engagement/scheduled-votes");
      const data = await res.json();
      setCounts(data.counts || { pending: 0, processing: 0, processed: 0, failed: 0 });
      setPendingTotal(data.pendingVotesTotal || 0);
      setBatches(data.recentPendingBatches || []);
    } catch {
      setMsg("Failed to load queue");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const cancelAll = async () => {
    if (!confirm("Cancel all pending scheduled votes? This cannot be undone.")) return;
    setCancelling(true);
    try {
      const res = await fetch("/api/admin/engagement/scheduled-votes", { method: "DELETE" });
      const data = await res.json();
      setMsg(`Cancelled ${data.cancelled} pending batches`);
      fetchQueue();
    } catch {
      setMsg("Failed to cancel");
    }
    setCancelling(false);
    setTimeout(() => setMsg(""), 4000);
  };

  const cancelOne = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/engagement/scheduled-votes?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setMsg(`Cancelled batch (${data.cancelled})`);
        fetchQueue();
      }
    } catch {
      setMsg("Failed");
    }
    setTimeout(() => setMsg(""), 3000);
  };

  if (loading) {
    return <div className="py-12 text-center text-surface-500">Loading vote queue...</div>;
  }

  const total = counts.pending + counts.processing + counts.processed + counts.failed;

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`rounded-lg px-4 py-2 text-sm ${msg.includes("Failed") || msg.includes("failed") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {msg}
        </div>
      )}

      {/* Status cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-xl border border-surface-200 bg-white p-4">
          <div className="text-2xl font-bold text-amber-600">{counts.pending}</div>
          <div className="text-xs text-surface-500">Pending</div>
        </div>
        <div className="rounded-xl border border-surface-200 bg-white p-4">
          <div className="text-2xl font-bold text-blue-600">{counts.processing}</div>
          <div className="text-xs text-surface-500">Processing</div>
        </div>
        <div className="rounded-xl border border-surface-200 bg-white p-4">
          <div className="text-2xl font-bold text-emerald-600">{counts.processed}</div>
          <div className="text-xs text-surface-500">Processed</div>
        </div>
        <div className="rounded-xl border border-surface-200 bg-white p-4">
          <div className="text-2xl font-bold text-red-600">{counts.failed}</div>
          <div className="text-xs text-surface-500">Failed</div>
        </div>
        <div className="rounded-xl border border-surface-200 bg-white p-4">
          <div className="text-2xl font-bold text-surface-900">{pendingTotal}</div>
          <div className="text-xs text-surface-500">Pending Votes</div>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="rounded-xl border border-surface-200 bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-surface-700">Campaign Progress</span>
            <span className="text-xs text-surface-500">{counts.processed}/{total} batches</span>
          </div>
          <div className="h-3 rounded-full bg-surface-100 overflow-hidden flex">
            {counts.processed > 0 && (
              <div
                className="bg-emerald-500 transition-all"
                style={{ width: `${(counts.processed / total) * 100}%` }}
              />
            )}
            {counts.processing > 0 && (
              <div
                className="bg-blue-500 transition-all"
                style={{ width: `${(counts.processing / total) * 100}%` }}
              />
            )}
            {counts.failed > 0 && (
              <div
                className="bg-red-400 transition-all"
                style={{ width: `${(counts.failed / total) * 100}%` }}
              />
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={fetchQueue}
          className="rounded-lg bg-surface-100 px-4 py-2 text-sm font-medium text-surface-600 hover:bg-surface-200 transition-colors"
        >
          🔄 Refresh
        </button>
        {counts.pending > 0 && (
          <button
            onClick={cancelAll}
            disabled={cancelling}
            className="rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
          >
            {cancelling ? "Cancelling..." : `🛑 Cancel All Pending (${counts.pending})`}
          </button>
        )}
      </div>

      {/* Upcoming batches */}
      {batches.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-surface-700 mb-3">Upcoming Vote Batches</h3>
          <div className="overflow-x-auto rounded-xl border border-surface-200">
            <table className="w-full text-xs">
              <thead className="bg-surface-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-surface-600">Scheduled</th>
                  <th className="px-3 py-2 text-left font-medium text-surface-600">Pet</th>
                  <th className="px-3 py-2 text-left font-medium text-surface-600">From Account</th>
                  <th className="px-3 py-2 text-left font-medium text-surface-600">Votes</th>
                  <th className="px-3 py-2 text-left font-medium text-surface-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-surface-50">
                    <td className="px-3 py-2 text-surface-500 whitespace-nowrap">
                      {new Date(b.scheduledFor).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-medium text-surface-800">{b.petName}</span>
                      <span className="text-[10px] ml-1 rounded-full px-1.5 py-0.5 bg-surface-100 text-surface-500">
                        {b.petType}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-surface-600">{b.seedEmail}</td>
                    <td className="px-3 py-2 font-semibold text-surface-800">{b.votesAmount}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => cancelOne(b.id)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {batches.length === 0 && counts.pending === 0 && (
        <div className="rounded-xl border border-surface-200 bg-white p-8 text-center text-surface-400">
          No scheduled votes in the queue. Go to Auto-Vote tab to create a campaign.
        </div>
      )}
    </div>
  );
}
