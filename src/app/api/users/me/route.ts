import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
import { getCurrentWeekId } from "@/lib/utils";
import { getMealRate, getAnimalType } from "@/lib/admin-settings";

// GET /api/users/me - Get current user's full profile
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const weekId = getCurrentWeekId();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        city: true,
        state: true,
        country: true,
        freeVotesRemaining: true,
        paidVoteBalance: true,
        votingStreak: true,
        lastVotedWeek: true,
        createdAt: true,
        pets: {
          where: { isActive: true },
          include: {
            weeklyStats: {
              where: { weekId },
              take: 1,
            },
            _count: { select: { votes: true } },
          },
        },
        purchases: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: {
          select: { pets: true, votes: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate lifetime impact
    const lifetimePurchases = await prisma.purchase.aggregate({
      where: { userId, status: "COMPLETED" },
      _sum: { mealsProvided: true, votes: true },
    });

    const [mealRate, animalType] = await Promise.all([
      getMealRate(),
      getAnimalType(),
    ]);

    return NextResponse.json({
      ...user,
      pets: user.pets.map((pet) => ({
        ...pet,
        weeklyVotes: pet.weeklyStats[0]?.totalVotes || 0,
        weeklyRank: pet.weeklyStats[0]?.rank || null,
        totalVotes: pet._count.votes,
      })),
      impact: {
        lifetimeMeals: lifetimePurchases._sum.mealsProvided || 0,
        lifetimeVotesPurchased: lifetimePurchases._sum.votes || 0,
        mealRate,
        animalType,
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
