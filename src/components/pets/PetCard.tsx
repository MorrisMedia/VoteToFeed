"use client";

import { useState } from "react";
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

// Reliable fallback images (placekitten/placedog are unreliable)
const FALLBACK_IMAGES = {
  DOG: "https://images.dog.ceo/breeds/labrador/n02099712_365.jpg",
  CAT: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&h=600&fit=crop",
  DEFAULT: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&h=600&fit=crop",
};

function getFallbackImage(type: string): string {
  if (type === "DOG") return FALLBACK_IMAGES.DOG;
  if (type === "CAT") return FALLBACK_IMAGES.CAT;
  return FALLBACK_IMAGES.DEFAULT;
}

// Generate a consistent color for a pet based on its ID
function getPetPlaceholderColor(petId: string): string {
  const colors = [
    "bg-blue-400",
    "bg-purple-400",
    "bg-pink-400",
    "bg-orange-400",
    "bg-green-400",
    "bg-red-400",
    "bg-indigo-400",
    "bg-teal-400",
    "bg-cyan-400",
    "bg-amber-400",
  ];
  let hash = 0;
  for (let i = 0; i < petId.length; i++) {
    hash = ((hash << 5) - hash) + petId.charCodeAt(i);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Get initials from pet name
function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function PetCard({
  id,
  name,
  ownerName,
  state,
  photos,
  type,
  weeklyVotes,
  weeklyRank,
  isNew,
}: PetCardProps) {
  const [imgError, setImgError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);

  const photo = photos[0];
  const hasPhoto = photo && photo.trim().length > 0;
  // Only show placeholder if no photo AND fallback also failed
  const showPlaceholder = (!hasPhoto && fallbackError) || (imgError && fallbackError);
  const placeholderColor = getPetPlaceholderColor(id);
  const initials = getInitials(name);
  const fallbackSrc = getFallbackImage(type);

  // Determine what image src to use
  const imageSrc = hasPhoto && !imgError ? photo : (!fallbackError ? fallbackSrc : null);

  return (
    <Link href={`/pets/${id}`} className="card card-hover group block overflow-hidden">
      <div className="aspect-[4/5] relative bg-surface-100 overflow-hidden">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            onError={() => {
              if (hasPhoto && !imgError) {
                // Original photo failed — try fallback
                setImgError(true);
              } else {
                // Fallback also failed — show placeholder
                setFallbackError(true);
              }
            }}
          />
        ) : null}

        {/* Placeholder for missing or broken photo (only when fallback also fails) */}
        {showPlaceholder && (
          <div
            className={cn(
              "w-full h-full flex flex-col items-center justify-center transition-opacity group-hover:opacity-80",
              placeholderColor
            )}
          >
            <span className="text-4xl font-bold text-white opacity-80 mb-2">
              {initials}
            </span>
            <span className="text-xs font-medium text-white opacity-70">
              Photo Pending
            </span>
          </div>
        )}

        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {isNew && <span className="badge-new text-[11px]">New</span>}
          {showPlaceholder && (
            <span className="badge-new text-[11px] bg-amber-500">No Photo</span>
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
          <span className="text-xs font-medium text-surface-700">{rankSuffix(weeklyRank)} this week</span>
        </div>
      )}
    </Link>
  );
}
