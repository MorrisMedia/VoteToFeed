import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getCurrentWeekId } from "@/lib/utils";
import { getMealRate, getAnimalType } from "@/lib/admin-settings";
import {
  ANONYMOUS_VOTE_LIMIT,
  cleanupOldAnonymousVotes,
  getAnonymousVotesUsedThisWeek,
  getClientIp,
} from "@/lib/anonymous-votes";
import { sendBatchedVoteAlert } from "@/lib/email";
import { checkAndAwardBadges } from "@/lib/badges";

// How long (ms) before we send another vote alert for the same pet
const VOTE_ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours

/** Return total votes for a pet across the active contest period */
async function getContestTotalVotes(petId: string): Promise<number> {
  const now = new Date();
  const entry = await prisma.contestEntry.findFirst({
    where: {
      petId,
      contest: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
    },
    include: { contest: { select: { startDate: true, endDate: true } } },
    orderBy: { createdAt: "desc" },
  });
  if (!entry) return 0;
  const agg = await prisma.vote.aggregate({
    where: {
      petId,
      createdAt: { gte: entry.contest.startDate, lte: entry.contest.endDate },
    },
    _sum: { quantity: true },
  });
  // Also count anonymous votes in the same window
  const anonAgg = await prisma.anonymousVote.count({
    where: {
      petId,
      createdAt: { gte: entry.contest.startDate, lte: entry.contest.endDate },
    },
  });
  return (agg._sum.quantity ?? 0) + anonAgg;
}

async function triggerVoteAlert(petId: string, ownerId: string, ownerEmail: string, ownerName: string, weeklyVotes: number) {
  const now = new Date();
  const cooldown = await prisma.voteEmailCooldown.findUnique({
    where: { petId_ownerId: { petId, ownerId } },
  });

  if (cooldown && now.getTime() - cooldown.lastSentAt.getTime() < VOTE_ALERT_COOLDOWN_MS) {
    // Still in cooldown — just increment the pending count, no email
    await prisma.voteEmailCooldown.update({
      where: { petId_ownerId: { petId, ownerId } },
      data: { pendingCount: { increment: 1 } },
    });
    return;
  }

  // Cooldown expired (or first vote) — send email with accumulated count
  const pendingFromBefore = cooldown?.pendingCount ?? 0;
  const totalNew = pendingFromBefore + 1;

  // Reset the record
  await prisma.voteEmailCooldown.upsert({
    where: { petId_ownerId: { petId, ownerId } },
    create: { petId, ownerId, lastSentAt: now, pendingCount: 0 },
    update: { lastSentAt: now, pendingCount: 0 },
  });

  const pet = await prisma.pet.findUnique({ where: { id: petId }, select: { name: true } });
  if (!pet) return;

  // Get current weekly rank
  const weekId = getCurrentWeekId();
  const allStats = await prisma.petWeeklyStats.findMany({
    where: { weekId },
    orderBy: { totalVotes: "desc" },
    select: { petId: true },
  });
  const rank = allStats.findIndex((s) => s.petId === petId) + 1 || null;
  const ownerFirstName = ownerName?.split(" ")[0] ?? "there";

  sendBatchedVoteAlert(ownerEmail, ownerFirstName, pet.name, petId, totalNew, weeklyVotes, rank || null)
    .catch((err) => console.error("[email] batched vote alert failed:", err));
}

