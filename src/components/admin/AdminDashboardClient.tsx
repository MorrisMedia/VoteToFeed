"use client";

import React, { useState } from "react";
import Link from "next/link";

type Overview = {
  totalUsers: number;
  totalPets: number;
  totalVotes: number;
  totalComments: number;
  activeContests: number;
  weeklyVotes: number;
  weeklyPaidVotes: number;
  weeklyFreeVotes: number;
  totalRevenueCents: number;
  totalPurchases: number;
  totalMealsProvided: number;
  weeklyRevenueCents: number;
  weeklyPurchases: number;
};

type RecentUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  paidVoteBalance: number;
  freeVotesRemaining: number;
  petsCount: number;
  votesCount: number;
  purchasesCount: number;
  createdAt: string;
};

type RecentPurchase = {
  id: string;
  tier: string;
  votes: number;
  amount: number;
  meals: number;
  userName: string | null;
  userEmail: string | null;
  createdAt: string;
};

type TopPet = {
  rank: number;
  petId: string;
  petName: string;
  petType: string;
  photo: string | null;
  ownerName: string;
  votes: number;
  paidVotes: number;
  freeVotes: number;
};

type SettingLog = {
  key: string;
  oldValue: string;
  newValue: string;
  createdAt: string;
};

type Settings = {
  mealRate: string;
  animalType: string;
  weeklyGoal: string;
  termsOfService: string;
  privacyPolicy: string;
  freeVotesAmount: string;
  freeVotesPeriod: string;
  freeVotesResetDay: string;
  freeVotesResetHour: string;
  freeVotesResetMinute: string;
  stripeSecretKey: string;
  stripePublishableKey: string;
  stripeWebhookSecret: string;
  googleClientId: string;
  googleClientSecret: string;
  facebookClientId: string;
  facebookClientSecret: string;
  nextauthSecret: string;
  nextauthUrl: string;
  appUrl: string;
  resendApiKey: string;
  resendFromEmail: string;
  posthogKey: string;
};

type Props = {
  settings: Settings;
  settingLogs: SettingLog[];
  overview: Overview;
  usersByRole: { role: string; count: number }[];
  petsByType: { type: string; count: number }[];
  recentUsers: RecentUser[];
  recentPurchases: RecentPurchase[];
  topPetsThisWeek: TopPet[];
  weekId: string;
};

type Tab = "overview" | "users" | "pets" | "revenue" | "email" | "support" | "settings";

