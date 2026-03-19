"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatVotes, rankSuffix, daysRemainingInWeek, VOTE_PACKAGES, calculateMeals } from "@/lib/utils";
import { trackStripePurchaseEvent } from "@/lib/meta-pixel";
import { getAnalyticsContext, trackPostHogEvent } from "@/lib/analytics";

type Pet = {
  id: string;
  name: string;
  type: string;
  breed?: string | null;
  photos: string[];
  weeklyVotes: number;
  weeklyRank: number | null;
  totalVotes: number;
};
type Purchase = { tier: string; votes: number; meals: number; amount: number; createdAt: string };
type VoteHistoryItem = { id: string; petName: string; petPhoto: string | null; type: string; quantity: number; createdAt: string };

type Props = {
  userName: string;
  userEmail: string;
  freeVotesRemaining: number;
  paidVoteBalance: number;
  votingStreak: number;
  animalType: string;
  mealRate: number;
  lifetimeMeals: number;
  lifetimePurchaseAmount: number;
  pets: Pet[];
  recentPurchases: Purchase[];
  recentVotes: VoteHistoryItem[];
  totalVotesCast: number;
  purchaseStatus?: "success" | "cancelled" | null;
  purchaseTier?: string | null;
};

type Tab = "overview" | "pets" | "votes" | "purchases" | "impact";

export function DashboardClient({
  userName,
  userEmail,
  freeVotesRemaining,
  paidVoteBalance,
  votingStreak,
  animalType,
  mealRate,
  lifetimeMeals,
  lifetimePurchaseAmount,
  pets,
  recentPurchases,
  recentVotes,
  totalVotesCast,
  purchaseStatus,
  purchaseTier,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [buyingTier, setBuyingTier] = useState<string | null>(null);
  const daysLeft = daysRemainingInWeek();

  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as Tab;
    const validTabs: Tab[] = ["overview", "pets", "votes", "purchases", "impact"];
    if (hash && validTabs.includes(hash)) {
      setActiveTab(hash);
    }
  }, []);

  useEffect(() => {
    if (purchaseStatus !== "success" || recentPurchases.length === 0) return;
    const latestPurchase = recentPurchases[0];
    trackStripePurchaseEvent({
      amountDollars: latestPurchase.amount / 100,
      voteQuantity: latestPurchase.votes,
    });
    trackPostHogEvent(
      "checkout_completed",
      {
        package_tier: latestPurchase.tier,
        amount_dollars: latestPurchase.amount / 100,
        votes: latestPurchase.votes,
        meals: latestPurchase.meals,
      },
      { internal: false }
    );
  }, [purchaseStatus, recentPurchases]);

  useEffect(() => {
    if (purchaseStatus !== "cancelled") return;
    trackPostHogEvent("checkout_cancelled", {
      package_tier: purchaseTier || undefined,
    });
  }, [purchaseStatus, purchaseTier]);

  async function handleBuyVotes(tier: string) {
    setBuyingTier(tier);
    const selectedPackage = VOTE_PACKAGES.find((pkg) => pkg.tier === tier);
    trackPostHogEvent("checkout_started", {
      package_tier: tier,
      votes: selectedPackage?.votes,
      amount_dollars: selectedPackage ? selectedPackage.price / 100 : undefined,
    });
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          analyticsContext: getAnalyticsContext({
            packageTier: tier,
            votes: selectedPackage?.votes,
            amountDollars: selectedPackage ? selectedPackage.price / 100 : undefined,
          }),
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || "Checkout failed");
    } catch {
      alert("Something went wrong");
    } finally {
      setBuyingTier(null);
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "overview",
      label: "Overview",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
      ),
    },
    {
      id: "pets",
      label: "My Pets",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
      ),
    },
    {
      id: "votes",
      label: "Buy Votes",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
      ),
    },
    {
      id: "purchases",
      label: "History",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
      ),
    },
    {
      id: "impact",
      label: "Impact",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 tracking-tight">
              Welcome back, {userName?.split(" ")[0] || "there"}
            </h1>
            <p className="text-sm text-surface-500 mt-1">{userEmail}</p>
          </div>
          <Link href="/pets/new" className="btn-primary inline-flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add New Pet
          </Link>
        </div>

        {purchaseStatus && (
          <div className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
            purchaseStatus === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}>
            {purchaseStatus === "success"
              ? `Payment received${purchaseTier ? ` for the ${purchaseTier.toLowerCase()} package` : ""}. Your votes were added to your balance.`
              : `Checkout cancelled${purchaseTier ? ` for the ${purchaseTier.toLowerCase()} package` : ""}. No charge was made.`}
          </div>
        )}

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

        {activeTab === "overview" && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <StatCard label="Free Votes" value={String(freeVotesRemaining)} sub={`Resets in ${daysLeft}d`} color="accent" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>} />
              <StatCard label="Paid Balance" value={formatVotes(paidVoteBalance)} sub="Never expires" color="brand" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/><path d="M9 12l2 2 4-4"/></svg>} />
              <StatCard label="Voting Streak" value={`${votingStreak}w`} sub="Consecutive weeks" color="default" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>} />
              <StatCard label="Pets Entered" value={String(pets.length)} sub="In active contests" color="default" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>} />
              <StatCard label="Shelter Impact" value={`~${Math.round(lifetimeMeals)}`} sub={`${animalType} helped`} color="accent" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, icon }: { label: string; value: string; sub: string; color: "brand" | "accent" | "default"; icon: React.ReactNode }) {
  const colorClasses = { brand: "text-brand-600", accent: "text-accent-600", default: "text-surface-900" };
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-medium text-surface-400 uppercase tracking-wider">{label}</p>
        <div className="text-surface-300">{icon}</div>
      </div>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
      <p className="text-[11px] text-surface-400 mt-0.5">{sub}</p>
    </div>
  );
}
