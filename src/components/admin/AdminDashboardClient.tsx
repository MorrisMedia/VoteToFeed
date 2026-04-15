"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ImageUpload } from "@/components/shared/ImageUpload";

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

type Tab = "overview" | "users" | "pets" | "revenue" | "settings" | "api-keys" | "moderation" | "engagement" | "shelter";

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
      id: "settings",
      label: "Settings",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
    },
    {
      id: "api-keys" as Tab,
      label: "API Keys",
      icon: <span>🔑</span>,
    },
    {
      id: "moderation" as Tab,
      label: "Moderation",
      icon: <span>🛡️</span>,
    },
    {
      id: "engagement" as Tab,
      label: "Engagement",
      icon: <span>🤖</span>,
    },
    {
      id: "shelter" as Tab,
      label: "Shelter Stories",
      icon: <span>🏠</span>,
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
          <Link href="/admin/guide" className="flex items-center gap-1.5 text-sm font-medium text-surface-600 hover:text-brand-600 px-3 py-2 rounded-lg hover:bg-brand-50 transition-colors border border-surface-200">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            Admin Guide
          </Link>
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

        {activeTab === "api-keys" && <AdminApiKeysTab />}
        {activeTab === "moderation" && <AdminModerationTab />}
        {activeTab === "engagement" && <AdminEngagementTab />}
        {activeTab === "shelter" && <AdminShelterTab />}
      </div>
    </div>
  );
}

// ─── API KEYS TAB ────────────────────────────────────────

type ApiKeyRecord = { id: string; name: string; prefix: string; isActive: boolean; lastUsedAt: string | null; usageCount: number; createdBy: string; createdAt: string; revokedAt: string | null };

