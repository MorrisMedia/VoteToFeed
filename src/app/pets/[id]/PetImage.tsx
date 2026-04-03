"use client";

import { useState, useRef, useCallback, useEffect } from "react";

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

function isUnsupportedImageFormat(src?: string | null): boolean {
  return !!src && /\.hei[cf](?:$|[?#])/i.test(src);
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
  // Check if source is empty or missing
  const hasValidSource = src && src.trim().length > 0 && !isUnsupportedImageFormat(src);
  
  // Use generated fallback if petType is provided, otherwise use provided fallback
  const actualFallback = fallback || 
    (petType ? generateFallbackImage(petType) : undefined) ||
    RELIABLE_FALLBACKS.DEFAULT;

  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>(() => {
    if (hasValidSource) return src;
    return actualFallback;
  });
  const triedFallback = useRef(!hasValidSource);

  // Reset state when src prop changes (e.g. navigating between pets)
  useEffect(() => {
    setImageLoaded(false);
    setHasError(false);
    setCurrentSrc(hasValidSource ? src : actualFallback);
    triedFallback.current = !hasValidSource;
  }, [src]);

  // Show placeholder when ALL image sources have failed
  const showPlaceholder = hasError;

  // Handle cached images: if img is already loaded when ref attaches, mark as loaded
  const imgRef = useCallback((node: HTMLImageElement | null) => {
    if (node && node.complete && node.naturalWidth > 0 && node.naturalHeight > 0) {
      setImageLoaded(true);
    }
  }, []);

  if (showPlaceholder && petId) {
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

  if (showPlaceholder) {
    return (
      <div className={`${className} bg-surface-200 flex items-center justify-center`}>
        <div className="text-sm font-medium text-surface-400">No photo</div>
      </div>
    );
  }

  return (
    <div className={`${className} relative overflow-hidden`}>
      {/* Skeleton loading state */}
      {!imageLoaded && (
        <div className="absolute inset-0 bg-surface-200 animate-pulse" />
      )}
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        className={`w-full h-full object-cover object-center transition-opacity duration-300 ${
          imageLoaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth === 0 || img.naturalHeight === 0) {
            if (!triedFallback.current) {
              triedFallback.current = true;
              setCurrentSrc(actualFallback);
              return;
            }
            setHasError(true);
            return;
          }
          setImageLoaded(true);
        }}
        onError={() => {
          if (!triedFallback.current) {
            triedFallback.current = true;
            setCurrentSrc(actualFallback);
          } else {
            setHasError(true);
          }
        }}
      />
    </div>
  );
}
