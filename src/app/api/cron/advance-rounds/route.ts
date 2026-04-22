import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { renderBuiltinTemplate } from "@/lib/email-templates";
import type { TemplateData } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

/**
 * POST /api/cron/advance-rounds
 * Runs hourly (Vercel cron). Checks all FLAGSHIP contests and advances phases
 * when their scheduled round dates have passed.
 *
 * Phase order:
 *   OPEN → TOP100 (cuts to top 100)  — triggered by round2StartDate
 *   TOP100 → TOP25 (cuts to top 25)  — triggered by round3StartDate
 *   TOP25 → TOP5 (cuts to top 5)     — triggered by finaleStartDate
 *   TOP5 → ENDED                      — triggered by endDate
 */
export async function POST(req: NextRequest) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  const now = new Date();
  const results: { contestId: string; name: string; action: string }[] = [];

  try {
    // Fetch all active FLAGSHIP contests that haven't ended yet
    const flagshipContests = await prisma.contest.findMany({
      where: {
        type: "FLAGSHIP",
        isActive: true,
        endDate: { gte: now },
      },
      select: {
        id: true,
        name: true,
        currentPhase: true,
        round2StartDate: true,
        round3StartDate: true,
        finaleStartDate: true,
        endDate: true,
        top100CutSize: true,
        top25CutSize: true,
        top5CutSize: true,
      },
    });

    for (const contest of flagshipContests) {
      // Check each transition in reverse priority (so we don't double-advance)
      if (
        contest.currentPhase === "TOP25" &&
        contest.finaleStartDate &&
        contest.finaleStartDate <= now
      ) {
        await advancePhase(contest.id, "TOP5", contest.top5CutSize, "TOP25");
        await sendRoundEmails(contest.id, "qualified_top5", "eliminated");
        results.push({ contestId: contest.id, name: contest.name, action: "TOP25 → TOP5" });
      } else if (
        contest.currentPhase === "TOP100" &&
        contest.round3StartDate &&
        contest.round3StartDate <= now
      ) {
        await advancePhase(contest.id, "TOP25", contest.top25CutSize, "TOP100");
        await sendRoundEmails(contest.id, "qualified_top25", "eliminated");
        results.push({ contestId: contest.id, name: contest.name, action: "TOP100 → TOP25" });
      } else if (
        contest.currentPhase === "OPEN" &&
        contest.round2StartDate &&
        contest.round2StartDate <= now
      ) {
        await advancePhase(contest.id, "TOP100", contest.top100CutSize, "OPEN");
        await sendRoundEmails(contest.id, "qualified_top100", "eliminated");
        results.push({ contestId: contest.id, name: contest.name, action: "OPEN → TOP100" });
      }
    }

    return NextResponse.json({
      ok: true,
      processed: flagshipContests.length,
      advanced: results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[advance-rounds] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Mark entries outside the top N as eliminated, then update contest phase.
 */
async function advancePhase(
  contestId: string,
  newPhase: string,
  keepCount: number,
  fromPhase: string
) {
  // Get all non-eliminated entries ordered by votes desc
  const entries = await prisma.contestEntry.findMany({
    where: { contestId, isEliminated: false },
    orderBy: { votes: "desc" },
    select: { id: true },
  });

  // Entries that survive (top N)
  const survivorIds = new Set(entries.slice(0, keepCount).map((e) => e.id));
  const eliminatedIds = entries
    .slice(keepCount)
    .map((e) => e.id);

  const roundNumber = phaseToRoundNumber(newPhase);

  if (eliminatedIds.length > 0) {
    await prisma.contestEntry.updateMany({
      where: { id: { in: eliminatedIds } },
      data: { isEliminated: true, eliminatedAtRound: roundNumber },
    });
  }

  await prisma.contest.update({
    where: { id: contestId },
    data: { currentPhase: newPhase },
  });

  console.log(
    `[advance-rounds] Contest ${contestId}: ${fromPhase} → ${newPhase}. ` +
    `Kept ${survivorIds.size}, eliminated ${eliminatedIds.length}`
  );
}

function phaseToRoundNumber(phase: string): number {
  switch (phase) {
    case "TOP100": return 2;
    case "TOP25":  return 3;
    case "TOP5":   return 4;
    default:       return 1;
  }
}

/**
 * After a phase transition, email all survivors with the qualified template
 * and all eliminated entries with the eliminated template + 20% coupon.
 */
async function sendRoundEmails(
  contestId: string,
  qualifiedTemplate: string,
  eliminatedTemplate: string
) {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: { name: true, endDate: true },
  });
  if (!contest) return;

  const daysLeft = Math.max(0, Math.ceil(
    (contest.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  ));

  // Get all entries with user/pet data
  const entries = await prisma.contestEntry.findMany({
    where: { contestId },
    orderBy: { votes: "desc" },
    include: {
      pet: { select: { name: true, type: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  const firstVotes = entries[0]?.votes || 0;

  const emailPromises: Promise<unknown>[] = [];

  entries.forEach((entry, idx) => {
    if (!entry.user?.email) return;
    const rank = idx + 1;
    const s: TemplateData = {
      userName: entry.user.name || "Friend",
      petName: entry.pet.name,
      contestName: contest.name,
      contestId,
      rank,
      totalEntries: entries.length,
      totalVotes: entry.votes,
      votesNeededForTop3: Math.max(0, (entries[2]?.votes || 0) - entry.votes + 1),
      votesNeededFor1st: Math.max(0, firstVotes - entry.votes),
      daysLeft,
      votesGap: rank > 1 ? (entries[rank - 2]?.votes || 0) - entry.votes : 0,
      prizeDescription: "",
      nextContestName: contest.name,
    };

    const templateId = entry.isEliminated ? eliminatedTemplate : qualifiedTemplate;
    const rendered = renderBuiltinTemplate(templateId, s);
    if (!rendered) return;

    emailPromises.push(
      sendEmail({
        from: "VoteToFeed <noreply@votetofeed.com>",
        to: entry.user.email,
        subject: rendered.subject,
        html: rendered.html,
      }).catch((err) =>
        console.error(`[advance-rounds] email failed for entry ${entry.id}:`, err)
      )
    );
  });

  await Promise.all(emailPromises);
  console.log(`[advance-rounds] Sent ${emailPromises.length} emails for contest ${contestId}`);
}
