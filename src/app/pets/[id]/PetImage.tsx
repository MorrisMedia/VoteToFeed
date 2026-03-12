"use client";

import { useState } from "react";

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

// Reliable fallback images (placekitten/placedog are unreliable/dead)
const RELIABLE_FALLBACKS = {
  DOG: "https://images.dog.ceo/breeds/labrador/n02099712_365.jpg",
  CAT: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&h=600&fit=crop",
  DEFAULT: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&h=600&fit=crop",
};

/**
 * Generate a deterministic fallback image URL based on pet type.
 * Uses reliable sources instead of placekitten/placedog which are often down.
 */
function generateFallbackImage(petType: string): string {
  if (petType === "DOG") return RELIABLE_FALLBACKS.DOG;
  if (petType === "CAT") return RELIABLE_FALLBACKS.CAT;
  return RELIABLE_FALLBACKS.DEFAULT;
}

export function PetImage({
  src,
  alt,
  className,
  petId,
  petType,
  fallback,
}: {
  src: string;
  alt: string;
  className?: string;
  petId?: string;
  petType?: string;
  fallback?: string;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Check if source is empty or missing
  const hasValidSource = src && src.trim().length > 0;
  
  // Use generated fallback if petType is provided, otherwise use provided fallback
  const actualFallback = fallback || 
    (petType ? generateFallbackImage(petType) : undefined) ||
    RELIABLE_FALLBACKS.DEFAULT;

  if (!hasValidSource && petId && petType) {
    // Show placeholder for missing photo
    const placeholderColor = getPetPlaceholderColor(petId);
    return (
      <div
        className={`${className} ${placeholderColor} flex items-center justify-center`}
      >
        <div className="text-center">
          <div className="text-5xl font-bold text-white opacity-70 mb-4">
            {alt.slice(0, 2).toUpperCase()}
          </div>
          <div className="text-sm font-medium text-white opacity-60">
            Photo Pending
          </div>
        </div>
      </div>
    );
  }

  return (
    <img
      src={hasValidSource ? src : actualFallback}
      alt={alt}
      className={className}
      onLoad={() => setImageLoaded(true)}
      onError={(e) => {
        const t = e.currentTarget;
        if (t.src !== actualFallback) {
          // Try fallback image
          t.src = actualFallback;
        } else {
          // Fallback failed too
          setHasError(true);
        }
      }}
    />
  );
}
