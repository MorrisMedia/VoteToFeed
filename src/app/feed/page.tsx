"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

/* ─── Types ─── */
type FeedUser = {
  id: string;
  name: string | null;
  image: string | null;
  city: string | null;
  state: string | null;
  followerCount: number;
};

type FeedComment = {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string | null; image: string | null };
  likeCount: number;
  isLiked: boolean;
};

type FeedPost = {
  id: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  user: FeedUser;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isFollowing: boolean;
  isOwnPost: boolean;
  comments: FeedComment[];
};

type FeedPet = {
  id: string;
  name: string;
  type: string;
  breed: string | null;
  bio: string | null;
  photos: string[];
  tags: string[];
  city: string | null;
  state: string | null;
  createdAt: string;
  user: { id: string; name: string | null; image: string | null };
  totalVotes: number;
  weeklyVotes: number;
  weeklyRank: number | null;
  isNew: boolean;
};

/* ─── Helpers ─── */
function timeAgo(dateStr: string) {
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ─── Share Modal ─── */
function ShareModal({ post, onClose }: { post: FeedPost; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/users/${post.user.id}`;
  const shareText = `Check out ${post.user.name || "this user"}'s post on VoteToFeed!`;

  function copyLink() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-modal-backdrop" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-modal-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-surface-900">Share Post</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-surface-100 flex items-center justify-center transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 group">
              <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </div>
              <span className="text-[11px] font-semibold text-surface-600">X</span>
            </a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 group">
              <div className="w-14 h-14 rounded-2xl bg-[#1877F2] flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </div>
              <span className="text-[11px] font-semibold text-surface-600">Facebook</span>
            </a>
            <a href={`https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`} target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 group">
              <div className="w-14 h-14 rounded-2xl bg-[#25D366] flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </div>
              <span className="text-[11px] font-semibold text-surface-600">WhatsApp</span>
            </a>
            <button onClick={copyLink} className="flex flex-col items-center gap-2 group">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all shadow-lg ${copied ? "bg-emerald-500" : "bg-surface-700"}`}>
                {copied ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                )}
              </div>
              <span className="text-[11px] font-semibold text-surface-600">{copied ? "Copied!" : "Copy"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Media helpers ─── */
function parseMedia(imageUrl: string | null): string[] {
  if (!imageUrl) return [];
  if (imageUrl.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(imageUrl);
      if (Array.isArray(parsed)) return parsed.filter((u): u is string => typeof u === "string");
    } catch { /* fall through */ }
    return [imageUrl];
  }
  return [imageUrl];
}
function isVideo(url: string): boolean {
  return /\.(mp4|webm|mov|ogg|avi)(\?.*)?$/i.test(url);
}

/* ─── Media Carousel (multi-image/video with prev/next + swipe) ─── */
function MediaCarousel({ media, onLightbox, doubleTapHeart, postId, onDoubleTap }: {
  media: string[];
  onLightbox: (url: string) => void;
  doubleTapHeart: string | null;
  postId: string;
  onDoubleTap: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  function prev() { setIdx((i) => Math.max(0, i - 1)); }
  function next() { setIdx((i) => Math.min(media.length - 1, i + 1)); }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Only swipe horizontally if dominant axis
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) next(); else prev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }

  const url = media[idx];
  return (
    <div
      className="border-t border-b border-surface-100 relative select-none overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onClick={onDoubleTap}
    >
      {/* Media item */}
      <div className="relative bg-black">
        {isVideo(url) ? (
          <video
            src={url}
            className="w-full block max-h-[500px] object-contain"
            controls
            playsInline
            preload="metadata"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <img
            src={url}
            alt={`Media ${idx + 1}`}
            className="w-full h-auto block max-h-[500px] object-cover"
            loading="lazy"
            onClick={(e) => { e.stopPropagation(); onLightbox(url); }}
          />
        )}

        {/* Double-tap heart */}
        {doubleTapHeart === postId && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="white" className="drop-shadow-2xl animate-[heart-pop_0.6s_ease-out_forwards]">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </div>
        )}

        {/* Counter badge */}
        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[11px] font-bold pointer-events-none">
          {idx + 1}/{media.length}
        </span>
      </div>

      {/* Prev arrow */}
      {idx > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); prev(); }}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-all backdrop-blur-sm z-10"
          aria-label="Previous"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
      )}
      {/* Next arrow */}
      {idx < media.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); next(); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-all backdrop-blur-sm z-10"
          aria-label="Next"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      )}

      {/* Dot indicators */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none">
        {media.map((_, mi) => (
          <span key={mi} className={`rounded-full transition-all ${mi === idx ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"}`} />
        ))}
      </div>
    </div>
  );
}

