"use client";

import { useState } from "react";
import Link from "next/link";

type Prize = { value: number; placement: number; title: string };

type ContestCardProps = {
  contest: {
    id: string;
    name: string;
    description: string | null;
    type: string;
    petType: string;
    coverImage: string | null;
    isFeatured: boolean;
    sponsorName: string | null;
    startDate: Date;
    endDate: Date;
    prizes: Prize[];
    _count: { entries: number };
  };
  isEnded?: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  NATIONAL: "Weekly",
  SEASONAL: "Seasonal",
  CHARITY: "Charity",
  CALENDAR: "Calendar",
  BREED: "Breed",
  STATE: "Regional",
};

const TYPE_BADGES: Record<string, string> = {
  NATIONAL: "bg-brand-100 text-brand-700",
  SEASONAL: "bg-amber-100 text-amber-700",
  CHARITY: "bg-emerald-100 text-emerald-700",
  CALENDAR: "bg-violet-100 text-violet-700",
  BREED: "bg-sky-100 text-sky-700",
  STATE: "bg-orange-100 text-orange-700",
};

export function ContestCard({ contest, isEnded }: ContestCardProps) {
  const [imgError, setImgError] = useState(false);
  const now = new Date();
  const prizeTotal = contest.prizes.reduce((s, p) => s + p.value, 0);
  const daysLeft = Math.max(0, Math.ceil((contest.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const typeLabel = TYPE_LABELS[contest.type] || contest.type;
  const typeBadge = TYPE_BADGES[contest.type] || "bg-surface-100 text-surface-800";
  const showCover = contest.coverImage && !imgError;

  return (
    <Link
      href={`/contests/${contest.id}`}
      className={`rounded-xl overflow-hidden bg-white border border-surface-200/80 shadow-sm hover:shadow-md transition-shadow group ${isEnded ? "opacity-70" : ""}`}
    >
      <div className="relative h-36 sm:h-44 bg-surface-100 overflow-hidden">
        {/* Always render fallback underneath */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center">
          <span className="text-5xl">{contest.petType === "DOG" ? "🐶" : contest.petType === "CAT" ? "🐱" : contest.petType === "ALL" ? "🐶🐱" : "🐾"}</span>
        </div>

        {/* Cover image on top — hidden on error */}
        {showCover && (
          <img
            src={contest.coverImage!}
            alt=""
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
          />
        )}

        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full backdrop-blur-sm ${typeBadge}`}>
            {typeLabel}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-100/90 text-surface-800 backdrop-blur-sm">
            {contest.petType === "DOG" ? "Dogs" : contest.petType === "CAT" ? "Cats" : contest.petType === "ALL" ? "Dogs & Cats" : "Pets"}
          </span>
          {contest.isFeatured && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-yellow-100/90 text-yellow-700 backdrop-blur-sm">Featured</span>
          )}
        </div>

        {!isEnded && (
          <div className="absolute top-2.5 right-2.5">
            <span className="text-[10px] font-bold bg-black/60 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
              {daysLeft}d left
            </span>
          </div>
        )}
        {isEnded && (
          <div className="absolute top-2.5 right-2.5">
            <span className="text-[10px] font-bold bg-red-600/80 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">Ended</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-bold text-surface-900 text-base leading-snug">{contest.name}</h3>
        {contest.description && (
          <p className="text-sm text-surface-700 mt-1 line-clamp-2 leading-relaxed">{contest.description}</p>
        )}
        <div className="flex items-center gap-3 mt-3 text-xs text-surface-700 flex-wrap">
          <span>{contest._count.entries} entries</span>
          <span>{contest.startDate.toLocaleDateString()} — {contest.endDate.toLocaleDateString()}</span>
          {prizeTotal > 0 && (
            <span className="font-semibold text-emerald-600">${(prizeTotal / 100).toLocaleString()} in prizes</span>
          )}
          {contest.sponsorName && <span>Sponsored by {contest.sponsorName}</span>}
        </div>
      </div>
    </Link>
  );
}