export function AdminDashboardClient({
  settings: initialSettings,
  settingLogs,
  overview,
  usersByRole,
  petsByType,
  recentUsers,
  recentPurchases,
  topPetsThisWeek,
  weekId,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  async function saveSetting(key: string, value: string) {
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (res.ok) {
        setSaveMsg("Saved successfully");
        setTimeout(() => setSaveMsg(""), 3000);
      } else {
        const data = await res.json();
        setSaveMsg(data.error || "Failed to save");
      }
    } catch {
      setSaveMsg("Error saving");
    } finally {
      setSaving(false);
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "overview",
      label: "Overview",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
    },
    {
      id: "users",
      label: "Users",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
    },
    {
      id: "pets",
      label: "Pets & Contests",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>,
    },
    {
      id: "revenue",
      label: "Revenue",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
    },
    {
      id: "support",
      label: "Support",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/></svg>,
    },
    {
      id: "email",
      label: "Email Alerts",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    },
    {
      id: "settings",
      label: "Settings",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-600">Admin</span>
              <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Dashboard</h1>
            </div>
            <p className="text-sm text-surface-500 mt-1">Platform management and analytics — {weekId}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-8 overflow-x-auto pb-1 hide-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-white text-surface-900 shadow-sm border border-surface-200/80"
                  : "text-surface-500 hover:text-surface-700 hover:bg-white/60"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-fade-in">
            {/* Top stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              <MiniStat label="Total Users" value={overview.totalUsers.toLocaleString()} color="brand" />
              <MiniStat label="Active Pets" value={overview.totalPets.toLocaleString()} color="default" />
              <MiniStat label="Total Votes" value={overview.totalVotes.toLocaleString()} color="default" />
              <MiniStat label="Weekly Votes" value={overview.weeklyVotes.toLocaleString()} color="accent" />
              <MiniStat label="Total Revenue" value={`$${(overview.totalRevenueCents / 100).toFixed(0)}`} color="brand" />
              <MiniStat label="Shelter Pets Fed" value={`~${Math.round(overview.totalMealsProvided).toLocaleString()}`} color="accent" />
            </div>

            {/* Breakdown row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* This Week */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-surface-900 mb-4">This Week</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-surface-500">Votes</span>
                    <span className="text-sm font-semibold text-surface-900">{overview.weeklyVotes.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-surface-500">Paid Votes</span>
                    <span className="text-sm font-semibold text-brand-600">{overview.weeklyPaidVotes.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-surface-500">Free Votes</span>
                    <span className="text-sm font-semibold text-accent-600">{overview.weeklyFreeVotes.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-surface-100 pt-3 flex items-center justify-between">
                    <span className="text-sm text-surface-500">Revenue</span>
                    <span className="text-sm font-bold text-surface-900">${(overview.weeklyRevenueCents / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-surface-500">Purchases</span>
                    <span className="text-sm font-semibold text-surface-900">{overview.weeklyPurchases}</span>
                  </div>
                </div>
              </div>

              {/* Platform Composition */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-surface-900 mb-4">Platform Breakdown</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-2">Users by Role</p>
                    {usersByRole.map((r) => (
                      <div key={r.role} className="flex items-center justify-between py-1">
                        <span className="flex items-center gap-2 text-sm text-surface-600">
                          <span className={`w-2 h-2 rounded-full ${r.role === "ADMIN" ? "bg-red-500" : r.role === "MODERATOR" ? "bg-red-300" : "bg-brand-400"}`} />
                          {r.role}
                        </span>
                        <span className="text-sm font-semibold text-surface-900">{r.count}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-surface-100 pt-3">
                    <p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-2">Pets by Type</p>
                    {petsByType.map((p) => (
                      <div key={p.type} className="flex items-center justify-between py-1">
                        <span className="flex items-center gap-2 text-sm text-surface-600">
                          <span className={`text-base ${p.type === "DOG" ? "" : ""}`}>{p.type === "DOG" ? "🐶" : p.type === "CAT" ? "🐱" : "🐾"}</span>
                          {p.type}
                        </span>
                        <span className="text-sm font-semibold text-surface-900">{p.count}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-surface-100 pt-3 flex items-center justify-between">
                    <span className="text-sm text-surface-500">Active Contests</span>
                    <span className="text-sm font-semibold text-surface-900">{overview.activeContests}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-surface-500">Comments</span>
                    <span className="text-sm font-semibold text-surface-900">{overview.totalComments.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Top Pets This Week */}
              <div className="card p-0 overflow-hidden">
                <div className="px-5 py-4 border-b border-surface-100">
                  <h3 className="text-sm font-semibold text-surface-900">Top Pets This Week</h3>
                </div>
                <ul className="divide-y divide-surface-50">
                  {topPetsThisWeek.slice(0, 5).map((pet) => (
                    <li key={pet.petId}>
                      <Link href={`/pets/${pet.petId}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-50/50 transition-colors">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                          pet.rank === 1 ? "bg-red-100 text-red-700" :
                          pet.rank === 2 ? "bg-surface-200 text-surface-600" :
                          pet.rank === 3 ? "bg-red-50 text-red-600" :
                          "bg-surface-100 text-surface-500"
                        }`}>
                          {pet.rank}
                        </span>
                        {pet.photo ? (
                          <img src={pet.photo} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-surface-100 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-surface-800 truncate">{pet.petName}</p>
                          <p className="text-[11px] text-surface-400">{pet.ownerName}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-brand-600">{pet.votes.toLocaleString()}</p>
                          <p className="text-[10px] text-surface-400">{pet.petType}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Recent Purchases */}
            <div className="card p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-surface-900">Recent Purchases</h3>
                <button onClick={() => setActiveTab("revenue")} className="text-xs text-brand-600 font-medium hover:text-brand-700">View all</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-100">
                      <th className="px-5 py-3 text-left text-[11px] font-medium text-surface-400 uppercase tracking-wider">User</th>
                      <th className="px-5 py-3 text-left text-[11px] font-medium text-surface-400 uppercase tracking-wider">Package</th>
                      <th className="px-5 py-3 text-right text-[11px] font-medium text-surface-400 uppercase tracking-wider">Votes</th>
                      <th className="px-5 py-3 text-right text-[11px] font-medium text-surface-400 uppercase tracking-wider">Amount</th>
                      <th className="px-5 py-3 text-right text-[11px] font-medium text-surface-400 uppercase tracking-wider">Impact</th>
                      <th className="px-5 py-3 text-right text-[11px] font-medium text-surface-400 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-50">
                    {recentPurchases.slice(0, 5).map((p) => (
                      <tr key={p.id} className="hover:bg-surface-50/50">
                        <td className="px-5 py-3">
                          <p className="font-medium text-surface-800">{p.userName || "Unknown"}</p>
                          <p className="text-[11px] text-surface-400">{p.userEmail}</p>
                        </td>
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-50 text-brand-600">{p.tier}</span>
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-surface-800">{p.votes}</td>
                        <td className="px-5 py-3 text-right font-semibold text-surface-900">${(p.amount / 100).toFixed(2)}</td>
                        <td className="px-5 py-3 text-right text-accent-600">~{Math.round(p.meals)}</td>
                        <td className="px-5 py-3 text-right text-surface-400 text-xs">{new Date(p.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── USERS TAB ── */}
        {activeTab === "users" && <AdminUsersTab totalUsers={overview.totalUsers} />}

        {/* ── PETS & CONTESTS TAB ── */}
        {activeTab === "pets" && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Pets */}
              <div>
                <h2 className="text-lg font-bold text-surface-900 mb-4">Top Pets — {weekId}</h2>
                <div className="card p-0 overflow-hidden">
                  <ul className="divide-y divide-surface-50">
                    {topPetsThisWeek.map((pet) => (
                      <li key={pet.petId}>
                        <Link href={`/pets/${pet.petId}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-50/50 transition-colors">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            pet.rank === 1 ? "bg-red-100 text-red-700" :
                          pet.rank === 2 ? "bg-surface-200 text-surface-600" :
                          pet.rank === 3 ? "bg-red-50 text-red-600" :
                          "bg-surface-100 text-surface-500"
                          }`}>
                            {pet.rank}
                          </span>
                          {pet.photo ? (
                            <img src={pet.photo} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-surface-100 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-surface-800 truncate">{pet.petName}</p>
                            <p className="text-xs text-surface-400">{pet.ownerName} · {pet.petType}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-brand-600">{pet.votes.toLocaleString()}</p>
                            <div className="flex items-center gap-2 text-[10px] text-surface-400">
                              <span>{pet.paidVotes} paid</span>
                              <span>{pet.freeVotes} free</span>
                            </div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Stats & Breakdown */}
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-surface-900 mb-4">Contest Stats</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="card p-4">
                    <p className="text-[11px] font-medium text-surface-400 uppercase">Active Pets</p>
                    <p className="text-2xl font-bold text-surface-900 mt-1">{overview.totalPets}</p>
                  </div>
                  <div className="card p-4">
                    <p className="text-[11px] font-medium text-surface-400 uppercase">Active Contests</p>
                    <p className="text-2xl font-bold text-surface-900 mt-1">{overview.activeContests}</p>
                  </div>
                  <div className="card p-4">
                    <p className="text-[11px] font-medium text-surface-400 uppercase">Weekly Votes</p>
                    <p className="text-2xl font-bold text-brand-600 mt-1">{overview.weeklyVotes.toLocaleString()}</p>
                  </div>
                  <div className="card p-4">
                    <p className="text-[11px] font-medium text-surface-400 uppercase">Comments</p>
                    <p className="text-2xl font-bold text-surface-900 mt-1">{overview.totalComments.toLocaleString()}</p>
                  </div>
                </div>
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-surface-900 mb-3">Pet Type Distribution</h3>
                  {petsByType.map((p) => {
                    const pct = overview.totalPets > 0 ? Math.round((p.count / overview.totalPets) * 100) : 0;
                    return (
                      <div key={p.type} className="mb-3 last:mb-0">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-surface-600">{p.type === "DOG" ? "🐶 Dogs" : p.type === "CAT" ? "🐱 Cats" : "🐾 Other"}</span>
                          <span className="font-medium text-surface-800">{p.count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-surface-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${p.type === "DOG" ? "bg-brand-400" : p.type === "CAT" ? "bg-accent-400" : "bg-surface-400"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Free Vote Allocation ── */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-500"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                <h2 className="text-lg font-bold text-surface-900">Free Vote Allocation</h2>
              </div>
              <p className="text-sm text-surface-500 mb-6">Configure how many free votes each user receives and when they reset.</p>

              {saveMsg && (
                <div className={`px-4 py-2.5 rounded-lg text-sm font-medium mb-4 ${
                  saveMsg === "Saved successfully" ? "bg-accent-50 text-accent-700 border border-accent-200" : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {saveMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Votes per period */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">
                    Free votes per period
                  </label>
                  <p className="text-xs text-surface-400 mb-2">How many free votes each user gets</p>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    value={settings.freeVotesAmount}
                    onChange={(e) => setSettings({ ...settings, freeVotesAmount: e.target.value })}
                    onBlur={() => saveSetting("free_votes_amount", settings.freeVotesAmount)}
                    className="input-field"
                    disabled={saving}
                  />
                </div>

                {/* Reset period */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">
                    Reset frequency
                  </label>
                  <p className="text-xs text-surface-400 mb-2">How often free votes refresh</p>
                  <select
                    value={settings.freeVotesPeriod}
                    onChange={(e) => {
                      setSettings({ ...settings, freeVotesPeriod: e.target.value });
                      saveSetting("free_votes_period", e.target.value);
                    }}
                    className="input-field"
                    disabled={saving}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                {/* Reset day (for weekly/monthly) */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">
                    Reset {settings.freeVotesPeriod === "weekly" ? "day" : settings.freeVotesPeriod === "monthly" ? "date" : ""}
                  </label>
                  <p className="text-xs text-surface-400 mb-2">
                    {settings.freeVotesPeriod === "weekly" ? "Day of week" : settings.freeVotesPeriod === "monthly" ? "Day of month" : "N/A for daily"}
                  </p>
                  {settings.freeVotesPeriod === "weekly" ? (
                    <select
                      value={settings.freeVotesResetDay}
                      onChange={(e) => {
                        setSettings({ ...settings, freeVotesResetDay: e.target.value });
                        saveSetting("free_votes_reset_day", e.target.value);
                      }}
                      className="input-field"
                      disabled={saving}
                    >
                      <option value="0">Sunday</option>
                      <option value="1">Monday</option>
                      <option value="2">Tuesday</option>
                      <option value="3">Wednesday</option>
                      <option value="4">Thursday</option>
                      <option value="5">Friday</option>
                      <option value="6">Saturday</option>
                    </select>
                  ) : settings.freeVotesPeriod === "monthly" ? (
                    <input
                      type="number"
                      min="1"
                      max="28"
                      value={settings.freeVotesResetDay}
                      onChange={(e) => setSettings({ ...settings, freeVotesResetDay: e.target.value })}
                      onBlur={() => saveSetting("free_votes_reset_day", settings.freeVotesResetDay)}
                      className="input-field"
                      placeholder="1-28"
                      disabled={saving}
                    />
                  ) : (
                    <input className="input-field" disabled value="N/A" />
                  )}
                </div>

                {/* Reset time (UTC) */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">
                    Reset time (UTC)
                  </label>
                  <p className="text-xs text-surface-400 mb-2">Hour:Minute in UTC</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={settings.freeVotesResetHour}
                      onChange={(e) => setSettings({ ...settings, freeVotesResetHour: e.target.value })}
                      onBlur={() => saveSetting("free_votes_reset_hour", settings.freeVotesResetHour)}
                      className="input-field w-20"
                      placeholder="HH"
                      disabled={saving}
                    />
                    <span className="self-center text-surface-400 font-bold">:</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={settings.freeVotesResetMinute}
                      onChange={(e) => setSettings({ ...settings, freeVotesResetMinute: e.target.value })}
                      onBlur={() => saveSetting("free_votes_reset_minute", settings.freeVotesResetMinute)}
                      className="input-field w-20"
                      placeholder="MM"
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="mt-5 p-4 rounded-xl bg-surface-50 border border-surface-200/60">
                <p className="text-xs font-semibold text-surface-700 mb-2">Current Configuration Preview</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold">{settings.freeVotesAmount || 0}</span>
                    <span className="text-surface-700">free votes per user per <strong>{settings.freeVotesPeriod === "daily" ? "day" : settings.freeVotesPeriod === "monthly" ? "month" : "week"}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-surface-600">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface-400"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Resets {settings.freeVotesPeriod === "daily" ? "every day" : settings.freeVotesPeriod === "weekly"
                      ? `every ${["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][parseInt(settings.freeVotesResetDay) || 0]}`
                      : `on day ${settings.freeVotesResetDay || 1} of each month`
                    } at {String(settings.freeVotesResetHour || 0).padStart(2, "0")}:{String(settings.freeVotesResetMinute || 0).padStart(2, "0")} UTC
                  </div>
                </div>
                <p className="text-[11px] text-surface-400 mt-3">
                  Changes take effect on the next scheduled reset. The cron job schedule must match: 
                  {settings.freeVotesPeriod === "daily"
                    ? ` "${String(settings.freeVotesResetMinute || 59).padStart(2, "0")} ${settings.freeVotesResetHour || 19} * * *"`
                    : settings.freeVotesPeriod === "weekly"
                    ? ` "${String(settings.freeVotesResetMinute || 59).padStart(2, "0")} ${settings.freeVotesResetHour || 19} * * ${settings.freeVotesResetDay || 0}"`
                    : ` "${String(settings.freeVotesResetMinute || 59).padStart(2, "0")} ${settings.freeVotesResetHour || 19} ${settings.freeVotesResetDay || 1} * *"`
                  }
                </p>
              </div>
            </div>

            {/* Contest Management */}
            <ContestManager />
          </div>
        )}

        {/* ── REVENUE TAB ── */}
        {activeTab === "revenue" && <AdminRevenueTab animalType={settings.animalType} />}

        {/* ── SUPPORT TAB ── */}
        {activeTab === "support" && <SupportPanel />}

        {/* ── EMAIL ALERTS TAB ── */}
        {activeTab === "email" && <AdminEmailTab />}

        {/* ── SETTINGS TAB ── */}
        {activeTab === "settings" && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-lg font-bold text-surface-900">Platform Settings</h2>

            {saveMsg && (
              <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
                saveMsg === "Saved successfully" ? "bg-accent-50 text-accent-700 border border-accent-200" : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                {saveMsg}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Settings form */}
              <div className="space-y-4">
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-surface-900 mb-4">Shelter Impact Configuration</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-1.5">
                        Meals per dollar
                      </label>
                      <p className="text-xs text-surface-400 mb-2">How many animals are helped per $1 spent</p>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={settings.mealRate}
                        onChange={(e) => setSettings({ ...settings, mealRate: e.target.value })}
                        onBlur={() => saveSetting("meal_rate", settings.mealRate)}
                        className="input-field"
                        disabled={saving}
                      />
                      <div className="mt-2 p-3 rounded-lg bg-surface-50 text-xs text-surface-500 space-y-2">
                        <p className="font-semibold text-surface-700">Live Package Preview (updates in real time):</p>
                        <table className="w-full text-left">
                          <thead>
                            <tr className="text-[10px] uppercase text-surface-400">
                              <th className="py-1">Package</th>
                              <th className="py-1">Price</th>
                              <th className="py-1">Votes</th>
                              <th className="py-1">Shelter Pets Fed</th>
                            </tr>
                          </thead>
                          <tbody className="text-xs">
                            {[
                              { label: "Starter", price: 0.99, votes: 5 },
                              { label: "Friend", price: 4.99, votes: 30 },
                              { label: "Supporter", price: 9.99, votes: 60 },
                              { label: "Champion", price: 24.99, votes: 150 },
                              { label: "Hero", price: 49.99, votes: 300 },
                              { label: "Legend", price: 99.99, votes: 600 },
                            ].map((pkg) => (
                              <tr key={pkg.label} className="border-t border-surface-100/50">
                                <td className="py-1 font-medium">{pkg.label}</td>
                                <td className="py-1">${pkg.price.toFixed(2)}</td>
                                <td className="py-1">{pkg.votes}</td>
                                <td className="py-1 text-accent-600 font-semibold">~{Math.round(pkg.price * parseFloat(settings.mealRate || "0"))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="mt-2 p-2.5 rounded-md bg-amber-50 border border-amber-200/60 text-amber-800 text-[11px]">
                          <p className="font-semibold">How this works:</p>
                          <p className="mt-0.5">Changing this rate updates the meal count shown on <strong>future</strong> vote packages and purchases. All <strong>past purchases keep their original meal count</strong> saved at the rate in effect when purchased.</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-1.5">
                        Shelter animal type
                      </label>
                      <p className="text-xs text-surface-400 mb-2">Used in all platform messaging</p>
                      <select
                        value={settings.animalType}
                        onChange={(e) => {
                          setSettings({ ...settings, animalType: e.target.value });
                          saveSetting("animal_type", e.target.value);
                        }}
                        className="input-field"
                        disabled={saving}
                      >
                        <option value="dogs">Dogs</option>
                        <option value="cats">Cats</option>
                        <option value="dogs and cats">Dogs and Cats</option>
                        <option value="animals">Animals</option>
                      </select>
                      <div className="mt-2 p-3 rounded-lg bg-surface-50 text-xs text-surface-500">
                        Preview: &quot;votes for shelter {settings.animalType}&quot;
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-1.5">
                        Weekly vote goal
                      </label>
                      <p className="text-xs text-surface-400 mb-2">Target vote count shown on progress bars</p>
                      <input
                        type="number"
                        min="1"
                        value={settings.weeklyGoal}
                        onChange={(e) => setSettings({ ...settings, weeklyGoal: e.target.value })}
                        onBlur={() => saveSetting("weekly_vote_goal", settings.weeklyGoal)}
                        className="input-field"
                        disabled={saving}
                      />
                    </div>
                  </div>
                  {saving && <p className="mt-3 text-xs text-surface-400">Saving...</p>}
                </div>

                {/* ── Stripe Payment Configuration ── */}
                <div className="card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-violet-500"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                    <h3 className="text-sm font-semibold text-surface-900">Stripe Payment Configuration</h3>
                  </div>
                  <p className="text-xs text-surface-400 mb-4">Connect your Stripe account to accept vote package payments. Keys are stored securely and masked in the UI.</p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-surface-600 mb-1">
                        Secret Key <span className="text-surface-400 font-normal">(starts with sk_)</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={settings.stripeSecretKey}
                          onChange={(e) => setSettings({ ...settings, stripeSecretKey: e.target.value })}
                          onBlur={() => { if (settings.stripeSecretKey) saveSetting("stripe_secret_key", settings.stripeSecretKey); }}
                          className="input-field flex-1 font-mono text-xs"
                          placeholder="sk_live_... or sk_test_..."
                          disabled={saving}
                          autoComplete="off"
                        />
                      </div>
                      {settings.stripeSecretKey && (
                        <p className="text-[10px] text-accent-600 mt-1 flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                          Key saved (ending ...{settings.stripeSecretKey.slice(-4)})
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-surface-600 mb-1">
                        Publishable Key <span className="text-surface-400 font-normal">(starts with pk_)</span>
                      </label>
                      <input
                        type="text"
                        value={settings.stripePublishableKey}
                        onChange={(e) => setSettings({ ...settings, stripePublishableKey: e.target.value })}
                        onBlur={() => { if (settings.stripePublishableKey) saveSetting("stripe_publishable_key", settings.stripePublishableKey); }}
                        className="input-field font-mono text-xs"
                        placeholder="pk_live_... or pk_test_..."
                        disabled={saving}
                        autoComplete="off"
                      />
                      {settings.stripePublishableKey && (
                        <p className="text-[10px] text-accent-600 mt-1 flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                          Key saved (ending ...{settings.stripePublishableKey.slice(-4)})
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-surface-600 mb-1">
                        Webhook Secret <span className="text-surface-400 font-normal">(starts with whsec_)</span>
                      </label>
                      <input
                        type="password"
                        value={settings.stripeWebhookSecret}
                        onChange={(e) => setSettings({ ...settings, stripeWebhookSecret: e.target.value })}
                        onBlur={() => { if (settings.stripeWebhookSecret) saveSetting("stripe_webhook_secret", settings.stripeWebhookSecret); }}
                        className="input-field font-mono text-xs"
                        placeholder="whsec_..."
                        disabled={saving}
                        autoComplete="off"
                      />
                      {settings.stripeWebhookSecret && (
                        <p className="text-[10px] text-accent-600 mt-1 flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                          Secret saved (ending ...{settings.stripeWebhookSecret.slice(-4)})
                        </p>
                      )}
                    </div>

                    <div className="p-3 rounded-lg bg-violet-50 border border-violet-200/60 text-[11px] text-violet-800 space-y-1.5">
                      <p className="font-semibold">How to get your Stripe keys:</p>
                      <ol className="list-decimal pl-4 space-y-0.5">
                        <li>Go to <span className="font-mono">dashboard.stripe.com/apikeys</span></li>
                        <li>Copy your <strong>Publishable key</strong> and <strong>Secret key</strong></li>
                        <li>For webhooks, go to <span className="font-mono">Developers → Webhooks</span></li>
                        <li>Set endpoint URL to: <span className="font-mono bg-violet-100 px-1 rounded">{typeof window !== "undefined" ? window.location.origin : ""}/api/stripe/webhook</span></li>
                        <li>Copy the <strong>Signing secret</strong> (starts with whsec_)</li>
                      </ol>
                      <p className="mt-1.5 text-violet-600">Use <strong>test keys</strong> (sk_test_, pk_test_) for development. Switch to <strong>live keys</strong> for production.</p>
                    </div>

                    {/* Connection status */}
                    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium ${
                      settings.stripeSecretKey && settings.stripePublishableKey
                        ? "bg-accent-50 text-accent-700 border border-accent-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        settings.stripeSecretKey && settings.stripePublishableKey
                          ? "bg-accent-500"
                          : "bg-amber-400"
                      }`} />
                      {settings.stripeSecretKey && settings.stripePublishableKey
                        ? "Stripe connected — payments enabled"
                        : "Stripe not configured — payments disabled. Set keys above or in .env file."
                      }
                    </div>
                  </div>
                </div>

                {/* ── Google OAuth ── */}
                <div className="card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-blue-500"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    <h3 className="text-sm font-semibold text-surface-900">Google OAuth</h3>
                  </div>
                  <p className="text-xs text-surface-400 mb-4">Allow users to sign in with their Google account.</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-surface-600 mb-1">Client ID</label>
                      <input
                        type="text"
                        value={settings.googleClientId}
                        onChange={(e) => setSettings({ ...settings, googleClientId: e.target.value })}
                        onBlur={() => { if (settings.googleClientId) saveSetting("google_client_id", settings.googleClientId); }}
                        className="input-field font-mono text-xs"
                        placeholder="123456789.apps.googleusercontent.com"
                        disabled={saving}
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-surface-600 mb-1">Client Secret</label>
                      <input
                        type="password"
                        value={settings.googleClientSecret}
                        onChange={(e) => setSettings({ ...settings, googleClientSecret: e.target.value })}
                        onBlur={() => { if (settings.googleClientSecret) saveSetting("google_client_secret", settings.googleClientSecret); }}
                        className="input-field font-mono text-xs"
                        placeholder="GOCSPX-..."
                        disabled={saving}
                        autoComplete="off"
                      />
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium ${
                      settings.googleClientId && settings.googleClientSecret ? "bg-accent-50 text-accent-700 border border-accent-200" : "bg-surface-50 text-surface-500 border border-surface-200"
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${settings.googleClientId && settings.googleClientSecret ? "bg-accent-500" : "bg-surface-300"}`} />
                      {settings.googleClientId && settings.googleClientSecret ? "Google sign-in enabled" : "Not configured — Google sign-in disabled"}
                    </div>
                  </div>
                </div>

                {/* ── Facebook OAuth ── */}
                <div className="card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    <h3 className="text-sm font-semibold text-surface-900">Facebook OAuth</h3>
                  </div>
                  <p className="text-xs text-surface-400 mb-4">Allow users to sign in with their Facebook account.</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-surface-600 mb-1">App ID</label>
                      <input
                        type="text"
                        value={settings.facebookClientId}
                        onChange={(e) => setSettings({ ...settings, facebookClientId: e.target.value })}
                        onBlur={() => { if (settings.facebookClientId) saveSetting("facebook_client_id", settings.facebookClientId); }}
                        className="input-field font-mono text-xs"
                        placeholder="123456789012345"
                        disabled={saving}
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-surface-600 mb-1">App Secret</label>
                      <input
                        type="password"
                        value={settings.facebookClientSecret}
                        onChange={(e) => setSettings({ ...settings, facebookClientSecret: e.target.value })}
                        onBlur={() => { if (settings.facebookClientSecret) saveSetting("facebook_client_secret", settings.facebookClientSecret); }}
                        className="input-field font-mono text-xs"
                        placeholder="abc123..."
                        disabled={saving}
                        autoComplete="off"
                      />
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium ${
                      settings.facebookClientId && settings.facebookClientSecret ? "bg-accent-50 text-accent-700 border border-accent-200" : "bg-surface-50 text-surface-500 border border-surface-200"
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${settings.facebookClientId && settings.facebookClientSecret ? "bg-accent-500" : "bg-surface-300"}`} />
                      {settings.facebookClientId && settings.facebookClientSecret ? "Facebook sign-in enabled" : "Not configured — Facebook sign-in disabled"}
                    </div>
                  </div>
                </div>

                {/* ── Resend Email ── */}
                <div className="card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-blue-500"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    <h3 className="text-sm font-semibold text-surface-900">Resend Email</h3>
                  </div>
                  <p className="text-xs text-surface-400 mb-4">Power email notifications with Resend. Get an API key at <span className="font-mono">resend.com</span>.</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-surface-600 mb-1">API Key</label>
                      <input
                        type="password"
                        value={settings.resendApiKey}
                        onChange={(e) => setSettings({ ...settings, resendApiKey: e.target.value })}
                        onBlur={() => { if (settings.resendApiKey) saveSetting("resend_api_key", settings.resendApiKey); }}
                        className="input-field font-mono text-xs"
                        placeholder="re_..."
                        disabled={saving}
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-surface-600 mb-1">From Email</label>
                      <input
                        type="text"
                        value={settings.resendFromEmail}
                        onChange={(e) => setSettings({ ...settings, resendFromEmail: e.target.value })}
                        onBlur={() => saveSetting("resend_from_email", settings.resendFromEmail)}
                        className="input-field text-xs"
                        placeholder="Vote to Feed <noreply@votetofeed.com>"
                        disabled={saving}
                      />
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium ${
                      settings.resendApiKey ? "bg-accent-50 text-accent-700 border border-accent-200" : "bg-surface-50 text-surface-500 border border-surface-200"
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${settings.resendApiKey ? "bg-accent-500" : "bg-surface-300"}`} />
                      {settings.resendApiKey ? "Resend connected — emails enabled" : "Not configured — emails disabled"}
                    </div>
                  </div>
                </div>

                {/* ── App & Auth Configuration ── */}
                <div className="card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-surface-500"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                    <h3 className="text-sm font-semibold text-surface-900">App &amp; Auth Configuration</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-surface-600 mb-1">App URL</label>
                      <p className="text-[10px] text-surface-400 mb-1">Public URL of your app (used in emails, OG images, share links)</p>
                      <input
                        type="url"
                        value={settings.appUrl}
                        onChange={(e) => setSettings({ ...settings, appUrl: e.target.value })}
                        onBlur={() => saveSetting("app_url", settings.appUrl)}
                        className="input-field text-xs"
                        placeholder="https://votetofeed.com"
                        disabled={saving}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-surface-600 mb-1">NextAuth URL</label>
                      <p className="text-[10px] text-surface-400 mb-1">Usually same as App URL. Used for auth callbacks.</p>
                      <input
                        type="url"
                        value={settings.nextauthUrl}
                        onChange={(e) => setSettings({ ...settings, nextauthUrl: e.target.value })}
                        onBlur={() => saveSetting("nextauth_url", settings.nextauthUrl)}
                        className="input-field text-xs"
                        placeholder="https://votetofeed.com"
                        disabled={saving}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-surface-600 mb-1">NextAuth Secret</label>
                      <p className="text-[10px] text-surface-400 mb-1">Random string for session encryption. Keep this private.</p>
                      <input
                        type="password"
                        value={settings.nextauthSecret}
                        onChange={(e) => setSettings({ ...settings, nextauthSecret: e.target.value })}
                        onBlur={() => { if (settings.nextauthSecret) saveSetting("nextauth_secret", settings.nextauthSecret); }}
                        className="input-field font-mono text-xs"
                        placeholder="random-secret-string..."
                        disabled={saving}
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-surface-600 mb-1">PostHog Key <span className="text-surface-400 font-normal">(optional)</span></label>
                      <p className="text-[10px] text-surface-400 mb-1">Client-side analytics key from posthog.com</p>
                      <input
                        type="text"
                        value={settings.posthogKey}
                        onChange={(e) => setSettings({ ...settings, posthogKey: e.target.value })}
                        onBlur={() => saveSetting("posthog_key", settings.posthogKey)}
                        className="input-field font-mono text-xs"
                        placeholder="phc_..."
                        disabled={saving}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Change log */}
              <div>
                <div className="card p-0 overflow-hidden">
                  <div className="px-5 py-4 border-b border-surface-100">
                    <h3 className="text-sm font-semibold text-surface-900">Settings Change Log</h3>
                  </div>
                  {settingLogs.length === 0 ? (
                    <p className="px-5 py-8 text-sm text-surface-400 text-center">No changes recorded</p>
                  ) : (
                    <ul className="divide-y divide-surface-50 max-h-[500px] overflow-y-auto hide-scrollbar">
                      {settingLogs.map((log, i) => (
                        <li key={i} className="px-5 py-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-surface-700 px-2 py-0.5 rounded bg-surface-100">{log.key}</span>
                            <span className="text-[10px] text-surface-400">{new Date(log.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-2 text-xs">
                            <span className="text-red-500 line-through">{log.oldValue.length > 50 ? log.oldValue.slice(0, 50) + "…" : log.oldValue}</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface-300"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                            <span className="text-accent-600 font-medium">{log.newValue.length > 50 ? log.newValue.slice(0, 50) + "…" : log.newValue}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* ── Legal Pages ── */}
            <LegalPagesEditor
              initialTos={settings.termsOfService}
              initialPrivacy={settings.privacyPolicy}
              onSave={saveSetting}
              saving={saving}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ADMIN USERS TAB ─────────────────────────────────────

type AdminUser = {
  id: string; name: string | null; email: string | null; role: string; image: string | null;
  city: string | null; state: string | null;
  freeVotesRemaining: number; paidVoteBalance: number; votingStreak: number;
  petsCount: number; votesCount: number; purchasesCount: number; commentsCount: number;
  totalSpent: number; totalMeals: number; createdAt: string;
};

function AdminUsersTab({ totalUsers }: { totalUsers: number }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(totalUsers);
  const [actionMsg, setActionMsg] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [grantAmount, setGrantAmount] = useState("10");

  async function loadUsers(p = page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "25", sort: sortBy });
      if (search) params.set("search", search);
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setPage(data.page || 1);
    } catch { /* */ }
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useState(() => { loadUsers(1); });

  async function userAction(userId: string, action: string, value?: string) {
    setActionMsg("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, value }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg(data.message || "Done");
        loadUsers();
      } else {
        setActionMsg(data.error || "Failed");
      }
    } catch { setActionMsg("Error"); }
    setTimeout(() => setActionMsg(""), 3000);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadUsers(1);
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-surface-900">User Management</h2>
          <p className="text-sm text-surface-500">{total.toLocaleString()} users found</p>
        </div>
      </div>

      {actionMsg && (
        <div className={`px-4 py-2.5 rounded-lg text-sm font-medium ${actionMsg.includes("Error") || actionMsg.includes("Failed") ? "bg-red-50 text-red-700 border border-red-200" : "bg-accent-50 text-accent-700 border border-accent-200"}`}>
          {actionMsg}
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="input-field text-sm flex-1"
          />
          <button type="submit" className="btn-primary text-sm px-4 py-2 whitespace-nowrap">Search</button>
        </form>
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setTimeout(() => loadUsers(1), 0); }} className="input-field text-sm w-auto">
          <option value="ALL">All Roles</option>
          <option value="USER">Users</option>
          <option value="ADMIN">Admins</option>
          <option value="MODERATOR">Moderators</option>
        </select>
        <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setTimeout(() => loadUsers(1), 0); }} className="input-field text-sm w-auto">
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="most_votes">Most Votes Balance</option>
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="px-5 py-12 text-center text-sm text-surface-400">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-surface-400">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100">
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-surface-400 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-surface-400 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-center text-[11px] font-medium text-surface-400 uppercase tracking-wider">Pets</th>
                  <th className="px-4 py-3 text-center text-[11px] font-medium text-surface-400 uppercase tracking-wider">Votes</th>
                  <th className="px-4 py-3 text-right text-[11px] font-medium text-surface-400 uppercase tracking-wider">Spent</th>
                  <th className="px-4 py-3 text-right text-[11px] font-medium text-surface-400 uppercase tracking-wider">Balance</th>
                  <th className="px-4 py-3 text-right text-[11px] font-medium text-surface-400 uppercase tracking-wider">Joined</th>
                  <th className="px-4 py-3 text-center text-[11px] font-medium text-surface-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {users.map((u) => (
                  <React.Fragment key={u.id}>
                    <tr className="hover:bg-surface-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-xs flex-shrink-0">
                            {(u.name || u.email || "?")[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-surface-800 truncate">{u.name || "—"}</p>
                            <p className="text-[11px] text-surface-400 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.role === "ADMIN" ? "bg-red-100 text-red-600" :
                          u.role === "MODERATOR" ? "bg-amber-100 text-amber-600" :
                          "bg-surface-100 text-surface-500"
                        }`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-surface-700">{u.petsCount}</td>
                      <td className="px-4 py-3 text-center text-surface-700">{u.votesCount}</td>
                      <td className="px-4 py-3 text-right font-medium text-surface-800">{u.totalSpent > 0 ? `$${(u.totalSpent / 100).toFixed(2)}` : "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-surface-700 font-medium">{u.paidVoteBalance}</span>
                        <span className="text-surface-400 text-[11px]"> +{u.freeVotesRemaining}f</span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-surface-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-surface-100 text-surface-600 hover:bg-surface-200 transition-colors font-medium"
                        >
                          {expandedUser === u.id ? "Close" : "Manage"}
                        </button>
                      </td>
                    </tr>
                    {/* Expanded action row */}
                    {expandedUser === u.id && (
                      <tr>
                        <td colSpan={8} className="px-4 py-4 bg-surface-50/80">
                          <div className="flex flex-wrap items-center gap-3">
                            {/* Change role */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-surface-500 font-medium">Role:</span>
                              {(["USER", "MODERATOR", "ADMIN"] as const).map((r) => (
                                <button
                                  key={r}
                                  onClick={() => userAction(u.id, "changeRole", r)}
                                  disabled={u.role === r}
                                  className={`text-[10px] px-2 py-1 rounded font-bold uppercase transition-all ${
                                    u.role === r
                                      ? "bg-brand-500 text-white cursor-default"
                                      : "bg-white border border-surface-200 text-surface-600 hover:border-brand-300 hover:text-brand-600"
                                  }`}
                                >
                                  {r}
                                </button>
                              ))}
                            </div>
                            <div className="w-px h-6 bg-surface-200" />
                            {/* Grant votes */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-surface-500 font-medium">Grant votes:</span>
                              <input
                                type="number"
                                min="1"
                                max="10000"
                                value={grantAmount}
                                onChange={(e) => setGrantAmount(e.target.value)}
                                className="input-field text-xs w-20 py-1"
                              />
                              <button
                                onClick={() => userAction(u.id, "grantVotes", grantAmount)}
                                className="text-xs px-3 py-1 rounded-lg bg-accent-500 text-white hover:bg-accent-600 font-medium transition-colors"
                              >
                                Grant
                              </button>
                            </div>
                            <div className="w-px h-6 bg-surface-200" />
                            {/* Reset free votes */}
                            <button
                              onClick={() => userAction(u.id, "resetFreeVotes")}
                              className="text-xs px-3 py-1 rounded-lg bg-white border border-surface-200 text-surface-600 hover:border-brand-300 font-medium transition-colors"
                            >
                              Reset Free Votes
                            </button>
                            {/* Stats summary */}
                            <div className="ml-auto flex items-center gap-4 text-[11px] text-surface-400">
                              <span>{u.purchasesCount} purchases</span>
                              <span>{u.commentsCount} comments</span>
                              <span>Streak: {u.votingStreak}w</span>
                              {u.totalMeals > 0 && <span className="text-accent-600">~{Math.round(u.totalMeals)} shelter pets fed</span>}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-surface-400">
            Page {page} of {totalPages} ({total.toLocaleString()} users)
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => { setPage(page - 1); loadUsers(page - 1); }}
              disabled={page <= 1}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-surface-200 text-surface-600 hover:bg-surface-50 disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => { setPage(page + 1); loadUsers(page + 1); }}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-surface-200 text-surface-600 hover:bg-surface-50 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN REVENUE TAB ───────────────────────────────────

type RevenuePurchase = {
  id: string; tier: string; votes: number; amount: number; meals: number;
  userName: string | null; userEmail: string | null; createdAt: string;
};
type RevenueSummary = { totalRevenue: number; totalVotesSold: number; totalMeals: number; totalPurchases: number; avgOrder: number };
type TierBreakdown = { tier: string; revenue: number; votes: number; count: number };

function AdminRevenueTab({ animalType }: { animalType: string }) {
  const [purchases, setPurchases] = useState<RevenuePurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("all");
  const [tier, setTier] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<RevenueSummary>({ totalRevenue: 0, totalVotesSold: 0, totalMeals: 0, totalPurchases: 0, avgOrder: 0 });
  const [byTier, setByTier] = useState<TierBreakdown[]>([]);

  async function loadRevenue(p = page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "25", range });
      if (tier) params.set("tier", tier);
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/revenue?${params}`);
      const data = await res.json();
      setPurchases(data.purchases || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setPage(data.page || 1);
      setSummary(data.summary || summary);
      setByTier(data.byTier || []);
    } catch { /* */ }
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useState(() => { loadRevenue(1); });

  const rangeLabels: Record<string, string> = { all: "All Time", today: "Today", "7d": "Last 7 Days", "30d": "Last 30 Days", "90d": "Last 90 Days" };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-surface-900">Revenue & Purchases</h2>
          <p className="text-sm text-surface-500">{rangeLabels[range]} — {total.toLocaleString()} purchases</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="card p-4 bg-gradient-to-br from-brand-500 to-brand-600 text-white border-0">
          <p className="text-xs text-white/80">Revenue</p>
          <p className="text-2xl font-bold mt-0.5">${(summary.totalRevenue / 100).toFixed(2)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-medium text-surface-400 uppercase">Purchases</p>
          <p className="text-2xl font-bold text-surface-900 mt-0.5">{summary.totalPurchases.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-medium text-surface-400 uppercase">Votes Sold</p>
          <p className="text-2xl font-bold text-surface-900 mt-0.5">{summary.totalVotesSold.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-medium text-surface-400 uppercase">Avg Order</p>
          <p className="text-2xl font-bold text-surface-900 mt-0.5">${(summary.avgOrder / 100).toFixed(2)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-medium text-surface-400 uppercase">Shelter Impact</p>
          <p className="text-2xl font-bold text-accent-600 mt-0.5">~{Math.round(summary.totalMeals).toLocaleString()}</p>
        </div>
      </div>

      {/* Tier breakdown */}
      {byTier.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-surface-900 mb-3">Revenue by Package</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {byTier.map((t) => (
              <button
                key={t.tier}
                onClick={() => { setTier(tier === t.tier ? "" : t.tier); setTimeout(() => loadRevenue(1), 0); }}
                className={`p-3 rounded-xl text-center transition-all ${
                  tier === t.tier ? "bg-brand-50 border-2 border-brand-300 shadow-sm" : "bg-surface-50 border-2 border-transparent hover:border-surface-200"
                }`}
              >
                <p className="text-[10px] font-bold uppercase text-surface-500">{t.tier}</p>
                <p className="text-lg font-bold text-surface-900 mt-0.5">${(t.revenue / 100).toFixed(0)}</p>
                <p className="text-[11px] text-surface-400">{t.count} orders</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex gap-1 overflow-x-auto hide-scrollbar">
          {(["all", "today", "7d", "30d", "90d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => { setRange(r); setPage(1); setTimeout(() => loadRevenue(1), 0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                range === r
                  ? "bg-brand-500 text-white shadow-sm"
                  : "bg-surface-100 text-surface-600 hover:bg-surface-200"
              }`}
            >
              {rangeLabels[r]}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <form onSubmit={(e) => { e.preventDefault(); loadRevenue(1); }} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search buyer..."
            className="input-field text-sm w-40"
          />
          <button type="submit" className="btn-secondary text-sm px-3 py-2">Go</button>
        </form>
      </div>

      {/* Purchases table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="px-5 py-12 text-center text-sm text-surface-400">Loading purchases...</div>
        ) : purchases.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-surface-400">No purchases found for this filter</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100">
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-surface-400 uppercase tracking-wider">User</th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-surface-400 uppercase tracking-wider">Package</th>
                  <th className="px-5 py-3 text-right text-[11px] font-medium text-surface-400 uppercase tracking-wider">Votes</th>
                  <th className="px-5 py-3 text-right text-[11px] font-medium text-surface-400 uppercase tracking-wider">Amount</th>
                  <th className="px-5 py-3 text-right text-[11px] font-medium text-surface-400 uppercase tracking-wider">Impact</th>
                  <th className="px-5 py-3 text-right text-[11px] font-medium text-surface-400 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-50/50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-surface-800">{p.userName || "Unknown"}</p>
                      <p className="text-[11px] text-surface-400">{p.userEmail}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-50 text-brand-600">{p.tier}</span>
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-surface-800">{p.votes}</td>
                    <td className="px-5 py-3 text-right font-semibold text-surface-900">${(p.amount / 100).toFixed(2)}</td>
                    <td className="px-5 py-3 text-right text-accent-600">~{Math.round(p.meals)} {animalType}</td>
                    <td className="px-5 py-3 text-right text-surface-400 text-xs">{new Date(p.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-surface-400">Page {page} of {totalPages}</p>
          <div className="flex gap-1">
            <button onClick={() => { setPage(page - 1); loadRevenue(page - 1); }} disabled={page <= 1} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-surface-200 text-surface-600 hover:bg-surface-50 disabled:opacity-40">Previous</button>
            <button onClick={() => { setPage(page + 1); loadRevenue(page + 1); }} disabled={page >= totalPages} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-surface-200 text-surface-600 hover:bg-surface-50 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: "brand" | "accent" | "default" }) {
  const colorMap = { brand: "text-brand-600", accent: "text-accent-600", default: "text-surface-900" };
  return (
    <div className="card p-4">
      <p className="text-[11px] font-medium text-surface-400 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold mt-1 ${colorMap[color]}`}>{value}</p>
    </div>
  );
}

// ─── LEGAL PAGES EDITOR ──────────────────────────────────

function LegalPagesEditor({
  initialTos,
  initialPrivacy,
  onSave,
  saving,
}: {
  initialTos: string;
  initialPrivacy: string;
  onSave: (key: string, value: string) => Promise<void>;
  saving: boolean;
}) {
  const [activeLegal, setActiveLegal] = useState<"tos" | "privacy">("tos");
  const [tos, setTos] = useState(initialTos);
  const [privacy, setPrivacy] = useState(initialPrivacy);
  const [legalSaving, setLegalSaving] = useState(false);
  const [legalMsg, setLegalMsg] = useState("");
  const [preview, setPreview] = useState(false);

  const content = activeLegal === "tos" ? tos : privacy;
  const setContent = activeLegal === "tos" ? setTos : setPrivacy;
  const settingKey = activeLegal === "tos" ? "terms_of_service" : "privacy_policy";
  const label = activeLegal === "tos" ? "Terms of Service" : "Privacy Policy";
  const pageUrl = activeLegal === "tos" ? "/terms" : "/privacy";

  async function handleSave() {
    setLegalSaving(true);
    setLegalMsg("");
    try {
      await onSave(settingKey, content);
      setLegalMsg(`${label} saved successfully`);
    } catch {
      setLegalMsg("Failed to save");
    } finally {
      setLegalSaving(false);
      setTimeout(() => setLegalMsg(""), 3000);
    }
  }

  // Simple markdown-like rendering: headings (#, ##, ###), bold (**), italic (*), links, paragraphs
  function renderPreview(text: string) {
    if (!text) return <p className="text-surface-400 italic">No content yet. Start typing above.</p>;
    const lines = text.split("\n");
    return lines.map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <br key={i} />;

      // Headings
      if (trimmed.startsWith("### ")) return <h3 key={i} className="text-base font-semibold text-surface-900 mt-4 mb-1">{formatInline(trimmed.slice(4))}</h3>;
      if (trimmed.startsWith("## ")) return <h2 key={i} className="text-lg font-bold text-surface-900 mt-5 mb-1.5">{formatInline(trimmed.slice(3))}</h2>;
      if (trimmed.startsWith("# ")) return <h1 key={i} className="text-xl font-bold text-surface-900 mt-6 mb-2">{formatInline(trimmed.slice(2))}</h1>;

      // Bullet lists
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        return <li key={i} className="ml-4 text-sm text-surface-600 list-disc">{formatInline(trimmed.slice(2))}</li>;
      }

      return <p key={i} className="text-sm text-surface-600 leading-relaxed mb-1.5">{formatInline(trimmed)}</p>;
    });
  }

  function formatInline(text: string): React.ReactNode {
    // Bold **text** and italic *text*
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Bold
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      if (boldMatch && boldMatch.index !== undefined) {
        if (boldMatch.index > 0) parts.push(remaining.slice(0, boldMatch.index));
        parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
        continue;
      }
      parts.push(remaining);
      break;
    }
    return <>{parts}</>;
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-surface-900">Legal Pages</h3>
          <p className="text-sm text-surface-500 mt-0.5">Manage Terms of Service and Privacy Policy displayed in the footer</p>
        </div>
        <a href={pageUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1">
          View live page
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => { setActiveLegal("tos"); setPreview(false); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeLegal === "tos"
              ? "bg-white text-surface-900 shadow-sm border border-surface-200/80"
              : "text-surface-500 hover:text-surface-700 hover:bg-white/60"
          }`}
        >
          <span className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Terms of Service
          </span>
        </button>
        <button
          onClick={() => { setActiveLegal("privacy"); setPreview(false); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeLegal === "privacy"
              ? "bg-white text-surface-900 shadow-sm border border-surface-200/80"
              : "text-surface-500 hover:text-surface-700 hover:bg-white/60"
          }`}
        >
          <span className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Privacy Policy
          </span>
        </button>
      </div>

      <div className="card p-5">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-surface-900">{label}</h4>
            {content && <span className="text-[10px] text-surface-400">{content.length} chars</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreview(!preview)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                preview ? "bg-brand-50 text-brand-600 border border-brand-200" : "bg-surface-100 text-surface-600 hover:bg-surface-200"
              }`}
            >
              {preview ? "Edit" : "Preview"}
            </button>
            <button
              onClick={handleSave}
              disabled={legalSaving || saving}
              className="btn-primary text-xs px-4 py-1.5 disabled:opacity-50"
            >
              {legalSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {legalMsg && (
          <div className={`mb-3 px-3 py-2 rounded-lg text-xs font-medium ${
            legalMsg.includes("success") ? "bg-accent-50 text-accent-700 border border-accent-200" : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {legalMsg}
          </div>
        )}

        {/* Formatting hint */}
        {!preview && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-surface-50 border border-surface-100">
            <p className="text-[11px] text-surface-400">
              <span className="font-semibold text-surface-500">Formatting:</span>{" "}
              <code className="bg-surface-200 px-1 rounded"># Heading 1</code>{" "}
              <code className="bg-surface-200 px-1 rounded">## Heading 2</code>{" "}
              <code className="bg-surface-200 px-1 rounded">### Heading 3</code>{" "}
              <code className="bg-surface-200 px-1 rounded">**bold**</code>{" "}
              <code className="bg-surface-200 px-1 rounded">- bullet list</code>{" "}
              Blank line = paragraph break
            </p>
          </div>
        )}

        {preview ? (
          <div className="prose-sm max-h-[500px] overflow-y-auto p-4 rounded-lg border border-surface-200 bg-white">
            {renderPreview(content)}
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="input-field font-mono text-sm resize-none"
            rows={20}
            placeholder={`Enter your ${label} content here...\n\nUse # for headings, **bold** for emphasis, - for bullet points.`}
          />
        )}
      </div>
    </div>
  );
}

// ─── SUPPORT PANEL ───────────────────────────────────

type SupportUser = {
  id: string; name: string | null; email: string | null; role: string; image: string | null;
  city: string | null; state: string | null; country: string | null; zipCode: string | null;
  freeVotesRemaining: number; paidVoteBalance: number; votingStreak: number;
  petsCount: number; votesCount: number; purchasesCount: number; commentsCount: number;
  totalSpent: number; totalMeals: number; totalVotesPurchased: number;
  linkedAccounts: number; createdAt: string; updatedAt: string;
};

type SupportUserDetail = {
  user: SupportUser & { hasPassword: boolean; linkedAccounts: { provider: string; type: string }[]; notificationPrefs: Record<string, unknown> | null; lastFreeVoteReset: string | null; emailVerified: string | null; lastVotedWeek: string | null };
  pets: { id: string; name: string; type: string; breed: string | null; bio: string | null; photos: string[]; isActive: boolean; createdAt: string; totalVotes: number; totalComments: number }[];
  purchases: { id: string; tier: string; votes: number; amount: number; status: string; mealsProvided: number; stripeSessionId: string | null; stripePaymentId: string | null; createdAt: string }[];
  votes: { id: string; petId: string; petName: string; petPhoto: string | null; type: string; quantity: number; contestWeek: string; createdAt: string }[];
  comments: { id: string; petId: string; petName: string; text: string; createdAt: string }[];
  lifetime: { totalSpent: number; totalMeals: number; totalVotesPurchased: number; totalPurchases: number };
};

function SupportPanel() {
  const [users, setUsers] = useState<SupportUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState<SupportUserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [actionError, setActionError] = useState("");
  const [activeSection, setActiveSection] = useState<"overview" | "pets" | "purchases" | "votes" | "comments">("overview");

  // Action form states
  const [grantVotesAmount, setGrantVotesAmount] = useState("10");
  const [removeVotesAmount, setRemoveVotesAmount] = useState("10");
  const [newPassword, setNewPassword] = useState("");
  const [editProfile, setEditProfile] = useState({ name: "", email: "", city: "", state: "", zipCode: "" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function loadUsers(p = page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "25" });
      if (search) params.set("search", search);
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      const res = await fetch(`/api/support/users?${params}`);
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setPage(data.page || 1);
    } catch { /* */ }
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useState(() => { loadUsers(1); });

  async function loadUserDetail(userId: string) {
    setLoadingDetail(true);
    setSelectedUser(null);
    setActiveSection("overview");
    try {
      const res = await fetch(`/api/support/users/${userId}`);
      const data = await res.json();
      setSelectedUser(data);
      setEditProfile({
        name: data.user.name || "",
        email: data.user.email || "",
        city: data.user.city || "",
        state: data.user.state || "",
        zipCode: data.user.zipCode || "",
      });
    } catch { /* */ }
    setLoadingDetail(false);
  }

  async function doAction(userId: string, action: string, value?: unknown) {
    setActionMsg(""); setActionError("");
    try {
      const res = await fetch(`/api/support/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, value }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg(data.message || "Done");
        if (action === "deleteAccount") { setSelectedUser(null); loadUsers(); }
        else loadUserDetail(userId);
      } else {
        setActionError(data.error || "Failed");
      }
    } catch { setActionError("Error"); }
    setTimeout(() => { setActionMsg(""); setActionError(""); }, 4000);
  }

  // If a user is selected, show the detail panel
  if (selectedUser) {
    const u = selectedUser.user;
    const sections: { id: typeof activeSection; label: string; count?: number }[] = [
      { id: "overview", label: "Overview" },
      { id: "pets", label: "Pets", count: selectedUser.pets.length },
      { id: "purchases", label: "Purchases", count: selectedUser.purchases.length },
      { id: "votes", label: "Votes", count: selectedUser.votes.length },
      { id: "comments", label: "Comments", count: selectedUser.comments.length },
    ];

    return (
      <div className="space-y-4 animate-fade-in">
        {/* Back button + user header */}
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedUser(null)} className="text-xs px-3 py-1.5 rounded-lg bg-surface-100 text-surface-600 hover:bg-surface-200 font-medium">← Back</button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-surface-900">{u.name || "No Name"}</h2>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                u.role === "ADMIN" ? "bg-red-100 text-red-600" : u.role === "SUPPORT" ? "bg-violet-100 text-violet-600" : u.role === "MODERATOR" ? "bg-amber-100 text-amber-600" : "bg-surface-100 text-surface-500"
              }`}>{u.role}</span>
            </div>
            <p className="text-xs text-surface-500">{u.email} · ID: {u.id}</p>
          </div>
        </div>

        {(actionMsg || actionError) && (
          <div className={`px-4 py-2.5 rounded-lg text-sm font-medium ${actionError ? "bg-red-50 text-red-700 border border-red-200" : "bg-accent-50 text-accent-700 border border-accent-200"}`}>
            {actionMsg || actionError}
          </div>
        )}

        {/* Section tabs */}
        <div className="flex gap-1 overflow-x-auto hide-scrollbar">
          {sections.map((s) => (
            <button key={s.id} onClick={() => setActiveSection(s.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeSection === s.id ? "bg-white text-surface-900 shadow-sm border border-surface-200/80" : "text-surface-500 hover:text-surface-700 hover:bg-white/60"
            }`}>
              {s.label}{s.count !== undefined ? ` (${s.count})` : ""}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {activeSection === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Quick stats */}
            <div className="card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-surface-900">Account Info</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-surface-400 text-xs">Joined</span><p className="font-medium">{new Date(u.createdAt).toLocaleDateString()}</p></div>
                <div><span className="text-surface-400 text-xs">Auth</span><p className="font-medium">{u.hasPassword ? "Email/Password" : "OAuth only"} {u.linkedAccounts.map(a => a.provider).join(", ")}</p></div>
                <div><span className="text-surface-400 text-xs">Free Votes</span><p className="font-medium">{u.freeVotesRemaining}</p></div>
                <div><span className="text-surface-400 text-xs">Paid Balance</span><p className="font-medium">{u.paidVoteBalance}</p></div>
                <div><span className="text-surface-400 text-xs">Total Spent</span><p className="font-medium">${(selectedUser.lifetime.totalSpent / 100).toFixed(2)}</p></div>
                <div><span className="text-surface-400 text-xs">Shelter Impact</span><p className="font-medium">~{Math.round(selectedUser.lifetime.totalMeals)} fed</p></div>
                <div><span className="text-surface-400 text-xs">Voting Streak</span><p className="font-medium">{u.votingStreak}w</p></div>
                <div><span className="text-surface-400 text-xs">Location</span><p className="font-medium">{[u.city, u.state].filter(Boolean).join(", ") || "—"}</p></div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {/* Role change */}
              <div className="card p-4">
                <h4 className="text-xs font-semibold text-surface-700 mb-2">Change Role</h4>
                <div className="flex gap-1.5 flex-wrap">
                  {(["USER", "MODERATOR", "SUPPORT", "ADMIN"] as const).map((r) => (
                    <button key={r} onClick={() => doAction(u.id, "changeRole", r)} disabled={u.role === r} className={`text-[10px] px-3 py-1.5 rounded-lg font-bold uppercase transition-all ${
                      u.role === r ? "bg-brand-500 text-white" : "bg-white border border-surface-200 text-surface-600 hover:border-brand-300"
                    }`}>{r}</button>
                  ))}
                </div>
              </div>

              {/* Grant / Remove votes */}
              <div className="card p-4">
                <h4 className="text-xs font-semibold text-surface-700 mb-2">Vote Management</h4>
                <div className="flex gap-2 items-center mb-2">
                  <input type="number" min="1" value={grantVotesAmount} onChange={(e) => setGrantVotesAmount(e.target.value)} className="input-field text-xs w-24 py-1.5" />
                  <button onClick={() => doAction(u.id, "grantVotes", grantVotesAmount)} className="text-xs px-3 py-1.5 rounded-lg bg-accent-500 text-white hover:bg-accent-600 font-medium">+ Grant</button>
                  <input type="number" min="1" value={removeVotesAmount} onChange={(e) => setRemoveVotesAmount(e.target.value)} className="input-field text-xs w-24 py-1.5" />
                  <button onClick={() => doAction(u.id, "removeVotes", removeVotesAmount)} className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 font-medium">- Remove</button>
                </div>
                <button onClick={() => doAction(u.id, "resetFreeVotes", "5")} className="text-xs px-3 py-1.5 rounded-lg bg-surface-100 text-surface-600 hover:bg-surface-200 font-medium">Reset Free Votes (5)</button>
              </div>

              {/* Reset password */}
              <div className="card p-4">
                <h4 className="text-xs font-semibold text-surface-700 mb-2">Reset Password</h4>
                <div className="flex gap-2">
                  <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field text-xs flex-1 py-1.5" placeholder="New password (min 8 chars)" />
                  <button onClick={() => { doAction(u.id, "resetPassword", newPassword); setNewPassword(""); }} disabled={newPassword.length < 8} className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 font-medium disabled:opacity-50">Reset</button>
                </div>
              </div>

              {/* Edit profile */}
              <div className="card p-4">
                <h4 className="text-xs font-semibold text-surface-700 mb-2">Edit Profile</h4>
                <div className="grid grid-cols-2 gap-2">
                  <input value={editProfile.name} onChange={(e) => setEditProfile({ ...editProfile, name: e.target.value })} className="input-field text-xs py-1.5" placeholder="Name" />
                  <input value={editProfile.email} onChange={(e) => setEditProfile({ ...editProfile, email: e.target.value })} className="input-field text-xs py-1.5" placeholder="Email" />
                  <input value={editProfile.city} onChange={(e) => setEditProfile({ ...editProfile, city: e.target.value })} className="input-field text-xs py-1.5" placeholder="City" />
                  <input value={editProfile.state} onChange={(e) => setEditProfile({ ...editProfile, state: e.target.value })} className="input-field text-xs py-1.5" placeholder="State" />
                </div>
                <button onClick={() => doAction(u.id, "updateProfile", editProfile)} className="mt-2 text-xs px-3 py-1.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600 font-medium">Save Changes</button>
              </div>

              {/* Danger zone */}
              <div className="card p-4 border-red-200">
                <h4 className="text-xs font-semibold text-red-600 mb-2">Danger Zone</h4>
                {!showDeleteConfirm ? (
                  <button onClick={() => setShowDeleteConfirm(true)} className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 font-medium">Delete Account Permanently</button>
                ) : (
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-xs text-red-700 font-medium mb-2">This will permanently delete {u.email} and all their data (pets, votes, comments, purchases). This cannot be undone.</p>
                    <div className="flex gap-2">
                      <button onClick={() => doAction(u.id, "deleteAccount")} className="text-xs px-4 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 font-bold">Yes, Delete Forever</button>
                      <button onClick={() => setShowDeleteConfirm(false)} className="text-xs px-3 py-1.5 rounded-lg bg-white text-surface-600 border border-surface-200 font-medium">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── PETS ── */}
        {activeSection === "pets" && (
          <div className="space-y-3">
            {selectedUser.pets.length === 0 ? <p className="text-sm text-surface-400 text-center py-8">No pets</p> : selectedUser.pets.map((pet) => (
              <div key={pet.id} className={`card p-4 flex items-start gap-4 ${!pet.isActive ? "opacity-60" : ""}`}>
                {pet.photos[0] ? <img src={pet.photos[0]} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" /> : <div className="w-16 h-16 rounded-xl bg-surface-100 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-surface-900 text-sm">{pet.name}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-100 text-surface-500">{pet.type}</span>
                    {!pet.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600">Deactivated</span>}
                  </div>
                  <p className="text-xs text-surface-400">{pet.breed || "—"} · {pet.totalVotes} votes · {pet.totalComments} comments</p>
                  <p className="text-xs text-surface-400">Photos: {pet.photos.length} · Added {new Date(pet.createdAt).toLocaleDateString()}</p>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {pet.photos.map((_, i) => (
                      <button key={i} onClick={() => doAction(u.id, "removePetPhoto", { petId: pet.id, photoIndex: i })} className="text-[10px] px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 font-medium">Remove Photo {i + 1}</button>
                    ))}
                    {pet.isActive ? (
                      <button onClick={() => doAction(u.id, "deactivatePet", { petId: pet.id })} className="text-[10px] px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 font-medium">Deactivate</button>
                    ) : (
                      <button onClick={() => doAction(u.id, "reactivatePet", { petId: pet.id })} className="text-[10px] px-2 py-1 rounded bg-accent-50 text-accent-600 hover:bg-accent-100 font-medium">Reactivate</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── PURCHASES ── */}
        {activeSection === "purchases" && (
          <div className="card p-0 overflow-hidden">
            {selectedUser.purchases.length === 0 ? <p className="text-sm text-surface-400 text-center py-8">No purchases</p> : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-surface-100">
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-surface-400 uppercase">Package</th>
                  <th className="px-4 py-3 text-right text-[11px] font-medium text-surface-400 uppercase">Amount</th>
                  <th className="px-4 py-3 text-right text-[11px] font-medium text-surface-400 uppercase">Votes</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-surface-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-surface-400 uppercase">Stripe</th>
                  <th className="px-4 py-3 text-right text-[11px] font-medium text-surface-400 uppercase">Date</th>
                  <th className="px-4 py-3 text-center text-[11px] font-medium text-surface-400 uppercase">Action</th>
                </tr></thead>
                <tbody className="divide-y divide-surface-50">
                  {selectedUser.purchases.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-50/50">
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-50 text-brand-600">{p.tier}</span></td>
                      <td className="px-4 py-3 text-right font-semibold">${(p.amount / 100).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">{p.votes}</td>
                      <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        p.status === "COMPLETED" ? "bg-accent-50 text-accent-600" : p.status === "REFUNDED" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                      }`}>{p.status}</span></td>
                      <td className="px-4 py-3 text-xs text-surface-400 font-mono">{p.stripePaymentId ? "..." + p.stripePaymentId.slice(-8) : "—"}</td>
                      <td className="px-4 py-3 text-right text-xs text-surface-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-center">
                        {p.status === "COMPLETED" && (
                          <button onClick={() => doAction(u.id, "refundPurchase", { purchaseId: p.id })} className="text-[10px] px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 font-medium">Refund</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── VOTES ── */}
        {activeSection === "votes" && (
          <div className="card p-0 overflow-hidden">
            {selectedUser.votes.length === 0 ? <p className="text-sm text-surface-400 text-center py-8">No votes</p> : (
              <ul className="divide-y divide-surface-50 max-h-[500px] overflow-y-auto">
                {selectedUser.votes.map((v) => (
                  <li key={v.id} className="px-4 py-3 flex items-center gap-3">
                    {v.petPhoto ? <img src={v.petPhoto} alt="" className="w-8 h-8 rounded-lg object-cover" /> : <div className="w-8 h-8 rounded-lg bg-surface-100" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-surface-700 truncate"><span className="font-medium">{v.petName}</span> {v.quantity > 1 && `x${v.quantity}`}</p>
                      <p className="text-[10px] text-surface-400">{v.contestWeek} · {new Date(v.createdAt).toLocaleString()}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${v.type === "FREE" ? "bg-accent-50 text-accent-600" : "bg-brand-50 text-brand-600"}`}>{v.type}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── COMMENTS ── */}
        {activeSection === "comments" && (
          <div className="space-y-2">
            {selectedUser.comments.length === 0 ? <p className="text-sm text-surface-400 text-center py-8">No comments</p> : selectedUser.comments.map((c) => (
              <div key={c.id} className="card p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-surface-500">on <span className="font-medium text-surface-700">{c.petName}</span> · {new Date(c.createdAt).toLocaleString()}</p>
                  <p className="text-sm text-surface-800 mt-0.5">{c.text}</p>
                </div>
                <button onClick={() => doAction(u.id, "deleteComment", { commentId: c.id })} className="text-[10px] px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 font-medium flex-shrink-0">Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // User list view
  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold text-surface-900">Support — User Management</h2>
        <p className="text-sm text-surface-500">Full access to manage any user account: edit profile, votes, purchases, refunds, photos, passwords, and account deletion.</p>
      </div>

      {/* Search */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); loadUsers(1); }} className="flex-1 flex gap-2">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, or user ID..." className="input-field text-sm flex-1" />
          <button type="submit" className="btn-primary text-sm px-4 py-2">Search</button>
        </form>
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setTimeout(() => loadUsers(1), 0); }} className="input-field text-sm w-auto">
          <option value="ALL">All Roles</option>
          <option value="USER">Users</option>
          <option value="ADMIN">Admins</option>
          <option value="SUPPORT">Support</option>
          <option value="MODERATOR">Moderators</option>
        </select>
      </div>

      <p className="text-xs text-surface-400">{total.toLocaleString()} users found</p>

      {/* User table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="px-5 py-12 text-center text-sm text-surface-400">Loading...</div>
        ) : users.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-surface-400">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-surface-100">
                <th className="px-4 py-3 text-left text-[11px] font-medium text-surface-400 uppercase">User</th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-surface-400 uppercase">Role</th>
                <th className="px-4 py-3 text-center text-[11px] font-medium text-surface-400 uppercase">Pets</th>
                <th className="px-4 py-3 text-right text-[11px] font-medium text-surface-400 uppercase">Spent</th>
                <th className="px-4 py-3 text-right text-[11px] font-medium text-surface-400 uppercase">Balance</th>
                <th className="px-4 py-3 text-right text-[11px] font-medium text-surface-400 uppercase">Joined</th>
                <th className="px-4 py-3 text-center text-[11px] font-medium text-surface-400 uppercase"></th>
              </tr></thead>
              <tbody className="divide-y divide-surface-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-50/50 cursor-pointer" onClick={() => loadUserDetail(u.id)}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-surface-800 truncate">{u.name || "—"}</p>
                      <p className="text-[11px] text-surface-400 truncate">{u.email}</p>
                    </td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      u.role === "ADMIN" ? "bg-red-100 text-red-600" : u.role === "SUPPORT" ? "bg-violet-100 text-violet-600" : u.role === "MODERATOR" ? "bg-amber-100 text-amber-600" : "bg-surface-100 text-surface-500"
                    }`}>{u.role}</span></td>
                    <td className="px-4 py-3 text-center">{u.petsCount}</td>
                    <td className="px-4 py-3 text-right font-medium">{u.totalSpent > 0 ? `$${(u.totalSpent / 100).toFixed(2)}` : "—"}</td>
                    <td className="px-4 py-3 text-right">{u.paidVoteBalance}<span className="text-surface-400 text-[11px]"> +{u.freeVotesRemaining}f</span></td>
                    <td className="px-4 py-3 text-right text-xs text-surface-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-center"><span className="text-xs text-brand-600 font-medium">Open →</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {loadingDetail && <div className="text-center py-8 text-sm text-surface-400">Loading user details...</div>}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-surface-400">Page {page} of {totalPages}</p>
          <div className="flex gap-1">
            <button onClick={() => { setPage(page - 1); loadUsers(page - 1); }} disabled={page <= 1} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-surface-200 text-surface-600 hover:bg-surface-50 disabled:opacity-40">Previous</button>
            <button onClick={() => { setPage(page + 1); loadUsers(page + 1); }} disabled={page >= totalPages} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-surface-200 text-surface-600 hover:bg-surface-50 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN EMAIL TAB ─────────────────────────────────

type EmailTemplateData = {
  type: string;
  label: string;
  description: string;
  subject: string;
  body: string;
  enabled: boolean;
  isCustomized: boolean;
};
type EmailConfig = { resendApiKey: string; resendFromEmail: string; isConfigured: boolean };

function AdminEmailTab() {
  const [templates, setTemplates] = useState<Record<string, EmailTemplateData>>({});
  const [config, setConfig] = useState<EmailConfig>({ resendApiKey: "", resendFromEmail: "", isConfigured: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [fromEmailInput, setFromEmailInput] = useState("");

  async function loadTemplates() {
    try {
      const res = await fetch("/api/admin/email-templates");
      const data = await res.json();
      setTemplates(data.templates || {});
      setConfig(data.config || { resendApiKey: "", resendFromEmail: "", isConfigured: false });
      setFromEmailInput(data.config?.resendFromEmail || "");
    } catch { /* ignore */ }
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useState(() => { loadTemplates(); });

  async function saveConfig(key: string, value: string) {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateConfig", key, value }),
      });
      if (res.ok) {
        setMsg("Saved!");
        loadTemplates();
      } else {
        const data = await res.json();
        setMsg(data.error || "Failed");
      }
    } catch { setMsg("Error"); }
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  }

  async function toggleTemplate(type: string, enabled: boolean) {
    try {
      await fetch("/api/admin/email-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, enabled }),
      });
      setTemplates((prev) => ({
        ...prev,
        [type]: { ...prev[type], enabled },
      }));
    } catch { /* ignore */ }
  }

  async function saveTemplate(type: string) {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, subject: editSubject, body: editBody }),
      });
      if (res.ok) {
        setMsg("Template saved!");
        setEditingTemplate(null);
        loadTemplates();
      } else {
        const data = await res.json();
        setMsg(data.error || "Failed");
      }
    } catch { setMsg("Error"); }
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  }

  const templateOrder = ["WELCOME", "VOTE_RECEIVED", "COMMENT_RECEIVED", "PURCHASE_CONFIRMATION", "FREE_VOTES_ADDED", "CONTEST_CLOSING", "CONTEST_RESULT"];

  if (loading) return <div className="text-center py-12 text-sm text-surface-400">Loading email settings...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold text-surface-900">Email Alert Settings</h2>
        <p className="text-sm text-surface-500 mt-1">Configure Resend email provider and manage all email touchpoints with editable messaging.</p>
      </div>

      {msg && (
        <div className={`px-4 py-2.5 rounded-lg text-sm font-medium ${msg.includes("Error") || msg.includes("Failed") ? "bg-red-50 text-red-700 border border-red-200" : "bg-accent-50 text-accent-700 border border-accent-200"}`}>
          {msg}
        </div>
      )}

      {/* Resend Configuration */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-blue-500"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          <h3 className="text-sm font-semibold text-surface-900">Resend Email Configuration</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">API Key</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={config.resendApiKey || "re_..."}
                className="input-field flex-1 font-mono text-xs"
                autoComplete="off"
              />
              <button
                onClick={() => { if (apiKeyInput) saveConfig("resend_api_key", apiKeyInput); }}
                disabled={saving || !apiKeyInput}
                className="btn-primary text-xs px-3 py-2 disabled:opacity-50"
              >
                Save
              </button>
            </div>
            {config.resendApiKey && (
              <p className="text-[10px] text-accent-600 mt-1 flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                Key saved ({config.resendApiKey})
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">From Email</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={fromEmailInput}
                onChange={(e) => setFromEmailInput(e.target.value)}
                placeholder="Vote to Feed <noreply@votetofeed.com>"
                className="input-field flex-1 text-xs"
              />
              <button
                onClick={() => saveConfig("resend_from_email", fromEmailInput)}
                disabled={saving}
                className="btn-primary text-xs px-3 py-2 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>

        <div className={`mt-4 flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium ${
          config.isConfigured ? "bg-accent-50 text-accent-700 border border-accent-200" : "bg-amber-50 text-amber-700 border border-amber-200"
        }`}>
          <span className={`w-2 h-2 rounded-full ${config.isConfigured ? "bg-accent-500" : "bg-amber-400"}`} />
          {config.isConfigured ? "Resend connected — emails will be sent" : "Resend not configured — emails disabled. Get an API key at resend.com"}
        </div>
      </div>

      {/* Email Touchpoints */}
      <div>
        <h3 className="text-sm font-semibold text-surface-900 mb-3">Email Touchpoints</h3>
        <div className="space-y-3">
          {templateOrder.map((type) => {
            const tmpl = templates[type];
            if (!tmpl) return null;
            const isEditing = editingTemplate === type;

            return (
              <div key={type} className={`card p-4 transition-all ${isEditing ? "ring-2 ring-brand-200" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-surface-900">{tmpl.label}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        tmpl.enabled ? "bg-accent-50 text-accent-600" : "bg-surface-100 text-surface-400"
                      }`}>
                        {tmpl.enabled ? "Active" : "Disabled"}
                      </span>
                      {(type === "VOTE_RECEIVED" || type === "COMMENT_RECEIVED" || type === "FREE_VOTES_ADDED" || type === "CONTEST_CLOSING") && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                          User can opt out
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-surface-500 mt-0.5">{tmpl.description}</p>
                    {!isEditing && (
                      <p className="text-xs text-surface-400 mt-1 font-mono truncate">Subject: {tmpl.subject}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleTemplate(type, !tmpl.enabled)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${tmpl.enabled ? "bg-accent-500" : "bg-surface-300"}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${tmpl.enabled ? "left-5" : "left-0.5"}`} />
                    </button>
                    <button
                      onClick={() => {
                        if (isEditing) { setEditingTemplate(null); }
                        else { setEditingTemplate(type); setEditSubject(tmpl.subject); setEditBody(tmpl.body); }
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-surface-100 text-surface-600 hover:bg-surface-200 font-medium transition-colors"
                    >
                      {isEditing ? "Cancel" : "Edit"}
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-4 space-y-3 border-t border-surface-100 pt-4">
                    <div>
                      <label className="block text-xs font-medium text-surface-600 mb-1">Subject Line</label>
                      <input
                        type="text"
                        value={editSubject}
                        onChange={(e) => setEditSubject(e.target.value)}
                        className="input-field text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-surface-600 mb-1">
                        Email Body <span className="text-surface-400 font-normal">(HTML — use {"{{variable}}"} for dynamic content)</span>
                      </label>
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        className="input-field font-mono text-xs resize-none"
                        rows={10}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => saveTemplate(type)}
                        disabled={saving}
                        className="btn-primary text-xs px-4 py-2 disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Save Template"}
                      </button>
                      <button
                        onClick={() => setEditingTemplate(null)}
                        className="text-xs px-4 py-2 rounded-lg bg-surface-100 text-surface-600 hover:bg-surface-200 font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── CONTEST MANAGER ─────────────────────────────────────
type ContestData = {
  id: string;
  name: string;
  type: string;
  petType: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isFeatured: boolean;
  description: string | null;
  entryCount: number;
  daysLeft: number;
  totalPrizeValue: number;
  prizeDescription: string | null;
  sponsorName: string | null;
  hasEnded: boolean;
};

function ContestManager() {
  const [contests, setContests] = useState<ContestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverFileRef = React.useRef<HTMLInputElement>(null);

  const [cf, setCf] = useState({
    name: "",
    type: "SEASONAL",
    petType: "DOG",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    description: "",
    rules: "",
    coverImage: "",
    prizeDescription: "",
    sponsorName: "",
    isFeatured: false,
  });

  async function loadContests() {
    try {
      const res = await fetch("/api/contests?includeEnded=true");
      const data = await res.json();
      if (Array.isArray(data)) setContests(data);
    } catch { /* ignore */ }
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useState(() => { loadContests(); });

  async function createContest(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateMsg("");
    try {
      const res = await fetch("/api/contests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...cf,
          startDate: new Date(cf.startDate).toISOString(),
          endDate: new Date(cf.endDate).toISOString(),
          description: cf.description || undefined,
          rules: cf.rules || undefined,
          coverImage: cf.coverImage || undefined,
          prizeDescription: cf.prizeDescription || undefined,
          sponsorName: cf.sponsorName || undefined,
        }),
      });
      if (res.ok) {
        setCreateMsg("Contest created!");
        setShowForm(false);
        setCf({ name: "", type: "SEASONAL", petType: "DOG", startDate: new Date().toISOString().split("T")[0], endDate: "", description: "", rules: "", coverImage: "", prizeDescription: "", sponsorName: "", isFeatured: false });
        loadContests();
      } else {
        const data = await res.json();
        setCreateMsg(data.error || "Failed to create");
      }
    } catch {
      setCreateMsg("Error creating contest");
    } finally {
      setCreating(false);
      setTimeout(() => setCreateMsg(""), 4000);
    }
  }

  function contestTypeLabel(type: string) {
    const map: Record<string, string> = { NATIONAL: "Weekly", SEASONAL: "Seasonal", CHARITY: "Charity", CALENDAR: "Calendar", BREED: "Breed", STATE: "Regional" };
    return map[type] || type;
  }
  function contestTypeBadge(type: string) {
    const map: Record<string, string> = { NATIONAL: "bg-brand-100 text-brand-700", SEASONAL: "bg-amber-100 text-amber-700", CHARITY: "bg-emerald-100 text-emerald-700", CALENDAR: "bg-violet-100 text-violet-700", BREED: "bg-sky-100 text-sky-700", STATE: "bg-orange-100 text-orange-700" };
    return map[type] || "bg-surface-100 text-surface-600";
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-surface-900">Contest Management</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm px-4 py-2">
          {showForm ? "Cancel" : "+ New Contest"}
        </button>
      </div>

      {createMsg && <p className={`text-sm mb-3 ${createMsg.includes("created") ? "text-emerald-600" : "text-red-600"}`}>{createMsg}</p>}

      {/* Create form */}
      {showForm && (
        <form onSubmit={createContest} className="card p-5 mb-6 space-y-4">
          <h3 className="font-semibold text-surface-900">Create New Contest</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Contest Name *</label>
              <input value={cf.name} onChange={(e) => setCf((f) => ({ ...f, name: e.target.value }))} className="input-field" required placeholder="e.g. Summer Fun Photo Contest" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1">Type *</label>
                <select value={cf.type} onChange={(e) => setCf((f) => ({ ...f, type: e.target.value }))} className="input-field">
                  <option value="NATIONAL">National (Weekly)</option>
                  <option value="SEASONAL">Seasonal</option>
                  <option value="CHARITY">Charity</option>
                  <option value="CALENDAR">Calendar</option>
                  <option value="BREED">Breed-specific</option>
                  <option value="STATE">Regional/State</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1">Pet Type *</label>
                <select value={cf.petType} onChange={(e) => setCf((f) => ({ ...f, petType: e.target.value }))} className="input-field">
                  <option value="DOG">Dog</option>
                  <option value="CAT">Cat</option>
                </select>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Start Date *</label>
              <input type="date" value={cf.startDate} onChange={(e) => setCf((f) => ({ ...f, startDate: e.target.value }))} className="input-field" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">End Date *</label>
              <input type="date" value={cf.endDate} onChange={(e) => setCf((f) => ({ ...f, endDate: e.target.value }))} className="input-field" required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Description</label>
            <textarea value={cf.description} onChange={(e) => setCf((f) => ({ ...f, description: e.target.value }))} className="input-field resize-none" rows={2} placeholder="What is this contest about?" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Rules</label>
            <textarea value={cf.rules} onChange={(e) => setCf((f) => ({ ...f, rules: e.target.value }))} className="input-field resize-none" rows={2} placeholder="Contest rules and eligibility..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Prize Summary</label>
              <input value={cf.prizeDescription} onChange={(e) => setCf((f) => ({ ...f, prizeDescription: e.target.value }))} className="input-field" placeholder="e.g. 1st: $500 Pack | 2nd: $200 Pack" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Sponsor Name</label>
              <input value={cf.sponsorName} onChange={(e) => setCf((f) => ({ ...f, sponsorName: e.target.value }))} className="input-field" placeholder="e.g. BarkBox" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Cover Image</label>
            <p className="text-[11px] text-surface-400 mb-2">Recommended: <span className="font-semibold">1200 x 630px</span> (landscape, 1.9:1 ratio). Min 600px wide. JPG, PNG, or WebP. Max 5MB.</p>

            {cf.coverImage ? (
              <div className="relative rounded-xl overflow-hidden border border-surface-200 bg-surface-50 mb-2">
                <img
                  src={cf.coverImage}
                  alt="Cover preview"
                  className="w-full aspect-[1.9/1] object-cover"
                />
                <button
                  type="button"
                  onClick={() => setCf((f) => ({ ...f, coverImage: "" }))}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/50 text-white text-[10px] font-medium backdrop-blur-sm">
                  Cover image
                </div>
              </div>
            ) : (
              <div
                onClick={() => coverFileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  uploadingCover ? "border-brand-300 bg-brand-50/50" : "border-surface-200 hover:border-brand-300 hover:bg-surface-50"
                }`}
              >
                {uploadingCover ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
                    <span className="text-xs text-brand-600 font-medium">Uploading...</span>
                  </div>
                ) : (
                  <>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-surface-300 mb-2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <p className="text-xs text-surface-500 font-medium">Click to upload cover image</p>
                    <p className="text-[10px] text-surface-400 mt-0.5">1200 x 630px recommended</p>
                  </>
                )}
              </div>
            )}

            <input
              ref={coverFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) {
                  setCreateMsg("Image must be under 5MB");
                  setTimeout(() => setCreateMsg(""), 3000);
                  return;
                }
                setUploadingCover(true);
                try {
                  const formData = new FormData();
                  formData.append("photos", file);
                  const res = await fetch("/api/upload", { method: "POST", body: formData });
                  const data = await res.json();
                  if (res.ok && data.urls?.[0]) {
                    setCf((f) => ({ ...f, coverImage: data.urls[0] }));
                  } else {
                    setCreateMsg(data.error || "Upload failed");
                    setTimeout(() => setCreateMsg(""), 3000);
                  }
                } catch {
                  setCreateMsg("Upload failed");
                  setTimeout(() => setCreateMsg(""), 3000);
                } finally {
                  setUploadingCover(false);
                  if (coverFileRef.current) coverFileRef.current.value = "";
                }
              }}
            />

            {/* Fallback: paste URL */}
            <div className="mt-2">
              <details className="group">
                <summary className="text-[11px] text-surface-400 cursor-pointer hover:text-surface-600 transition-colors">
                  Or paste an image URL instead
                </summary>
                <input
                  type="url"
                  value={cf.coverImage}
                  onChange={(e) => setCf((f) => ({ ...f, coverImage: e.target.value }))}
                  className="input-field text-sm mt-1.5"
                  placeholder="https://example.com/image.jpg"
                />
              </details>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={cf.isFeatured} onChange={(e) => setCf((f) => ({ ...f, isFeatured: e.target.checked }))} className="w-4 h-4 rounded border-surface-300 text-brand-600" />
            <span className="text-sm text-surface-700">Featured contest (shown prominently)</span>
          </label>
          <button type="submit" disabled={creating} className="btn-primary py-2 px-6 text-sm disabled:opacity-50">
            {creating ? "Creating..." : "Create Contest"}
          </button>
        </form>
      )}

      {/* Contest list */}
      {loading ? (
        <p className="text-sm text-surface-400">Loading contests...</p>
      ) : contests.length === 0 ? (
        <p className="text-sm text-surface-400">No contests found. Create one above.</p>
      ) : (
        <div className="space-y-2">
          {contests.map((c) => (
            <div key={c.id} className={`card p-4 flex items-center gap-4 ${c.hasEnded ? "opacity-60" : ""}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-surface-900">{c.name}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${contestTypeBadge(c.type)}`}>
                    {contestTypeLabel(c.type)}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-100 text-surface-500">
                    {c.petType === "DOG" ? "Dogs" : "Cats"}
                  </span>
                  {c.isFeatured && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Featured</span>}
                  {c.hasEnded && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-600">Ended</span>}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-surface-500">
                  <span>{new Date(c.startDate).toLocaleDateString()} — {new Date(c.endDate).toLocaleDateString()}</span>
                  <span>{c.entryCount} entries</span>
                  {c.totalPrizeValue > 0 && <span className="text-emerald-600 font-medium">${(c.totalPrizeValue / 100).toLocaleString()} prizes</span>}
                  {!c.hasEnded && <span>{c.daysLeft}d left</span>}
                  {c.sponsorName && <span>Sponsor: {c.sponsorName}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
