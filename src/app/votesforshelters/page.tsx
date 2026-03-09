"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ShelterPost = {
  id: string; title: string | null; featuredImage: string | null; content: string | null;
  photos: string[]; caption: string | null; videoUrl: string | null; tags: string[];
  type: string; location: string | null; isPublished: boolean; createdAt: string;
  author: { name: string | null; image: string | null };
  contest: { id: string; name: string } | null;
};

type ShelterPartner = { id: string; name: string; logoUrl: string | null; website: string | null };

const typeLabel: Record<string, string> = { UPDATE: "Update", STORY: "Story", ANNOUNCEMENT: "Announcement", GALLERY: "Gallery" };
const typeBadge: Record<string, string> = { UPDATE: "bg-blue-100 text-blue-700", STORY: "bg-purple-100 text-purple-700", ANNOUNCEMENT: "bg-red-100 text-red-700", GALLERY: "bg-emerald-100 text-emerald-700" };

function getVideoEmbedUrl(url: string): string | null {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vmMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}`;
  return null;
}

export default function VotesForSheltersPage() {
  const [posts, setPosts] = useState<ShelterPost[]>([]);
  const [partners, setPartners] = useState<ShelterPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<ShelterPost | null>(null);

  useEffect(() => {
    fetch("/api/shelter-posts").then(r => r.json()).then(d => {
      setPosts(d.posts || []);
      setPartners(d.partners || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = filter ? posts.filter(p => p.type === filter) : posts;
  const [hero, ...rest] = filtered;

  if (loading) return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
      <div className="animate-pulse text-surface-400">Loading...</div>
    </div>
  );

  // Detail view modal
  if (selectedPost) {
    const embedUrl = selectedPost.videoUrl ? getVideoEmbedUrl(selectedPost.videoUrl) : null;
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <button onClick={() => setSelectedPost(null)} className="text-sm text-brand-600 hover:underline mb-6 inline-block">← Back to all posts</button>
          {selectedPost.featuredImage && (
            <img src={selectedPost.featuredImage} alt={selectedPost.title || ""} className="w-full h-64 sm:h-80 object-cover rounded-2xl mb-6" />
          )}
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${typeBadge[selectedPost.type] || "bg-surface-100"}`}>{typeLabel[selectedPost.type] || selectedPost.type}</span>
            {selectedPost.location && <span className="text-xs text-surface-500">📍 {selectedPost.location}</span>}
            <span className="text-xs text-surface-400">{new Date(selectedPost.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 mb-4">{selectedPost.title || "(Untitled)"}</h1>
          {selectedPost.caption && <p className="text-lg text-surface-600 mb-6">{selectedPost.caption}</p>}
          {selectedPost.content && (
            <div className="prose prose-surface max-w-none text-surface-700 mb-8 whitespace-pre-wrap">
              {selectedPost.content}
            </div>
          )}
          {embedUrl && (
            <div className="aspect-video rounded-xl overflow-hidden mb-8">
              <iframe src={embedUrl} className="w-full h-full" allowFullScreen title="Video" />
            </div>
          )}
          {selectedPost.photos.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-surface-700 mb-3">Photo Gallery</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {selectedPost.photos.map((url, i) => (
                  <img key={i} src={url} alt="" className="w-full h-40 object-cover rounded-xl" />
                ))}
              </div>
            </div>
          )}
          {selectedPost.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap">{selectedPost.tags.map(t => <span key={t} className="rounded-full bg-surface-100 px-3 py-1 text-xs text-surface-600">{t}</span>)}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <nav className="mb-4"><Link href="/" className="text-sm text-brand-600 hover:underline">← Home</Link></nav>
          <h1 className="text-3xl sm:text-4xl font-bold text-surface-900 tracking-tight">Votes for Shelters</h1>
          <p className="mt-2 text-surface-500 max-w-lg mx-auto">See how your votes are making a real difference for shelter animals across the country.</p>
        </div>

        {/* Shelter Partners Strip */}
        {partners.length > 0 && (
          <div className="mb-10 pb-6 border-b border-surface-200">
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-4 text-center">Our Shelter Partners</p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {partners.map(p => (
                <a key={p.id} href={p.website || "#"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 grayscale hover:grayscale-0 transition opacity-60 hover:opacity-100" title={p.name}>
                  {p.logoUrl ? <img src={p.logoUrl} alt={p.name} className="h-10 w-auto object-contain" /> : <span className="text-sm font-medium text-surface-600">{p.name}</span>}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Type filter */}
        <div className="flex gap-2 mb-8 flex-wrap justify-center">
          <button onClick={() => setFilter(null)} className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${!filter ? "bg-brand-600 text-white" : "bg-surface-100 text-surface-600 hover:bg-surface-200"}`}>All</button>
          {(["UPDATE", "STORY", "ANNOUNCEMENT", "GALLERY"] as const).map(t => (
            <button key={t} onClick={() => setFilter(t)} className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${filter === t ? "bg-brand-600 text-white" : "bg-surface-100 text-surface-600 hover:bg-surface-200"}`}>{typeLabel[t]}</button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-surface-400 py-16">No shelter posts yet. Check back soon!</p>
        ) : (
          <>
            {/* Hero post */}
            {hero && (
              <button onClick={() => setSelectedPost(hero)} className="block w-full mb-10 text-left group">
                <div className="relative rounded-2xl overflow-hidden">
                  {hero.featuredImage ? (
                    <img src={hero.featuredImage} alt={hero.title || ""} className="w-full h-72 sm:h-96 object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-72 sm:h-96 bg-gradient-to-br from-brand-400 to-brand-700" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${typeBadge[hero.type]}`}>{typeLabel[hero.type]}</span>
                    <h2 className="text-xl sm:text-2xl font-bold text-white mt-2">{hero.title || "(Untitled)"}</h2>
                    {hero.caption && <p className="text-sm text-white/80 mt-1 line-clamp-2">{hero.caption}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-white/60">
                      {hero.location && <span>📍 {hero.location}</span>}
                      <span>{new Date(hero.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </button>
            )}

            {/* Grid of remaining posts */}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {rest.map(p => (
                  <button key={p.id} onClick={() => setSelectedPost(p)} className="block text-left group">
                    <div className="rounded-xl overflow-hidden border border-surface-200 bg-white hover:shadow-lg transition-shadow">
                      {p.featuredImage ? (
                        <img src={p.featuredImage} alt={p.title || ""} className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-40 bg-gradient-to-br from-surface-100 to-surface-200 flex items-center justify-center">
                          <span className="text-4xl">🐾</span>
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${typeBadge[p.type]}`}>{typeLabel[p.type]}</span>
                          <span className="text-[10px] text-surface-400">{new Date(p.createdAt).toLocaleDateString()}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-surface-900 line-clamp-2">{p.title || "(Untitled)"}</h3>
                        {p.caption && <p className="text-xs text-surface-500 mt-1 line-clamp-2">{p.caption}</p>}
                        {p.location && <p className="text-[10px] text-surface-400 mt-2">📍 {p.location}</p>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
