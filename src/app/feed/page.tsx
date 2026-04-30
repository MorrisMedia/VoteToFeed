"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

/* ─── Create Post Modal ─── */
function CreatePostModal({ onClose, onCreated }: { onClose: () => void; onCreated: (post: FeedPost) => void }) {
  const { data: session } = useSession();
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [modalMaxH, setModalMaxH] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Use visualViewport API for 100% accurate keyboard-aware height on iOS & Android
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function onResize() {
      // Leave 10px breathing room above keyboard
      setModalMaxH(Math.floor((vv as VisualViewport).height * 0.95));
    }

    onResize();
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
    };
  }, []);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function removeImage() {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  }

  async function handleSubmit() {
    if (!content.trim() || !session?.user) return;
    setPosting(true);
    try {
      const userId = (session.user as { id: string }).id;
      let imageUrl: string | null = null;
      if (imageFile) {
        const fd = new FormData();
        fd.append("photos", imageFile);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        if (up.ok) {
          const { urls } = await up.json();
          imageUrl = urls?.[0] ?? null;
        }
      }
      const res = await fetch(`/api/users/${userId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), imageUrl }),
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
      {/* Modal card — visualViewport-driven height so keyboard never covers it */}
      <div
        className="absolute inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg flex flex-col bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-modal-slide-up"
        style={{ maxHeight: modalMaxH ? `${modalMaxH}px` : "85dvh" }}
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

          {imagePreview && (
            <div className="mt-3 relative rounded-xl overflow-hidden border border-surface-200">
              <img src={imagePreview} alt="Preview" className="w-full h-auto block max-h-48 object-cover" />
              <button
                onClick={removeImage}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          )}
        </div>

        {/* Actions bar — pinned at bottom, above iOS safe area */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-surface-100 bg-surface-50/50 shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          <div className="flex gap-1">
            <label className="w-10 h-10 rounded-full hover:bg-brand-50 flex items-center justify-center cursor-pointer transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2EC4B6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <input type="file" accept="image/*" className="hidden" onChange={pickImage} />
            </label>
          </div>
          <span className="text-xs text-surface-400">{content.length}/1000</span>
        </div>
      </div>
    </div>
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
        if (res.ok) setUsers(await res.json());
      } catch (e) {}
    }
    load();
  }, [session]);

  if (users.length === 0) return null;

  return (
    <div className="mb-6 bg-white rounded-2xl border border-surface-200/60 shadow-sm p-4 overflow-hidden">
      <h3 className="text-sm font-extrabold text-surface-900 mb-3 px-1 flex items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500">
          <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
        </svg>
        Who to Follow
      </h3>
      <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 px-1 snap-x">
        {users.map((u) => (
          <div key={u.id} className="flex flex-col items-center gap-2 min-w-[80px] snap-start">
            <Link href={`/users/${u.id}`} className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-brand-100 to-brand-50 p-0.5 border-2 border-brand-400/30 hover:border-brand-500 transition-colors shrink-0">
              <div className="w-full h-full rounded-full overflow-hidden bg-white">
                {u.image ? <img src={u.image} alt="" className="w-full h-full object-cover" /> : (
                  <div className="w-full h-full flex items-center justify-center text-lg font-bold text-brand-600">{u.name?.[0]?.toUpperCase()}</div>
                )}
              </div>
            </Link>
            <div className="text-center">
              <Link href={`/users/${u.id}`} className="text-[11px] font-bold text-surface-900 hover:text-brand-600 transition-colors line-clamp-1 break-all w-20 px-1">{u.name}</Link>
            </div>
            <Link href={`/users/${u.id}`} className="px-3 py-1 bg-brand-50 text-brand-600 text-[10px] font-bold rounded-full hover:bg-brand-100 transition-colors">View</Link>
          </div>
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
        setPosts(data.posts || []);
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
              <article
                key={post.id}
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

                {/* Post Image */}
                {post.imageUrl && (
                  <div 
                    className="border-t border-b border-surface-100 relative cursor-pointer group/img"
                    onClick={() => handleDoubleTap(post)}
                  >
                    <img
                      src={post.imageUrl}
                      alt="Post"
                      className="w-full h-auto block max-h-[500px] object-cover transition-transform duration-300"
                      loading="lazy"
                    />
                    
                    {/* Floating Heart for Double Tap */}
                    {doubleTapHeart === post.id && (
                      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="white" className="drop-shadow-2xl animate-[heart-pop_0.6s_ease-out_forwards]">
                          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                        </svg>
                      </div>
                    )}
                    
                    {/* Expand icon */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); setLightboxUrl(post.imageUrl!); }}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity backdrop-blur-sm"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                    </button>
                  </div>
                )}

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
