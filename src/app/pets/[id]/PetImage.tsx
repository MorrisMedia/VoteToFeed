"use client";

export function PetImage({
  src,
  alt,
  className,
  fallback,
}: {
  src: string;
  alt: string;
  className?: string;
  fallback: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        const t = e.currentTarget;
        t.onerror = null;
        t.src = fallback;
      }}
    />
  );
}
