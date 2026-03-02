import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentWeekId, getWeekDateRange } from "@/lib/utils";
import { getMealRate, getAnimalType } from "@/lib/admin-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const weekId = getCurrentWeekId();
  const { start, end } = getWeekDateRange();

  const [agg, weeklyMealsAgg, mealRate, animalType] = await Promise.all([
    prisma.petWeeklyStats.aggregate({
      where: { weekId },
      _sum: { totalVotes: true, paidVotes: true },
    }),
    // Paid purchases: meals stored at purchase time (price × mealRate)
    prisma.purchase.aggregate({
      where: { status: "COMPLETED", createdAt: { gte: start, lt: end } },
      _sum: { mealsProvided: true },
    }),
    getMealRate(),
    getAnimalType(),
  ]);

  const totalVotes = agg._sum.totalVotes ?? 0;
  const paidVotes = agg._sum.paidVotes ?? 0;
  const freeVotes = totalVotes - paidVotes;

  // Paid votes: meals already tracked via purchase.mealsProvided ($ × mealRate)
  const mealsFromPaid = Math.round(weeklyMealsAgg._sum.mealsProvided ?? 0);
  // Free votes: every 10 free votes = 1 meal
  const mealsFromFree = Math.round(freeVotes / 10);
  const mealsHelped = mealsFromPaid + mealsFromFree;

  return NextResponse.json({
    weeklyVotes: totalVotes,
    paidVotes,
    animalType,
    mealRate,
    mealsHelped,
    weekId,
  });
}
