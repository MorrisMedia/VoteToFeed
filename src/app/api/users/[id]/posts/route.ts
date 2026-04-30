import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/users/[id]/posts — list posts for a user
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const viewerId = session?.user ? (session.user as { id: string }).id : null;

  const posts = await prisma.userPost.findMany({
    where: { userId: params.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      _count: { select: { likes: true, comments: true } },
      likes: viewerId ? { where: { userId: viewerId }, select: { id: true } } : false,
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          user: { select: { id: true, name: true, image: true } },
          _count: { select: { likes: true } },
          likes: viewerId ? { where: { userId: viewerId }, select: { id: true } } : false,
        },
      },
    },
  });

  const result = posts.map((p) => ({
    id: p.id,
    content: p.content,
    imageUrl: p.imageUrl,
    createdAt: p.createdAt,
    likeCount: p._count.likes,
    commentCount: p._count.comments,
    isLiked: viewerId ? (p.likes as { id: string }[]).length > 0 : false,
    comments: p.comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      user: c.user,
      likeCount: c._count.likes,
      isLiked: viewerId ? (c.likes as { id: string }[]).length > 0 : false,
    })),
  }));

  return NextResponse.json({ posts: result });
}

// POST /api/users/[id]/posts — create a post (own profile only)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUserId = (session.user as { id: string }).id;
  if (currentUserId !== params.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  interface CreatePostBody {
    content?: unknown;
    mediaUrls?: unknown[];
    imageUrl?: unknown;
  }
  const body = (await req.json()) as CreatePostBody;
  const content = (typeof body.content === "string" ? body.content : "").trim();
  if (!content) return NextResponse.json({ error: "Content required" }, { status: 400 });
  if (content.length > 1000) return NextResponse.json({ error: "Too long" }, { status: 400 });

  // Only allow URLs that originate from this project's own blob storage (prevent URL injection)
  const BLOB_PREFIX = (process.env.BLOB_BASE_URL ?? "https://public.blob.vercel-storage.com").replace(/\/+$/, "");

  // Support mediaUrls[] (multi-image/video) stored as JSON, or single imageUrl for compat
  let imageUrl: string | null = null;
  if (Array.isArray(body.mediaUrls) && body.mediaUrls.length > 0) {
    const urls = (body.mediaUrls as unknown[])
      .filter((u): u is string => typeof u === "string" && u.trim().startsWith(BLOB_PREFIX))
      .slice(0, 3);
    imageUrl = urls.length === 1 ? urls[0] : urls.length > 1 ? JSON.stringify(urls) : null;
  } else if (typeof body.imageUrl === "string" && body.imageUrl.trim().startsWith(BLOB_PREFIX)) {
    imageUrl = body.imageUrl.trim();
  }

  const post = await prisma.userPost.create({
    data: {
      content,
      imageUrl,
      userId: currentUserId,
    },
    select: { id: true, content: true, imageUrl: true, createdAt: true },
  });

  return NextResponse.json(post, { status: 201 });
}

// DELETE /api/users/[id]/posts — delete a post (own profile only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUserId = (session.user as { id: string }).id;
  if (currentUserId !== params.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { postId } = await req.json();
  await prisma.userPost.deleteMany({ where: { id: postId, userId: currentUserId } });

  return NextResponse.json({ ok: true });
}
