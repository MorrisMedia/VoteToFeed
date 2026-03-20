"use client";

import { useState } from "react";

type Props = {
  image?: string | null;
  name?: string | null;
  className: string;
  fallbackClassName: string;
  title?: string;
};

export function AvatarFallback({ image, name, className, fallbackClassName, title }: Props) {
  const [hasError, setHasError] = useState(false);
  const initial = (name || "?")[0].toUpperCase();

  if (!image || hasError) {
    return (
      <div title={title} className={fallbackClassName}>
        {initial}
      </div>
    );
  }

  return (
    <img
      src={image}
      alt={name || ""}
      title={title}
      className={className}
      onError={() => setHasError(true)}
    />
  );
}
