"use client";

import Link from "next/link";
import { formatVotes, rankSuffix, cn } from "@/lib/utils";

type PetCardProps = {
  id: string;
  name: string;
  ownerName: string;
  state?: string | null;
  photos: string[];
  type: string;
  weeklyVotes: number;
  weeklyRank?: number | null;
  isNew?: boolean;
  animalType?: string;
};

export function PetCard({
  id,
  name,
  ownerName,
  state,
  photos,
  weeklyVotes,
  weeklyRank,
  isNew,
}: PetCardProps) {
  const photo = photos[0] || "https://placedog.net/400/400?random=" + id;

  return (
    <Link href={`/pets/${id}`} className="card card-hover group block overflow-hidden">
      <div className="aspect-[4/5] relative bg-surface-100 overflow-hidden">
        <img
          src={photo}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://placedog.net/400/400?random=${id}`;
          }}
        />

        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {isNew && (
            <span className="badge-new text-[11px]">New</span>
          )}
        </div>

        {weeklyRank != null && weeklyRank <= 3 && (
          <div
            className={cn(
              "absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-md",
              weeklyRank === 1 && "bg-red-500 text-white",
              weeklyRank === 2 && "bg-surface-200 text-surface-700",
              weeklyRank === 3 && "bg-red-200 text-red-800"
            )}
          >
            {weeklyRank}
          </div>
        )}

        {/* Vote count overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div>
            <h3 className="font-bold text-white text-base leading-tight drop-shadow-sm">{name}</h3>
            <p className="text-white/70 text-xs mt-0.5">{ownerName}{state ? ` · ${state}` : ""}</p>
          </div>
          <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-brand-500">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>
            </svg>
            <span className="text-sm font-bold text-surface-900">{formatVotes(weeklyVotes)}</span>
          </div>
        </div>
      </div>

      {weeklyRank != null && weeklyRank > 3 && (
        <div className="px-4 py-2.5 border-t border-surface-100">
          <span className="text-xs font-medium text-surface-500">{rankSuffix(weeklyRank)} this week</span>
        </div>
      )}
    </Link>
  );
}
