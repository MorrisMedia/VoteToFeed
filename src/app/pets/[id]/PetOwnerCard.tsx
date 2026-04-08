"use client";

import { useState } from "react";
import Link from "next/link";

export function PetOwnerCard({
  owner,
  location,
  isLoggedIn,
  isOwner,
  isFollowing: initialFollowing,
  petId,
  bonusClaimed,
}: {
  owner: { id: string; name: string | null; image: string | null };
  location: string | null;
  isLoggedIn: boolean;
  isOwner: boolean;
  isFollowing: boolean;
  petId: string;
  bonusClaimed: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const [showBonus, setShowBonus] = useState(false);
  const [claimed, setClaimed] = useState(bonusClaimed);
  const [hover, setHover] = useState(false);

  const name = owner.name || "Pet Owner";
  const initial = name[0]?.toUpperCase() || "?";

  async function handleFollow() {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${owner.id}/follow`, {
        method: following ? "DELETE" : "POST",
      });
      if (res.ok) {
        const data = await res.json();
        const newState = !following;
        setFollowing(newState);
        if (newState && data.bonusVotes) {
          setClaimed(true);
          setShowBonus(true);
          setTimeout(() => setShowBonus(false), 3000);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gradient-to-r from-surface-50 to-white rounded-2xl border border-surface-200/60 p-4 transition-all hover:shadow-md">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <Link href={`/users/${owner.id}`} className="flex-shrink-0">
          <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center ring-2 ring-white shadow-sm hover:ring-brand-200 transition-all">
            {owner.image ? (
              <img src={owner.image} alt={name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-base font-bold bg-gradient-to-br from-brand-500 to-brand-600 bg-clip-text text-transparent">
                {initial}
              </span>
            )}
          </div>
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <Link
            href={`/users/${owner.id}`}
            className="text-sm font-bold text-surface-900 hover:text-brand-600 transition-colors truncate block"
          >
            {name}
          </Link>
          {location && (
            <p className="text-xs text-surface-400 flex items-center gap-1 mt-0.5">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-surface-300 flex-shrink-0">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
              <span className="truncate">{location}</span>
            </p>
          )}
        </div>

        {/* Follow button */}
        {!isOwner && isLoggedIn && (
          <div className="flex-shrink-0">
            {following ? (
              <button
                onClick={handleFollow}
                disabled={loading}
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs rounded-xl font-bold transition-all border-2 active:scale-95 ${
                  hover
                    ? "border-red-300 text-red-600 bg-red-50"
                    : "border-brand-200 text-brand-700 bg-brand-50"
                } disabled:opacity-50`}
              >
                {loading ? (
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : hover ? (
                  "Unfollow"
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    Following
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleFollow}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs rounded-xl font-bold bg-gradient-to-r from-brand-500 to-brand-600 text-white hover:shadow-lg hover:shadow-brand-500/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
                    Follow
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {!isOwner && !isLoggedIn && (
          <Link
            href={`/auth/signin?callbackUrl=/pets/${petId}`}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs rounded-xl font-bold bg-gradient-to-r from-brand-500 to-brand-600 text-white hover:shadow-lg hover:shadow-brand-500/20 active:scale-95 transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
            Follow
          </Link>
        )}
      </div>

      {/* Follow incentive — only for non-following non-owners who haven't claimed bonus */}
      {!isOwner && !following && !claimed && (
        <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200/60 rounded-xl px-3 py-2">
          <span className="text-base">🎁</span>
          <p className="text-[11px] font-semibold text-amber-800">
            Follow to get <span className="text-amber-900 font-extrabold">5 free votes</span> instantly!
          </p>
        </div>
      )}

      {/* Bonus awarded animation */}
      {showBonus && (
        <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-200/60 rounded-xl px-3 py-2 animate-profile-slide-up">
          <span className="text-base">🎉</span>
          <p className="text-[11px] font-bold text-green-800">
            +5 free votes added to your balance!
          </p>
        </div>
      )}
    </div>
  );
}
