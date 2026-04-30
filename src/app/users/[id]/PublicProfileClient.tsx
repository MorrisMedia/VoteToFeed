"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FollowButton } from "@/components/shared/FollowButton";
import { BadgeGrid } from "@/components/shared/BadgeGrid";
import { FollowersList } from "@/components/shared/FollowersList";

type Badge = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  earnedAt: string;
};

type Pet = {
  id: string;
  name: string;
  type: string;
  breed: string | null;
  photos: string[];
  createdAt: string;
  totalVotes: number;
  contests: { id: string; name: string; isActive: boolean }[];
};

// A pet "group" merges clones (same name + type + first photo for the same owner)
// so a re-added pet shows as ONE card with multiple contest chips.
type PetGroup = {
  // Latest pet id (used for /pets/[id] link — points to the most recent entry)
  id: string;
  name: string;
  type: string;
  breed: string | null;
  photos: string[];
  totalVotes: number;       // summed across all clones
  petCount: number;         // number of underlying Pet records
  contests: { id: string; name: string; isActive: boolean }[]; // deduped
  // One row per underlying Pet record + the contests it's entered in
  // (used for the picker shown when a pet has multiple entries)
  entries: Array<{
    petId: string;
    totalVotes: number;
    contests: { id: string; name: string; isActive: boolean }[];
  }>;
};

type Profile = {
  id: string;
  name: string;
  image: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  createdAt: string;
  votingStreak: number;
  pets: Pet[];
  followerCount: number;
  followingCount: number;
  petCount: number;
  voteCount: number;
  badges: Badge[];
  isFollowing: boolean;
  isOwnProfile: boolean;
};

type Tab = "pets" | "badges" | "posts";

type PostComment = {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string | null; image: string | null };
  likeCount: number;
  isLiked: boolean;
};

type UserPost = {
  id: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  comments: PostComment[];
};

/**
 * Group pets that are clones of each other (same name + type + first photo).
 * A pet that's re-added to a new contest produces a clone Pet record;
 * we merge those into a single card showing combined votes and all contest chips.
 * Pets must be sorted newest-first when passed in (server returns desc).
 */
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

function groupPets(pets: Pet[]): PetGroup[] {
  const map = new Map<string, PetGroup>();
  for (const p of pets) {
    const sig = `${p.name.trim().toLowerCase()}|${p.type}|${p.photos[0] ?? ""}`;
    const entry = { petId: p.id, totalVotes: p.totalVotes, contests: p.contests };
    const existing = map.get(sig);
    if (existing) {
      existing.totalVotes += p.totalVotes;
      existing.petCount += 1;
      existing.entries.push(entry);
      for (const c of p.contests) {
        if (!existing.contests.some((x) => x.id === c.id)) existing.contests.push(c);
      }
    } else {
      map.set(sig, {
        id: p.id, // newest because input is desc
        name: p.name,
        type: p.type,
        breed: p.breed,
        photos: p.photos,
        totalVotes: p.totalVotes,
        petCount: 1,
        contests: [...p.contests],
        entries: [entry],
      });
    }
  }
  // Sort active-contest cards first, then by votes
  return Array.from(map.values()).sort((a, b) => {
    const aActive = a.contests.some((c) => c.isActive) ? 1 : 0;
    const bActive = b.contests.some((c) => c.isActive) ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    return b.totalVotes - a.totalVotes;
  });
}

