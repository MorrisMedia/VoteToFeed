import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/users/[id] — public profile data
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      image: true,
      city: true,
      state: true,
      country: true,
      createdAt: true,
      pets: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          type: true,
          breed: true,
          photos: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          pets: true,
          votes: true,
          followers: true,
          following: true,
        },
      },
      badges: {
        include: { badge: true },
        orderBy: { earnedAt: "desc" },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check if current user follows this user
  let isFollowing = false;
  if (currentUserId && currentUserId !== params.id) {
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: params.id,
        },
      },
    });
    isFollowing = !!follow;
  }

  return NextResponse.json({
    ...user,
    isFollowing,
    isOwnProfile: currentUserId === params.id,
  });
}
