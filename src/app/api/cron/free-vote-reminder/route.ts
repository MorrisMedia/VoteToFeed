import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentWeekId } from "@/lib/utils";
import { verifyCronSecret } from "@/lib/cron-auth";
import { sendFreeVoteReminder } from "@/lib/email";
import { getAnimalType } from "@/lib/admin-settings";

export const dynamic = "force-dynamic";

// Runs mid-week (Wednesday at 5 PM UTC / 10 AM PST)
// Vercel cron: "0 17 * * 3"
//
// Targets users who:
//   1. Still have free votes remaining this week
//   2. Have NOT voted at all this week
//   3. Have NOT already received a reminder this week
//   4. Have freeVoteReminder preference = true (or no prefs row = default true)
//
// Sends at most 500 emails per run to stay within Resend rate limits.

export async function GET(req: NextRequest) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  const weekId = getCurrentWeekId();
  const animalType = await getAnimalType();

  const candidates = await prisma.user.findMany({
    where: {
      email: { not: null },
      freeVotesRemaining: { gt: 0 },
      // Has NOT voted this week
      lastVotedWeek: { not: weekId },
      // Has NOT received a reminder this week
      lastFreeVoteReminderWeek: { not: weekId },
      // Respect opt-out (if no row exists, default = send)
      OR: [
        { notifications: null },
        { notifications: { freeVoteReminder: true } },
      ],
    },
    select: {
      id: true,
      email: true,
      name: true,
      freeVotesRemaining: true,
      votingStreak: true,
    },
    take: 500,
  });

  let sent = 0;
  let failed = 0;

  for (const user of candidates) {
    if (!user.email) continue;
    try {
      const firstName = user.name?.split(" ")[0] ?? "there";
      await sendFreeVoteReminder(user.email, firstName, animalType, user.votingStreak);

      // Mark reminder sent for this week so we don't double-send
      await prisma.user.update({
        where: { id: user.id },
        data: { lastFreeVoteReminderWeek: weekId },
      });
      sent++;
    } catch (err) {
      console.error(`[free-vote-reminder] failed for user ${user.id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({
    success: true,
    weekId,
    sent,
    failed,
    skipped: candidates.length - sent - failed,
  });
}
