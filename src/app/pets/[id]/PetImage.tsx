"use client";

/**
 * Generate a deterministic but pseudo-random fallback image URL based on pet ID
 * This ensures the same pet always gets the same fallback, but different pets get variety
 */
function generateFallbackImage(petId: string, petType: string): string {
  // Create a simple hash from petId to get a number between 0-1
  let hash = 0;
  for (let i = 0; i < petId.length; i++) {
    const char = petId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  const randomSeed = Math.abs(hash) % 100; // Get number 0-99
  
  if (petType === "DOG") {
    // Use different dog breeds based on hash
    const dogBreeds = [
      "labrador",
      "golden-retriever",
      "german-shepherd",
      "bulldog",
      "poodle",
      "rottweiler",
      "beagle",
      "dachshund",
      "husky",
      "boxer"
    ];
    const breed = dogBreeds[randomSeed % dogBreeds.length];
    return `https://placedog.net/600/600?${petId}`;
  } else {
    // Use random kitten for cats
    return `https://placekitten.com/600/600?${petId}`;
  }
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
  // Use generated fallback if petId and petType are provided, otherwise use provided fallback
  const actualFallback = fallback || 
    (petId && petType ? generateFallbackImage(petId, petType) : undefined) ||
    "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&h=600&fit=crop";

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        const t = e.currentTarget;
        t.onerror = null;
        if (actualFallback) {
          t.src = actualFallback;
        }
      }}
    />
  );
}
