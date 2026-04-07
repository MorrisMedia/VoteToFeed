import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyCronSecret } from "@/lib/cron-auth";
import {
  CONTEST_EMAIL_TYPES,
  createBiWeeklyContest,
  getContestLeaderboard,
  getWinnerEmailType,
  hasContestEmailBeenSent,
  logContestEmail,
} from "@/lib/contest-growth";
import { sendAlmostWonEmail, sendContestReEntry, sendContestWinner } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  const now = new Date();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.votetofeed.com";

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

      const nextContest = await createBiWeeklyContest(
        contest.petType as "DOG" | "CAT",
        contest.type as "NATIONAL" | "STATE" | "SEASONAL" | "BREED" | "CHARITY" | "CALENDAR"
      );
      const winnerPetIds = new Set([...winnersByPlacement.values()]);
      const nonWinnerEntries = contest.entries.filter((entry) => !winnerPetIds.has(entry.petId));

      // "Almost Won" emails — send to pets ranked 4th-10th who were close to top 3
      const thirdPlaceVotes = leaderboard[2]?.totalVotes ?? 0;
      const almostWonRows = leaderboard.filter(
        (row) => row.rank >= 4 && row.rank <= 10 && !winnerPetIds.has(row.petId)
      );
      let almostWonSent = 0;
      for (const row of almostWonRows) {
        if (!row.userEmail) continue;
        const alreadySent = await hasContestEmailBeenSent(contest.id, row.userId, CONTEST_EMAIL_TYPES.ALMOST_WON);
        if (alreadySent) continue;
        const votesFromTop3 = Math.max(0, thirdPlaceVotes - row.totalVotes + 1);
        if (votesFromTop3 === 0) continue;
        await sendAlmostWonEmail(
          row.userEmail,
          row.userName,
          row.petName,
          contest.name,
          row.rank,
          votesFromTop3,
          nextContest.id,
        );
        await logContestEmail(contest.id, row.userId, CONTEST_EMAIL_TYPES.ALMOST_WON);
        almostWonSent++;
      }

      for (const entry of nonWinnerEntries) {
        await prisma.reEntryToken.create({
          data: {
            userId: entry.pet.userId,
            petId: entry.petId,
            fromContestId: contest.id,
            toContestId: nextContest.id,
            expiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
          },
        });
      }

      for (const prize of contest.prizes) {
        const winnerPetId = winnersByPlacement.get(prize.placement);
        if (!winnerPetId) continue;

        const entry = contest.entries.find((candidate) => candidate.petId === winnerPetId);
        const userEmail = entry?.pet.user.email;
        if (!entry || !userEmail) continue;

        const emailType = getWinnerEmailType(prize.placement);
        const alreadySent = await hasContestEmailBeenSent(contest.id, entry.pet.userId, emailType);
        if (alreadySent) continue;

        await sendContestWinner(
          userEmail,
          entry.pet.name,
          contest.name,
          prize.placement,
          prize.title,
          prize.items,
          prize.value
        );

        await logContestEmail(contest.id, entry.pet.userId, emailType);
      }

      const reentryTokens = await prisma.reEntryToken.findMany({
        where: {
          fromContestId: contest.id,
          toContestId: nextContest.id,
          userId: { in: nonWinnerEntries.map((entry) => entry.pet.userId) },
        },
        orderBy: { createdAt: "desc" },
      });
      const tokenByPetId = new Map(reentryTokens.map((token) => [token.petId, token]));

      for (const entry of nonWinnerEntries) {
        const userEmail = entry.pet.user.email;
        const token = tokenByPetId.get(entry.petId);
        if (!userEmail || !token) continue;

        const alreadySent = await hasContestEmailBeenSent(contest.id, entry.pet.userId, CONTEST_EMAIL_TYPES.REENTRY);
        if (alreadySent) continue;

        await sendContestReEntry(
          userEmail,
          entry.pet.user.name?.trim() || entry.pet.ownerFirstName?.trim() || entry.pet.ownerName || "friend",
          entry.pet.name,
          contest.name,
          nextContest.name,
          nextContest.id,
          token.token,
          appUrl
        );

        await logContestEmail(contest.id, entry.pet.userId, CONTEST_EMAIL_TYPES.REENTRY);
      }

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
        almostWonEmails: almostWonSent,
        reentryCount: nonWinnerEntries.length,
      });
    }

    return NextResponse.json({ ok: true, processed: results.length, results, timestamp: now.toISOString() });
  } catch (error) {
    console.error("contest-close cron failed:", error);
    return NextResponse.json({ error: "Failed to close contests" }, { status: 500 });
  }
}
