"use client";

import { useState } from "react";

export function FollowButton({
  userId,
  initialFollowing,
  onFollowChange,
  size = "default",
}: {
  userId: string;
  initialFollowing: boolean;
  onFollowChange?: (following: boolean) => void;
  size?: "default" | "small";
}) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const [hover, setHover] = useState(false);

  async function handleToggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/follow`, {
        method: isFollowing ? "DELETE" : "POST",
      });
      if (res.ok) {
        const newState = !isFollowing;
        setIsFollowing(newState);
        onFollowChange?.(newState);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  const sizeClasses =
    size === "small"
      ? "px-3.5 py-1.5 text-xs rounded-xl"
      : "px-5 py-2.5 text-sm rounded-xl";

  if (isFollowing) {
    return (
      <button
        onClick={handleToggle}
        disabled={loading}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={`inline-flex items-center gap-2 font-bold transition-all duration-200 border-2 active:scale-[0.95] ${sizeClasses} ${
          hover
            ? "border-red-300 text-red-600 bg-red-50 shadow-sm shadow-red-100"
            : "border-brand-200 text-brand-700 bg-brand-50"
        } disabled:opacity-50`}
      >
        {loading ? (
          <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : hover ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            Unfollow
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Following
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center gap-2 font-bold bg-gradient-to-r from-brand-500 to-brand-600 text-white hover:shadow-lg hover:shadow-brand-500/25 active:scale-[0.95] transition-all duration-200 ${sizeClasses} disabled:opacity-50`}
    >
      {loading ? (
        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          Follow
        </>
      )}
    </button>
  );
}
