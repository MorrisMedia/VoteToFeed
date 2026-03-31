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

      if (pet.userId === userId) {
        return NextResponse.json(
          { error: "Cannot vote for your own pet" },
          { status: 400 }
        );
      }

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

      const mealRate = await getMealRate();
      const animalType = await getAnimalType();

      return NextResponse.json({
        success: true,
        vote: {
          id: vote.id,
          type: voteType,
          quantity: votesToCast,
        },
        pet: {
          weeklyVotes: updatedStats?.totalVotes || 0,
        },
        user: {
          freeVotesRemaining: updatedUser?.freeVotesRemaining || 0,
          paidVoteBalance: updatedUser?.paidVoteBalance || 0,
          votingStreak: updatedUser?.votingStreak || 0,
        },
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

    return NextResponse.json({
      success: true,
      vote: {
        type: "FREE",
        quantity: 1,
        isAnonymous: true,
      },
      pet: {
        weeklyVotes: updatedStats.totalVotes || 0,
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
