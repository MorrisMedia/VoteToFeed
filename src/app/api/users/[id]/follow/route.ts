import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkAndAwardBadges } from "@/lib/badges";
import { sendFollowNotification } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// POST /api/users/[id]/follow — follow a user
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const followerId = (session.user as { id: string }).id;
  const followingId = params.id;

  if (followerId === followingId) {
    return NextResponse.json(
      { error: "You cannot follow yourself" },
      { status: 400 }
    );
  }

  // Check target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: followingId },
    select: { id: true },
  });
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check if already following
  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: { followerId, followingId },
    },
  });

  if (existing) {
    return NextResponse.json({ error: "Already following" }, { status: 409 });
  }

  await prisma.follow.create({
    data: { followerId, followingId },
  });

  // Award 5 bonus free votes ONLY on first-ever follow (prevent follow/unfollow exploit)
  // Use a transaction to prevent race conditions
  const FOLLOW_BONUS_VOTES = 5;
  let bonusAwarded = 0;

  try {
    await prisma.$transaction(async (tx) => {
      // createMany with unique constraint acts as an atomic check-and-insert
      await tx.followBonusLog.create({
        data: { followerId, followingId },
      });
      await tx.user.update({
        where: { id: followerId },
        data: { freeVotesRemaining: { increment: FOLLOW_BONUS_VOTES } },
      });
      bonusAwarded = FOLLOW_BONUS_VOTES;
    });
  } catch (e: unknown) {
    // P2002 = unique constraint violation → bonus already claimed, silently skip
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002") {
      // Already claimed – no bonus
    } else {
      throw e;
    }
  }

  // Check badges for both users
  await Promise.all([
    checkAndAwardBadges(followerId),
    checkAndAwardBadges(followingId),
  ]);

  const counts = await prisma.user.findUnique({
    where: { id: followingId },
    select: { _count: { select: { followers: true } } },
  });

  // Send email notification (fire-and-forget)
  prisma.user.findUnique({
    where: { id: followerId },
    select: { name: true, image: true },
  }).then((follower) => {
    if (!follower) return;
    return prisma.user.findUnique({
      where: { id: followingId },
      select: { email: true, name: true },
    }).then((target) => {
      if (!target?.email) return;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.votetofeed.com";
      return sendFollowNotification(
        target.email,
        target.name || "there",
        follower.name || "Someone",
        follower.image,
        `${appUrl}/users/${followerId}`,
      );
    });
  }).catch((e) => console.error("[email] follow notification failed:", e));

  // Send In-App Notification (wait for it to run so it's guaranteed, but it's okay)
  const followerUser = await prisma.user.findUnique({
    where: { id: followerId },
    select: { name: true },
  });
  
  if (followerUser) {
    await createNotification({
      userId: followingId, // Send to the person being followed
      type: "FOLLOW",
      title: "New Follower!",
      message: `${followerUser.name || "Someone"} started following you.`,
      linkUrl: `/users/${followerId}`,
      sourceUserId: followerId,
    });
  }

  return NextResponse.json({
    followed: true,
    followerCount: counts?._count.followers ?? 0,
    bonusVotes: bonusAwarded,
  });
}

// DELETE /api/users/[id]/follow — unfollow a user
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const followerId = (session.user as { id: string }).id;
  const followingId = params.id;

  await prisma.follow.deleteMany({
    where: { followerId, followingId },
  });

  const counts = await prisma.user.findUnique({
    where: { id: followingId },
    select: { _count: { select: { followers: true } } },
  });

  return NextResponse.json({
    followed: false,
    followerCount: counts?._count.followers ?? 0,
  });
}
