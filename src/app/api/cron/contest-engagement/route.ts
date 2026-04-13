import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyCronSecret } from "@/lib/cron-auth";
import {
  CONTEST_EMAIL_TYPES,
  getContestLeaderboard,
  hasEngagementEmailBeenSentToday,
  getVotesTodayForPet,
  logContestEmail,
} from "@/lib/contest-growth";
import {
  sendCloseRaceAlert,
  sendNoVotesNudge,
  sendFinalHoursPush,
} from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * Evening engagement cron — runs daily at 6 PM UTC.
 * Sends 3 types of engagement emails to active contest participants:
 *
 * 1. Close Race Alert — pet is within a few votes of moving up a rank
 * 2. No Votes Nudge  — pet received 0 votes today
 * 3. Final Hours Push — contest ends tomorrow, push to buy votes
 *
 * Each email type is sent at most once per day per user per contest.
 */
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
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        },
      },
    });

    let closeRaceSent = 0;
    let noVotesSent = 0;
    let finalHoursSent = 0;

    for (const contest of contests) {
      const leaderboard = await getContestLeaderboard(contest.id);
      if (leaderboard.length < 2) continue;

      const leaderboardByPet = new Map(leaderboard.map((row) => [row.petId, row]));
      const daysLeft = Math.max(0, Math.ceil((contest.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

      for (const entry of contest.entries) {
        const userEmail = entry.pet.user.email;
        if (!userEmail) continue;

        const row = leaderboardByPet.get(entry.petId);
        if (!row) continue;

        const userName = entry.pet.user.name?.trim() || entry.pet.ownerFirstName?.trim() || entry.pet.ownerName || "friend";

        // ── 1. Final Hours Push (contest ends within ~24-36h) ──
        if (daysLeft === 1) {
          const alreadySent = await hasEngagementEmailBeenSentToday(
            contest.id,
            entry.pet.userId,
            CONTEST_EMAIL_TYPES.FINAL_HOURS_PUSH
          );
          if (!alreadySent) {
            await sendFinalHoursPush(
              userEmail,
              userName,
              entry.pet.name,
              contest.name,
              contest.id,
              row.rank,
              row.votesNeededForTop3,
              contest.prizeDescription,
            );
            await logContestEmail(contest.id, entry.pet.userId, CONTEST_EMAIL_TYPES.FINAL_HOURS_PUSH);
            finalHoursSent += 1;
            continue; // Don't send other engagement emails on final day — this one is enough
          }
        }

        // ── 2. Close Race Alert (within 1-10 votes of next rank, not #1) ──
        if (row.rank > 1) {
          const nextRank = row.rank - 1;
          const petAbove = leaderboard[nextRank - 1]; // 0-indexed
          if (petAbove) {
            const votesGap = petAbove.totalVotes - row.totalVotes + 1;
            if (votesGap >= 1 && votesGap <= 10) {
              const alreadySent = await hasEngagementEmailBeenSentToday(
                contest.id,
                entry.pet.userId,
                CONTEST_EMAIL_TYPES.CLOSE_RACE
              );
              if (!alreadySent) {
                await sendCloseRaceAlert(
                  userEmail,
                  userName,
                  entry.pet.name,
                  contest.name,
                  contest.id,
                  row.rank,
                  nextRank,
                  votesGap,
                  daysLeft,
                );
                await logContestEmail(contest.id, entry.pet.userId, CONTEST_EMAIL_TYPES.CLOSE_RACE);
                closeRaceSent += 1;
                continue; // One engagement email per user per run
              }
            }
          }
        }

        // ── 3. No Votes Nudge (0 votes today, contest has been running >1 day) ──
        if (daysLeft < Math.ceil((contest.endDate.getTime() - contest.startDate.getTime()) / (1000 * 60 * 60 * 24))) {
          const votesToday = await getVotesTodayForPet(entry.petId);
          if (votesToday === 0) {
            const alreadySent = await hasEngagementEmailBeenSentToday(
              contest.id,
              entry.pet.userId,
              CONTEST_EMAIL_TYPES.NO_VOTES_NUDGE
            );
            if (!alreadySent) {
              await sendNoVotesNudge(
                userEmail,
                userName,
                entry.pet.name,
                contest.name,
                contest.id,
                row.rank,
                row.totalVotes,
                daysLeft,
              );
              await logContestEmail(contest.id, entry.pet.userId, CONTEST_EMAIL_TYPES.NO_VOTES_NUDGE);
              noVotesSent += 1;
            }
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      contestsChecked: contests.length,
      closeRaceSent,
      noVotesSent,
      finalHoursSent,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("contest-engagement cron failed:", error);
    return NextResponse.json({ error: "Failed to process engagement emails" }, { status: 500 });
  }
}
