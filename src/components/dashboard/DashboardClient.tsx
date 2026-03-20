"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatVotes, rankSuffix, daysRemainingInWeek, VOTE_PACKAGES, calculateMeals } from "@/lib/utils";
import { trackCheckoutStartedEvent, trackStripePurchaseEvent } from "@/lib/meta-pixel";
import { trackPostHogEvent } from "@/lib/analytics";

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
      tier: latestPurchase.tier,
    });
    trackPostHogEvent("checkout_completed", {
      package_tier: latestPurchase.tier,
      amount_cents: latestPurchase.amount,
      amount_dollars: latestPurchase.amount / 100,
      votes: latestPurchase.votes,
      meals: latestPurchase.meals,
    });
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
    trackCheckoutStartedEvent({
      tier,
      voteQuantity: selectedPackage?.votes,
      amountDollars: selectedPackage ? selectedPackage.price / 100 : undefined,
    });
    trackPostHogEvent("checkout_started", {
      package_tier: tier,
      votes: selectedPackage?.votes,
      amount_cents: selectedPackage?.price,
      amount_dollars: selectedPackage ? selectedPackage.price / 100 : undefined,
    });
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="card p-0 overflow-hidden">
                  <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-surface-900">Your Pets</h3>
                    <Link href="/pets/new" className="text-xs font-medium text-brand-600 hover:text-brand-700">+ Add pet</Link>
                  </div>
                  {pets.length === 0 ? (
                    <div className="px-5 py-10 text-center">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-surface-100 flex items-center justify-center mb-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-400"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                      </div>
                      <p className="font-medium text-surface-600 text-sm">No pets entered yet</p>
                      <p className="text-xs text-surface-400 mt-1 max-w-xs mx-auto">You can vote for other pets right away, or enter your own to win prizes!</p>
                      <div className="mt-4 flex items-center justify-center gap-3">
                        <Link href="/" className="btn-secondary text-xs px-4 py-2">Browse &amp; Vote</Link>
                        <Link href="/pets/new" className="btn-primary text-xs px-4 py-2">Add Your Pet</Link>
                      </div>
                    </div>
                  ) : (
                    <ul className="divide-y divide-surface-50">
                      {pets.map((pet) => (
                        <li key={pet.id}>
                          <Link href={`/pets/${pet.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-50/50 transition-colors">
                            <img src={pet.photos[0] || `https://placedog.net/100/100?random=${pet.id}`} alt={pet.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = `https://placedog.net/100/100?random=${pet.id}`; }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-surface-900 text-sm truncate">{pet.name}</p>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-100 text-surface-500 font-medium">{pet.type}</span>
                              </div>
                              {pet.breed && <p className="text-xs text-surface-400">{pet.breed}</p>}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold text-brand-600">{formatVotes(pet.weeklyVotes)}</p>
                              <p className="text-[11px] text-surface-400">this week</p>
                            </div>
                            {pet.weeklyRank != null && <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${pet.weeklyRank === 1 ? "bg-red-100 text-red-700" : pet.weeklyRank === 2 ? "bg-surface-200 text-surface-600" : pet.weeklyRank === 3 ? "bg-red-50 text-red-600" : "bg-surface-100 text-surface-500"}`}>{pet.weeklyRank}</div>}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="card p-5 bg-gradient-to-br from-brand-500 to-brand-600 text-white border-0">
                  <p className="text-sm font-medium text-white/80">Total Vote Balance</p>
                  <p className="text-3xl font-bold mt-1">{formatVotes(freeVotesRemaining + paidVoteBalance)}</p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-white/70">
                    <span>{freeVotesRemaining} free</span>
                    <span className="w-1 h-1 rounded-full bg-white/40" />
                    <span>{formatVotes(paidVoteBalance)} paid</span>
                  </div>
                  <button onClick={() => setActiveTab("votes")} className="mt-4 w-full py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-semibold transition-colors">Buy More Votes</button>
                </div>

                <div className="card p-0 overflow-hidden">
                  <div className="px-5 py-3 border-b border-surface-100"><h3 className="text-sm font-semibold text-surface-900">Recent Activity</h3></div>
                  {recentVotes.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-surface-400 text-center">No votes cast yet</p>
                  ) : (
                    <ul className="divide-y divide-surface-50 max-h-[260px] overflow-y-auto hide-scrollbar">
                      {recentVotes.slice(0, 8).map((v) => (
                        <li key={v.id} className="px-5 py-2.5 flex items-center gap-3">
                          {v.petPhoto ? <img src={v.petPhoto} alt="" className="w-7 h-7 rounded-lg object-cover flex-shrink-0" /> : <div className="w-7 h-7 rounded-lg bg-surface-100 flex-shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-surface-700 truncate">Voted for <span className="font-medium">{v.petName}</span></p>
                            <p className="text-[10px] text-surface-400">{new Date(v.createdAt).toLocaleDateString()}</p>
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${v.type === "FREE" ? "bg-accent-50 text-accent-600" : "bg-brand-50 text-brand-600"}`}>{v.type === "FREE" ? "Free" : "Paid"}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "pets" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-surface-900">Your Pets</h2>
                <p className="text-sm text-surface-500 mt-0.5">{pets.length} pet{pets.length !== 1 ? "s" : ""} entered in active contests</p>
              </div>
              <Link href="/pets/new" className="btn-primary text-sm">+ Add New Pet</Link>
            </div>
            {pets.length === 0 ? (
              <div className="card p-16 text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-surface-100 flex items-center justify-center mb-4"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-400"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></div>
                <p className="font-semibold text-surface-700">No pets entered yet</p>
                <p className="text-sm text-surface-400 mt-1 max-w-sm mx-auto">You don&apos;t need a pet to participate! Vote for your favorites, or add your own pet to win prizes.</p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <Link href="/" className="btn-secondary">Browse &amp; Vote</Link>
                  <Link href="/pets/new" className="btn-primary">Add your pet — free</Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pets.map((pet) => (
                  <div key={pet.id} className="card overflow-hidden">
                    <div className="aspect-[16/10] relative bg-surface-100">
                      <img src={pet.photos[0] || `https://placedog.net/400/250?random=${pet.id}`} alt={pet.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = `https://placedog.net/400/250?random=${pet.id}`; }} />
                      {pet.weeklyRank != null && pet.weeklyRank <= 3 && <div className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-md ${pet.weeklyRank === 1 ? "bg-red-500 text-white" : pet.weeklyRank === 2 ? "bg-surface-200 text-surface-700" : "bg-red-200 text-red-800"}`}>{pet.weeklyRank}</div>}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between"><h3 className="font-bold text-surface-900">{pet.name}</h3><span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-100 text-surface-500 font-medium">{pet.type}</span></div>
                      {pet.breed && <p className="text-xs text-surface-400 mt-0.5">{pet.breed}</p>}
                      <div className="mt-3 flex items-center justify-between border-t border-surface-100 pt-3">
                        <div><p className="text-lg font-bold text-brand-600">{formatVotes(pet.weeklyVotes)}</p><p className="text-[11px] text-surface-400">votes this week</p></div>
                        <div className="text-right"><p className="text-sm font-semibold text-surface-700">{formatVotes(pet.totalVotes)}</p><p className="text-[11px] text-surface-400">all-time</p></div>
                      </div>
                      {pet.weeklyRank != null && <p className="mt-2 text-xs font-medium text-surface-500">{rankSuffix(pet.weeklyRank)} this week</p>}
                      <div className="mt-3 flex gap-2">
                        <Link href={`/pets/${pet.id}`} className="flex-1 text-center py-2 text-xs font-semibold rounded-lg bg-surface-100 text-surface-700 hover:bg-surface-200 transition-colors">View</Link>
                        <Link href={`/pets/${pet.id}`} className="flex-1 text-center py-2 text-xs font-semibold rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors">Share</Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "votes" && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center max-w-lg mx-auto">
              <h2 className="text-lg font-bold text-surface-900">Buy Vote Packages</h2>
              <p className="text-sm text-surface-500 mt-1">Every purchase helps feed shelter pets in need</p>
            </div>

            <div className="card p-5 flex items-center justify-between max-w-2xl mx-auto">
              <div>
                <p className="text-sm text-surface-500">Your current balance</p>
                <p className="text-2xl font-bold text-surface-900">{formatVotes(freeVotesRemaining + paidVoteBalance)} votes</p>
                <p className="text-xs text-surface-400 mt-0.5">{freeVotesRemaining} free + {formatVotes(paidVoteBalance)} paid</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-brand-600"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/></svg></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {VOTE_PACKAGES.map((pkg) => {
                const meals = calculateMeals(pkg.price, mealRate);
                const isBest = pkg.tier === "SUPPORTER";
                const isHero = pkg.tier === "HERO" || pkg.tier === "LEGEND";
                return (
                  <div key={pkg.tier} className={`card p-5 relative transition-all hover:shadow-card-hover ${isBest ? "border-brand-300 ring-2 ring-brand-100 shadow-md" : ""} ${isHero ? "border-accent-200" : ""}`}>
                    {isBest && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-brand-500 text-white text-[10px] font-bold uppercase tracking-wide">Most Popular</span>}
                    <div className="flex items-start justify-between">
                      <div><p className="text-sm font-bold text-surface-900">{pkg.label}</p><p className="text-2xl font-bold text-surface-900 mt-1">${(pkg.price / 100).toFixed(2)}</p></div>
                      <div className="text-right"><p className="text-xl font-bold text-brand-600">{pkg.votes}</p><p className="text-[11px] text-surface-400">votes</p></div>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-accent-600"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>Feeds ~{meals} shelter pets</div>
                    <button onClick={() => handleBuyVotes(pkg.tier)} disabled={!!buyingTier} className={`mt-4 w-full py-2.5 text-sm font-semibold rounded-lg transition-all disabled:opacity-50 ${isBest ? "bg-brand-500 text-white hover:bg-brand-600 shadow-sm" : "bg-surface-100 text-surface-700 hover:bg-surface-200"}`}>
                      {buyingTier === pkg.tier ? "Processing..." : "Buy Now"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "purchases" && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-lg font-bold text-surface-900">Purchase & Voting History</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card p-0 overflow-hidden">
                <div className="px-5 py-4 border-b border-surface-100"><h3 className="text-sm font-semibold text-surface-900">Vote Purchases</h3></div>
                {recentPurchases.length === 0 ? <p className="px-5 py-8 text-sm text-surface-400 text-center">No purchases yet</p> : (
                  <ul className="divide-y divide-surface-50">
                    {recentPurchases.map((p, i) => (
                      <li key={i} className="px-5 py-3.5 flex items-center justify-between">
                        <div><p className="text-sm font-medium text-surface-800">{p.tier} — {p.votes} votes</p><p className="text-xs text-accent-600 mt-0.5">~{Math.round(p.meals)} {animalType} fed</p></div>
                        <div className="text-right"><p className="text-sm font-semibold text-surface-900">${(p.amount / 100).toFixed(2)}</p><p className="text-[11px] text-surface-400">{new Date(p.createdAt).toLocaleDateString()}</p></div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="card p-0 overflow-hidden">
                <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between"><h3 className="text-sm font-semibold text-surface-900">Votes Cast</h3><span className="text-xs text-surface-400">{totalVotesCast} total</span></div>
                {recentVotes.length === 0 ? <p className="px-5 py-8 text-sm text-surface-400 text-center">No votes cast yet</p> : (
                  <ul className="divide-y divide-surface-50 max-h-[400px] overflow-y-auto hide-scrollbar">
                    {recentVotes.map((v) => (
                      <li key={v.id} className="px-5 py-3 flex items-center gap-3">
                        {v.petPhoto ? <img src={v.petPhoto} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" /> : <div className="w-8 h-8 rounded-lg bg-surface-100 flex-shrink-0" />}
                        <div className="flex-1 min-w-0"><p className="text-sm text-surface-700 truncate"><span className="font-medium">{v.petName}</span>{v.quantity > 1 && <span className="text-surface-400"> x{v.quantity}</span>}</p><p className="text-[11px] text-surface-400">{new Date(v.createdAt).toLocaleDateString()}</p></div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${v.type === "FREE" ? "bg-accent-50 text-accent-600" : "bg-brand-50 text-brand-600"}`}>{v.type === "FREE" ? "Free" : "Paid"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "impact" && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center max-w-lg mx-auto mb-8"><h2 className="text-lg font-bold text-surface-900">Your Shelter Impact</h2><p className="text-sm text-surface-500 mt-1">Every vote you purchase helps feed shelter pets in need</p></div>
            <div className="max-w-3xl mx-auto">
              <div className="card p-8 text-center bg-gradient-to-br from-accent-50 to-white border-accent-200/60">
                <p className="text-sm font-medium text-accent-700 uppercase tracking-wider">Lifetime Impact</p>
                <p className="text-5xl font-bold text-accent-600 mt-2">~{Math.round(lifetimeMeals).toLocaleString()}</p>
                <p className="text-lg text-surface-600 mt-1">shelter pets helped</p>
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-accent-200/60 text-sm text-surface-600"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>Total spent: ${(lifetimePurchaseAmount / 100).toFixed(2)}</div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="card p-5 text-center"><p className="text-2xl font-bold text-surface-900">{totalVotesCast}</p><p className="text-xs text-surface-500 mt-1">Votes cast</p></div>
                <div className="card p-5 text-center"><p className="text-2xl font-bold text-surface-900">{votingStreak}</p><p className="text-xs text-surface-500 mt-1">Week streak</p></div>
                <div className="card p-5 text-center"><p className="text-2xl font-bold text-surface-900">{recentPurchases.length}</p><p className="text-xs text-surface-500 mt-1">Purchases</p></div>
              </div>

              <div className="mt-6 card p-5">
                <p className="text-sm text-surface-600">At the current rate, every $1 spent helps feed approximately <span className="font-bold text-accent-600">{mealRate}</span> shelter pets. Thank you for making a difference!</p>
                <div className="mt-4"><button onClick={() => setActiveTab("votes")} className="btn-primary text-sm">Buy More Votes to Help</button></div>
              </div>
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
      <div className="flex items-center justify-between mb-2"><p className="text-[11px] font-medium text-surface-400 uppercase tracking-wider">{label}</p><div className="text-surface-300">{icon}</div></div>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
      <p className="text-[11px] text-surface-400 mt-0.5">{sub}</p>
    </div>
  );
}
