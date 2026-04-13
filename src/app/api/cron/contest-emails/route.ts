import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyCronSecret } from "@/lib/cron-auth";
import {
  CONTEST_EMAIL_TYPES,
  getContestLeaderboard,
  getCountdownEmailType,
  hasDailyRankEmailBeenSentToday,
  hasContestEmailBeenSent,
  isCountdownWindow,
  logContestEmail,
} from "@/lib/contest-growth";
import { sendContestCountdown, sendDailyRankEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  const now = new Date();

  try {
    const contests = await prisma.contest.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gt: now },
      },
      include: {
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

    let countdownSent = 0;
    let rankSent = 0;

    for (const contest of contests) {
      const leaderboard = await getContestLeaderboard(contest.id);
      const leaderboardByPet = new Map(leaderboard.map((row) => [row.petId, row]));

      for (const targetDays of [7, 3, 1]) {
        if (!isCountdownWindow(contest.endDate, targetDays)) continue;

        const emailType = getCountdownEmailType(targetDays);
        if (!emailType) continue;

        for (const entry of contest.entries) {
          const userEmail = entry.pet.user.email;
          if (!userEmail) continue;

          const alreadySent = await hasContestEmailBeenSent(contest.id, entry.pet.userId, emailType);
          if (alreadySent) continue;

          await sendContestCountdown(
            userEmail,
            entry.pet.user.name?.trim() || entry.pet.ownerFirstName?.trim() || entry.pet.ownerName || "friend",
            entry.pet.name,
            contest.name,
            contest.id,
            targetDays
          );

          await logContestEmail(contest.id, entry.pet.userId, emailType);
          countdownSent += 1;
        }
      }

      for (const entry of contest.entries) {
        const userEmail = entry.pet.user.email;
        if (!userEmail) continue;

        const alreadySentToday = await hasDailyRankEmailBeenSentToday(contest.id, entry.pet.userId);
        if (alreadySentToday) continue;

        const row = leaderboardByPet.get(entry.petId);
        if (!row) continue;

        const daysLeft = Math.max(0, Math.ceil((contest.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

        await sendDailyRankEmail(
          userEmail,
          row.userName,
          row.petName,
          contest.name,
          contest.id,
          row.rank,
          leaderboard.length,
          row.votesNeededForTop3,
          row.votesNeededFor1st,
          daysLeft,
          contest.prizeDescription,
        );

        await logContestEmail(contest.id, entry.pet.userId, CONTEST_EMAIL_TYPES.DAILY_RANK);
        rankSent += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      contestsChecked: contests.length,
      countdownSent,
      rankSent,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("contest-emails cron failed:", error);
    return NextResponse.json({ error: "Failed to process contest emails" }, { status: 500 });
  }
}
