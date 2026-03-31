import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentWeekId } from "@/lib/utils";
import { getMealRate, getAnimalType } from "@/lib/admin-settings";

export const dynamic = "force-dynamic";

// GET /api/leaderboard - Get leaderboard data
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const petType = searchParams.get("type") || "DOG"; // DOG or CAT
    const state = searchParams.get("state");
    const breed = searchParams.get("breed");
    const view = searchParams.get("view") || "weekly"; // weekly or alltime
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const weekId = getCurrentWeekId();

    if (view === "weekly") {
      // Weekly leaderboard from PetWeeklyStats
      const where: Record<string, unknown> = { weekId };
      const petWhere: Record<string, unknown> = {
        isActive: true,
        type: petType,
      };
      if (state) petWhere.state = state;
      if (breed) petWhere.breed = { contains: breed, mode: "insensitive" };

      const stats = await prisma.petWeeklyStats.findMany({
        where: {
          weekId,
          pet: petWhere,
        },
        include: {
          pet: {
            include: {
              user: { select: { id: true, name: true, image: true } },
            },
          },
        },
        orderBy: { totalVotes: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      });

      const total = await prisma.petWeeklyStats.count({
        where: {
          weekId,
          pet: petWhere,
        },
      });

      // Get admin settings
      const [mealRate, animalType] = await Promise.all([
        getMealRate(),
        getAnimalType(),
      ]);

      // Calculate total votes this week for this pet type
      const weeklyAgg = await prisma.petWeeklyStats.aggregate({
        where: { weekId, pet: { type: petType as "DOG" | "CAT" } },
        _sum: { totalVotes: true, paidVotes: true },
      });

      return NextResponse.json({
        entries: stats.map((s, i) => ({
          rank: (page - 1) * limit + i + 1,
          pet: {
            id: s.pet.id,
            name: s.pet.name,
            type: s.pet.type,
            breed: s.pet.breed,
            ownerName: s.pet.ownerName,
            state: s.pet.state,
            photos: s.pet.photos,
            user: s.pet.user,
            createdAt: s.pet.createdAt,
          },
          weeklyVotes: s.totalVotes,
          isNew:
            new Date().getTime() - new Date(s.pet.createdAt).getTime() <
            7 * 24 * 60 * 60 * 1000,
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
        weekId,
        meta: {
          totalWeeklyVotes: weeklyAgg._sum.totalVotes || 0,
          totalPaidVotes: weeklyAgg._sum.paidVotes || 0,
          mealRate,
          animalType,
        },
      });
    } else {
      // All-time leaderboard
      const petWhere: Record<string, unknown> = {
        isActive: true,
        type: petType,
      };
      if (state) petWhere.state = state;
      if (breed) petWhere.breed = { contains: breed, mode: "insensitive" };

      const pets = await prisma.pet.findMany({
        where: petWhere,
        include: {
          user: { select: { id: true, name: true, image: true } },
          _count: { select: { votes: true } },
          weeklyStats: {
            where: { weekId },
            take: 1,
          },
        },
        orderBy: { votes: { _count: "desc" } },
        skip: (page - 1) * limit,
        take: limit,
      });

      const total = await prisma.pet.count({ where: petWhere });

      return NextResponse.json({
        entries: pets.map((pet, i) => ({
          rank: (page - 1) * limit + i + 1,
          pet: {
            id: pet.id,
            name: pet.name,
            type: pet.type,
            breed: pet.breed,
            ownerName: pet.ownerName,
            state: pet.state,
            photos: pet.photos,
            user: pet.user,
            createdAt: pet.createdAt,
          },
          totalVotes: pet._count.votes,
          weeklyVotes: pet.weeklyStats[0]?.totalVotes || 0,
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    }
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
