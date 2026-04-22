"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { getCreativeSource, trackVoteCastEvent, trackVoteToFeedEvent } from "@/lib/meta-pixel";
import { trackPostHogEvent } from "@/lib/analytics";
import { VOTE_PACKAGES, calculateMeals } from "@/lib/utils";
import { ImpactModal } from "./ImpactModal";

type Props = {
  petId: string;
  petName?: string;
  isOwner: boolean;
  initialWeeklyVotes: number;
  freeVotesRemaining?: number;
  paidVoteBalance?: number;
  animalType?: string;
  weeklyRank?: number | null;
  petType?: string;
  contestEndDate?: string | null;
  contestName?: string | null;
  votesNeededForTop3?: number | null;
  mealRate?: number;
};

export function VoteButton({
  petId,
  petName,
  isOwner,
  initialWeeklyVotes,
  freeVotesRemaining: initialFree = 0,
  paidVoteBalance: initialPaid = 0,
  animalType = "animals",
  weeklyRank,
  petType = "DOG",
  contestEndDate,
  contestName,
  votesNeededForTop3,
  mealRate = 1,
}: Props) {
  const { status } = useSession();
  const [loading, setLoading] = useState(false);
  const [voteCount, setVoteCount] = useState(initialWeeklyVotes);
  const [freeVotes, setFreeVotes] = useState(initialFree);
  const [paidVotes, setPaidVotes] = useState(initialPaid);
  const [showPurchase, setShowPurchase] = useState(!initialFree && !initialPaid);
  const [lastVoteType, setLastVoteType] = useState<"free" | "paid" | null>(null);
  const [animating, setAnimating] = useState(false);
  const [showImpactModal, setShowImpactModal] = useState(false);
  const [impactVoteCount, setImpactVoteCount] = useState(0);
  const [navigatingPkg, setNavigatingPkg] = useState<string | null>(null);
  const noVotesLeft = freeVotes === 0 && paidVotes === 0;

  useEffect(() => {
    if (status === "loading") return;

    let ignore = false;

    const loadRemainingVotes = async () => {
      try {
        const res = await fetch("/api/votes/remaining", { cache: "no-store" });
        if (!res.ok) return;

        const data = await res.json();
        if (ignore) return;

        setFreeVotes(data.freeVotesRemaining ?? 0);
        setPaidVotes(data.paidVoteBalance ?? 0);
      } catch {
        // Non-blocking UI enhancement.
      }
    };

    loadRemainingVotes();

    return () => {
      ignore = true;
    };
  }, [status]);

  const hasVotes = freeVotes > 0 || paidVotes > 0;

  const handleVote = useCallback(async () => {
    if (!hasVotes) {
      trackPostHogEvent("vote_paywall_shown", {
        pet_id: petId,
        pet_type: petType,
        auth_status: status,
        free_votes_remaining: freeVotes,
        paid_votes_remaining: paidVotes,
      });

      // Show impact modal (with upsell) every time they click with 0 votes
      setImpactVoteCount(voteCount);
      setShowImpactModal(true);
      return;
    }

    setLoading(true);
    setShowPurchase(false);
    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId, quantity: 1 }),
      });
      const data = await res.json();
      if (res.ok) {
        setVoteCount(data.pet.weeklyVotes);
        setFreeVotes(data.user.freeVotesRemaining);
        setPaidVotes(data.user.paidVoteBalance);
        setLastVoteType(data.vote.type === "FREE" ? "free" : "paid");
        trackVoteCastEvent({
          petId,
          petType,
          voteType: data.vote.type,
          weeklyVotes: data.pet.weeklyVotes,
          isAnonymous: data.vote.isAnonymous || false,
        });
        trackPostHogEvent("vote_cast", {
          pet_id: petId,
          pet_type: petType,
          vote_type: data.vote.type,
          weekly_votes: data.pet.weeklyVotes,
          free_votes_remaining: data.user.freeVotesRemaining,
          paid_votes_remaining: data.user.paidVoteBalance,
          is_anonymous: data.vote.isAnonymous || false,
        });
        if (data.vote.type === "FREE") {
          trackVoteToFeedEvent("AddToCart", {
            content_name: "VoteToFeed_FreeVote",
            content_category: "VoteToFeed_Engagement",
            source: getCreativeSource(petType),
            value: 0.1,
          });
        }

        setAnimating(true);
        setTimeout(() => setAnimating(false), 600);

        // Show impact modal: every 3 votes under 10, every 10 after that, or when out of votes
        const newVoteCount = data.pet.weeklyVotes;
        const outOfVotes = data.user.freeVotesRemaining === 0 && data.user.paidVoteBalance === 0;
        const shouldShowModal =
          outOfVotes ||
          (newVoteCount < 10 && newVoteCount % 3 === 0) ||
          (newVoteCount >= 10 && newVoteCount % 10 === 0);

        if (shouldShowModal) {
          setImpactVoteCount(newVoteCount);
          setTimeout(() => setShowImpactModal(true), 800);
        }

        if (data.user.freeVotesRemaining === 0 && data.user.paidVoteBalance === 0 && status === "authenticated") {
          setTimeout(() => {
            trackPostHogEvent("vote_paywall_shown", {
              pet_id: petId,
              pet_type: petType,
              auth_status: status,
              free_votes_remaining: 0,
              paid_votes_remaining: 0,
              trigger: "post_vote_exhaustion",
            });
            setShowPurchase(true);
          }, 1500);
        }
      } else if (data.error === "No votes available") {
        setFreeVotes(0);
        setPaidVotes(data.paidVoteBalance || 0);
        trackPostHogEvent("vote_paywall_shown", {
          pet_id: petId,
          pet_type: petType,
          auth_status: status,
          free_votes_remaining: 0,
          paid_votes_remaining: data.paidVoteBalance || 0,
          trigger: "api_no_votes_available",
        });
        setShowPurchase(true);
      } else {
        if (typeof data.remainingAnonymousVotes === "number") {
          setFreeVotes(data.remainingAnonymousVotes);
          setPaidVotes(0);
        }
        alert(data.error || "Vote failed");
      }
    } catch {
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [freeVotes, hasVotes, paidVotes, petId, petType, status, voteCount]);

  return (
    <div className="space-y-3">
      <VoteStats voteCount={voteCount} animalType={animalType} weeklyRank={weeklyRank} petType={petType} animating={animating} contestEndDate={contestEndDate} contestName={contestName} votesNeededForTop3={votesNeededForTop3} />

      <button
        onClick={handleVote}
        disabled={loading}
        className="flex items-center justify-center gap-2.5 w-full min-h-[64px] rounded-2xl text-xl font-bold transition-all shadow-sm hover:shadow-md disabled:opacity-60 bg-brand-500 text-white hover:bg-brand-600 active:scale-[0.98]"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            Voting...
          </>
        ) : (
          <>
            <HeartIcon />
            Vote for this pet
          </>
        )}
      </button>

      {lastVoteType && !loading && (
        <p className="text-center text-sm font-medium animate-slide-up" key={voteCount}>
          <span className="text-accent-600">
            +1 vote added!
            {lastVoteType === "free" && " (free vote used)"}
            {lastVoteType === "paid" && " (paid vote used)"}
          </span>
        </p>
      )}

      <div className="flex items-center justify-center gap-3 text-xs text-surface-500 flex-wrap">
        {freeVotes > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-500" />
            {freeVotes} free vote{freeVotes !== 1 ? "s" : ""}
            {status !== "authenticated" ? " left this week" : ""}
          </span>
        )}
        {paidVotes > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
            {paidVotes} paid vote{paidVotes !== 1 ? "s" : ""}
          </span>
        )}
        {freeVotes === 0 && paidVotes === 0 && (
          <span className="text-surface-400">
            {status === "authenticated" ? "No votes remaining" : "You've used your 3 free votes this week"}
          </span>
        )}
      </div>

      <p className="text-center text-sm font-bold text-brand-600">
        Every vote helps feed shelter pets in need
      </p>

      {status !== "authenticated" && (
        <p className="text-center text-xs text-surface-500">
          Want more than 3 free votes?{" "}
          <Link href={`/auth/signin?callbackUrl=/pets/${petId}`} className="font-semibold text-brand-600 hover:underline">
            Create an account
          </Link>
        </p>
      )}

      {showPurchase && (
        <div className="card p-4 border-brand-200 bg-gradient-to-b from-brand-50 to-white text-center animate-slide-up space-y-3">
          <p className="text-sm font-bold text-surface-900">
            {freeVotes === 0 && paidVotes === 0 ? "🔥 Out of votes!" : "⚡ Boost your votes"}
          </p>
          <p className="text-xs text-surface-500">Every vote feeds a shelter pet. Pick a package:</p>
          <div className="grid grid-cols-3 gap-2">
            {VOTE_PACKAGES.slice(0, 3).map((pkg) => {
              const meals = calculateMeals(pkg.price, mealRate);
              const isBest = pkg.tier === "CHAMPION";
              return (
                <button
                  key={pkg.tier}
                  onClick={() => {
                    setNavigatingPkg(pkg.tier);
                    const dashboardUrl = `/dashboard?buy=${pkg.tier}&pet=${petId}`;
                    const url = status === "authenticated" ? dashboardUrl : `/auth/signin?callbackUrl=${encodeURIComponent(dashboardUrl)}`;
                    window.location.href = url;
                  }}
                  disabled={!!navigatingPkg}
                  className={`relative rounded-xl p-3 text-center transition-all hover:shadow-md disabled:opacity-70 ${
                    isBest
                      ? "bg-brand-500 text-white ring-2 ring-brand-300 shadow-sm"
                      : "bg-surface-50 hover:bg-surface-100 border border-surface-200"
                  }`}
                >
                  {navigatingPkg === pkg.tier ? (
                    <div className="flex items-center justify-center py-3">
                      <div className={`w-5 h-5 rounded-full border-2 ${isBest ? "border-white border-t-transparent" : "border-brand-500 border-t-transparent"} animate-spin`} />
                    </div>
                  ) : (
                    <>
                      {isBest && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-yellow-400 text-[9px] font-bold uppercase text-yellow-900 whitespace-nowrap">
                          Best Value
                        </span>
                      )}
                      <p className={`text-lg font-black ${isBest ? "text-white" : "text-surface-900"}`}>{pkg.votes}</p>
                      <p className={`text-[10px] font-medium ${isBest ? "text-white/80" : "text-surface-400"}`}>votes</p>
                      <p className={`text-sm font-bold mt-1 ${isBest ? "text-white" : "text-brand-600"}`}>${(pkg.price / 100).toFixed(2)}</p>
                      <p className={`text-[10px] mt-0.5 ${isBest ? "text-white/70" : "text-accent-600"}`}>~{meals} meals</p>
                    </>
                  )}
                </button>
              );
            })}
          </div>
          <Link href="/dashboard#votes" className="text-[11px] text-brand-600 font-medium hover:underline">
            View all packages →
          </Link>
        </div>
      )}

      {/* Impact Modal */}
      <ImpactModal
        open={showImpactModal}
        onClose={() => setShowImpactModal(false)}
        voteCount={impactVoteCount || voteCount}
        petName={petName}
        petId={petId}
        isAuthenticated={status === "authenticated"}
        mealRate={mealRate}
        animalType={animalType}
        outOfVotes={noVotesLeft}
      />
    </div>
  );
}

