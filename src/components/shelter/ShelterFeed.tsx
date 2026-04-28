"use client";

import { useState, useRef } from "react";
import Link from "next/link";

type ShelterPostData = {
  id: string;
  photos: string[];
  caption: string | null;
  location: string | null;
  author: { name: string | null; image: string | null };
  contest: { id: string; name: string; type: string; petType: string; coverImage?: string | null } | null;
};

type ContestOption = { id: string; name: string; type: string; petType: string };

type Props = {
  initialPosts: ShelterPostData[];
  isAdmin: boolean;
  contests: ContestOption[];
};

export function ShelterFeed({ initialPosts, isAdmin, contests }: Props) {
  const [posts, setPosts] = useState(initialPosts);
  const [showForm, setShowForm] = useState(false);

  function handleNewPost(post: ShelterPostData) {
    setPosts((prev) => [post, ...prev]);
    setShowForm(false);
  }

  return (
    <div>
      {/* Admin: Create post button */}
      {isAdmin && (
        <div className="mb-6">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary text-sm px-4 py-2.5 flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              Post shelter update
            </button>
          ) : (
            <PostForm
              contests={contests}
              onPost={handleNewPost}
              onCancel={() => setShowForm(false)}
            />
          )}
        </div>
      )}

      {/* Feed */}
      {posts.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-50 flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent-400"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </div>
          <p className="font-semibold text-surface-700">No shelter updates yet</p>
          <p className="text-sm text-surface-400 mt-1">Photos from shelters we support will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {posts.map((post) => (
            <ShelterPostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Single Post Card (Instagram-style) ─────────────────
function ShelterPostCard({ post }: { post: ShelterPostData }) {
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const hasMultiple = post.photos.length > 1;

  return (
    <div className="rounded-xl overflow-hidden bg-white border border-surface-200/80 shadow-sm">
      {/* Photo area */}
      <div className="relative aspect-square bg-surface-100 overflow-hidden">
        <img
          src={post.photos[currentPhoto]}
          alt={post.caption || "Shelter update"}
          className="w-full h-full object-cover"
        />

        {/* Photo navigation dots */}
        {hasMultiple && (
          <>
            {/* Left/right arrows */}
            {currentPhoto > 0 && (
              <button
                onClick={() => setCurrentPhoto((p) => p - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-sm hover:bg-black/60 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
            )}
            {currentPhoto < post.photos.length - 1 && (
              <button
                onClick={() => setCurrentPhoto((p) => p + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-sm hover:bg-black/60 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            )}
            {/* Dots */}
            <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5">
              {post.photos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPhoto(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === currentPhoto ? "bg-white w-3" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Author + Location row */}
        <div className="flex items-center gap-2 mb-2">
          {post.author.image ? (
            <img src={post.author.image} alt="" className="w-7 h-7 rounded-full object-cover" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-[10px]">
              {(post.author.name || "A")[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-surface-900 truncate">{post.author.name || "Vote to Feed"}</p>
            {post.location && (
              <p className="text-xs text-surface-400 truncate flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {post.location}
              </p>
            )}
          </div>
        </div>

        {/* Caption */}
        {post.caption && (
          <p className="text-sm text-surface-700 leading-relaxed">{post.caption}</p>
        )}

        {/* Tagged contest */}
        {post.contest && (
          <Link
            href={`/contests/${post.contest.id}`}
            className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-lg bg-surface-50 border border-surface-200/80 text-xs font-medium text-surface-600 hover:bg-surface-100 transition-colors"
          >
            <span>{post.contest.petType === "DOG" ? "🐶" : post.contest.petType === "CAT" ? "🐱" : post.contest.petType === "ALL" ? "🐶🐱" : "🐾"}</span>
            <span className="truncate max-w-[200px]">{post.contest.name}</span>
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Admin Post Form ─────────────────────────────────
function PostForm({
  contests,
  onPost,
  onCancel,
}: {
  contests: ContestOption[];
  onPost: (post: ShelterPostData) => void;
  onCancel: () => void;
}) {
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [contestId, setContestId] = useState("");
  const [photos, setPhotos] = useState<{ url: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = 10 - photos.length;
    if (remaining <= 0) { setError("Maximum 10 photos"); return; }

    const selected = Array.from(files).slice(0, remaining);
    setError("");
    setUploading(true);

    try {
      const formData = new FormData();
      selected.forEach((f) => formData.append("photos", f));
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Upload failed"); setUploading(false); return; }
      setPhotos((prev) => [
        ...prev,
        ...data.urls.map((url: string, i: number) => ({ url, name: selected[i]?.name || "Photo" })),
      ]);
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (photos.length === 0) { setError("Upload at least one photo"); return; }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/shelter-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos: photos.map((p) => p.url),
          caption: caption || undefined,
          location: location || undefined,
          contestId: contestId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to post"); setSubmitting(false); return; }
      onPost({
        id: data.id,
        photos: data.photos,
        caption: data.caption,
        location: data.location,
        author: data.author,
        contest: data.contest,
      });
    } catch {
      setError("Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4 border-brand-200 bg-brand-50/30">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-surface-900 text-sm flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-500"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          New Shelter Update
        </h3>
        <button type="button" onClick={onCancel} className="text-xs text-surface-400 hover:text-surface-600">Cancel</button>
      </div>

      {/* Photo upload */}
      <div>
        {photos.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-2 hide-scrollbar">
            {photos.map((p, i) => (
              <div key={i} className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-surface-100 group">
                <img src={p.url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}
        {photos.length < 10 && (
          <div
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
              uploading ? "border-brand-300 bg-brand-50" : "border-surface-200 hover:border-brand-300"
            }`}
          >
            <input ref={fileRef} type="file" multiple accept="image/*,.heic,.heif" onChange={handleFiles} className="hidden" />
            {uploading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
                <span className="text-xs text-brand-600">Uploading...</span>
              </div>
            ) : (
              <p className="text-xs text-surface-500">Click to add photos ({photos.length}/10)</p>
            )}
          </div>
        )}
      </div>

      {/* Caption */}
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Write a caption... What shelter was helped? What happened?"
        className="input-field resize-none text-sm"
        rows={3}
      />

      {/* Location */}
      <input
        type="text"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Shelter name or location"
        className="input-field text-sm"
      />

      {/* Tag a contest */}
      <select
        value={contestId}
        onChange={(e) => setContestId(e.target.value)}
        className="input-field text-sm"
      >
        <option value="">Tag a contest (optional)</option>
        {contests.map((c) => (
          <option key={c.id} value={c.id}>
            {c.petType === "DOG" ? "🐶" : c.petType === "CAT" ? "🐱" : c.petType === "ALL" ? "🐶🐱" : "🐾"} {c.name}
          </option>
        ))}
      </select>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button type="submit" disabled={submitting || uploading} className="btn-primary py-2 px-5 text-sm disabled:opacity-50">
        {submitting ? "Posting..." : "Post update"}
      </button>
    </form>
  );
}
