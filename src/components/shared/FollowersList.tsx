"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type FollowUser = {
  id: string;
  name: string | null;
  image: string | null;
  _count: { followers: number; pets: number };
};

export function FollowersList({
  userId,
  type,
  onClose,
}: {
  userId: string;
  type: "followers" | "following";
  onClose: () => void;
}) {
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/users/${userId}/followers?type=${type}&limit=50`)
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users || []);
        setTotal(data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [userId, type]);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-modal-backdrop">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col border border-surface-200/60 animate-modal-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-100">
          <div>
            <h2 className="text-lg font-extrabold text-surface-900 capitalize">
              {type}
            </h2>
            <p className="text-xs text-surface-400 mt-0.5">{total} {type}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-surface-100 flex items-center justify-center transition-all hover:rotate-90 duration-200"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-surface-400"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-4 py-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-surface-400 mt-3">Loading...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-2">👋</div>
              <p className="text-surface-500 font-medium">No {type} yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {users.map((u, i) => (
                <Link
                  key={u.id}
                  href={`/users/${u.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-50 transition-all group animate-profile-slide-up"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center flex-shrink-0 ring-2 ring-white shadow-sm">
                    {u.image ? (
                      <img
                        src={u.image}
                        alt={u.name || "User"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-bold bg-gradient-to-br from-brand-500 to-brand-600 bg-clip-text text-transparent">
                        {(u.name || "?")[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-surface-900 truncate group-hover:text-brand-600 transition-colors">
                      {u.name || "Anonymous"}
                    </p>
                    <p className="text-xs text-surface-400">
                      {u._count.pets} pets · {u._count.followers} followers
                    </p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface-300 group-hover:text-brand-400 group-hover:translate-x-1 transition-all flex-shrink-0"><path d="M9 18l6-6-6-6"/></svg>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
