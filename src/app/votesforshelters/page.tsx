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
const typeBadge: Record<string, string> = {
  UPDATE: "bg-blue-100 text-blue-700",
  STORY: "bg-purple-100 text-purple-700",
  ANNOUNCEMENT: "bg-red-100 text-red-700",
  GALLERY: "bg-emerald-100 text-emerald-700",
};

function getVideoEmbedUrl(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vmMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}`;
  return null;
}

/** Render text with basic markdown: **bold**, double-newline → paragraphs, single newline → <br /> */
function RichContent({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/);
  return (
    <div className="text-surface-700 leading-relaxed space-y-4">
      {paragraphs.map((para, pi) => {
        // Split by single newlines for <br /> within a paragraph
        const lines = para.split("\n");
        const rendered = lines.map((line, li) => {
          // Parse **bold**
          const parts = line.split(/(\*\*[^*]+\*\*)/g);
          return (
            <span key={li}>
              {parts.map((part, i) =>
                part.startsWith("**") && part.endsWith("**")
                  ? <strong key={i}>{part.slice(2, -2)}</strong>
                  : <span key={i}>{part}</span>
              )}
              {li < lines.length - 1 && <br />}
            </span>
          );
        });
        return <p key={pi}>{rendered}</p>;
      })}
    </div>
  );
}

/** Full blog-style post card */
function PostCard({ post }: { post: ShelterPost }) {
  const embedUrl = post.videoUrl ? getVideoEmbedUrl(post.videoUrl) : null;
  const badge = typeBadge[post.type] || "bg-surface-100 text-surface-600";
  const label = typeLabel[post.type] || post.type;
  const date = new Date(post.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <article className="bg-white rounded-2xl border border-surface-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Featured image */}
      {post.featuredImage && (
        <div className="w-full aspect-[16/7] overflow-hidden bg-surface-100">
          <img src={post.featuredImage} alt={post.title || ""} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Text block */}
      <div className="p-6 sm:p-8">
        {/* Badge + type */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badge}`}>{label}</span>
        </div>

        {/* Title */}
        {post.title && (
          <h2 className="text-xl sm:text-2xl font-bold text-surface-900 leading-tight mb-2">{post.title}</h2>
        )}

        {/* Caption / subheading */}
        {post.caption && (
          <p className="text-base text-surface-500 font-medium mb-4">{post.caption}</p>
        )}

        {/* Full content */}
        {post.content && (
          <div className="mb-6">
            <RichContent text={post.content} />
          </div>
        )}

        {/* Video embed */}
        {embedUrl && (
          <div className="aspect-video rounded-xl overflow-hidden mb-6">
            <iframe src={embedUrl} className="w-full h-full" allowFullScreen title="Video" />
          </div>
        )}

        {/* Photo gallery grid */}
        {post.photos.length > 0 && (
          <div className="mb-6">
            <div className={`grid gap-2 ${post.photos.length === 1 ? "grid-cols-1" : post.photos.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
              {post.photos.map((url, i) => (
                <img key={i} src={url} alt="" className="w-full h-40 sm:h-48 object-cover rounded-xl" />
              ))}
            </div>
          </div>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-surface-400 border-t border-surface-100 pt-4 mt-2">
          {post.location && (
            <span className="flex items-center gap-1">
              <span>📍</span>{post.location}
            </span>
          )}
          <span>{date}</span>
          {post.author?.name && (
            <span className="flex items-center gap-1">
              <span>✍️</span>{post.author.name}
            </span>
          )}
          {post.contest && (
            <span className="flex items-center gap-1 text-brand-600 font-medium">
              <span>🏆</span>{post.contest.name}
            </span>
          )}
          {post.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap ml-auto">
              {post.tags.map(t => (
                <span key={t} className="rounded-full bg-surface-100 px-2 py-0.5 text-surface-500">{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function VotesForSheltersPage() {
  const [posts, setPosts] = useState<ShelterPost[]>([]);
  const [partners, setPartners] = useState<ShelterPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/shelter-posts").then(r => r.json()).then(d => {
      setPosts(d.posts || []);
      setPartners(d.partners || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = filter ? posts.filter(p => p.type === filter) : posts;

  if (loading) return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
      <div className="animate-pulse text-surface-400">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
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

        {/* Posts feed */}
        {filtered.length === 0 ? (
          <p className="text-center text-surface-400 py-16">No shelter posts yet. Check back soon!</p>
        ) : (
          <div className="space-y-8">
            {filtered.map(post => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