function VoteStats({
  voteCount,
  animalType,
  weeklyRank,
  petType,
  animating,
  contestEndDate,
  contestName,
  votesNeededForTop3,
}: {
  voteCount: number;
  animalType: string;
  weeklyRank?: number | null;
  petType: string;
  animating: boolean;
  contestEndDate?: string | null;
  contestName?: string | null;
  votesNeededForTop3?: number | null;
}) {
  const rankSuffix = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!contestEndDate) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [contestEndDate]);

  const countdown = useMemo(() => {
    if (!contestEndDate) return null;
    const diff = Math.max(0, new Date(contestEndDate).getTime() - now);
    if (diff < 1000) return null;
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return { days, hours, minutes, seconds, totalHours: Math.floor(diff / 3600000) };
  }, [contestEndDate, now]);

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-surface-400 uppercase tracking-wider">Total</p>
          <p className={`text-5xl font-black text-surface-900 mt-1 tabular-nums transition-transform ${animating ? "scale-110 text-brand-600" : ""}`}>
            {voteCount.toLocaleString()}
            <span className="text-lg font-semibold text-surface-500 ml-1.5">votes</span>
          </p>
        </div>
        {countdown && (
          <div className="text-right flex-shrink-0">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${countdown.totalHours <= 24 ? "bg-red-100 text-red-700 animate-pulse" : countdown.days <= 3 ? "bg-red-50 text-red-600" : countdown.days <= 7 ? "bg-amber-100 text-amber-700" : "bg-surface-100 text-surface-600"}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              {countdown.days > 0 ? `${countdown.days}d ${countdown.hours}h` : countdown.hours > 0 ? `${countdown.hours}h ${countdown.minutes}m` : `${countdown.minutes}m ${countdown.seconds}s`}
            </div>
            {countdown.totalHours <= 48 && (
              <p className="text-[9px] font-bold text-red-500 mt-1">⚡ Ends soon!</p>
            )}
          </div>
        )}
      </div>

      {weeklyRank != null && weeklyRank > 0 && (
        <p className="text-lg font-semibold text-surface-500 mt-1">
          {rankSuffix(weeklyRank)} in Weekly {petType === "DOG" ? "Dog" : petType === "CAT" ? "Cat" : "Pet"} Leaderboard
        </p>
      )}

      {votesNeededForTop3 != null && votesNeededForTop3 > 0 && weeklyRank != null && weeklyRank > 3 && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-amber-800">🏆 Top 3 Prize Zone</p>
            <p className="text-xs font-bold text-amber-700">
              {votesNeededForTop3} vote{votesNeededForTop3 !== 1 ? "s" : ""} away
            </p>
          </div>
          <div className="relative h-3 rounded-full bg-surface-100 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-700"
              style={{ width: `${Math.min(95, Math.max(5, (voteCount / (voteCount + votesNeededForTop3)) * 100))}%` }}
            />
            <div className="absolute inset-y-0 right-0 w-[5%] rounded-r-full bg-gradient-to-r from-emerald-400 to-emerald-500 flex items-center justify-center">
              <span className="text-[7px] font-black text-white">🏆</span>
            </div>
          </div>
          {(() => {
            const pkg = VOTE_PACKAGES.find(p => p.votes >= votesNeededForTop3) || VOTE_PACKAGES[VOTE_PACKAGES.length - 1];
            return (
              <button
                onClick={() => { window.location.href = `/dashboard?buy=${pkg.tier}`; }}
                className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors"
              >
                🔥 Only {votesNeededForTop3} vote{votesNeededForTop3 !== 1 ? "s" : ""} from Top 3 — Get {pkg.votes} for ${(pkg.price / 100).toFixed(2)}!
              </button>
            );
          })()}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-surface-100">
        <p className="text-xs text-accent-600 font-medium">
          {voteCount > 0 ? `🐾 ${voteCount} meals for shelter ${animalType}` : `Vote to help shelter ${animalType}`}
        </p>
      </div>

    </div>
  );
}

function HeartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}
