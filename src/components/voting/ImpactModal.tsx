"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { VOTE_PACKAGES, calculateMeals } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  voteCount: number;
  petName?: string;
  petId: string;
  isAuthenticated: boolean;
  mealRate: number;
  animalType: string;
  outOfVotes?: boolean;
};

const SHELTER_FACTS = [
  "6.3 million animals enter U.S. shelters every year",
  "About 920,000 shelter animals are euthanized each year",
  "1 in 5 shelter pets go hungry on any given day",
  "A single meal can keep a shelter pet healthy for a day",
  "Your votes directly fund meals for shelter pets in need",
  "Every 11 seconds, a shelter animal is euthanized in the US",
  "Shelter pets with proper nutrition are 3x more likely to be adopted",
];

const URGENCY_MESSAGES = [
  "🔥 Don't let your pet fall behind — boost now!",
  "⏰ Other pets are gaining votes right now!",
  "🏆 A small boost could push your pet into the top 3!",
  "💛 Every vote = a meal for a shelter pet in need",
  "🚀 Top voters get featured on the leaderboard!",
];

export function ImpactModal({
  open,
  onClose,
  voteCount,
  petName,
  petId,
  isAuthenticated,
  mealRate,
  animalType,
  outOfVotes = false,
}: Props) {
  const factRef = useRef(Math.floor(Math.random() * SHELTER_FACTS.length));
  const urgencyRef = useRef(Math.floor(Math.random() * URGENCY_MESSAGES.length));
  const [closing, setClosing] = useState(false);
  const [navigating, setNavigating] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      factRef.current = Math.floor(Math.random() * SHELTER_FACTS.length);
      urgencyRef.current = Math.floor(Math.random() * URGENCY_MESSAGES.length);
      setClosing(false);
      setNavigating(null);
    }
  }, [open]);

  if (!open) return null;

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 250);
  };

  const meals = voteCount; // 1 vote ≈ 1 meal for display purposes
  const buyUrl = (tier: string) =>
    isAuthenticated
      ? `/dashboard?buy=${tier}&pet=${petId}`
      : `/auth/signin?callbackUrl=/dashboard?buy=${tier}&pet=${petId}`;

  const starter = VOTE_PACKAGES[0];  // STARTER
  const friend = VOTE_PACKAGES[1];   // FRIEND
  const supporter = VOTE_PACKAGES[2]; // SUPPORTER
  const champion = VOTE_PACKAGES[3];  // CHAMPION
  const starterMeals = calculateMeals(starter.price, mealRate);
  const friendMeals = calculateMeals(friend.price, mealRate);
  const supporterMeals = calculateMeals(supporter.price, mealRate);
  const championMeals = calculateMeals(champion.price, mealRate);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-250 ${closing ? "opacity-0" : "opacity-100"}`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`relative bg-white rounded-3xl shadow-2xl max-w-[380px] w-full overflow-hidden transition-all duration-250 ${closing ? "scale-90 opacity-0" : "scale-100 opacity-100"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors text-lg"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Top banner — changes based on state */}
        {outOfVotes ? (
          <div className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 px-6 py-6 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_70%)]" />
            <div className="relative">
              <div className="text-4xl mb-2">🔥</div>
              <h3 className="text-xl font-black tracking-tight">You&apos;re Out of Votes!</h3>
              <p className="text-sm mt-1.5 text-white/90 leading-snug">
                {petName || "Your pet"} needs more votes to climb the ranks
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 px-6 py-6 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.15),transparent_70%)]" />
            <div className="relative">
              <div className="text-4xl mb-2">🐾</div>
              <h3 className="text-xl font-black tracking-tight">Amazing! You&apos;re Making a Difference!</h3>
              <p className="text-sm mt-1.5 text-white/90 leading-snug">
                Your votes for {petName || "this pet"} feed shelter {animalType}
              </p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="px-5 py-4 space-y-3">
          {/* Impact counter */}
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <p className="text-4xl font-black text-surface-900 tabular-nums">{voteCount}</p>
              <p className="text-[10px] text-surface-400 font-semibold uppercase tracking-wide">Total Votes</p>
            </div>
            <div className="w-px h-10 bg-surface-200" />
            <div className="text-center">
              <p className="text-4xl font-black text-emerald-600 tabular-nums">~{meals}</p>
              <p className="text-[10px] text-surface-400 font-semibold uppercase tracking-wide">Meals Provided</p>
            </div>
          </div>

          {/* Urgency / fact banner */}
          {outOfVotes ? (
            <div className="rounded-xl bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 p-3 text-center">
              <p className="text-xs text-orange-800 font-bold leading-relaxed">
                {URGENCY_MESSAGES[urgencyRef.current]}
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs text-amber-800 leading-relaxed">
                💡 <span className="font-semibold">Did you know?</span> {SHELTER_FACTS[factRef.current]}
              </p>
            </div>
          )}

          {/* CTA packages */}
          <div className="space-y-2.5">
            <p className="text-center text-[10px] font-black text-surface-500 uppercase tracking-widest">
              {outOfVotes ? "⚡ Get votes instantly" : "🚀 Boost your pet & feed shelters"}
            </p>

            {/* 3-column package grid */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => { setNavigating(starter.tier); window.location.href = buyUrl(starter.tier); }}
                disabled={!!navigating}
                className="rounded-xl bg-gradient-to-b from-surface-50 to-surface-100 border border-surface-200 p-2.5 text-center hover:shadow-md hover:border-brand-300 transition-all active:scale-95 disabled:opacity-70"
              >
                {navigating === starter.tier ? (
                  <div className="flex items-center justify-center py-4"><div className="w-5 h-5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" /></div>
                ) : (
                  <>
                    <p className="text-lg font-black text-surface-800">{starter.votes}</p>
                    <p className="text-[9px] text-surface-400 font-medium">votes</p>
                    <p className="text-sm font-bold text-brand-600 mt-1">${(starter.price / 100).toFixed(2)}</p>
                    <p className="text-[9px] mt-0.5 text-emerald-600">~{starterMeals} meal{starterMeals !== 1 ? "s" : ""} 🐾</p>
                  </>
                )}
              </button>
              <button
                onClick={() => { setNavigating(friend.tier); window.location.href = buyUrl(friend.tier); }}
                disabled={!!navigating}
                className="rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 text-white p-2.5 text-center hover:shadow-lg transition-all active:scale-95 ring-2 ring-brand-300 disabled:opacity-70"
              >
                {navigating === friend.tier ? (
                  <div className="flex items-center justify-center py-4"><div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" /></div>
                ) : (
                  <>
                    <p className="text-lg font-black">{friend.votes}</p>
                    <p className="text-[9px] opacity-80 font-medium">votes</p>
                    <p className="text-sm font-bold mt-1">${(friend.price / 100).toFixed(2)}</p>
                    <p className="text-[9px] mt-0.5 text-emerald-200">~{friendMeals} meals 🐾</p>
                  </>
                )}
              </button>
              <button
                onClick={() => { setNavigating(supporter.tier); window.location.href = buyUrl(supporter.tier); }}
                disabled={!!navigating}
                className="rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 text-white p-2.5 text-center hover:shadow-lg transition-all active:scale-95 relative disabled:opacity-70"
              >
                {navigating === supporter.tier ? (
                  <div className="flex items-center justify-center py-4"><div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" /></div>
                ) : (
                  <>
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-red-500 text-[7px] font-black uppercase text-white whitespace-nowrap shadow-sm">
                      Best Value
                    </span>
                    <p className="text-lg font-black">{supporter.votes}</p>
                    <p className="text-[9px] opacity-80 font-medium">votes</p>
                    <p className="text-sm font-bold mt-1">${(supporter.price / 100).toFixed(2)}</p>
                    <p className="text-[9px] mt-0.5 text-emerald-100">~{supporterMeals} meals 🐾</p>
                  </>
                )}
              </button>
            </div>

            {/* Big CTA for out-of-votes state */}
            {outOfVotes && (
              <button
                onClick={() => { setNavigating(champion.tier); window.location.href = buyUrl(champion.tier); }}
                disabled={!!navigating}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white font-bold text-sm hover:shadow-lg transition-all active:scale-[0.98] animate-pulse disabled:opacity-70"
              >
                {navigating === champion.tier ? (
                  <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <>🏆 Get {champion.votes} votes for ${(champion.price / 100).toFixed(2)} — feed ~{championMeals} pets!</>
                )}
              </button>
            )}
          </div>

          {/* Bottom link */}
          <div className="flex items-center justify-between pt-1">
            <Link href="/dashboard#votes" className="text-[11px] text-brand-600 font-semibold hover:underline">
              All packages →
            </Link>
            <button
              onClick={handleClose}
              className="text-[11px] font-semibold text-surface-400 hover:text-surface-600 transition-colors"
            >
              {outOfVotes ? "Maybe later" : "Keep voting for free →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