export function PublicProfileClient({
  profile,
  isLoggedIn,
  currentUserId,
}: {
  profile: Profile;
  isLoggedIn: boolean;
  currentUserId?: string;
}) {
  const [tab, setTab] = useState<Tab>("posts");
  const [followerCount, setFollowerCount] = useState(profile.followerCount);
  const [showFollowers, setShowFollowers] = useState<"followers" | "following" | null>(null);

  // Group clones (e.g., "Buddy" entered in 2 contests) into one card
  const petGroups = groupPets(profile.pets);
  // Picker modal — when a grouped pet has multiple underlying records, click
  // opens this picker so the user chooses which contest entry to view.
  const [pickerGroup, setPickerGroup] = useState<PetGroup | null>(null);

  // Posts state
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [postText, setPostText] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const MAX_POST_MEDIA = 3;
  // Likes & comments state
  const [likingPost, setLikingPost] = useState<string | null>(null);
  const [likingComment, setLikingComment] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);
  const [likesModalPostId, setLikesModalPostId] = useState<string | null>(null);

  // Scroll to post from URL hash (notification deep-link)
  useEffect(() => {
    // Default tab is "posts" — load them on mount
    loadPosts();
    const hash = window.location.hash;
    if (!hash.startsWith("#post-")) return;
    const postId = hash.replace("#post-", "");
    setTab("posts");
    loadPosts().then(() => {
      setTimeout(() => {
        const el = document.getElementById(`post-${postId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-2", "ring-brand-400", "ring-offset-2");
          setTimeout(() => el.classList.remove("ring-2", "ring-brand-400", "ring-offset-2"), 3000);
        }
      }, 400);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPosts() {
    if (postsLoaded) return;
    const res = await fetch(`/api/users/${profile.id}/posts`);
    const data = await res.json();
    setPosts(data.posts || []);
    setPostsLoaded(true);
  }

  function handleTabChange(t: Tab) {
    setTab(t);
    if (t === "posts") loadPosts();
  }

  function pickMedia(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadError(null);
    const remaining = MAX_POST_MEDIA - mediaFiles.length;
    const toAdd = files.slice(0, remaining);
    if (files.length > remaining) {
      setUploadError(`Maximum ${MAX_POST_MEDIA} files per post.`);
    }
    setMediaFiles((prev) => [...prev, ...toAdd]);
    setMediaPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
    e.target.value = "";
  }

  function removeMedia(idx: number) {
    URL.revokeObjectURL(mediaPreviews[idx]);
    setMediaFiles((prev) => prev.filter((_, i) => i !== idx));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  function clearAllMedia() {
    mediaPreviews.forEach((p) => URL.revokeObjectURL(p));
    setMediaFiles([]);
    setMediaPreviews([]);
    setUploadError(null);
  }

  async function submitPost() {
    if (!postText.trim()) return;
    setPosting(true);
    setUploadError(null);
    try {
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
      const res = await fetch(`/api/users/${profile.id}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: postText.trim(), mediaUrls }),
      });
      if (res.ok) {
        const newPost = await res.json();
        setPosts((prev) => [{ ...newPost, likeCount: 0, isLiked: false, comments: [], commentCount: 0 }, ...prev]);
        setPostText("");
        clearAllMedia();
        setShowCompose(false);
      }
    } finally {
      setPosting(false);
    }
  }

  async function deletePost(postId: string) {
    const res = await fetch(`/api/users/${profile.id}/posts`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
    });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    }
  }

  async function toggleLike(postId: string) {
    if (likingPost) return;
    setLikingPost(postId);
    try {
      const res = await fetch(`/api/users/${profile.id}/posts/${postId}/like`, { method: "POST" });
      if (res.ok) {
        const { liked, likeCount } = await res.json();
        setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, isLiked: liked, likeCount } : p));
      }
    } finally {
      setLikingPost(null);
    }
  }

  async function submitComment(postId: string) {
    const text = (commentTexts[postId] || "").trim();
    if (!text || submittingComment) return;
    setSubmittingComment(postId);
    try {
      const res = await fetch(`/api/users/${profile.id}/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const comment = await res.json();
        setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comments: [...p.comments, { ...comment, likeCount: 0, isLiked: false }], commentCount: p.commentCount + 1 } : p));
        setCommentTexts((prev) => ({ ...prev, [postId]: "" }));
      }
    } finally {
      setSubmittingComment(null);
    }
  }

  async function toggleCommentLike(postId: string, commentId: string) {
    if (likingComment) return;
    setLikingComment(commentId);
    try {
      const res = await fetch(`/api/users/${profile.id}/posts/${postId}/comment/${commentId}/like`, { method: "POST" });
      if (res.ok) {
        const { liked, likeCount } = await res.json();
        setPosts((prev) => prev.map((p) =>
          p.id === postId
            ? { ...p, comments: p.comments.map((c) => c.id === commentId ? { ...c, isLiked: liked, likeCount } : c) }
            : p
        ));
      }
    } finally {
      setLikingComment(null);
    }
  }

  async function deleteComment(postId: string, commentId: string) {
    const res = await fetch(`/api/users/${profile.id}/posts/${postId}/comment`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId }),
    });
    if (res.ok) {
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comments: p.comments.filter((c) => c.id !== commentId), commentCount: Math.max(0, p.commentCount - 1) } : p));
    }
  }

  const memberSince = new Date(profile.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const location = [profile.city, profile.state, profile.country]
    .filter(Boolean)
    .join(", ");

  // Determine "level" from badge count for visual flair
  const level = profile.badges.length;
  const levelTitle = level >= 15 ? "Legend" : level >= 10 ? "Champion" : level >= 5 ? "Rising Star" : level >= 1 ? "Newcomer" : "";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 animate-profile-fade-in">
      {/* Back */}
      <Link
        href="/pets"
        className="inline-flex items-center gap-2 text-sm text-surface-400 hover:text-surface-700 transition-all mb-6 group"
      >
        <span className="w-8 h-8 rounded-full bg-white border border-surface-200 shadow-sm flex items-center justify-center group-hover:-translate-x-1 transition-transform">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </span>
        Back to pets
      </Link>

      {/* ─── Profile Header Card ─── */}
      <div className="bg-white rounded-3xl border border-surface-200/60 shadow-lg shadow-surface-200/40 overflow-hidden mb-8">
        {/* Banner with decorative pattern */}
        <div className="relative h-36 sm:h-44 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500 via-brand-400 to-rose-400" />
          <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
          {/* Floating decorative circles */}
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10 blur-sm" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/[0.07]" />
          <div className="absolute top-8 right-12 w-16 h-16 rounded-full bg-white/[0.08]" />
        </div>

        <div className="relative px-6 sm:px-8 pb-8 -mt-16 sm:-mt-20">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex items-end gap-4 sm:gap-5">
              {/* Avatar with ring */}
              <div className="relative flex-shrink-0">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 bg-gradient-to-br from-brand-400 to-rose-400 shadow-xl shadow-brand-500/20">
                  <div className="w-full h-full rounded-full border-4 border-white overflow-hidden bg-surface-100 flex items-center justify-center">
                    {profile.image ? (
                      <img
                        src={profile.image}
                        alt={profile.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl sm:text-5xl font-bold bg-gradient-to-br from-brand-500 to-brand-600 bg-clip-text text-transparent">
                        {profile.name[0]?.toUpperCase() || "?"}
                      </span>
                    )}
                  </div>
                </div>
                {/* Level badge on avatar */}
                {levelTitle && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-md whitespace-nowrap">
                    {levelTitle}
                  </span>
                )}
              </div>

              <div className="pb-1 sm:pb-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-900 tracking-tight">
                  {profile.name}
                </h1>
                {location && (
                  <p className="text-sm text-surface-500 flex items-center gap-1.5 mt-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface-400"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {location}
                  </p>
                )}
                <p className="text-xs text-surface-400 mt-1 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface-300"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Member since {memberSince}
                </p>
              </div>
            </div>

            {/* Follow / Edit */}
            <div className="sm:pb-3">
              {profile.isOwnProfile ? (
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border-2 border-surface-200 text-surface-700 hover:bg-surface-50 hover:border-surface-300 transition-all active:scale-[0.97]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit Profile
                </Link>
              ) : isLoggedIn ? (
                <FollowButton
                  userId={profile.id}
                  initialFollowing={profile.isFollowing}
                  onFollowChange={(following) => {
                    setFollowerCount((c) => c + (following ? 1 : -1));
                  }}
                />
              ) : (
                <Link
                  href={`/auth/signin?callbackUrl=/users/${profile.id}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-brand-500 to-brand-600 text-white hover:shadow-lg hover:shadow-brand-500/25 transition-all active:scale-[0.97]"
                >
                  Sign in to Follow
                </Link>
              )}
            </div>
          </div>

          {/* Badge showcase */}
          {profile.badges.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5">
              {profile.badges.slice(0, 5).map((b) => (
                <span
                  key={b.id}
                  title={b.description}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 border border-amber-200/80 shadow-sm hover:shadow-md hover:scale-105 transition-all cursor-default"
                >
                  <span className="text-sm">{b.icon}</span>
                  {b.name}
                </span>
              ))}
              {profile.badges.length > 5 && (
                <button
                  onClick={() => setTab("badges")}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-brand-600 bg-brand-50 border border-brand-200/60 hover:bg-brand-100 transition-colors"
                >
                  +{profile.badges.length - 5} more
                </button>
              )}
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-5 gap-3 mt-6 pt-6 border-t border-surface-100">
            <div className="text-center group">
              <p className="text-xl sm:text-2xl font-extrabold text-surface-900 tabular-nums">
                {profile.petCount}
              </p>
              <p className="text-[11px] font-medium text-surface-400 uppercase tracking-wider mt-0.5">Pets</p>
            </div>
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-extrabold text-surface-900 tabular-nums">
                {profile.voteCount}
              </p>
              <p className="text-[11px] font-medium text-surface-400 uppercase tracking-wider mt-0.5">Votes</p>
            </div>
            <button
              onClick={() => setShowFollowers("followers")}
              className="text-center rounded-xl py-2 -my-2 hover:bg-brand-50/50 transition-colors group"
            >
              <p className="text-xl sm:text-2xl font-extrabold text-surface-900 tabular-nums group-hover:text-brand-600 transition-colors">
                {followerCount}
              </p>
              <p className="text-[11px] font-medium text-surface-400 uppercase tracking-wider mt-0.5 group-hover:text-brand-500 transition-colors">Followers</p>
            </button>
            <button
              onClick={() => setShowFollowers("following")}
              className="text-center rounded-xl py-2 -my-2 hover:bg-brand-50/50 transition-colors group"
            >
              <p className="text-xl sm:text-2xl font-extrabold text-surface-900 tabular-nums group-hover:text-brand-600 transition-colors">
                {profile.followingCount}
              </p>
              <p className="text-[11px] font-medium text-surface-400 uppercase tracking-wider mt-0.5 group-hover:text-brand-500 transition-colors">Following</p>
            </button>
            {profile.votingStreak > 0 && (
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500 tabular-nums flex items-center justify-center gap-1">
                  <span className="animate-pulse">🔥</span> {profile.votingStreak}
                </p>
                <p className="text-[11px] font-medium text-surface-400 uppercase tracking-wider mt-0.5">Streak</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex gap-1.5 p-1.5 bg-surface-100/80 backdrop-blur-sm rounded-2xl mb-8 border border-surface-200/50">
        <button
          onClick={() => handleTabChange("pets")}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
            tab === "pets"
              ? "bg-white text-surface-900 shadow-md shadow-surface-200/50"
              : "text-surface-500 hover:text-surface-700 hover:bg-white/50"
          }`}
        >
          🐾 Pets ({petGroups.length})
        </button>
        <button
          onClick={() => handleTabChange("posts")}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
            tab === "posts"
              ? "bg-white text-surface-900 shadow-md shadow-surface-200/50"
              : "text-surface-500 hover:text-surface-700 hover:bg-white/50"
          }`}
        >
          📝 Posts
        </button>
        <button
          onClick={() => handleTabChange("badges")}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
            tab === "badges"
              ? "bg-white text-surface-900 shadow-md shadow-surface-200/50"
              : "text-surface-500 hover:text-surface-700 hover:bg-white/50"
          }`}
        >
          🏅 Badges ({profile.badges.length})
        </button>
      </div>

      {/* ─── Pets Grid ─── */}
      {tab === "pets" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {petGroups.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-surface-200/60">
              <div className="text-5xl mb-3 animate-bounce">🐾</div>
              <p className="font-bold text-surface-700 text-lg">No pets yet</p>
              <p className="text-sm text-surface-400 mt-1">This user hasn&apos;t added any pets.</p>
            </div>
          ) : (
            petGroups.map((pet, i) => {
              const activeContests = pet.contests.filter((c) => c.isActive);
              const endedContests = pet.contests.filter((c) => !c.isActive);
              const isMulti = pet.petCount > 1;
              const cardClass = "block text-left w-full bg-white rounded-2xl border border-surface-200/60 shadow-sm overflow-hidden hover:shadow-xl hover:shadow-surface-200/50 hover:-translate-y-1 transition-all duration-300 group";
              const cardInner = (
                <>
                <div className="aspect-[4/3] overflow-hidden bg-surface-100 relative">
                  {pet.photos[0] ? (
                    <img
                      src={pet.photos[0]}
                      alt={pet.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl bg-gradient-to-br from-surface-50 to-surface-100">
                      {pet.type === "DOG" ? "🐕" : pet.type === "CAT" ? "🐈" : "🐾"}
                    </div>
                  )}
                  {/* Vote count overlay */}
                  <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-brand-500"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                    <span className="text-xs font-bold text-surface-700">{pet.totalVotes}</span>
                  </div>
                  {/* Type badge */}
                  <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider">
                    {pet.type === "DOG" ? "🐕 Dog" : pet.type === "CAT" ? "🐈 Cat" : "🐾 Pet"}
                  </div>
                  {/* "Participating in N contests" pill */}
                  {activeContests.length > 0 && (
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-brand-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg flex items-center gap-1">
                      🏆 {activeContests.length === 1 ? "In contest" : `In ${activeContests.length} contests`}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-lg text-surface-900 group-hover:text-brand-600 transition-colors truncate">{pet.name}</h3>
                      {pet.breed && (
                        <p className="text-sm text-surface-400 mt-0.5 truncate">{pet.breed}</p>
                      )}
                    </div>
                    {isMulti && (
                      <span className="shrink-0 mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider border border-amber-100">
                        {pet.petCount}× entries
                      </span>
                    )}
                  </div>
                  {/* Contest chips */}
                  {(activeContests.length > 0 || endedContests.length > 0) && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {activeContests.slice(0, 2).map((c) => (
                        <span key={c.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-[11px] font-semibold border border-brand-100 max-w-full">
                          <span>🏆</span>
                          <span className="truncate">{c.name}</span>
                        </span>
                      ))}
                      {endedContests.slice(0, Math.max(0, 2 - activeContests.length)).map((c) => (
                        <span key={c.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-100 text-surface-500 text-[11px] font-semibold border border-surface-200 max-w-full">
                          <span>📋</span>
                          <span className="truncate">{c.name}</span>
                        </span>
                      ))}
                      {pet.contests.length > 2 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-surface-50 text-surface-500 text-[11px] font-semibold">
                          +{pet.contests.length - 2} more
                        </span>
                      )}
                    </div>
                  )}
                  {isMulti && (
                    <p className="mt-2 text-[11px] text-surface-400 italic">Click to choose which contest entry to view →</p>
                  )}
                </div>
                </>
              );
              return isMulti ? (
                <button
                  key={pet.id}
                  type="button"
                  onClick={() => setPickerGroup(pet)}
                  className={cardClass}
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  {cardInner}
                </button>
              ) : (
                <Link
                  key={pet.id}
                  href={`/pets/${pet.id}`}
                  className={cardClass}
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  {cardInner}
                </Link>
              );
            })
          )}
        </div>
      )}

      {/* ─── Posts Tab ─── */}
      {tab === "posts" && (
        <div className="space-y-4">
          {/* Compose box — only own profile */}
          {profile.isOwnProfile && (
            <div className="bg-white rounded-2xl border border-surface-200/60 shadow-sm overflow-hidden">
              {!showCompose ? (
                <button
                  onClick={() => setShowCompose(true)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-surface-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {profile.name[0]?.toUpperCase()}
                  </div>
                  <span className="text-surface-400 text-sm flex-1">Share something with your followers...</span>
                  <span className="text-xs font-bold text-brand-500 bg-brand-50 px-3 py-1.5 rounded-full border border-brand-200/60">+ Post</span>
                </button>
              ) : (
                <div className="p-5">
                  <textarea
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                    placeholder="Share something with your followers..."
                    rows={3}
                    maxLength={1000}
                    autoFocus
                    className="w-full resize-none text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none leading-relaxed"
                  />
                  <div className="mt-3 flex items-center gap-3 flex-wrap">
                    <label className="inline-flex items-center gap-2 cursor-pointer px-3 py-2 rounded-xl border border-surface-200 text-xs text-surface-500 hover:border-brand-400 hover:text-brand-500 transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      {mediaFiles.length > 0 ? `${mediaFiles.length}/${MAX_POST_MEDIA} added` : "Add photo / video"}
                      <input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        className="hidden"
                        onChange={pickMedia}
                        disabled={mediaFiles.length >= MAX_POST_MEDIA}
                      />
                    </label>
                    {mediaFiles.length > 0 && (
                      <button onClick={clearAllMedia} className="text-xs text-red-400 hover:text-red-600 transition-colors">Clear all</button>
                    )}
                    <span className="text-xs text-surface-400">{mediaFiles.length}/{MAX_POST_MEDIA}</span>
                  </div>
                  {uploadError && (
                    <p className="mt-2 text-xs text-red-500">{uploadError}</p>
                  )}
                  {mediaPreviews.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {mediaPreviews.map((src, i) => (
                        <div key={i} className="relative rounded-xl overflow-hidden border border-surface-200 aspect-square bg-black">
                          {isVideo(mediaFiles[i]?.name || "") ? (
                            <video src={src} className="w-full h-full object-cover" muted playsInline />
                          ) : (
                            <img src={src} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                          )}
                          <button
                            onClick={() => removeMedia(i)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center text-xs"
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-surface-100">
                    <span className="text-xs text-surface-400">{postText.length}/1000</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowCompose(false); setPostText(""); clearAllMedia(); }}
                        className="px-4 py-2 text-sm font-semibold text-surface-600 hover:bg-surface-100 rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={submitPost}
                        disabled={posting || !postText.trim()}
                        className="px-5 py-2 text-sm font-bold bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl hover:shadow-lg hover:shadow-brand-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]"
                      >
                        {posting ? (
                          <span className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Posting...
                          </span>
                        ) : "Post"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Posts feed */}
          {!postsLoaded ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-surface-200/60">
              <div className="text-5xl mb-3">📝</div>
              <p className="font-bold text-surface-700 text-lg">No posts yet</p>
              <p className="text-sm text-surface-400 mt-1">
                {profile.isOwnProfile ? "Share your first post above!" : "Nothing posted yet."}
              </p>
            </div>
          ) : (
            posts.map((post, i) => (
              <div
                key={post.id}
                id={`post-${post.id}`}
                className="bg-white rounded-2xl border border-surface-200/60 shadow-sm overflow-hidden animate-profile-slide-up transition-all"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {/* Post header */}
                <div className="flex items-center justify-between px-5 pt-4 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center flex-shrink-0">
                      {profile.image ? (
                        <img src={profile.image} alt={profile.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold bg-gradient-to-br from-brand-500 to-brand-600 bg-clip-text text-transparent">
                          {profile.name[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-surface-900">{profile.name}</p>
                      <p className="text-[11px] text-surface-400">
                        {new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  {profile.isOwnProfile && (
                    <button
                      onClick={() => deletePost(post.id)}
                      className="w-7 h-7 rounded-full hover:bg-red-50 flex items-center justify-center text-surface-300 hover:text-red-400 transition-all"
                      title="Delete post"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                    </button>
                  )}
                </div>
                {/* Content */}
                <p className="px-5 pb-3 text-sm text-surface-800 leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>
                {/* Media (photos / video — supports multi) */}
                {post.imageUrl && (() => {
                  const media = parseMedia(post.imageUrl);
                  if (media.length === 0) return null;
                  if (media.length === 1) {
                    const url = media[0];
                    return (
                      <div className="mx-5 mb-3 rounded-xl overflow-hidden border border-surface-100 bg-black">
                        {isVideo(url) ? (
                          <video src={url} className="w-full max-h-[500px] object-contain block" controls playsInline preload="metadata" />
                        ) : (
                          <img src={url} alt="Post media" className="w-full h-auto block" />
                        )}
                      </div>
                    );
                  }
                  return (
                    <div className={`mx-5 mb-3 grid gap-1 ${media.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                      {media.map((url, mi) => (
                        <div key={mi} className="relative aspect-square rounded-xl overflow-hidden border border-surface-100 bg-black">
                          {isVideo(url) ? (
                            <video src={url} className="w-full h-full object-cover" controls playsInline preload="metadata" />
                          ) : (
                            <img src={url} alt={`Post media ${mi + 1}`} className="w-full h-full object-cover" />
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
                {/* Actions: like + comment */}
                <div className="px-5 pb-4 flex items-center gap-4 border-t border-surface-100 pt-3">
                  <button
                    onClick={() => isLoggedIn ? toggleLike(post.id) : undefined}
                    disabled={likingPost === post.id || !isLoggedIn}
                    className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-all active:scale-95 ${
                      post.isLiked
                        ? "text-red-500"
                        : "text-surface-400 hover:text-red-400"
                    } disabled:opacity-50`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={post.isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                    </svg>
                  </button>
                  {post.likeCount > 0 && (
                    <button
                      onClick={() => setLikesModalPostId(post.id)}
                      className="text-sm font-semibold text-surface-500 hover:text-red-500 transition-colors -ml-1"
                    >
                      {post.likeCount}
                    </button>
                  )}
                  <button
                    onClick={() => setExpandedComments((s) => { const n = new Set(s); n.has(post.id) ? n.delete(post.id) : n.add(post.id); return n; })}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-surface-400 hover:text-brand-500 transition-colors"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                    {post.commentCount > 0 && <span>{post.commentCount}</span>}
                  </button>
                </div>
                {/* Comments section */}
                {expandedComments.has(post.id) && (
                  <div className="border-t border-surface-100 px-5 pb-4 pt-3 space-y-3">
                    {/* Comment list */}
                    {post.comments.map((c) => (
                      <div key={c.id} className="flex gap-2.5 group">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-surface-100 flex-shrink-0 flex items-center justify-center">
                          {c.user.image ? (
                            <img src={c.user.image} alt={c.user.name || ""} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-surface-500">{c.user.name?.[0]?.toUpperCase() || "?"}</span>
                          )}
                        </div>
                        <div className="flex-1 bg-surface-50 rounded-2xl px-3 py-2">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-bold text-surface-800">{c.user.name || "User"}</span>
                            <span className="text-[10px] text-surface-400">
                              {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                            {(profile.isOwnProfile || c.user.id === currentUserId) && (
                              <button
                                onClick={() => deleteComment(post.id, c.id)}
                                className="ml-auto text-[10px] text-surface-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                              >delete</button>
                            )}
                          </div>
                          <p className="text-xs text-surface-700 mt-0.5 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                          {/* Comment like */}
                          {isLoggedIn && (
                            <button
                              onClick={() => toggleCommentLike(post.id, c.id)}
                              disabled={likingComment === c.id}
                              className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold transition-all ${
                                c.isLiked ? "text-red-400" : "text-surface-300 hover:text-red-400"
                              } disabled:opacity-50`}
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill={c.isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                              </svg>
                              {c.likeCount > 0 && <span>{c.likeCount}</span>}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {/* Comment input */}
                    {isLoggedIn && (
                      <div className="flex gap-2 items-end pt-1">
                        <textarea
                          value={commentTexts[post.id] || ""}
                          onChange={(e) => setCommentTexts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(post.id); } }}
                          placeholder="Write a comment..."
                          rows={1}
                          maxLength={500}
                          className="flex-1 resize-none text-xs text-surface-900 placeholder:text-surface-400 bg-surface-50 rounded-2xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400/30 border border-transparent focus:border-brand-300 transition-colors leading-relaxed"
                        />
                        <button
                          onClick={() => submitComment(post.id)}
                          disabled={submittingComment === post.id || !(commentTexts[post.id] || "").trim()}
                          className="w-8 h-8 flex-shrink-0 bg-brand-500 text-white rounded-full flex items-center justify-center hover:bg-brand-600 transition-colors disabled:opacity-40"
                        >
                          {submittingComment === post.id ? (
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── Badges Grid ─── */}
      {tab === "badges" && <BadgeGrid badges={profile.badges} />}

      {/* ─── Followers Modal ─── */}
      {showFollowers && (
        <FollowersList
          userId={profile.id}
          type={showFollowers}
          onClose={() => setShowFollowers(null)}
        />
      )}

      {/* ─── Likes Modal ─── */}
      {likesModalPostId && (
        <LikesModal
          postId={likesModalPostId}
          postUserId={profile.id}
          onClose={() => setLikesModalPostId(null)}
        />
      )}

      {/* ─── Pet Entry Picker (multi-contest pets) ─── */}
      {pickerGroup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setPickerGroup(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-surface-100 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-lg text-surface-900 truncate">
                  {pickerGroup.name} — choose a contest entry
                </h3>
                <p className="text-xs text-surface-500 mt-0.5">
                  {(() => {
                    const total = pickerGroup.entries.reduce((s, e) => s + e.contests.length, 0) || pickerGroup.entries.length;
                    return `${pickerGroup.name} has ${total} contest ${total === 1 ? "entry" : "entries"}. Pick which one to view.`;
                  })()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickerGroup(null)}
                className="shrink-0 w-8 h-8 rounded-full hover:bg-surface-100 flex items-center justify-center text-surface-500"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-surface-100">
              {pickerGroup.entries.flatMap((entry) =>
                entry.contests.length > 0
                  ? entry.contests.map((c) => ({ contest: c, petId: entry.petId, totalVotes: entry.totalVotes }))
                  : [{ contest: null as null | { id: string; name: string; isActive: boolean }, petId: entry.petId, totalVotes: entry.totalVotes }]
              ).map((row, idx) => (
                <Link
                  key={`${row.petId}-${row.contest?.id ?? "no-contest"}-${idx}`}
                  href={`/pets/${row.petId}`}
                  onClick={() => setPickerGroup(null)}
                  className="flex items-center gap-3 p-4 hover:bg-surface-50 transition-colors"
                >
                  <div className="w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-surface-100">
                    {pickerGroup.photos[0] ? (
                      <img src={pickerGroup.photos[0]} alt={pickerGroup.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        {pickerGroup.type === "DOG" ? "🐕" : pickerGroup.type === "CAT" ? "🐈" : "🐾"}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {row.contest ? (
                        row.contest.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-[11px] font-bold border border-brand-100 max-w-full">
                            <span>🏆</span>
                            <span className="truncate">{row.contest.name}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-100 text-surface-600 text-[11px] font-bold border border-surface-200 max-w-full">
                            <span>📋</span>
                            <span className="truncate">{row.contest.name}</span>
                            <span className="opacity-60">(ended)</span>
                          </span>
                        )
                      ) : (
                        <span className="text-[11px] text-surface-400 italic">No contest</span>
                      )}
                    </div>
                    <p className="text-xs text-surface-500 mt-1">
                      {row.totalVotes} vote{row.totalVotes === 1 ? "" : "s"} in this entry
                    </p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-surface-400 shrink-0"><path d="M9 18l6-6-6-6"/></svg>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xs overflow-hidden"
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