/* ─── Create Post Modal ─── */
function CreatePostModal({ onClose, onCreated }: { onClose: () => void; onCreated: (post: FeedPost) => void }) {
  const { data: session } = useSession();
  const [content, setContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const MAX_MEDIA = 3;
  // vvBottom: how many px above the keyboard to push the modal
  // vvMaxH:  max height of the modal so it never overlaps the keyboard
  const [vvBottom, setVvBottom] = useState(0);
  const [vvMaxH, setVvMaxH] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // visualViewport API — works on iOS 13+, Android Chrome 61+
  // When keyboard opens, visualViewport.height shrinks and offsetTop may change.
  // We use that to push the sheet up exactly to the top of the keyboard.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function update() {
      const v = vv as VisualViewport;
      // Distance from bottom of visual viewport to bottom of layout viewport
      const bottomGap = window.innerHeight - (v.offsetTop + v.height);
      setVvBottom(Math.max(0, bottomGap));
      setVvMaxH(Math.floor(v.height * 0.92));
    }

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  function pickMedia(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadError(null);
    const remaining = MAX_MEDIA - mediaFiles.length;
    const toAdd = files.slice(0, remaining);
    if (files.length > remaining) {
      setUploadError(`Maximum ${MAX_MEDIA} files per post.`);
    }
    setMediaFiles((prev) => [...prev, ...toAdd]);
    setMediaPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
    // reset so same file can be picked again
    e.target.value = "";
  }

  function removeMedia(idx: number) {
    URL.revokeObjectURL(mediaPreviews[idx]);
    setMediaFiles((prev) => prev.filter((_, i) => i !== idx));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    if (!content.trim() || !session?.user) return;
    setPosting(true);
    setUploadError(null);
    try {
      const userId = (session.user as { id: string }).id;
      const mediaUrls: string[] = [];

      if (mediaFiles.length > 0) {
        const fd = new FormData();
        mediaFiles.forEach((f) => fd.append("photos", f));
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        if (up.ok) {
          const { urls } = await up.json();
          mediaUrls.push(...(urls || []));
        } else {
          const err = await up.json().catch(() => ({}));
          setUploadError(err.error || "Upload failed.");
          setPosting(false);
          return;
        }
      }

      const res = await fetch(`/api/users/${userId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), mediaUrls }),
      });
      if (res.ok) {
        const newPost = await res.json();
        const feedPost: FeedPost = {
          ...newPost,
          user: {
            id: userId,
            name: session.user.name,
            image: session.user.image,
            city: null,
            state: null,
            followerCount: 0,
          },
          likeCount: 0,
          commentCount: 0,
          isLiked: false,
          isFollowing: false,
          isOwnPost: true,
          comments: [],
        };
        onCreated(feedPost);
        onClose();
      }
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 animate-modal-backdrop">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      {/* Modal card — pinned just above keyboard via visualViewport bottom offset */}
      <div
        className="fixed inset-x-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg flex flex-col bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-modal-slide-up"
        style={{
          bottom: `${vvBottom}px`,
          maxHeight: vvMaxH ? `${vvMaxH}px` : "85svh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — always visible at top */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-surface-100 shrink-0">
          <button onClick={onClose} className="text-sm font-semibold text-surface-500 hover:text-surface-700 transition-colors">Cancel</button>
          <h3 className="text-base font-bold text-surface-900">Create Post</h3>
          <button
            onClick={handleSubmit}
            disabled={posting || !content.trim()}
            className="px-4 py-1.5 rounded-full text-sm font-bold bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            {posting ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Posting
              </span>
            ) : "Post"}
          </button>
        </div>

        {/* Scrollable compose area */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center flex-shrink-0">
              {session?.user?.image ? (
                <img src={session.user.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-brand-600">{(session?.user?.name || "U")[0].toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-surface-900 mb-1">{session?.user?.name || "You"}</p>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share a fun moment, a new photo, or what your pet is up to today! 🐶🐱✨"
                rows={3}
                maxLength={1000}
                className="w-full resize-none text-sm text-surface-800 placeholder:text-surface-400 focus:outline-none leading-relaxed"
              />
            </div>
          </div>

          {/* Multi-media preview grid */}
          {mediaPreviews.length > 0 && (
            <div className={`mt-3 grid gap-2 ${mediaPreviews.length === 1 ? "grid-cols-1" : mediaPreviews.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
              {mediaPreviews.map((src, idx) => (
                <div key={idx} className="relative rounded-xl overflow-hidden border border-surface-200 aspect-square bg-black">
                  {isVideo(mediaFiles[idx]?.name || src) ? (
                    <video src={src} className="w-full h-full object-cover" muted playsInline />
                  ) : (
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  )}
                  {isVideo(mediaFiles[idx]?.name || src) && (
                    <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold flex items-center gap-1">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      Video
                    </div>
                  )}
                  <button
                    onClick={() => removeMedia(idx)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90 transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
              {mediaPreviews.length < MAX_MEDIA && (
                <label className="relative rounded-xl border-2 border-dashed border-surface-200 hover:border-brand-300 transition-colors cursor-pointer aspect-square flex flex-col items-center justify-center gap-1 text-surface-400 hover:text-brand-500">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <span className="text-[10px] font-semibold">Add more</span>
                  <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={pickMedia} />
                </label>
              )}
            </div>
          )}
          {uploadError && (
            <p className="mt-2 text-xs text-red-500 font-medium">{uploadError}</p>
          )}
        </div>

        {/* Actions bar — pinned at bottom, above iOS safe area */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-surface-100 bg-surface-50/50 shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          <div className="flex gap-1 items-center">
            {mediaPreviews.length < MAX_MEDIA && (
              <>
                <label className="w-10 h-10 rounded-full hover:bg-brand-50 flex items-center justify-center cursor-pointer transition-colors" title="Add photo">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2EC4B6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={pickMedia} />
                </label>
                <label className="w-10 h-10 rounded-full hover:bg-brand-50 flex items-center justify-center cursor-pointer transition-colors" title="Add video">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2EC4B6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                  <input type="file" accept="video/*" className="hidden" onChange={pickMedia} />
                </label>
              </>
            )}
            {mediaPreviews.length > 0 && (
              <span className="text-xs text-surface-400 ml-1">{mediaPreviews.length}/{MAX_MEDIA}</span>
            )}
          </div>
          <span className="text-xs text-surface-400">{content.length}/1000</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Pet Card (shown inline in feed) ─── */
function PetCard({ pet }: { pet: FeedPet }) {
  const photo = pet.photos?.[0] || null;
  const location = [pet.city, pet.state].filter(Boolean).join(", ");
  const petEmoji = pet.type === "DOG" ? "🐶" : pet.type === "CAT" ? "🐱" : "🐾";

  return (
    <article className="bg-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
      {/* Header — owner info */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <Link href={`/users/${pet.user.id}`} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center flex-shrink-0 ring-2 ring-surface-200/60 group-hover:ring-brand-300 transition-all">
            {pet.user.image ? (
              <img src={pet.user.image} alt={pet.user.name || ""} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-brand-600">{(pet.user.name || "?")[0].toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-surface-900 group-hover:text-brand-600 transition-colors">
              {pet.user.name || "Anonymous"}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-surface-400">
              <span>{petEmoji} Shared their pet</span>
              {location && <><span>·</span><span>📍 {location}</span></>}
            </div>
          </div>
        </Link>
        {pet.isNew && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-wide">New</span>
        )}
      </div>

      {/* Pet name + bio */}
      <div className="px-5 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base font-extrabold text-surface-900">{pet.name}</span>
          {pet.breed && <span className="text-xs text-surface-400 font-medium">{pet.breed}</span>}
        </div>
        {pet.bio && (
          <p className="text-sm text-surface-700 leading-relaxed">{pet.bio}</p>
        )}
        {pet.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {pet.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="px-2 py-0.5 rounded-full text-[11px] bg-brand-50 text-brand-600 font-medium">#{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Photo */}
      {photo && (
        <Link href={`/pets/${pet.id}`}>
          <img src={photo} alt={pet.name} className="w-full object-cover max-h-80 bg-surface-100" />
        </Link>
      )}

      {/* Footer — votes + CTA */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-surface-100">
        <div className="flex items-center gap-4 text-sm text-surface-500">
          <span className="flex items-center gap-1.5 font-semibold">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#E8453C" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            <span className="text-surface-700">{pet.totalVotes.toLocaleString()} votes</span>
          </span>
          {pet.weeklyRank && pet.weeklyRank <= 10 && (
            <span className="flex items-center gap-1 text-amber-600 font-bold text-xs">
              🏆 #{pet.weeklyRank} this week
            </span>
          )}
        </div>
        <Link
          href={`/pets/${pet.id}`}
          className="px-4 py-1.5 rounded-full text-xs font-bold bg-brand-500 text-white hover:bg-brand-600 transition-colors active:scale-95"
        >
          View &amp; Vote
        </Link>
      </div>
    </article>
  );
}

/* ─── Suggested Users (Horizontal Stories Style) ─── */
function SuggestedUsers() {
  const [users, setUsers] = useState<FeedUser[]>([]);
  const { data: session } = useSession();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/users/suggested");
        if (res.ok) {
          const data = await res.json();
          // Shuffle on every load so it feels fresh
          setUsers([...data].sort(() => Math.random() - 0.5));
        }
      } catch (e) {}
    }
    load();
  }, [session]);

  if (users.length === 0) return null;

  return (
    <div className="mb-6 overflow-hidden">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-xs font-extrabold text-surface-500 uppercase tracking-widest flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-400">
            <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
          </svg>
          People you may like
        </h3>
      </div>
      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 snap-x">
        {users.map((u) => (
          <Link
            key={u.id}
            href={`/users/${u.id}`}
            className="flex flex-col items-center gap-2 min-w-[90px] max-w-[90px] snap-start bg-white rounded-2xl border border-surface-200/60 shadow-sm p-3 hover:shadow-md hover:border-brand-200 transition-all group"
          >
            <div className="relative">
              <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-brand-300/40 group-hover:ring-brand-500/60 transition-all">
                {u.image ? (
                  <img src={u.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-400 to-brand-600 text-white text-xl font-bold">
                    {u.name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-brand-500 border-2 border-white flex items-center justify-center">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </span>
            </div>
            <p className="text-[11px] font-bold text-surface-800 group-hover:text-brand-600 transition-colors text-center line-clamp-1 w-full">
              {u.name?.split(" ")[0] || "User"}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─── Who Liked Modal ─── */
function LikesModal({ postId, postUserId, onClose }: { postId: string; postUserId: string; onClose: () => void }) {
  const [users, setUsers] = useState<{ id: string; name: string | null; image: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/users/${postUserId}/posts/${postId}/like`)
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [postId, postUserId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-modal-backdrop" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xs overflow-hidden animate-modal-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <h3 className="text-base font-bold text-surface-900 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            </span>
            Liked by
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-surface-100 flex items-center justify-center transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-sm text-surface-500 py-8">No likes yet.</p>
          ) : (
            users.map((u) => (
              <Link
                key={u.id}
                href={`/users/${u.id}`}
                onClick={onClose}
                className="flex items-center gap-3 px-5 py-3 hover:bg-surface-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full overflow-hidden bg-brand-50 flex-shrink-0 flex items-center justify-center">
                  {u.image ? (
                    <img src={u.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-brand-600">{(u.name || "?")[0].toUpperCase()}</span>
                  )}
                </div>
                <span className="text-sm font-semibold text-surface-800">{u.name || "User"}</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Image Lightbox ─── */
function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-modal-backdrop" onClick={onClose}>
      <div className="absolute inset-0 bg-black/90" />
      <button onClick={onClose} className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <img src={src} alt="" className="relative max-w-[95vw] max-h-[90vh] object-contain rounded-lg animate-modal-slide-up" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

/* ─── Main Feed Page ─── */
export default function FeedPage() {
  const { data: session, status } = useSession();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [feedPets, setFeedPets] = useState<FeedPet[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sharePost, setSharePost] = useState<FeedPost | null>(null);
  const [likingPost, setLikingPost] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);
  const [followingUser, setFollowingUser] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [doubleTapHeart, setDoubleTapHeart] = useState<string | null>(null);
  const [likesModalPostId, setLikesModalPostId] = useState<string | null>(null);
  const lastTapRef = useRef<Record<string, number>>({});
  const observerRef = useRef<HTMLDivElement>(null);

  const loadFeed = useCallback(async (cursor?: string) => {
    if (cursor) setLoadingMore(true); else setLoading(true);
    try {
      const url = `/api/feed?limit=15${cursor ? `&cursor=${cursor}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (cursor) {
        setPosts((prev) => [...prev, ...(data.posts || [])]);
      } else {
        // Shuffle first page so feed feels fresh on every visit
        const fresh: FeedPost[] = data.posts || [];
        const shuffled = [...fresh].sort(() => Math.random() - 0.5);
        setPosts(shuffled);
      }
      setNextCursor(data.nextCursor || null);
    } catch (e) {
      console.error("Feed load error:", e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  // Fetch pets to show inline in feed (most recent, random shuffle so it feels fresh)
  useEffect(() => {
    fetch("/api/pets?limit=30&sort=recent")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.pets)) {
          // Shuffle so different pets show on each visit
          const shuffled = [...data.pets].sort(() => Math.random() - 0.5);
          setFeedPets(shuffled);
        }
      })
      .catch((err) => console.error("[feed] pets fetch failed:", err));
  }, []);

  // Scroll to post from URL hash (e.g. from notification link)
  useEffect(() => {
    if (loading) return;
    const hash = window.location.hash;
    if (!hash.startsWith("#post-")) return;
    const postId = hash.replace("#post-", "");
    const el = document.getElementById(`post-${postId}`);
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-brand-400", "ring-offset-2");
        setTimeout(() => el.classList.remove("ring-2", "ring-brand-400", "ring-offset-2"), 3000);
      }, 300);
    }
  }, [loading]);

  // Infinite scroll
  useEffect(() => {
    if (!nextCursor || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor) {
          loadFeed(nextCursor);
        }
      },
      { threshold: 0.5 }
    );
    const el = observerRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [nextCursor, loadingMore, loadFeed]);

  async function toggleLike(post: FeedPost) {
    if (likingPost || !session?.user) return;
    setLikingPost(post.id);
    try {
      const res = await fetch(`/api/users/${post.user.id}/posts/${post.id}/like`, { method: "POST" });
      if (res.ok) {
        const { liked, likeCount } = await res.json();
        setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, isLiked: liked, likeCount } : p));
      }
    } finally {
      setLikingPost(null);
    }
  }

  // Double-tap to like (Instagram-style)
  function handleDoubleTap(post: FeedPost) {
    if (!session?.user) return;
    const now = Date.now();
    const lastTap = lastTapRef.current[post.id] || 0;
    if (now - lastTap < 300) {
      // Double tap detected!
      if (!post.isLiked) toggleLike(post);
      setDoubleTapHeart(post.id);
      setTimeout(() => setDoubleTapHeart(null), 1000);
      lastTapRef.current[post.id] = 0;
    } else {
      lastTapRef.current[post.id] = now;
    }
  }

  async function submitComment(post: FeedPost) {
    const text = (commentTexts[post.id] || "").trim();
    if (!text || submittingComment || !session?.user) return;
    setSubmittingComment(post.id);
    try {
      const res = await fetch(`/api/users/${post.user.id}/posts/${post.id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const comment = await res.json();
        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id
              ? {
                  ...p,
                  comments: [...p.comments, { ...comment, likeCount: 0, isLiked: false }],
                  commentCount: p.commentCount + 1,
                }
              : p
          )
        );
        setCommentTexts((prev) => ({ ...prev, [post.id]: "" }));
      }
    } finally {
      setSubmittingComment(null);
    }
  }

  async function toggleFollow(userId: string, currentlyFollowing: boolean) {
    if (followingUser || !session?.user) return;
    setFollowingUser(userId);
    try {
      const res = await fetch(`/api/users/${userId}/follow`, {
        method: currentlyFollowing ? "DELETE" : "POST",
      });
      if (res.ok) {
        setPosts((prev) =>
          prev.map((p) =>
            p.user.id === userId ? { ...p, isFollowing: !currentlyFollowing } : p
          )
        );
      }
    } finally {
      setFollowingUser(null);
    }
  }

  const isLoggedIn = status === "authenticated";
  const userId = session?.user ? (session.user as { id: string }).id : null;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-[600px] mx-auto px-4 sm:px-0 py-6 sm:py-8">
        {/* Stories-style header strip */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-extrabold text-surface-900 tracking-tight flex items-center gap-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              Feed
            </h1>
            {isLoggedIn && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 text-white text-sm font-bold shadow-md hover:shadow-lg hover:shadow-brand-500/25 transition-all active:scale-95"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                New Post
              </button>
            )}
          </div>

          {/* Quick action strip */}
          {isLoggedIn && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full flex items-center gap-3 px-5 py-4 bg-white rounded-2xl border border-surface-200/60 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center flex-shrink-0 ring-2 ring-brand-200/50">
                {session?.user?.image ? (
                  <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-brand-600">{(session?.user?.name || "U")[0].toUpperCase()}</span>
                )}
              </div>
              <span className="text-sm text-surface-400 flex-1 text-left group-hover:text-surface-500 transition-colors">
                What is your pet up to today? 🐶🐱✨
              </span>
              <div className="flex gap-2">
                <span className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </span>
              </div>
            </button>
          )}

          {!isLoggedIn && (
            <div className="bg-gradient-to-r from-brand-500 to-brand-600 rounded-2xl p-6 text-center shadow-lg">
              <h2 className="text-xl font-extrabold text-white mb-2">Join the Community! 🐾</h2>
              <p className="text-sm text-white/80 mb-4 max-w-sm mx-auto">
                Sign up to create posts, follow pet lovers, and interact with their content.
              </p>
              <div className="flex gap-3 justify-center">
                <Link href="/auth/signin" className="px-5 py-2.5 rounded-xl bg-white/20 text-white font-bold text-sm hover:bg-white/30 transition-colors backdrop-blur-sm">
                  Log in
                </Link>
                <Link href="/auth/signup" className="px-5 py-2.5 rounded-xl bg-white text-brand-600 font-bold text-sm hover:bg-brand-50 transition-colors shadow-md">
                  Sign up free
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Suggested Users horizontal list */}
        {isLoggedIn && !loading && posts.length > 0 && (
          <SuggestedUsers />
        )}

        {/* Feed Posts */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-surface-200/60 overflow-hidden animate-pulse">
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="w-10 h-10 rounded-full bg-surface-200" />
                  <div className="flex-1">
                    <div className="w-24 h-3 bg-surface-200 rounded-full mb-2" />
                    <div className="w-16 h-2 bg-surface-100 rounded-full" />
                  </div>
                </div>
                <div className="px-5 pb-4">
                  <div className="w-full h-3 bg-surface-100 rounded-full mb-2" />
                  <div className="w-3/4 h-3 bg-surface-100 rounded-full" />
                </div>
                <div className="h-48 bg-surface-100" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-surface-200/60 shadow-sm">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-brand-50 flex items-center justify-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2EC4B6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-surface-900 mb-2">Feed is empty</h3>
            <p className="text-sm text-surface-500 mb-6 max-w-xs mx-auto">
              Be the first to share something! Post updates about your pets and connect with other pet lovers.
            </p>
            {isLoggedIn ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 transition-colors shadow-md"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Create your first post
              </button>
            ) : (
              <Link href="/auth/signup" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 transition-colors shadow-md">
                Sign up to get started
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post, i) => (
              <React.Fragment key={post.id}>
                <article
                  id={`post-${post.id}`}
                  className="bg-white rounded-2xl border border-surface-200/60 shadow-sm overflow-hidden hover:shadow-md transition-all animate-profile-slide-up"
                  style={{ animationDelay: `${Math.min(i, 5) * 60}ms` }}
                >
                {/* Post Header */}
                <div className="flex items-center justify-between px-5 pt-4 pb-3">
                  <Link href={`/users/${post.user.id}`} className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center flex-shrink-0 ring-2 ring-surface-200/60 group-hover:ring-brand-300 transition-all">
                      {post.user.image ? (
                        <img src={post.user.image} alt={post.user.name || ""} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold bg-gradient-to-br from-brand-500 to-brand-600 bg-clip-text text-transparent">
                          {post.user.name?.[0]?.toUpperCase() || "?"}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-surface-900 group-hover:text-brand-600 transition-colors">
                        {post.user.name || "Anonymous"}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-surface-400">{timeAgo(post.createdAt)}</span>
                        {post.user.city && (
                          <span className="text-[11px] text-surface-400 flex items-center gap-0.5">
                            · 📍 {post.user.city}{post.user.state ? `, ${post.user.state}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>

                  {/* Follow button */}
                  {isLoggedIn && !post.isOwnPost && (
                    <button
                      onClick={() => toggleFollow(post.user.id, post.isFollowing)}
                      disabled={followingUser === post.user.id}
                      className={`text-xs font-bold px-3.5 py-1.5 rounded-full transition-all active:scale-95 ${
                        post.isFollowing
                          ? "bg-surface-100 text-surface-600 hover:bg-red-50 hover:text-red-500 border border-surface-200"
                          : "bg-brand-50 text-brand-600 hover:bg-brand-100 border border-brand-200/60"
                      }`}
                    >
                      {post.isFollowing ? "Following" : "Follow"}
                    </button>
                  )}
                </div>

                {/* Post Content */}
                <div className="px-5 pb-3">
                  <p className="text-sm text-surface-800 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                </div>

                {/* Post Media — single image/video or multi-item carousel */}
                {post.imageUrl && (() => {
                  const media = parseMedia(post.imageUrl);
                  if (media.length === 0) return null;
                  if (media.length === 1) {
                    const url = media[0];
                    return (
                      <div
                        className="border-t border-b border-surface-100 relative cursor-pointer group/img"
                        onClick={() => handleDoubleTap(post)}
                      >
                        {isVideo(url) ? (
                          <video
                            src={url}
                            className="w-full block max-h-[500px] object-cover"
                            controls
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          <img
                            src={url}
                            alt="Post"
                            className="w-full h-auto block max-h-[500px] object-cover transition-transform duration-300"
                            loading="lazy"
                          />
                        )}
                        {doubleTapHeart === post.id && (
                          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                            <svg width="80" height="80" viewBox="0 0 24 24" fill="white" className="drop-shadow-2xl animate-[heart-pop_0.6s_ease-out_forwards]">
                              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                            </svg>
                          </div>
                        )}
                        {!isVideo(url) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setLightboxUrl(url); }}
                            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity backdrop-blur-sm"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                          </button>
                        )}
                      </div>
                    );
                  }
                  // Multiple media items — interactive carousel with prev/next + swipe
                  return (
                    <MediaCarousel
                      media={media}
                      onLightbox={setLightboxUrl}
                      doubleTapHeart={doubleTapHeart}
                      postId={post.id}
                      onDoubleTap={() => handleDoubleTap(post)}
                    />
                  );
                })()}

                {/* Engagement Stats Bar */}
                {(post.likeCount > 0 || post.commentCount > 0) && (
                  <div className="flex items-center justify-between px-5 py-2 text-xs text-surface-400">
                    {post.likeCount > 0 && (
                      <button
                        onClick={() => setLikesModalPostId(post.id)}
                        className="flex items-center gap-1 hover:text-surface-600 transition-colors"
                      >
                        <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                        </span>
                        {post.likeCount} {post.likeCount === 1 ? "like" : "likes"}
                      </button>
                    )}
                    {post.commentCount > 0 && (
                      <button
                        onClick={() => setExpandedComments((s) => { const n = new Set(s); n.has(post.id) ? n.delete(post.id) : n.add(post.id); return n; })}
                        className="hover:text-surface-600 transition-colors"
                      >
                        {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
                      </button>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-3 border-t border-surface-100">
                  <button
                    onClick={() => isLoggedIn ? toggleLike(post) : undefined}
                    disabled={likingPost === post.id || !isLoggedIn}
                    className={`flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all active:scale-95 ${
                      post.isLiked
                        ? "text-red-500"
                        : "text-surface-500 hover:text-red-400 hover:bg-red-50/50"
                    } disabled:opacity-60`}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={post.isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={post.isLiked ? "animate-[heart-pop_0.3s_ease-out]" : ""}>
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                    </svg>
                    Like
                  </button>
                  <button
                    onClick={() => setExpandedComments((s) => { const n = new Set(s); n.has(post.id) ? n.delete(post.id) : n.add(post.id); return n; })}
                    className="flex items-center justify-center gap-2 py-3 text-sm font-semibold text-surface-500 hover:text-brand-500 hover:bg-brand-50/50 transition-all"
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                    </svg>
                    Comment
                  </button>
                  <button
                    onClick={() => setSharePost(post)}
                    className="flex items-center justify-center gap-2 py-3 text-sm font-semibold text-surface-500 hover:text-emerald-500 hover:bg-emerald-50/50 transition-all"
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                    Share
                  </button>
                </div>

                {/* Comments Section */}
                {expandedComments.has(post.id) && (
                  <div className="border-t border-surface-100 px-5 pb-4 pt-3 space-y-3 bg-surface-50/30">
                    {post.comments.map((c) => (
                      <div key={c.id} className="flex gap-2.5">
                        <Link href={`/users/${c.user.id}`} className="w-8 h-8 rounded-full overflow-hidden bg-surface-100 flex-shrink-0 flex items-center justify-center">
                          {c.user.image ? (
                            <img src={c.user.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-surface-500">{c.user.name?.[0]?.toUpperCase() || "?"}</span>
                          )}
                        </Link>
                        <div className="flex-1 bg-white rounded-2xl px-3 py-2 border border-surface-100">
                          <div className="flex items-baseline gap-2">
                            <Link href={`/users/${c.user.id}`} className="text-xs font-bold text-surface-800 hover:text-brand-600 transition-colors">{c.user.name || "User"}</Link>
                            <span className="text-[10px] text-surface-400">{timeAgo(c.createdAt)}</span>
                          </div>
                          <p className="text-xs text-surface-700 mt-0.5 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                        </div>
                      </div>
                    ))}

                    {/* Comment input */}
                    {isLoggedIn && (
                      <div className="flex gap-2 items-end pt-1">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-brand-50 flex-shrink-0 flex items-center justify-center">
                          {session?.user?.image ? (
                            <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-brand-600">{(session?.user?.name || "U")[0].toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex-1 flex gap-2 items-center bg-white rounded-full border border-surface-200 pl-3 pr-1 py-1 focus-within:ring-2 focus-within:ring-brand-400/30 focus-within:border-brand-300 transition-all">
                          <input
                            type="text"
                            value={commentTexts[post.id] || ""}
                            onChange={(e) => setCommentTexts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(post); } }}
                            placeholder="Write a comment..."
                            maxLength={500}
                            className="flex-1 text-xs text-surface-900 placeholder:text-surface-400 focus:outline-none bg-transparent py-1"
                          />
                          <button
                            onClick={() => submitComment(post)}
                            disabled={submittingComment === post.id || !(commentTexts[post.id] || "").trim()}
                            className="w-7 h-7 flex-shrink-0 rounded-full bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 transition-colors disabled:opacity-40"
                          >
                            {submittingComment === post.id ? (
                              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </article>
                {/* Insert a pet card after every 4th post */}
                {feedPets.length > 0 && (i + 1) % 4 === 0 && feedPets[Math.floor((i + 1) / 4) - 1] && (
                  <PetCard pet={feedPets[Math.floor((i + 1) / 4) - 1]} />
                )}
              </React.Fragment>
            ))}

            {/* Infinite scroll sentinel */}
            <div ref={observerRef} className="h-4" />

            {loadingMore && (
              <div className="flex justify-center py-6">
                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!nextCursor && posts.length > 0 && (
              <div className="text-center py-10">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-surface-100 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/>
                  </svg>
                </div>
                <p className="text-sm font-semibold text-surface-500">You&apos;re all caught up!</p>
                <p className="text-xs text-surface-400 mt-1">You&apos;ve seen all the latest posts.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(post) => setPosts((prev) => [post, ...prev])}
        />
      )}
      {sharePost && <ShareModal post={sharePost} onClose={() => setSharePost(null)} />}
      {lightboxUrl && <ImageLightbox src={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
      {likesModalPostId && (() => {
        const p = posts.find((x) => x.id === likesModalPostId);
        return p ? <LikesModal postId={p.id} postUserId={p.user.id} onClose={() => setLikesModalPostId(null)} /> : null;
      })()}
    </div>
  );
}