// POST /api/votes - Cast a vote
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { petId, quantity = 1 } = await req.json();

    if (!petId) {
      return NextResponse.json(
        { error: "Pet ID required" },
        { status: 400 }
      );
    }

    // Check pet exists and user doesn't own it
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    if (!pet || !pet.isActive) {
      return NextResponse.json({ error: "Pet not found" }, { status: 404 });
    }

    const weekId = getCurrentWeekId();
    const ip = getClientIp(req);

    // Basic abuse throttle across all vote types
    const recentVoteWindow = { gte: new Date(Date.now() - 60 * 60 * 1000) };
    const [recentVotesFromIP, recentAnonymousVotesFromIP] = await Promise.all([
      prisma.vote.count({
        where: {
          ipAddress: ip,
          createdAt: recentVoteWindow,
        },
      }),
      prisma.anonymousVote.count({
        where: {
          ipAddress: ip,
          createdAt: recentVoteWindow,
        },
      }),
    ]);

    if (recentVotesFromIP + recentAnonymousVotesFromIP > 200) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429 }
      );
    }

    // Logged-in users keep the existing free/paid vote flow.
    if (session?.user) {
      const userId = (session.user as Record<string, unknown>).id as string;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          freeVotesRemaining: true,
          paidVoteBalance: true,
          lastFreeVoteReset: true,
          votingStreak: true,
          lastVotedWeek: true,
        },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      let voteType: "FREE" | "PAID";
      let votesToCast = quantity;

      if (user.freeVotesRemaining > 0 && quantity === 1) {
        voteType = "FREE";
        votesToCast = 1;
      } else if (user.paidVoteBalance >= quantity) {
        voteType = "PAID";
      } else if (user.freeVotesRemaining > 0) {
        voteType = "FREE";
        votesToCast = 1;
      } else {
        return NextResponse.json(
          {
            error: "No votes available",
            freeVotesRemaining: 0,
            paidVoteBalance: user.paidVoteBalance,
          },
          { status: 400 }
        );
      }

      const vote = await prisma.$transaction(async (tx) => {
        if (voteType === "FREE") {
          await tx.user.update({
            where: { id: userId },
            data: {
              freeVotesRemaining: { decrement: 1 },
              lastVotedWeek: weekId,
              votingStreak:
                user.lastVotedWeek && user.lastVotedWeek !== weekId
                  ? { increment: 1 }
                  : user.votingStreak || 1,
            },
          });
        } else {
          await tx.user.update({
            where: { id: userId },
            data: {
              paidVoteBalance: { decrement: votesToCast },
              lastVotedWeek: weekId,
            },
          });
        }

        const newVote = await tx.vote.create({
          data: {
            petId,
            userId,
            voteType,
            quantity: votesToCast,
            ipAddress: ip,
            userAgent: req.headers.get("user-agent") || undefined,
            contestWeek: weekId,
          },
        });

        await tx.petWeeklyStats.upsert({
          where: { petId_weekId: { petId, weekId } },
          create: {
            petId,
            weekId,
            totalVotes: votesToCast,
            freeVotes: voteType === "FREE" ? votesToCast : 0,
            paidVotes: voteType === "PAID" ? votesToCast : 0,
          },
          update: {
            totalVotes: { increment: votesToCast },
            ...(voteType === "FREE"
              ? { freeVotes: { increment: votesToCast } }
              : { paidVotes: { increment: votesToCast } }),
          },
        });

        return newVote;
      });

      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { freeVotesRemaining: true, paidVoteBalance: true, votingStreak: true },
      });

      const updatedStats = await prisma.petWeeklyStats.findUnique({
        where: { petId_weekId: { petId, weekId } },
      });

      // ── Follower vote bonus: +1 bonus vote if voter follows the pet owner ──
      let followerBonus = 0;
      if (pet.userId !== userId) {
        const isFollowing = await prisma.follow.findUnique({
          where: {
            followerId_followingId: { followerId: userId, followingId: pet.userId },
          },
        });
        if (isFollowing) {
          followerBonus = 1;
          await prisma.$transaction(async (tx) => {
            await tx.petWeeklyStats.upsert({
              where: { petId_weekId: { petId, weekId } },
              create: { petId, weekId, totalVotes: 1, freeVotes: 1, paidVotes: 0 },
              update: { totalVotes: { increment: 1 }, freeVotes: { increment: 1 } },
            });
          });
        }
      }

      // Badge check (fire-and-forget)
      checkAndAwardBadges(userId).catch(() => {});

      const mealRate = await getMealRate();
      const animalType = await getAnimalType();

      // Get total votes across the entire contest period
      const contestTotal = await getContestTotalVotes(petId);

      // Get all-time total votes for this pet
      const [allTimeAgg, allTimeAnon] = await Promise.all([
        prisma.vote.aggregate({ where: { petId }, _sum: { quantity: true } }),
        prisma.anonymousVote.count({ where: { petId } }),
      ]);
      const allTimeTotal = (allTimeAgg._sum.quantity ?? 0) + allTimeAnon;

      // Fire-and-forget vote alert (debounced — 1 email per 6h per pet)
      if (pet.user.email && pet.userId !== userId) {
        triggerVoteAlert(
          petId,
          pet.userId,
          pet.user.email,
          pet.user.name ?? "",
          contestTotal
        );
      }

      return NextResponse.json({
        success: true,
        vote: {
          id: vote.id,
          type: voteType,
          quantity: votesToCast,
        },
        pet: {
          weeklyVotes: allTimeTotal,
        },
        user: {
          freeVotesRemaining: updatedUser?.freeVotesRemaining || 0,
          paidVoteBalance: updatedUser?.paidVoteBalance || 0,
          votingStreak: updatedUser?.votingStreak || 0,
        },
        followerBonus,
        impact: {
          animalType,
          mealRate,
        },
      });
    }

    // Anonymous users: 3 votes per week per IP.
    if (quantity !== 1) {
      return NextResponse.json(
        { error: "Anonymous votes are limited to 1 vote at a time" },
        { status: 400 }
      );
    }

    await cleanupOldAnonymousVotes();

    const anonymousVotesUsed = await getAnonymousVotesUsedThisWeek(ip);

    if (anonymousVotesUsed >= ANONYMOUS_VOTE_LIMIT) {
      return NextResponse.json(
        {
          error: "You've used your 3 free votes this week",
          remainingAnonymousVotes: 0,
        },
        { status: 429 }
      );
    }

    const updatedStats = await prisma.$transaction(async (tx) => {
      await tx.anonymousVote.create({
        data: {
          petId,
          ipAddress: ip,
          userAgent: req.headers.get("user-agent") || undefined,
          contestWeek: weekId,
        },
      });

      return tx.petWeeklyStats.upsert({
        where: { petId_weekId: { petId, weekId } },
        create: {
          petId,
          weekId,
          totalVotes: 1,
          freeVotes: 1,
          paidVotes: 0,
        },
        update: {
          totalVotes: { increment: 1 },
          freeVotes: { increment: 1 },
        },
      });
    });

    const mealRate = await getMealRate();
    const animalType = await getAnimalType();
    const remainingAnonymousVotes = Math.max(0, ANONYMOUS_VOTE_LIMIT - (anonymousVotesUsed + 1));

    // Get total votes across the entire contest period
    const contestTotal = await getContestTotalVotes(petId);

    // Get all-time total votes for this pet
    const [anonAllTimeAgg, anonAllTimeAnon] = await Promise.all([
      prisma.vote.aggregate({ where: { petId }, _sum: { quantity: true } }),
      prisma.anonymousVote.count({ where: { petId } }),
    ]);
    const anonAllTimeTotal = (anonAllTimeAgg._sum.quantity ?? 0) + anonAllTimeAnon;

    return NextResponse.json({
      success: true,
      vote: {
        type: "FREE",
        quantity: 1,
        isAnonymous: true,
      },
      pet: {
        weeklyVotes: anonAllTimeTotal,
      },
      user: {
        freeVotesRemaining: remainingAnonymousVotes,
        paidVoteBalance: 0,
        votingStreak: 0,
        isAnonymous: true,
      },
      anonymous: {
        remainingVotes: remainingAnonymousVotes,
        limit: ANONYMOUS_VOTE_LIMIT,
      },
      impact: {
        animalType,
        mealRate,
      },
    });
  } catch (error) {
    console.error("Error casting vote:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/votes - Recent vote feed
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    const votes = await prisma.vote.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { id: true, name: true, image: true } },
        pet: { select: { id: true, name: true, photos: true, type: true } },
      },
    });

    return NextResponse.json(votes);
  } catch (error) {
    console.error("Error fetching votes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
