import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/feed — Returns recent posts across all users, cursor-paginated.
 * `isFollowing` flag indicates posts from users the viewer follows.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const viewerId = session?.user ? (session.user as { id: string }).id : null;

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor");
  const limit = Math.min(Number(url.searchParams.get("limit")) || 20, 50);

  // Get IDs of users the viewer follows
  let followingIds: string[] = [];
  if (viewerId) {
    const follows = await prisma.follow.findMany({
      where: { followerId: viewerId },
      select: { followingId: true },
    });
    followingIds = follows.map((f) => f.followingId);
  }

  // Build query options
  const query: Parameters<typeof prisma.userPost.findMany>[0] = {
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          city: true,
          state: true,
          _count: { select: { followers: true } },
        },
      },
      _count: { select: { likes: true, comments: true } },
      likes: viewerId
        ? { where: { userId: viewerId }, select: { id: true } }
        : false,
      comments: {
        take: 3,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, image: true } },
          _count: { select: { likes: true } },
          likes: viewerId
            ? { where: { userId: viewerId }, select: { id: true } }
            : false,
        },
      },
    },
  };

  if (cursor) {
    query.cursor = { id: cursor };
    query.skip = 1;
  }

  const posts = await prisma.userPost.findMany(query);

  // Check follow state for each post author
  const followedSet = new Set(followingIds);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = posts.map((p: any) => ({
    id: p.id,
    content: p.content,
    imageUrl: p.imageUrl,
    createdAt: p.createdAt,
    user: {
      id: p.user.id,
      name: p.user.name,
      image: p.user.image,
      city: p.user.city,
      state: p.user.state,
      followerCount: p.user._count.followers,
    },
    likeCount: p._count.likes,
    commentCount: p._count.comments,
    isLiked: viewerId ? (p.likes as { id: string }[]).length > 0 : false,
    isFollowing: followedSet.has(p.user.id),
    isOwnPost: viewerId === p.user.id,
    comments: p.comments
      .map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        user: c.user,
        likeCount: c._count.likes,
        isLiked: viewerId ? (c.likes as { id: string }[]).length > 0 : false,
      }))
      .reverse(), // Show oldest first for the preview
  }));

  const nextCursor = posts.length === limit ? posts[posts.length - 1].id : null;

  return NextResponse.json({ posts: result, nextCursor });
}
