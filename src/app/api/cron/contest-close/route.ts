import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyCronSecret } from "@/lib/cron-auth";
import {
  createBiWeeklyContest,
  getContestLeaderboard,
} from "@/lib/contest-growth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  const now = new Date();

  try {
    const contests = await prisma.contest.findMany({
      where: {
        isActive: true,
        endDate: { lt: now },
      },
      include: {
        prizes: { orderBy: { placement: "asc" } },
        entries: {
          include: {
            pet: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const results: Array<Record<string, unknown>> = [];

    for (const contest of contests) {
      const leaderboard = await getContestLeaderboard(contest.id);
      const winnersByPlacement = new Map<number, string>();
      const topThreePetIds = leaderboard.slice(0, 3).map((row) => row.petId);
      const nonWinnerRows = leaderboard.filter((row) => !topThreePetIds.includes(row.petId));
      const randomWinner = nonWinnerRows.length
        ? nonWinnerRows[Math.floor(Math.random() * nonWinnerRows.length)]
        : null;

      // Assign prizes
      for (const prize of contest.prizes) {
        const winnerPetId = prize.placement === 0
          ? randomWinner?.petId
          : leaderboard[prize.placement - 1]?.petId;

        if (!winnerPetId) continue;
        winnersByPlacement.set(prize.placement, winnerPetId);

        await prisma.prize.update({
          where: { id: prize.id },
          data: {
            winnerId: winnerPetId,
            awardedAt: prize.awardedAt ?? now,
            status: prize.fulfilledAt ? "SHIPPED" : "AWARDED",
          },
        });
      }

      // Create next contest
      const nextContest = await createBiWeeklyContest(
        contest.petType as "DOG" | "CAT",
        contest.type as "NATIONAL" | "STATE" | "SEASONAL" | "BREED" | "CHARITY" | "CALENDAR"
      );
      const winnerPetIds = new Set([...winnersByPlacement.values()]);
      const nonWinnerEntries = contest.entries.filter((entry) => !winnerPetIds.has(entry.petId));

      // Auto-add non-winners to the next contest
      const autoAddData = nonWinnerEntries.map((entry) => ({
        contestId: nextContest.id,
        petId: entry.petId,
      }));
      if (autoAddData.length > 0) {
        await prisma.contestEntry.createMany({
          data: autoAddData,
          skipDuplicates: true,
        });
      }

      // Deactivate old contest
      await prisma.contest.update({
        where: { id: contest.id },
        data: { isActive: false },
      });

      results.push({
        contestId: contest.id,
        contestName: contest.name,
        closed: true,
        nextContestId: nextContest.id,
        nextContestName: nextContest.name,
        winnersAssigned: winnersByPlacement.size,
        autoAddedToNext: nonWinnerEntries.length,
        emailsNote: "No emails sent — use Admin > Emails > Contest Emails to send manually",
      });
    }

    return NextResponse.json({ ok: true, processed: results.length, results, timestamp: now.toISOString() });
  } catch (error) {
    console.error("contest-close cron failed:", error);
    return NextResponse.json({ error: "Failed to close contests" }, { status: 500 });
  }
}
