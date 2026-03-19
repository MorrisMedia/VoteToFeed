"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { getCreativeSource, trackMetaPixel, trackVoteToFeedEvent } from "@/lib/meta-pixel";
import { trackPostHogEvent } from "@/lib/analytics";

type Props = {
  petId: string;
  isOwner: boolean;
  initialWeeklyVotes: number;
  freeVotesRemaining?: number;
  paidVoteBalance?: number;
  animalType?: string;
  weeklyRank?: number | null;
  petType?: string;
};

export function VoteButton({
  petId,
  isOwner,
  initialWeeklyVotes,
  freeVotesRemaining: initialFree = 0,
  paidVoteBalance: initialPaid = 0,
  animalType = "animals",
  weeklyRank,
  petType = "DOG",
}: Props) {
  const { status } = useSession();
  const [loading, setLoading] = useState(false);
  const [voteCount, setVoteCount] = useState(initialWeeklyVotes);
  const [freeVotes, setFreeVotes] = useState(initialFree);
  const [paidVotes, setPaidVotes] = useState(initialPaid);
  const [showPurchase, setShowPurchase] = useState(false);
  const [lastVoteType, setLastVoteType] = useState<"free" | "paid" | null>(null);
  const [animating, setAnimating] = useState(false);

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

      if (status === "authenticated") {
        setShowPurchase(true);
      } else {
        alert("You've used your 3 free votes this week");
      }
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
        trackMetaPixel("VoteToFeedVote", {
          petId,
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
            value: 0.10,
          });
        }

        setAnimating(true);
        setTimeout(() => setAnimating(false), 600);

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
  }, [freeVotes, hasVotes, paidVotes, petId, petType, status]);

  if (isOwner) {
    return (
      <div className="space-y-3">
        <VoteStats voteCount={voteCount} animalType={animalType} weeklyRank={weeklyRank} petType={petType} animating={false} />
        <div className="rounded-xl border border-dashed border-surface-300 p-5 text-center bg-surface-50">
          <p className="text-sm text-surface-500 font-medium">This is your pet</p>
          <p className="text-xs text-surface-400 mt-1">Share the link so others can vote!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <VoteStats voteCount={voteCount} animalType={animalType} weeklyRank={weeklyRank} petType={petType} animating={animating} />

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
        <div className="card p-4 border-brand-200 bg-brand-50 text-center animate-slide-up">
          <p className="text-sm font-medium text-surface-800">
            {freeVotes === 0 && paidVotes === 0 ? "Out of votes!" : "Want to vote more?"}
          </p>
          <p className="text-xs text-surface-500 mt-1">Buy votes to keep supporting shelter pets</p>
          <Link href="/dashboard#votes" className="btn-primary mt-3 text-xs px-4 py-2 inline-flex">
            View vote packages
          </Link>
        </div>
      )}
    </div>
  );
}

function VoteStats({
  voteCount,
  animalType,
  weeklyRank,
  petType,
  animating,
}: {
  voteCount: number;
  animalType: string;
  weeklyRank?: number | null;
  petType: string;
  animating: boolean;
}) {
  const rankSuffix = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <div className="card p-5">
      <p className="text-xs font-medium text-surface-400 uppercase tracking-wider">This week</p>
      <p className={`text-5xl font-black text-surface-900 mt-1 tabular-nums transition-transform ${animating ? "scale-110 text-brand-600" : ""}`}>
        {voteCount.toLocaleString()}
        <span className="text-lg font-semibold text-surface-500 ml-1.5">votes</span>
      </p>
      {weeklyRank != null && weeklyRank > 0 && (
        <p className="text-lg font-semibold text-surface-500 mt-1">
          {rankSuffix(weeklyRank)} in National {petType === "DOG" ? "Dog" : petType === "CAT" ? "Cat" : "Pet"} Contest
        </p>
      )}
      <div className="mt-3 pt-3 border-t border-surface-100">
        <p className="text-xs text-accent-600 font-medium">
          {voteCount > 0
            ? `${voteCount} votes for shelter ${animalType}`
            : `Vote to help shelter ${animalType}`}
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
