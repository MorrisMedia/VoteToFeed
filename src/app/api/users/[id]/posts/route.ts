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

  const body = await req.json();
  const content = (body.content || "").trim();
  if (!content) return NextResponse.json({ error: "Content required" }, { status: 400 });
  if (content.length > 1000) return NextResponse.json({ error: "Too long" }, { status: 400 });

  const post = await prisma.userPost.create({
    data: {
      content,
      imageUrl: body.imageUrl?.trim() || null,
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
