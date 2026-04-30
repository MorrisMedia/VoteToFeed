"use client";

import { useState, Children, type ReactNode } from "react";

/**
 * Client-side paginator for contest entries.
 * Server renders ALL entry cards; we only mount the first `initialCount` and
 * progressively reveal the rest via "Show more" — keeps the page snappy when
 * a contest has hundreds of pets.
 */
export function EntriesPaginator({
  children,
  initialCount = 60,
  step = 60,
}: {
  children: ReactNode;
  initialCount?: number;
  step?: number;
}) {
  const all = Children.toArray(children);
  const [visible, setVisible] = useState(Math.min(initialCount, all.length));

  if (all.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {all.slice(0, visible)}
      </div>
      {visible < all.length && (
        <div className="mt-6 flex flex-col items-center gap-2.5">
          <p className="text-xs text-surface-500">
            Showing <span className="font-semibold text-surface-700">{visible}</span> of{" "}
            <span className="font-semibold text-surface-700">{all.length}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVisible((v) => Math.min(all.length, v + step))}
              className="btn-primary px-6 py-2.5 text-sm"
            >
              Show {Math.min(step, all.length - visible)} more
            </button>
            <button
              onClick={() => setVisible(all.length)}
              className="px-4 py-2.5 text-sm font-semibold text-brand-600 hover:bg-brand-50 rounded-xl transition-colors"
            >
              Show all ({all.length})
            </button>
          </div>
        </div>
      )}
    </>
  );
}