function AdminApiKeysTab() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchKeys = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/api-keys");
    const data = await res.json();
    setKeys(data.keys || []);
    setLoading(false);
  };

  useEffect(() => { fetchKeys(); }, []);

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/admin/api-keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newKeyName }) });
    const data = await res.json();
    if (data.key) { setRevealedKey(data.key); setNewKeyName(""); fetchKeys(); }
    setCreating(false);
  };

  const revokeKey = async (id: string) => {
    if (!confirm("Revoke this API key?")) return;
    await fetch("/api/admin/api-keys", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchKeys();
  };

  const copyKey = () => { if (revealedKey) { navigator.clipboard.writeText(revealedKey); setCopied(true); setTimeout(() => setCopied(false), 2000); } };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-surface-900">API Keys</h2>
        <div className="flex gap-2">
          <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="Key name..." className="rounded-lg border border-surface-200 bg-white px-3 py-1.5 text-sm" />
          <button onClick={createKey} disabled={creating || !newKeyName.trim()} className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">Create Key</button>
        </div>
      </div>

      {revealedKey && (
        <div className="rounded-xl border-2 border-yellow-400 bg-yellow-50 p-4">
          <p className="text-sm font-semibold text-yellow-800 mb-2">⚠️ Save this key now — it won&apos;t be shown again!</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-white px-3 py-2 text-xs font-mono text-surface-800 border">{revealedKey}</code>
            <button onClick={copyKey} className="rounded-lg bg-surface-800 px-3 py-2 text-xs text-white">{copied ? "Copied!" : "Copy"}</button>
          </div>
          <button onClick={() => setRevealedKey(null)} className="mt-2 text-xs text-yellow-700 hover:underline">Dismiss</button>
        </div>
      )}

      {loading ? <p className="text-sm text-surface-500">Loading...</p> : (
        <div className="overflow-x-auto rounded-xl border border-surface-200">
          <table className="w-full text-sm">
            <thead className="bg-surface-50"><tr>
              <th className="px-4 py-3 text-left font-medium text-surface-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-surface-600">Key</th>
              <th className="px-4 py-3 text-left font-medium text-surface-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-surface-600">Usage</th>
              <th className="px-4 py-3 text-left font-medium text-surface-600">Created</th>
              <th className="px-4 py-3 text-left font-medium text-surface-600">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-surface-100">
              {keys.map(k => (
                <tr key={k.id} className="hover:bg-surface-50">
                  <td className="px-4 py-3 font-medium">{k.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-surface-500">{k.prefix}...</td>
                  <td className="px-4 py-3">{k.isActive ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Active</span> : <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Revoked</span>}</td>
                  <td className="px-4 py-3 text-surface-500">{k.usageCount} calls</td>
                  <td className="px-4 py-3 text-xs text-surface-400">{new Date(k.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{k.isActive && <button onClick={() => revokeKey(k.id)} className="text-xs text-red-600 hover:text-red-800 font-medium">Revoke</button>}</td>
                </tr>
              ))}
              {keys.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-surface-400">No API keys yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── MODERATION TAB ──────────────────────────────────────

type FlaggedItem = { id: string; reason: string; matchedWords: string[]; status: string; createdAt: string; comment: { id: string; text: string; user: { id: string; name: string | null; email: string | null; image: string | null }; pet: { id: string; name: string } } };
type CommentItem = { id: string; text: string; createdAt: string; user: { id: string; name: string | null; email: string | null; image: string | null }; pet: { id: string; name: string } };

function AdminModerationTab() {
  const [subTab, setSubTab] = useState<"spam" | "comments">("spam");
  const [items, setItems] = useState<FlaggedItem[] | CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchItems = async () => {
    setLoading(true);
    const params = new URLSearchParams({ tab: subTab, page: String(page), limit: "25" });
    if (search && subTab === "comments") params.set("search", search);
    const res = await fetch(`/api/admin/moderation?${params}`);
    const data = await res.json();
    setItems(data.items || []);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [subTab, page]);

  const moderateAction = async (action: string, id: string, userId?: string) => {
    await fetch("/api/admin/moderation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, id, userId }) });
    fetchItems();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-surface-200 pb-2">
        {(["spam", "comments"] as const).map(t => (
          <button key={t} onClick={() => { setSubTab(t); setPage(1); }} className={`rounded-lg px-4 py-2 text-sm font-medium ${subTab === t ? "bg-brand-600 text-white" : "text-surface-600 hover:bg-surface-100"}`}>
            {t === "spam" ? "🛡️ Spam Queue" : "💬 All Comments"}
          </button>
        ))}
      </div>

      {subTab === "comments" && (
        <div className="flex gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search comments..." className="flex-1 rounded-lg border border-surface-200 px-3 py-2 text-sm" />
          <button onClick={fetchItems} className="rounded-lg bg-surface-200 px-4 py-2 text-sm">Search</button>
        </div>
      )}

      {loading ? <p className="text-sm text-surface-500 py-8 text-center">Loading...</p> : (
        <div className="space-y-2">
          {(items as (FlaggedItem | CommentItem)[]).map((item) => {
            if (subTab === "spam") {
              const f = item as FlaggedItem;
              return (
                <div key={f.id} className="rounded-xl border border-surface-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{f.comment?.user?.name || "Unknown"}</span>
                        <span className="text-xs text-surface-400">{f.comment?.user?.email}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${f.reason === "profanity" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>{f.reason}</span>
                      </div>
                      <p className="text-sm text-surface-700 mb-1">&ldquo;{f.comment?.text}&rdquo;</p>
                      <p className="text-xs text-surface-400">On: {f.comment?.pet?.name} · Matched: {f.matchedWords?.join(", ")} · {new Date(f.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => moderateAction("approve_comment", f.id)} className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200">✅ Approve</button>
                      <button onClick={() => moderateAction("reject_comment", f.id)} className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200">❌ Reject</button>
                    </div>
                  </div>
                </div>
              );
            } else {
              const c = item as CommentItem;
              return (
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-surface-200 bg-white p-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium">{c.user?.name || "Unknown"}</span>
                      <span className="text-xs text-surface-400">on {c.pet?.name}</span>
                    </div>
                    <p className="text-sm text-surface-600">{c.text}</p>
                    <p className="text-xs text-surface-400 mt-0.5">{new Date(c.createdAt).toLocaleString()}</p>
                  </div>
                  <button onClick={() => moderateAction("delete_comment", c.id)} className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 shrink-0">Delete</button>
                </div>
              );
            }
          })}
          {items.length === 0 && <p className="text-center text-surface-400 py-8">{subTab === "spam" ? "No pending spam — all clear! 🎉" : "No comments found"}</p>}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded-lg border px-3 py-1 text-sm disabled:opacity-40">← Prev</button>
          <span className="px-3 py-1 text-sm text-surface-500">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded-lg border px-3 py-1 text-sm disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}

// ─── ENGAGEMENT TAB ──────────────────────────────────────

type EngagementLogEntry = { id: string; targetUserId: string; seedAccountId: string; petId: string; action: string; commentText: string | null; createdAt: string };

function AdminEngagementTab() {
  const [logs, setLogs] = useState<EngagementLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/engagement-log");
    const data = await res.json();
    setLogs(data.logs || []);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const seedEngagements = async () => {
    setProcessing(true); setResult(null);
    const res = await fetch("/api/admin/seed-engagement", { method: "POST" });
    const data = await res.json();
    setResult(JSON.stringify(data, null, 2));
    setProcessing(false);
    fetchLogs();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={seedEngagements} disabled={processing} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">{processing ? "Seeding..." : "🌱 Seed Engagements"}</button>
      </div>

      {result && (
        <details open className="rounded-xl border border-surface-200 bg-white">
          <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-surface-700">Seed Engagement Results</summary>
          <pre className="px-4 py-2 text-xs text-surface-600 overflow-x-auto max-h-60">{result}</pre>
        </details>
      )}

      <div>
        <h3 className="text-sm font-semibold text-surface-700 mb-3">Engagement Log ({logs.length} entries)</h3>
        {loading ? <p className="text-sm text-surface-500">Loading...</p> : (
          <div className="overflow-x-auto rounded-xl border border-surface-200">
            <table className="w-full text-xs">
              <thead className="bg-surface-50"><tr>
                <th className="px-3 py-2 text-left font-medium text-surface-600">Time</th>
                <th className="px-3 py-2 text-left font-medium text-surface-600">Target User</th>
                <th className="px-3 py-2 text-left font-medium text-surface-600">Seed Account</th>
                <th className="px-3 py-2 text-left font-medium text-surface-600">Action</th>
                <th className="px-3 py-2 text-left font-medium text-surface-600">Comment</th>
              </tr></thead>
              <tbody className="divide-y divide-surface-100">
                {logs.map(l => (
                  <tr key={l.id} className="hover:bg-surface-50">
                    <td className="px-3 py-2 text-surface-500 whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono text-surface-600">{l.targetUserId.slice(0, 8)}...</td>
                    <td className="px-3 py-2 font-mono text-surface-600">{l.seedAccountId.slice(0, 8)}...</td>
                    <td className="px-3 py-2">{l.action === "like" ? "❤️ Like" : "💬 Comment"}</td>
                    <td className="px-3 py-2 text-surface-500 max-w-xs truncate">{l.commentText || "—"}</td>
                  </tr>
                ))}
                {logs.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-surface-400">No engagement activity yet</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SHELTER TAB ─────────────────────────────────────────

type ShelterPartnerData = { id: string; name: string; logoUrl: string | null; website: string | null; description: string | null; isActive: boolean; createdAt: string };
type ShelterPostData = { id: string; title: string | null; featuredImage: string | null; content: string | null; photos: string[]; caption: string | null; videoUrl: string | null; tags: string[]; type: string; location: string | null; isPublished: boolean; createdAt: string; author: { name: string | null }; contest: { id: string; name: string } | null };

function AdminShelterTab() {
  const [subTab, setSubTab] = useState<"posts" | "partners">("posts");
  const [posts, setPosts] = useState<ShelterPostData[]>([]);
  const [partners, setPartners] = useState<ShelterPartnerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  // Post form state
  const emptyPost = { title: "", featuredImage: "", content: "", photos: [] as string[], caption: "", videoUrl: "", tags: [] as string[], type: "UPDATE", location: "", contestId: "", isPublished: true };
  const [pf, setPf] = useState(emptyPost);
  const [tagInput, setTagInput] = useState("");
  const [photoInput, setPhotoInput] = useState("");

  // Partner form state
  const emptyPartner = { name: "", logoUrl: "", website: "", description: "" };
  const [partnerForm, setPartnerForm] = useState(emptyPartner);
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch("/api/shelter-posts?all=true");
    const data = await res.json();
    setPosts(data.posts || []);
    const pRes = await fetch("/api/admin/shelter-partners");
    const pData = await pRes.json();
    setPartners(pData.partners || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Post CRUD
  const savePost = async () => {
    const url = editingId ? `/api/shelter-posts/${editingId}` : "/api/shelter-posts";
    const method = editingId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(pf) });
    if (res.ok) { setShowForm(false); setEditingId(null); setPf(emptyPost); fetchData(); setMsg(editingId ? "Post updated" : "Post created"); }
    else { const d = await res.json(); setMsg(d.error || "Failed"); }
    setTimeout(() => setMsg(""), 3000);
  };

  const startEditPost = (p: ShelterPostData) => {
    setEditingId(p.id);
    setPf({ title: p.title || "", featuredImage: p.featuredImage || "", content: p.content || "", photos: p.photos || [], caption: p.caption || "", videoUrl: p.videoUrl || "", tags: p.tags || [], type: p.type, location: p.location || "", contestId: p.contest?.id || "", isPublished: p.isPublished });
    setShowForm(true);
  };

  const deletePost = async (id: string) => {
    if (!confirm("Delete this shelter post?")) return;
    await fetch(`/api/shelter-posts/${id}`, { method: "DELETE" });
    fetchData();
  };

  const togglePublish = async (id: string, isPublished: boolean) => {
    await fetch(`/api/shelter-posts/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPublished }) });
    fetchData();
  };

  // Partner CRUD
  const savePartner = async () => {
    if (editingPartnerId) {
      await fetch("/api/admin/shelter-partners", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingPartnerId, ...partnerForm }) });
    } else {
      await fetch("/api/admin/shelter-partners", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(partnerForm) });
    }
    setEditingPartnerId(null); setPartnerForm(emptyPartner); fetchData();
  };

  const deletePartner = async (id: string) => {
    if (!confirm("Delete this shelter partner?")) return;
    await fetch("/api/admin/shelter-partners", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchData();
  };

  const togglePartner = async (id: string, isActive: boolean) => {
    await fetch("/api/admin/shelter-partners", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, isActive }) });
    fetchData();
  };

  const addTag = () => { if (tagInput.trim() && !pf.tags.includes(tagInput.trim())) { setPf(f => ({ ...f, tags: [...f.tags, tagInput.trim()] })); setTagInput(""); } };
  const removeTag = (t: string) => setPf(f => ({ ...f, tags: f.tags.filter(x => x !== t) }));
  const addPhoto = () => { if (photoInput.trim()) { setPf(f => ({ ...f, photos: [...f.photos, photoInput.trim()] })); setPhotoInput(""); } };
  const removePhoto = (url: string) => setPf(f => ({ ...f, photos: f.photos.filter(x => x !== url) }));

  const typeLabel: Record<string, string> = { UPDATE: "Update", STORY: "Story", ANNOUNCEMENT: "Announcement", GALLERY: "Gallery" };
  const typeBadge: Record<string, string> = { UPDATE: "bg-blue-100 text-blue-700", STORY: "bg-purple-100 text-purple-700", ANNOUNCEMENT: "bg-red-100 text-red-700", GALLERY: "bg-emerald-100 text-emerald-700" };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-surface-200 pb-2">
        <button onClick={() => setSubTab("posts")} className={`rounded-lg px-4 py-2 text-sm font-medium ${subTab === "posts" ? "bg-brand-600 text-white" : "text-surface-600 hover:bg-surface-100"}`}>📝 Shelter Posts ({posts.length})</button>
        <button onClick={() => setSubTab("partners")} className={`rounded-lg px-4 py-2 text-sm font-medium ${subTab === "partners" ? "bg-brand-600 text-white" : "text-surface-600 hover:bg-surface-100"}`}>🤝 Shelter Partners ({partners.length})</button>
      </div>

      {msg && <p className={`text-sm ${msg.includes("Failed") || msg.includes("error") ? "text-red-600" : "text-emerald-600"}`}>{msg}</p>}

      {loading ? <p className="text-sm text-surface-500 py-8 text-center">Loading...</p> : subTab === "posts" ? (
        <div className="space-y-4">
          <div className="flex justify-between">
            <h2 className="text-lg font-bold text-surface-900">Shelter Posts</h2>
            <button onClick={() => { setShowForm(!showForm); setEditingId(null); setPf(emptyPost); }} className="btn-primary text-sm px-4 py-2">{showForm ? "Cancel" : "+ New Post"}</button>
          </div>

          {showForm && (
            <div className="card p-5 space-y-3">
              <h3 className="font-semibold text-surface-900">{editingId ? "Edit Post" : "Create New Post"}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-surface-500 mb-1">Title</label>
                  <input value={pf.title} onChange={e => setPf(f => ({...f, title: e.target.value}))} className="input-field" placeholder="Post title..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-500 mb-1">Post Type</label>
                  <select value={pf.type} onChange={e => setPf(f => ({...f, type: e.target.value}))} className="input-field">
                    <option value="UPDATE">Update</option><option value="STORY">Story</option>
                    <option value="ANNOUNCEMENT">Announcement</option><option value="GALLERY">Gallery</option>
                  </select>
                </div>
              </div>
              <ImageUpload label="Featured Image" value={pf.featuredImage} onChange={url => setPf(f => ({...f, featuredImage: url}))} />
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1">Content (Markdown supported)</label>
                <textarea value={pf.content} onChange={e => setPf(f => ({...f, content: e.target.value}))} className="input-field resize-none font-mono text-sm" rows={6} placeholder="Write your shelter post content here..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1">Caption (short summary)</label>
                <textarea value={pf.caption} onChange={e => setPf(f => ({...f, caption: e.target.value}))} className="input-field resize-none" rows={2} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-surface-500 mb-1">Location / Shelter</label>
                  <input value={pf.location} onChange={e => setPf(f => ({...f, location: e.target.value}))} className="input-field" placeholder="Happy Paws Rescue, Austin TX" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-500 mb-1">Video URL (YouTube/Vimeo)</label>
                  <input value={pf.videoUrl} onChange={e => setPf(f => ({...f, videoUrl: e.target.value}))} className="input-field" placeholder="https://youtube.com/watch?v=..." />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1">Photo Gallery</label>
                <div className="flex gap-2 mb-2">
                  <input value={photoInput} onChange={e => setPhotoInput(e.target.value)} className="input-field flex-1" placeholder="Paste photo URL" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addPhoto())} />
                  <button type="button" onClick={addPhoto} className="btn-secondary text-xs px-3">Add</button>
                </div>
                {pf.photos.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {pf.photos.map((url, i) => (
                      <div key={i} className="relative group">
                        <img src={url} alt="" className="h-16 w-16 rounded object-cover border" />
                        <button onClick={() => removePhoto(url)} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1">Tags</label>
                <div className="flex gap-2 mb-2">
                  <input value={tagInput} onChange={e => setTagInput(e.target.value)} className="input-field flex-1" placeholder="Add tag..." onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())} />
                  <button type="button" onClick={addTag} className="btn-secondary text-xs px-3">Add</button>
                </div>
                {pf.tags.length > 0 && <div className="flex gap-1 flex-wrap">{pf.tags.map(t => <span key={t} className="rounded-full bg-surface-100 px-2 py-0.5 text-xs flex items-center gap-1">{t}<button onClick={() => removeTag(t)} className="text-surface-400 hover:text-red-500">✕</button></span>)}</div>}
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-sm"><input type="checkbox" checked={pf.isPublished} onChange={e => setPf(f => ({...f, isPublished: e.target.checked}))} className="w-4 h-4 rounded" /> Published</label>
              </div>
              <div className="flex gap-2">
                <button onClick={savePost} className="btn-primary text-sm px-6 py-2">{editingId ? "Save Changes" : "Create Post"}</button>
                <button onClick={() => { setShowForm(false); setEditingId(null); }} className="btn-secondary text-sm px-4 py-2">Cancel</button>
              </div>
            </div>
          )}

          {posts.map(p => (
            <div key={p.id} className="card p-4 flex gap-4 items-start">
              {p.featuredImage && <img src={p.featuredImage} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-surface-900">{p.title || "(Untitled)"}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${typeBadge[p.type] || "bg-surface-100 text-surface-500"}`}>{typeLabel[p.type] || p.type}</span>
                  {!p.isPublished && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-200 text-surface-500">Draft</span>}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-surface-500">
                  {p.location && <span>📍 {p.location}</span>}
                  <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                  <span>by {p.author?.name || "Admin"}</span>
                  {p.photos.length > 0 && <span>📷 {p.photos.length} photos</span>}
                  {p.videoUrl && <span>🎥 Video</span>}
                  {p.tags.length > 0 && <span>{p.tags.join(", ")}</span>}
                </div>
                {p.caption && <p className="text-xs text-surface-600 mt-1 line-clamp-2">{p.caption}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => togglePublish(p.id, !p.isPublished)} title={p.isPublished ? "Unpublish" : "Publish"} className={`p-1.5 rounded-lg text-xs ${p.isPublished ? "bg-green-100 text-green-700" : "bg-surface-100 text-surface-400"}`}>{p.isPublished ? "✅" : "⏸"}</button>
                <button onClick={() => startEditPost(p)} className="p-1.5 rounded-lg text-xs text-surface-400 hover:bg-surface-100">✏️</button>
                <button onClick={() => deletePost(p.id)} className="p-1.5 rounded-lg text-xs text-surface-400 hover:bg-red-50 hover:text-red-600">🗑️</button>
              </div>
            </div>
          ))}
          {posts.length === 0 && <p className="text-center text-surface-400 py-8">No shelter posts yet. Create one above!</p>}
        </div>
      ) : (
        /* Partners sub-tab */
        <div className="space-y-4">
          <div className="flex justify-between">
            <h2 className="text-lg font-bold text-surface-900">Shelter Partners</h2>
            <button onClick={() => { setEditingPartnerId(null); setPartnerForm(emptyPartner); setShowForm(!showForm); }} className="btn-primary text-sm px-4 py-2">{showForm && !editingPartnerId ? "Cancel" : "+ New Partner"}</button>
          </div>

          {(showForm || editingPartnerId) && (
            <div className="card p-5 space-y-3">
              <h3 className="font-semibold text-surface-900">{editingPartnerId ? "Edit Partner" : "Add Shelter Partner"}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-surface-500 mb-1">Name *</label><input value={partnerForm.name} onChange={e => setPartnerForm(f => ({...f, name: e.target.value}))} className="input-field" /></div>
                <div><label className="block text-xs font-medium text-surface-500 mb-1">Website</label><input value={partnerForm.website} onChange={e => setPartnerForm(f => ({...f, website: e.target.value}))} className="input-field" placeholder="https://..." /></div>
              </div>
              <div><label className="block text-xs font-medium text-surface-500 mb-1">Logo URL</label><input value={partnerForm.logoUrl} onChange={e => setPartnerForm(f => ({...f, logoUrl: e.target.value}))} className="input-field" /></div>
              <div><label className="block text-xs font-medium text-surface-500 mb-1">Description</label><textarea value={partnerForm.description} onChange={e => setPartnerForm(f => ({...f, description: e.target.value}))} className="input-field resize-none" rows={2} /></div>
              <div className="flex gap-2">
                <button onClick={savePartner} className="btn-primary text-sm px-6 py-2">Save</button>
                <button onClick={() => { setEditingPartnerId(null); setShowForm(false); setPartnerForm(emptyPartner); }} className="btn-secondary text-sm px-4 py-2">Cancel</button>
              </div>
            </div>
          )}

          {partners.map(p => (
            <div key={p.id} className="card p-4 flex items-center gap-4">
              {p.logoUrl && <img src={p.logoUrl} alt={p.name} className="w-12 h-12 rounded-lg object-contain bg-surface-50 p-1" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-surface-900">{p.name}</span>
                  {!p.isActive && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-surface-200 text-surface-500">Inactive</span>}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-surface-500">
                  {p.website && <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">{p.website}</a>}
                  {p.description && <span className="truncate max-w-xs">{p.description}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => togglePartner(p.id, !p.isActive)} className={`p-1.5 rounded-lg text-xs ${p.isActive ? "bg-green-100 text-green-700" : "bg-surface-100 text-surface-400"}`}>{p.isActive ? "✅" : "⏸"}</button>
                <button onClick={() => { setEditingPartnerId(p.id); setPartnerForm({ name: p.name, logoUrl: p.logoUrl || "", website: p.website || "", description: p.description || "" }); setShowForm(true); }} className="p-1.5 rounded-lg text-xs text-surface-400 hover:bg-surface-100">✏️</button>
                <button onClick={() => deletePartner(p.id)} className="p-1.5 rounded-lg text-xs text-surface-400 hover:bg-red-50 hover:text-red-600">🗑️</button>
              </div>
            </div>
          ))}
          {partners.length === 0 && <p className="text-center text-surface-400 py-8">No shelter partners yet</p>}
        </div>
      )}
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

// ─── CONTEST MANAGER ─────────────────────────────────────
type ContestData = {
  id: string;
  name: string;
  type: string;
  petType: string;
  state: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isFeatured: boolean;
  description: string | null;
  rules: string | null;
  coverImage: string | null;
  entryFee: number;
  maxEntries: number | null;
  entryCount: number;
  daysLeft: number;
  totalPrizeValue: number;
  prizeDescription: string | null;
  sponsorName: string | null;
  sponsorLogo: string | null;
  sponsorUrl: string | null;
  isRecurring: boolean;
  recurringInterval: string | null;
  recurringCounter: number;
  isStoryteller: boolean;
  hasEnded: boolean;
  prizes?: { placement: number; title: string; value: number; items: string[] }[];
};

type ContestWinnerRecord = {
  id: string;
  contestId: string;
  contestName: string;
  contestEndedAt: string;
  placement: number;
  title: string;
  winnerPetId: string | null;
  winnerPetName: string;
  ownerUserName: string;
  ownerAddress: string;
  prizeSent: boolean;
  fulfilledAt: string | null;
  awardedAt: string | null;
  status: string;
  value: number;
};

function ContestManager() {
  const [contests, setContests] = useState<ContestData[]>([]);
  const [winners, setWinners] = useState<ContestWinnerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [winnersLoading, setWinnersLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("");
  const [winnerMsg, setWinnerMsg] = useState("");
  const [togglingPrizeId, setTogglingPrizeId] = useState<string | null>(null);
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
    isRecurring: false,
    recurringInterval: "biweekly",
    isStoryteller: false,
    prizes: [
      { placement: 1, title: "1st Place", value: "", items: "" },
      { placement: 2, title: "2nd Place", value: "", items: "" },
      { placement: 3, title: "3rd Place", value: "", items: "" },
    ],
  });

  async function loadContests() {
    try {
      const res = await fetch("/api/contests?includeEnded=true");
      const data = await res.json();
      if (Array.isArray(data)) setContests(data);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function loadWinners() {
    setWinnersLoading(true);
    try {
      const res = await fetch("/api/admin/contest-winners");
      const data = await res.json();
      setWinners(Array.isArray(data.winners) ? data.winners : []);
    } catch {
      setWinners([]);
    } finally {
      setWinnersLoading(false);
    }
  }

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [editMsg, setEditMsg] = useState("");

  useEffect(() => {
    loadContests();
    loadWinners();
  }, []);

  function startEdit(c: ContestData) {
    setEditingId(c.id);
    
    // Load prizes and convert from cents to dollars for display
    const prizes = [
      { placement: 1, title: "1st Place", value: "", items: "" },
      { placement: 2, title: "2nd Place", value: "", items: "" },
      { placement: 3, title: "3rd Place", value: "", items: "" },
    ];
    
    if (c.prizes && Array.isArray(c.prizes)) {
      c.prizes.forEach((p: any) => {
        const idx = prizes.findIndex(pr => pr.placement === p.placement);
        if (idx !== -1) {
          prizes[idx] = {
            placement: p.placement,
            title: p.title || `${p.placement === 1 ? '1st' : p.placement === 2 ? '2nd' : '3rd'} Place`,
            value: (p.value / 100).toString(), // Convert cents to dollars
            items: Array.isArray(p.items) ? p.items.join(", ") : (p.items || ""),
          };
        }
      });
    }
    
    setEditForm({
      name: c.name, type: c.type, petType: c.petType, state: c.state || "",
      startDate: new Date(c.startDate).toISOString().split("T")[0],
      endDate: new Date(c.endDate).toISOString().split("T")[0],
      description: c.description || "", rules: c.rules || "",
      coverImage: c.coverImage || "", prizeDescription: c.prizeDescription || "",
      sponsorName: c.sponsorName || "", sponsorUrl: c.sponsorUrl || "",
      isFeatured: c.isFeatured, isActive: c.isActive,
      entryFee: c.entryFee || 0, maxEntries: c.maxEntries || "",
      isRecurring: c.isRecurring || false, recurringInterval: c.recurringInterval || "biweekly",
      isStoryteller: c.isStoryteller || false,
      prizes: prizes,
    });
  }

  async function saveEdit(id: string) {
    setEditMsg("");
    try {
      // Transform prizes: convert value to cents, split items into array, filter out empty tiers
      const transformedPrizes = (editForm.prizes as any[])
        .filter((p: any) => p.value && parseFloat(p.value) > 0)
        .map((p: any) => ({
          placement: p.placement,
          title: p.title,
          value: Math.round(parseFloat(p.value) * 100), // Convert dollars to cents
          items: p.items ? p.items.split(",").map((item: string) => item.trim()).filter((item: string) => item) : [],
        }));

      const payload = {
        ...editForm,
        startDate: new Date(editForm.startDate as string).toISOString(),
        endDate: new Date(editForm.endDate as string).toISOString(),
        entryFee: Number(editForm.entryFee) || 0,
        maxEntries: editForm.maxEntries ? Number(editForm.maxEntries) : null,
        prizes: transformedPrizes,
      };
      const res = await fetch(`/api/contests/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) { setEditingId(null); loadContests(); loadWinners(); }
      else { const d = await res.json(); setEditMsg(d.error || "Save failed"); }
    } catch { setEditMsg("Error saving"); }
  }

  async function toggleField(id: string, field: "isActive" | "isFeatured", value: boolean) {
    await fetch(`/api/contests/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    loadContests();
    loadWinners();
  }

  async function deleteContest(id: string, name: string) {
    if (!confirm(`Delete contest "${name}"? Contests with entries will be deactivated instead.`)) return;
    await fetch(`/api/contests/${id}`, { method: "DELETE" });
    loadContests();
    loadWinners();
  }

  async function createContest(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateMsg("");
    try {
      // Transform prizes: convert value to cents, split items into array, filter out empty tiers
      const transformedPrizes = cf.prizes
        .filter((p: { placement: number; title: string; value: string; items: string }) => p.value && parseFloat(p.value) > 0)
        .map((p: { placement: number; title: string; value: string; items: string }) => ({
          placement: p.placement,
          title: p.title,
          value: Math.round(parseFloat(p.value) * 100), // Convert dollars to cents
          items: p.items ? p.items.split(",").map((item: string) => item.trim()).filter((item: string) => item) : [],
        }));

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
          prizes: transformedPrizes,
        }),
      });
      if (res.ok) {
        setCreateMsg("Contest created!");
        setShowForm(false);
        setCf({ name: "", type: "SEASONAL", petType: "DOG", startDate: new Date().toISOString().split("T")[0], endDate: "", description: "", rules: "", coverImage: "", prizeDescription: "", sponsorName: "", isFeatured: false, isRecurring: false, recurringInterval: "biweekly", isStoryteller: false, prizes: [
          { placement: 1, title: "1st Place", value: "", items: "" },
          { placement: 2, title: "2nd Place", value: "", items: "" },
          { placement: 3, title: "3rd Place", value: "", items: "" },
        ] });
        loadContests();
        loadWinners();
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

  async function togglePrizeSent(prizeId: string, prizeSent: boolean) {
    setTogglingPrizeId(prizeId);
    setWinnerMsg("");
    try {
      const res = await fetch("/api/admin/contest-winners", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prizeId, prizeSent }),
      });
      const data = await res.json();
      if (!res.ok) {
        setWinnerMsg(data.error || "Failed to update prize status");
      } else {
        setWinners((current) => current.map((winner) => winner.id === prizeId ? {
          ...winner,
          prizeSent: data.prizeSent,
          fulfilledAt: data.fulfilledAt,
          status: data.status,
        } : winner));
        setWinnerMsg(data.prizeSent ? "Prize marked as sent" : "Prize marked as not sent");
      }
    } catch {
      setWinnerMsg("Failed to update prize status");
    } finally {
      setTogglingPrizeId(null);
      setTimeout(() => setWinnerMsg(""), 3000);
    }
  }

  const endedContests = contests.filter((contest) => contest.hasEnded);

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

          {/* Prize Tiers */}
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-2">Prize Tiers</label>
            <div className="space-y-2">
              {cf.prizes && cf.prizes.map((prize: { placement: number; title: string; value: string; items: string }, idx: number) => (
                <div key={prize.placement} className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-2 bg-surface-50 rounded-lg">
                  <div>
                    <label className="block text-[10px] font-medium text-surface-500 mb-0.5">{prize.title}</label>
                    <input
                      type="text"
                      placeholder="Title"
                      value={prize.title}
                      onChange={(e) => setCf((f) => ({
                        ...f,
                        prizes: f.prizes.map((p, i) => i === idx ? { ...p, title: e.target.value } : p)
                      }))}
                      className="input-field text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-surface-500 mb-0.5">Value ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={prize.value}
                      onChange={(e) => setCf((f) => ({
                        ...f,
                        prizes: f.prizes.map((p, i) => i === idx ? { ...p, value: e.target.value } : p)
                      }))}
                      className="input-field text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-medium text-surface-500 mb-0.5">Items (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. Gift Card, Premium Treats"
                      value={prize.items}
                      onChange={(e) => setCf((f) => ({
                        ...f,
                        prizes: f.prizes.map((p, i) => i === idx ? { ...p, items: e.target.value } : p)
                      }))}
                      className="input-field text-xs"
                    />
                  </div>
                </div>
              ))}
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
                  formData.append("file", file);
                  const res = await fetch("/api/upload/blob", { method: "POST", body: formData });
                  const data = await res.json();
                  if (res.ok && data.url) {
                    setCf((f) => ({ ...f, coverImage: data.url }));
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
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={cf.isFeatured} onChange={(e) => setCf((f) => ({ ...f, isFeatured: e.target.checked }))} className="w-4 h-4 rounded border-surface-300 text-brand-600" />
              <span className="text-sm text-surface-700">Featured</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={cf.isRecurring} onChange={(e) => setCf((f) => ({ ...f, isRecurring: e.target.checked }))} className="w-4 h-4 rounded border-surface-300 text-brand-600" />
              <span className="text-sm text-surface-700">Recurring</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={cf.isStoryteller} onChange={(e) => setCf((f) => ({ ...f, isStoryteller: e.target.checked }))} className="w-4 h-4 rounded border-surface-300 text-brand-600" />
              <span className="text-sm text-surface-700">Storyteller Mode</span>
            </label>
            {cf.isRecurring && (
              <select value={cf.recurringInterval} onChange={(e) => setCf((f) => ({ ...f, recurringInterval: e.target.value }))} className="input-field text-sm w-auto">
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly</option>
              </select>
            )}
          </div>
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
            <div key={c.id} className={`card p-4 ${c.hasEnded ? "opacity-60" : ""}`}>
              {editingId === c.id ? (
                /* ── EDIT FORM ── */
                <div className="space-y-3">
                  {editMsg && <p className="text-xs text-red-600">{editMsg}</p>}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-surface-500 mb-0.5">Name</label>
                      <input value={editForm.name as string} onChange={e => setEditForm(f => ({...f, name: e.target.value}))} className="input-field text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-surface-500 mb-0.5">Type</label>
                      <select value={editForm.type as string} onChange={e => setEditForm(f => ({...f, type: e.target.value}))} className="input-field text-sm">
                        <option value="NATIONAL">National</option><option value="SEASONAL">Seasonal</option>
                        <option value="CHARITY">Charity</option><option value="CALENDAR">Calendar</option>
                        <option value="BREED">Breed</option><option value="STATE">State</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-surface-500 mb-0.5">Pet Type</label>
                      <select value={editForm.petType as string} onChange={e => setEditForm(f => ({...f, petType: e.target.value}))} className="input-field text-sm">
                        <option value="DOG">Dog</option><option value="CAT">Cat</option><option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-surface-500 mb-0.5">Start Date</label>
                      <input type="date" value={editForm.startDate as string} onChange={e => setEditForm(f => ({...f, startDate: e.target.value}))} className="input-field text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-surface-500 mb-0.5">End Date</label>
                      <input type="date" value={editForm.endDate as string} onChange={e => setEditForm(f => ({...f, endDate: e.target.value}))} className="input-field text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-surface-500 mb-0.5">Description</label>
                    <textarea value={editForm.description as string} onChange={e => setEditForm(f => ({...f, description: e.target.value}))} className="input-field text-sm resize-none" rows={2} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-surface-500 mb-0.5">Rules</label>
                    <textarea value={editForm.rules as string} onChange={e => setEditForm(f => ({...f, rules: e.target.value}))} className="input-field text-sm resize-none" rows={2} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-surface-500 mb-0.5">Prize Summary</label>
                      <input value={editForm.prizeDescription as string} onChange={e => setEditForm(f => ({...f, prizeDescription: e.target.value}))} className="input-field text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-surface-500 mb-0.5">Sponsor</label>
                      <input value={editForm.sponsorName as string} onChange={e => setEditForm(f => ({...f, sponsorName: e.target.value}))} className="input-field text-sm" />
                    </div>
                    <div>
                      <ImageUpload label="Cover Image" value={editForm.coverImage as string} onChange={url => setEditForm(f => ({...f, coverImage: url}))} />
                    </div>
                  </div>

                  {/* Prize Tiers */}
                  <div>
                    <label className="block text-[10px] font-medium text-surface-500 mb-1">Prize Tiers</label>
                    <div className="space-y-1.5">
                      {Array.isArray(editForm.prizes) && (editForm.prizes as any[]).map((prize: any, idx: number) => (
                        <div key={prize.placement} className="grid grid-cols-1 sm:grid-cols-4 gap-1.5 p-1.5 bg-surface-50 rounded">
                          <div>
                            <label className="block text-[9px] font-medium text-surface-500 mb-0.5">{prize.title}</label>
                            <input
                              type="text"
                              placeholder="Title"
                              value={prize.title}
                              onChange={(e) => setEditForm((f) => ({
                                ...f,
                                prizes: (f.prizes as any[]).map((p, i) => i === idx ? { ...p, title: e.target.value } : p)
                              }))}
                              className="input-field text-xs py-1"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-medium text-surface-500 mb-0.5">Value ($)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={prize.value}
                              onChange={(e) => setEditForm((f) => ({
                                ...f,
                                prizes: (f.prizes as any[]).map((p, i) => i === idx ? { ...p, value: e.target.value } : p)
                              }))}
                              className="input-field text-xs py-1"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[9px] font-medium text-surface-500 mb-0.5">Items (comma-separated)</label>
                            <input
                              type="text"
                              placeholder="e.g. Gift Card, Premium Treats"
                              value={prize.items}
                              onChange={(e) => setEditForm((f) => ({
                                ...f,
                                prizes: (f.prizes as any[]).map((p, i) => i === idx ? { ...p, items: e.target.value } : p)
                              }))}
                              className="input-field text-xs py-1"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-surface-500 mb-0.5">Entry Fee (cents)</label>
                      <input type="number" value={editForm.entryFee as number} onChange={e => setEditForm(f => ({...f, entryFee: e.target.value}))} className="input-field text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-surface-500 mb-0.5">Max Entries (blank=unlimited)</label>
                      <input type="number" value={editForm.maxEntries as string} onChange={e => setEditForm(f => ({...f, maxEntries: e.target.value}))} className="input-field text-sm" placeholder="Unlimited" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs"><input type="checkbox" checked={editForm.isFeatured as boolean} onChange={e => setEditForm(f => ({...f, isFeatured: e.target.checked}))} className="w-3.5 h-3.5 rounded" /> Featured</label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs"><input type="checkbox" checked={editForm.isActive as boolean} onChange={e => setEditForm(f => ({...f, isActive: e.target.checked}))} className="w-3.5 h-3.5 rounded" /> Active</label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs"><input type="checkbox" checked={editForm.isRecurring as boolean} onChange={e => setEditForm(f => ({...f, isRecurring: e.target.checked}))} className="w-3.5 h-3.5 rounded" /> Recurring</label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs"><input type="checkbox" checked={Boolean(editForm.isStoryteller)} onChange={e => setEditForm(f => ({...f, isStoryteller: e.target.checked}))} className="w-3.5 h-3.5 rounded" /> Storyteller Mode</label>
                    {Boolean(editForm.isRecurring) && (
                      <select value={editForm.recurringInterval as string} onChange={e => setEditForm(f => ({...f, recurringInterval: e.target.value}))} className="input-field text-xs w-auto py-0.5">
                        <option value="weekly">Weekly</option><option value="biweekly">Biweekly</option><option value="monthly">Monthly</option>
                      </select>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(c.id)} className="btn-primary text-xs px-4 py-1.5">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-surface-500 hover:text-surface-700 px-3 py-1.5">Cancel</button>
                  </div>
                </div>
              ) : (
                /* ── DISPLAY ROW ── */
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-surface-900">{c.name}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${contestTypeBadge(c.type)}`}>
                        {contestTypeLabel(c.type)}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-100 text-surface-500">
                        {c.petType === "DOG" ? "Dogs" : c.petType === "CAT" ? "Cats" : "Other"}
                      </span>
                      {c.isFeatured && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Featured</span>}
                      {!c.isActive && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-200 text-surface-500">Inactive</span>}
                      {c.isRecurring && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700">🔄 {c.recurringInterval}</span>}
                      {c.hasEnded && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-600">Ended</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-surface-500">
                      <span>{new Date(c.startDate).toLocaleDateString()} — {new Date(c.endDate).toLocaleDateString()}</span>
                      <span>{c.entryCount} entries</span>
                      {c.totalPrizeValue > 0 && <span className="text-emerald-600 font-medium">${(c.totalPrizeValue / 100).toLocaleString()} prizes</span>}
                      {!c.hasEnded && <span>{c.daysLeft}d left</span>}
                      {c.sponsorName && <span>Sponsor: {c.sponsorName}</span>}
                      {c.prizeDescription && <span className="text-emerald-600">{c.prizeDescription}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleField(c.id, "isFeatured", !c.isFeatured)} title={c.isFeatured ? "Unfeature" : "Feature"} className={`p-1.5 rounded-lg text-xs transition ${c.isFeatured ? "bg-yellow-100 text-yellow-700" : "text-surface-400 hover:bg-surface-100"}`}>⭐</button>
                    <button onClick={() => toggleField(c.id, "isActive", !c.isActive)} title={c.isActive ? "Deactivate" : "Activate"} className={`p-1.5 rounded-lg text-xs transition ${c.isActive ? "bg-green-100 text-green-700" : "bg-surface-100 text-surface-400"}`}>{c.isActive ? "✅" : "⏸"}</button>
                    <button onClick={() => startEdit(c)} title="Edit" className="p-1.5 rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-700 text-xs transition">✏️</button>
                    <button onClick={() => deleteContest(c.id, c.name)} title="Delete" className="p-1.5 rounded-lg text-surface-400 hover:bg-red-50 hover:text-red-600 text-xs transition">🗑️</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-surface-900">Winners</h3>
            <p className="text-sm text-surface-500 mt-1">Closed contest winners and fulfillment tracking.</p>
          </div>
          <span className="text-xs font-medium text-surface-400">{endedContests.length} ended contests</span>
        </div>

        {winnerMsg && (
          <div className={`mb-3 rounded-lg border px-4 py-2.5 text-sm font-medium ${winnerMsg.includes("Failed") ? "border-red-200 bg-red-50 text-red-700" : "border-accent-200 bg-accent-50 text-accent-700"}`}>
            {winnerMsg}
          </div>
        )}

        {winnersLoading ? (
          <div className="card p-5 text-sm text-surface-400">Loading winners...</div>
        ) : winners.length === 0 ? (
          <div className="card p-5 text-sm text-surface-500">
            {endedContests.length === 0
              ? "No ended contests yet. Winners will appear here once contests close."
              : "No prizes or winners have been assigned for ended contests yet."}
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-100 bg-surface-50">
                    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-surface-400">Contest</th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-surface-400">Winner Pet</th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-surface-400">Owner Name</th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-surface-400">Shipping Address</th>
                    <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-wider text-surface-400">Prize / Product Sent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-50">
                  {winners.map((winner) => (
                    <tr key={winner.id} className="hover:bg-surface-50/50 align-top">
                      <td className="px-4 py-3">
                        <div className="min-w-[220px]">
                          <p className="font-medium text-surface-800">{winner.contestName}</p>
                          <p className="mt-0.5 text-[11px] text-surface-400">{winner.placement}{winner.placement === 1 ? "st" : winner.placement === 2 ? "nd" : winner.placement === 3 ? "rd" : "th"} place · {new Date(winner.contestEndedAt).toLocaleDateString()}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-surface-900">{winner.winnerPetName}</p>
                          <p className="text-[11px] text-surface-400">{winner.title}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-surface-700">{winner.ownerUserName}</td>
                      <td className="px-4 py-3 text-surface-700 max-w-xs whitespace-normal">{winner.ownerAddress}</td>
                      <td className="px-4 py-3 text-center">
                        <label className="inline-flex items-center justify-center gap-2 rounded-lg border border-surface-200 px-3 py-2 text-xs font-medium text-surface-700">
                          <input
                            type="checkbox"
                            checked={winner.prizeSent}
                            disabled={togglingPrizeId === winner.id}
                            onChange={(e) => togglePrizeSent(winner.id, e.target.checked)}
                            className="h-4 w-4 rounded border-surface-300 text-brand-600"
                          />
                          {togglingPrizeId === winner.id ? "Saving..." : winner.prizeSent ? "Sent" : "Not sent"}
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
