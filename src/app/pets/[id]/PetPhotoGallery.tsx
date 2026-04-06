"use client";

import { useMemo, useState } from "react";
import { PetImage } from "./PetImage";
import { ImageLightbox } from "@/components/shared/ImageLightbox";

type PetPhotoGalleryProps = {
  photos: string[];
  petId: string;
  petName: string;
  petType: string;
  isNew: boolean;
  weeklyRank: number | null;
  rankLabel?: string;
  weeklyVotes?: number;
  canVote?: boolean;
  votesRemaining?: number;
  isOwner?: boolean;
};

export function PetPhotoGallery({
  photos,
  petId,
  petName,
  petType,
  isNew,
  weeklyRank,
  rankLabel,
  weeklyVotes = 0,
  canVote = true,
  votesRemaining,
  isOwner = false,
}: PetPhotoGalleryProps) {
  const galleryPhotos = useMemo(() => {
    const valid = photos.filter((photo) => typeof photo === "string" && photo.trim().length > 0);

    if (valid.length > 0) return valid;

    return [""];
  }, [photos]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const hasMultiplePhotos = galleryPhotos.length > 1;
  const activePhoto = galleryPhotos[activeIndex] ?? galleryPhotos[0] ?? "";
  const hasValidPhotos = galleryPhotos.length > 0 && galleryPhotos[0] !== "";

  const goToPhoto = (index: number) => {
    setActiveIndex((index + galleryPhotos.length) % galleryPhotos.length);
  };

  const goPrev = () => goToPhoto(activeIndex - 1);
  const goNext = () => goToPhoto(activeIndex + 1);

  return (
    <div>
      <div className="relative rounded-2xl overflow-hidden bg-surface-100 aspect-[4/3] group shadow-sm">
        <button
          type="button"
          onClick={() => hasValidPhotos && setLightboxOpen(true)}
          className={`w-full h-full block ${hasValidPhotos ? "cursor-zoom-in" : "cursor-default"}`}
          aria-label={hasValidPhotos ? `View ${petName} photo full size` : undefined}
        >
          <PetImage
            src={activePhoto}
            alt={petName}
            className="w-full h-full object-cover"
            petId={petId}
            petType={petType}
          />
        </button>

        <div className="absolute top-4 left-4 flex flex-wrap gap-2 max-w-[calc(100%-2rem)]">
          {isNew && <span className="badge-new">New</span>}
          {weeklyRank != null && weeklyRank <= 10 && rankLabel && (
            <span className="badge-rank">{rankLabel}</span>
          )}
          {hasMultiplePhotos && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-lg backdrop-blur-sm">
              More photos
            </span>
          )}
        </div>

        {/* Zoom hint */}
        {hasValidPhotos && (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 hover:bg-black/80 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/80"
            aria-label="View full size"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>
        )}

        {hasMultiplePhotos && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={goPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/70 text-white shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-black/85 focus:outline-none focus:ring-2 focus:ring-white/80 md:opacity-80 md:group-hover:opacity-100"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <button
              type="button"
              aria-label="Next photo"
              onClick={goNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/70 text-white shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-black/85 focus:outline-none focus:ring-2 focus:ring-white/80 md:opacity-80 md:group-hover:opacity-100"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>

            <div className="absolute bottom-4 right-4 rounded-full bg-black/75 px-3 py-1.5 text-sm font-bold text-white shadow-lg backdrop-blur-sm">
              {activeIndex + 1}/{galleryPhotos.length}
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
          </>
        )}
      </div>

      {hasMultiplePhotos && (
        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-surface-700">Browse all photos</p>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-500">
              Use arrows or tap a thumbnail
            </p>
          </div>

          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {galleryPhotos.map((url, index) => {
              const isActive = index === activeIndex;

              return (
                <button
                  key={`${url}-${index}`}
                  type="button"
                  onClick={() => goToPhoto(index)}
                  aria-label={`View photo ${index + 1} of ${galleryPhotos.length}`}
                  aria-pressed={isActive}
                  className={`relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border-2 shadow-sm transition-all ${
                    isActive
                      ? "border-brand-500 ring-2 ring-brand-200 scale-[1.02]"
                      : "border-white hover:border-surface-300"
                  }`}
                >
                  <PetImage
                    src={url}
                    alt={`${petName} photo ${index + 1}`}
                    className="w-full h-full object-cover"
                    petId={petId}
                    petType={petType}
                  />
                  <div className={`absolute inset-0 transition-colors ${isActive ? "bg-brand-500/10" : "bg-black/0 hover:bg-black/5"}`} />
                  <div className="absolute bottom-1 right-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {index + 1}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {lightboxOpen && hasValidPhotos && (
        <ImageLightbox
          photos={galleryPhotos}
          initialIndex={activeIndex}
          petName={petName}
          onClose={() => setLightboxOpen(false)}
          petId={petId}
          weeklyVotes={weeklyVotes}
          canVote={canVote}
          votesRemaining={votesRemaining}
          onVote={async () => {
            try {
              const res = await fetch("/api/votes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ petId, quantity: 1 }),
              });
              const data = await res.json();
              if (res.ok) {
                return { success: true, newVoteCount: data.pet.weeklyVotes };
              }
              return { success: false };
            } catch {
              return { success: false };
            }
          }}
        />
      )}
    </div>
  );
}
