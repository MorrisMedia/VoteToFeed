import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  CONTEST_EMAIL_TYPES,
  getContestLeaderboard,
  getWinnerEmailType,
  hasContestEmailBeenSent,
  logContestEmail,
} from "@/lib/contest-growth";
import {
  sendAlmostWonEmail,
  sendContestAddedEmail,
  sendContestWinner,
} from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/* ─── GET: available email types + recipient counts for a contest ─── */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contestId = req.nextUrl.searchParams.get("contestId");
  if (!contestId) {
    return NextResponse.json({ error: "contestId required" }, { status: 400 });
  }

  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    include: {
      prizes: { orderBy: { placement: "asc" } },
      entries: {
        include: {
          pet: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
    },
  });

  if (!contest) {
    return NextResponse.json({ error: "Contest not found" }, { status: 404 });
  }

  const hasEnded = contest.endDate < new Date();
  const daysLeft = Math.max(0, Math.ceil((contest.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const leaderboard = await getContestLeaderboard(contestId);

  // Check what's already been sent
  const sentLogs = await prisma.contestEmailLog.findMany({
    where: { contestId },
    select: { userId: true, emailType: true },
  });
  const sentSet = new Set(sentLogs.map((l) => `${l.userId}:${l.emailType}`));

  const emailTypes: Array<{
    type: string;
    label: string;
    emoji: string;
    description: string;
    totalRecipients: number;
    alreadySent: number;
    remaining: number;
    available: boolean;
  }> = [];

  // Auto-Added Notification — for active contests with entries
  if (!hasEnded && contest.entries.length > 0) {
    const withEmail = contest.entries.filter((e) => e.pet.user.email);
    const sent = withEmail.filter((e) => sentSet.has(`${e.pet.userId}:${CONTEST_EMAIL_TYPES.REENTRY}`)).length;
    emailTypes.push({
      type: "reentry",
      label: "Auto-Added Notification",
      emoji: "✅",
      description: `Tell participants they're competing in ${contest.name}`,
      totalRecipients: withEmail.length,
      alreadySent: sent,
      remaining: withEmail.length - sent,
      available: withEmail.length - sent > 0,
    });
  }

  // Winner emails — only for ended contests with prizes assigned
  if (hasEnded) {
    for (const prize of contest.prizes) {
      if (!prize.winnerId) continue;
      const entry = contest.entries.find((e) => e.petId === prize.winnerId);
      if (!entry?.pet.user.email) continue;

      const emailType = getWinnerEmailType(prize.placement);
      const already = sentSet.has(`${entry.pet.userId}:${emailType}`);
      const placementLabel = prize.placement === 0 ? "Random Winner" : prize.placement === 1 ? "1st Place" : prize.placement === 2 ? "2nd Place" : "3rd Place";
      const emoji = prize.placement === 0 ? "🎲" : prize.placement === 1 ? "🥇" : prize.placement === 2 ? "🥈" : "🥉";

      emailTypes.push({
        type: emailType,
        label: `Winner — ${placementLabel}`,
        emoji,
        description: `${entry.pet.name} → ${entry.pet.user.name || entry.pet.user.email}`,
        totalRecipients: 1,
        alreadySent: already ? 1 : 0,
        remaining: already ? 0 : 1,
        available: !already,
      });
    }

    // Almost Won — 4th-10th
    const winnerPetIds = new Set(contest.prizes.filter((p) => p.winnerId).map((p) => p.winnerId!));
    const thirdPlaceVotes = leaderboard[2]?.totalVotes ?? 0;
    const almostWonRows = leaderboard.filter(
      (row) => row.rank >= 4 && row.rank <= 10 && !winnerPetIds.has(row.petId) && row.userEmail
    );
    const almostSent = almostWonRows.filter((r) => sentSet.has(`${r.userId}:${CONTEST_EMAIL_TYPES.ALMOST_WON}`)).length;

    if (almostWonRows.length > 0) {
      emailTypes.push({
        type: "almost_won",
        label: "Almost Won",
        emoji: "😢",
        description: `Pets ranked 4th-10th who were close to winning`,
        totalRecipients: almostWonRows.length,
        alreadySent: almostSent,
        remaining: almostWonRows.length - almostSent,
        available: almostWonRows.length - almostSent > 0,
      });
    }

    // Auto-Added to next contest — non-winners in the next contest
    const nonWinnerEntries = contest.entries.filter(
      (e) => !winnerPetIds.has(e.petId) && e.pet.user.email
    );
    const reentySent = nonWinnerEntries.filter((e) => sentSet.has(`${e.pet.userId}:${CONTEST_EMAIL_TYPES.REENTRY}`)).length;
    if (nonWinnerEntries.length > 0) {
      emailTypes.push({
        type: "reentry",
        label: "Auto-Added Notification",
        emoji: "✅",
        description: `Notify non-winners they were auto-added to the next contest`,
        totalRecipients: nonWinnerEntries.length,
        alreadySent: reentySent,
        remaining: nonWinnerEntries.length - reentySent,
        available: nonWinnerEntries.length - reentySent > 0,
      });
    }
  }

  return NextResponse.json({
    contest: {
      id: contest.id,
      name: contest.name,
      hasEnded,
      daysLeft,
      entryCount: contest.entries.length,
      petType: contest.petType,
    },
    emailTypes,
  });
}

/* ─── POST: send a specific email type to a contest's participants ─── */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { contestId, emailType } = body as { contestId?: string; emailType?: string };

  if (!contestId || !emailType) {
    return NextResponse.json({ error: "contestId and emailType required" }, { status: 400 });
  }

  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    include: {
      prizes: { orderBy: { placement: "asc" } },
      entries: {
        include: {
          pet: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
    },
  });

  if (!contest) {
    return NextResponse.json({ error: "Contest not found" }, { status: 404 });
  }

  const now = new Date();
  const hasEnded = contest.endDate < now;
  const daysLeft = Math.max(0, Math.ceil((contest.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  const BATCH_DELAY = 1500;

  try {
    // ─── Winner emails ───
    if (emailType.startsWith("winner_")) {
      const placement = emailType === "winner_random" ? 0 : parseInt(emailType.split("_")[1]);
      const prize = contest.prizes.find((p) => p.placement === placement);
      if (!prize?.winnerId) {
        return NextResponse.json({ error: "No winner assigned for this placement" }, { status: 400 });
      }

      const entry = contest.entries.find((e) => e.petId === prize.winnerId);
      if (!entry?.pet.user.email) {
        return NextResponse.json({ error: "Winner has no email" }, { status: 400 });
      }

      const already = await hasContestEmailBeenSent(contestId, entry.pet.userId, emailType);
      if (already) {
        return NextResponse.json({ sent: 0, skipped: 1, failed: 0, message: "Already sent" });
      }

      await sendContestWinner(
        entry.pet.user.email,
        entry.pet.name,
        contest.name,
        prize.placement,
        prize.title,
        prize.items,
        prize.value
      );
      await logContestEmail(contestId, entry.pet.userId, emailType as any);
      sent = 1;
    }

    // ─── Almost Won emails ───
    else if (emailType === "almost_won") {
      const leaderboard = await getContestLeaderboard(contestId);
      const winnerPetIds = new Set(contest.prizes.filter((p) => p.winnerId).map((p) => p.winnerId!));
      const thirdPlaceVotes = leaderboard[2]?.totalVotes ?? 0;

      // Find next contest for the CTA
      const nextContest = await prisma.contest.findFirst({
        where: { petType: contest.petType, isActive: true, startDate: { gte: contest.endDate } },
        orderBy: { startDate: "asc" },
      });

      const almostWonRows = leaderboard.filter(
        (row) => row.rank >= 4 && row.rank <= 10 && !winnerPetIds.has(row.petId) && row.userEmail
      );

      for (const row of almostWonRows) {
        const already = await hasContestEmailBeenSent(contestId, row.userId, CONTEST_EMAIL_TYPES.ALMOST_WON);
        if (already) { skipped++; continue; }

        const votesFromTop3 = Math.max(0, thirdPlaceVotes - row.totalVotes + 1);
        if (votesFromTop3 === 0) { skipped++; continue; }

        try {
          await sendAlmostWonEmail(
            row.userEmail!,
            row.userName,
            row.petName,
            contest.name,
            row.rank,
            votesFromTop3,
            nextContest?.id || contestId,
          );
          await logContestEmail(contestId, row.userId, CONTEST_EMAIL_TYPES.ALMOST_WON);
          sent++;
          if (sent % 10 === 0) await new Promise((r) => setTimeout(r, BATCH_DELAY));
        } catch {
          failed++;
        }
      }
    }

    // ─── Auto-Added Notification (reentry) ───
    else if (emailType === "reentry") {
      const winnerPetIds = new Set(contest.prizes.filter((p) => p.winnerId).map((p) => p.winnerId!));

      // For ended contests: notify non-winners about being added to next contest
      // For active contests: notify all participants
      let targetEntries = hasEnded
        ? contest.entries.filter((e) => !winnerPetIds.has(e.petId) && e.pet.user.email)
        : contest.entries.filter((e) => e.pet.user.email);

      // Find next contest if ended
      let targetContestName = contest.name;
      let targetContestId = contest.id;

      if (hasEnded) {
        const nextContest = await prisma.contest.findFirst({
          where: { petType: contest.petType, isActive: true, startDate: { gte: contest.endDate } },
          orderBy: { startDate: "asc" },
        });
        if (nextContest) {
          targetContestName = nextContest.name;
          targetContestId = nextContest.id;
        }
      }

      const targetDaysLeft = hasEnded ? 14 : daysLeft;

      // Group by user to avoid duplicate emails
      const userEntriesMap = new Map<string, typeof targetEntries>();
      for (const entry of targetEntries) {
        const userId = entry.pet.userId;
        if (!userEntriesMap.has(userId)) userEntriesMap.set(userId, []);
        userEntriesMap.get(userId)!.push(entry);
      }

      for (const [userId, entries] of userEntriesMap) {
        const already = await hasContestEmailBeenSent(contestId, userId, CONTEST_EMAIL_TYPES.REENTRY);
        if (already) { skipped++; continue; }

        const entry = entries[0];
        try {
          await sendContestAddedEmail(
            entry.pet.user.email!,
            entry.pet.user.name?.trim() || "friend",
            entry.pet.name,
            targetContestName,
            targetContestId,
            targetDaysLeft,
          );
          await logContestEmail(contestId, userId, CONTEST_EMAIL_TYPES.REENTRY);
          sent++;
          if (sent % 10 === 0) await new Promise((r) => setTimeout(r, BATCH_DELAY));
        } catch {
          failed++;
        }
      }
    }

    else {
      return NextResponse.json({ error: `Unknown email type: ${emailType}` }, { status: 400 });
    }

    return NextResponse.json({ sent, skipped, failed });
  } catch (error) {
    console.error("contest-send error:", error);
    return NextResponse.json({ error: "Failed to send emails" }, { status: 500 });
  }
}
