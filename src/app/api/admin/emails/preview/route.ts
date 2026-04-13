import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getContestLeaderboard } from "@/lib/contest-growth";
import { renderBuiltinTemplate, TemplateData, TEMPLATE_FALLBACK } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

const FALLBACK = TEMPLATE_FALLBACK;

async function buildDataFromContest(contestId: string): Promise<TemplateData> {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    include: {
      prizes: { orderBy: { placement: "asc" } },
      entries: true,
    },
  });

  if (!contest) return FALLBACK;

  // Build prize description from real prizes or contest field
  let prizeDescription = contest.prizeDescription || "";
  if (!prizeDescription && contest.prizes.length > 0) {
    prizeDescription = contest.prizes
      .map((p) => {
        const place = p.placement === 1 ? "1st" : p.placement === 2 ? "2nd" : p.placement === 3 ? "3rd" : `${p.placement}th`;
        const val = p.value > 0 ? ` ($${(p.value / 100).toFixed(0)})` : "";
        return `${place} Place: ${p.title}${val}`;
      })
      .join(". ") + ".";
  }
  if (!prizeDescription) prizeDescription = FALLBACK.prizeDescription;

  // Use the real leaderboard ranking logic (same as cron emails use)
  const leaderboard = await getContestLeaderboard(contestId);

  const daysLeft = Math.max(0, Math.ceil((contest.endDate.getTime() - Date.now()) / 86400000));

  // Pick a mid-ranked entry for preview (rank ~4 is more interesting than #1)
  const sampleIdx = Math.min(3, leaderboard.length - 1);
  const sample = leaderboard[sampleIdx] || leaderboard[0];

  // Gap to the rank above
  const aboveVotes = sampleIdx > 0 ? (leaderboard[sampleIdx - 1]?.totalVotes || 0) : (sample?.totalVotes || 0);
  const votesGap = Math.max(1, aboveVotes - (sample?.totalVotes || 0) + 1);

  // Find next contest for re-entry template
  const nextContest = await prisma.contest.findFirst({
    where: { startDate: { gt: contest.endDate }, isActive: true },
    orderBy: { startDate: "asc" },
    select: { name: true },
  });

  return {
    userName: sample?.userName || FALLBACK.userName,
    petName: sample?.petName || FALLBACK.petName,
    contestName: contest.name,
    contestId: contest.id,
    rank: sample?.rank || FALLBACK.rank,
    totalEntries: contest.entries.length || FALLBACK.totalEntries,
    totalVotes: sample?.totalVotes || FALLBACK.totalVotes,
    votesNeededForTop3: sample?.votesNeededForTop3 ?? FALLBACK.votesNeededForTop3,
    votesNeededFor1st: sample?.votesNeededFor1st ?? FALLBACK.votesNeededFor1st,
    daysLeft: daysLeft || FALLBACK.daysLeft,
    votesGap,
    prizeDescription,
    nextContestName: nextContest?.name || FALLBACK.nextContestName,
  };
}

// POST /api/admin/emails/preview — render a built-in template
// Accepts: { templateId, contestId? }
// If contestId is provided, uses real contest data; otherwise uses sample data
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { templateId, contestId } = await req.json();
  if (!templateId || typeof templateId !== "string") {
    return NextResponse.json({ error: "templateId required" }, { status: 400 });
  }

  // Build data: real contest data or fallback sample
  const data = contestId
    ? await buildDataFromContest(contestId)
    : FALLBACK;

  const result = renderBuiltinTemplate(templateId, data);
  if (!result) {
    return NextResponse.json({ error: "Unknown template" }, { status: 404 });
  }

  return NextResponse.json({ ...result, contestData: { contestName: data.contestName, totalEntries: data.totalEntries, daysLeft: data.daysLeft, prizeDescription: data.prizeDescription } });
}
