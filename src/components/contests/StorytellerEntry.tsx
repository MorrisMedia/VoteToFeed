"use client";

import { useState } from "react";

type Props = {
  story: string | null;
  bio: string | null;
  isStoryteller: boolean;
};

export function StorytellerEntry({ story, bio, isStoryteller }: Props) {
  const [open, setOpen] = useState(false);

  // Original behaviour: just show story inline when present
  if (!isStoryteller) {
    if (!story) return null;
    return (
      <div className="card px-3 py-2.5">
        <p className="text-xs text-surface-600 leading-relaxed italic">&ldquo;{story}&rdquo;</p>
      </div>
    );
  }

  // Storyteller mode: story takes priority, fall back to bio
  const content = story || bio;
  if (!content) return null;

  const label = story ? "Story" : "Bio";

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="self-start inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
      >
        <svg
          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        {open ? `Hide ${label}` : `Show ${label}`}
      </button>

      {open && (
        <div className="card px-3 py-2.5 animate-in fade-in duration-150">
          <p className="text-xs text-surface-600 leading-relaxed italic">&ldquo;{content}&rdquo;</p>
        </div>
      )}
    </div>
  );
}
