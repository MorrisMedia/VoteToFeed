"use client";

import { useState } from "react";
import { timeAgo } from "@/lib/utils";
import { AvatarFallback } from "@/components/shared/AvatarFallback";
import { CommentForm } from "./CommentForm";

type Reply = {
  id: string;
  text: string;
  createdAt: string | Date;
  likeCount: number;
  likedByMe: boolean;
  user: { name: string | null; image: string | null };
};

type Comment = {
  id: string;
  text: string;
  createdAt: string | Date;
  likeCount: number;
  likedByMe: boolean;
  user: { name: string | null; image: string | null };
  replies: Reply[];
};

function abbreviateName(name?: string | null) {
  if (!name) return "Anonymous";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || "Anonymous";
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase();
  return lastInitial ? `${firstName} ${lastInitial}.` : firstName;
}

function LikeButton({ commentId, initialCount, initialLiked, isLoggedIn }: {
  commentId: string;
  initialCount: number;
  initialLiked: boolean;
  isLoggedIn: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!isLoggedIn || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/comments/${commentId}/like`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setCount(data.count);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading || !isLoggedIn}
      title={isLoggedIn ? (liked ? "Unlike" : "Like") : "Log in to like"}
      className={`flex items-center gap-1 text-xs font-medium transition-colors ${
        liked ? "text-red-500" : "text-surface-400 hover:text-red-400"
      } ${!isLoggedIn ? "cursor-default" : "cursor-pointer"}`}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
      {count > 0 && <span>{count}</span>}
    </button>
  );
}

export function CommentList({
  comments,
  petId,
  isLoggedIn,
}: {
  comments: Comment[];
  petId: string;
  isLoggedIn: boolean;
}) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  return (
    <ul className="mt-5 space-y-0 divide-y divide-surface-100">
      {comments.map((c) => (
        <li key={c.id} className="py-4" id={`comment-${c.id}`}>
          <div className="flex gap-3">
            <AvatarFallback
              image={c.user.image}
              name={c.user.name}
              className="w-11 h-11 rounded-full object-cover flex-shrink-0"
              fallbackClassName="w-11 h-11 rounded-full bg-surface-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-surface-500"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-base font-semibold text-surface-900">{abbreviateName(c.user.name)}</p>
                <p className="text-xs text-surface-600 font-medium">{timeAgo(new Date(c.createdAt))}</p>
              </div>
              <p className="text-base text-surface-800 font-medium mt-1">{c.text}</p>

              {/* Action row */}
              <div className="flex items-center gap-3 mt-2">
                <LikeButton
                  commentId={c.id}
                  initialCount={c.likeCount}
                  initialLiked={c.likedByMe}
                  isLoggedIn={isLoggedIn}
                />
                {isLoggedIn && replyingTo !== c.id && (
                  <button
                    onClick={() => setReplyingTo(c.id)}
                    className="text-xs text-brand-600 font-medium hover:underline"
                  >
                    Reply
                  </button>
                )}
              </div>

              {/* Inline reply form */}
              {replyingTo === c.id && (
                <div className="mt-3 ml-1">
                  <CommentForm
                    petId={petId}
                    parentId={c.id}
                    onCancel={() => setReplyingTo(null)}
                    compact
                  />
                </div>
              )}

              {/* Existing replies */}
              {c.replies.length > 0 && (
                <ul className="mt-3 ml-3 space-y-3 border-l-2 border-surface-100 pl-3">
                  {c.replies.map((r) => (
                    <li key={r.id} id={`comment-${r.id}`}>
                      <div className="flex gap-2">
                        <AvatarFallback
                          image={r.user.image}
                          name={r.user.name}
                          className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                          fallbackClassName="w-7 h-7 rounded-full bg-surface-100 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-surface-500"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-surface-900">{abbreviateName(r.user.name)}</p>
                            <p className="text-xs text-surface-500">{timeAgo(new Date(r.createdAt))}</p>
                          </div>
                          <p className="text-sm text-surface-700 font-medium">{r.text}</p>
                          <div className="mt-1">
                            <LikeButton
                              commentId={r.id}
                              initialCount={r.likeCount}
                              initialLiked={r.likedByMe}
                              isLoggedIn={isLoggedIn}
                            />
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
