import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getContestLeaderboard } from "@/lib/contest-growth";
import { emailShell, ctaButton, infoBox, statRow } from "@/lib/email";

export const dynamic = "force-dynamic";

type TemplateData = {
  userName: string;
  petName: string;
  contestName: string;
  contestId: string;
  rank: number;
  totalEntries: number;
  totalVotes: number;
  votesNeededForTop3: number;
  votesNeededFor1st: number;
  daysLeft: number;
  votesGap: number;
  prizeDescription: string;
  nextContestName: string;
};

const FALLBACK: TemplateData = {
  userName: "Sarah",
  petName: "Bella",
  contestName: "Cutest Pups of April",
  contestId: "sample-contest-id",
  rank: 4,
  totalEntries: 28,
  totalVotes: 42,
  votesNeededForTop3: 8,
  votesNeededFor1st: 23,
  daysLeft: 5,
  votesGap: 3,
  prizeDescription: "1st Place: $200 Gift Card + Premium Pet Box. 2nd Place: $100 Gift Card. 3rd Place: $50 Gift Card.",
  nextContestName: "Cutest Pups of May",
};

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

function renderBuiltinTemplate(templateId: string, s: TemplateData): { subject: string; html: string } | null {
  const url = process.env.NEXT_PUBLIC_APP_URL || "https://www.votetofeed.com";

  switch (templateId) {
    case "daily_rank":
      return {
        subject: `🔥 ${s.petName} is #${s.rank} — SO close to top 3!`,
        html: emailShell(`
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:1px;">Daily Contest Update</p>
          <h1 style="margin:0 0 20px;font-size:28px;font-weight:900;color:#18181b;line-height:1.2;">${s.petName} is almost there!</h1>
          ${statRow([
            { label: "Current Rank", value: `#${s.rank}` },
            { label: "To #1", value: `${s.votesNeededFor1st} votes` },
            { label: "Days Left", value: `${s.daysLeft}d` },
          ])}
          ${infoBox(`<strong>${s.petName} is #${s.rank}</strong> — just <strong>${s.votesNeededForTop3} vote${s.votesNeededForTop3 === 1 ? "" : "s"}</strong> from the top 3! That's totally doable today. Share the link and ask a few friends.`)}
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:20px 0;border:1px solid #c7d2fe;border-radius:12px;overflow:hidden;background:#eef2ff;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#4338ca;text-transform:uppercase;letter-spacing:0.5px;">📱 Tip of the Day</p>
              <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#312e81;">Share on Instagram Stories</p>
              <p style="margin:0;font-size:14px;color:#3730a3;line-height:1.6;">Post a cute photo of your pet with the contest link in your story. Friends swipe up → free votes!</p>
            </td></tr>
          </table>
          ${ctaButton("Vote & Share Now", `${url}/contests/${s.contestId}`)}
          ${ctaButton("Buy Votes — Jump the Ranks", `${url}/dashboard#votes`, "#71717a")}
          <p style="margin-top:20px;font-size:14px;color:#16a34a;">🐾 Every vote feeds shelter pets — win or not, you're making a difference.</p>
        `, `${s.petName} is #${s.rank} in ${s.contestName} — ${s.daysLeft}d left.`),
      };

    case "close_race":
      return {
        subject: `⚡ ${s.petName} is only ${s.votesGap} votes from #${s.rank - 1}!`,
        html: emailShell(`
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:1px;">Close Race Alert</p>
          <h1 style="margin:0 0 20px;font-size:28px;font-weight:900;color:#18181b;line-height:1.2;">Just ${s.votesGap} votes to move up! ⚡</h1>
          ${statRow([
            { label: "Current Rank", value: `#${s.rank}` },
            { label: "Next Rank", value: `#${s.rank - 1}` },
            { label: "Votes Needed", value: String(s.votesGap) },
          ])}
          ${infoBox(`<strong>${s.petName}</strong> is neck-and-neck with the pet ranked #${s.rank - 1} in <strong>${s.contestName}</strong>. Just <strong>${s.votesGap} more votes</strong> and you move up!`, "#fffbeb", "#fde68a")}
          ${ctaButton("Buy Votes & Move Up", `${url}/dashboard#votes`, "#d97706")}
          ${ctaButton("Share & Get Free Votes", `${url}/contests/${s.contestId}`, "#71717a")}
        `, `${s.petName} is only ${s.votesGap} votes from #${s.rank - 1}!`),
      };

    case "no_votes_nudge":
      return {
        subject: `😟 ${s.petName} hasn't gotten any votes today`,
        html: emailShell(`
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:1px;">Heads Up</p>
          <h1 style="margin:0 0 20px;font-size:28px;font-weight:900;color:#18181b;line-height:1.2;">${s.petName} needs some love today 😟</h1>
          <p style="margin:0 0 20px;color:#52525b;font-size:16px;">Hey ${s.userName}, <strong>${s.petName}</strong> hasn't received any new votes today in <strong>${s.contestName}</strong>. Meanwhile, other pets are climbing the ranks.</p>
          ${statRow([
            { label: "Current Rank", value: `#${s.rank}` },
            { label: "Total Votes", value: String(s.totalVotes) },
            { label: "Days Left", value: `${s.daysLeft}d` },
          ])}
          ${infoBox(`<strong>Don't let ${s.petName} fall behind!</strong> Here are 3 things you can do right now:<br/><br/>1. <strong>Share the contest link</strong> on social media<br/>2. <strong>Buy a small vote pack</strong> — even 5 votes for $0.99<br/>3. <strong>Use your free votes</strong> if you haven't already`, "#fef2f2", "#fca5a5")}
          ${ctaButton("Vote & Share Now", `${url}/contests/${s.contestId}`)}
          ${ctaButton("Buy a Quick Boost — $0.99", `${url}/dashboard#votes`, "#71717a")}
        `, `${s.petName} has 0 votes today — help them out!`),
      };

    case "final_hours_push":
      return {
        subject: `🚨 LAST CHANCE — ${s.contestName} ends tomorrow!`,
        html: emailShell(`
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:1px;">🚨 Final Hours</p>
          <h1 style="margin:0 0 20px;font-size:28px;font-weight:900;color:#18181b;line-height:1.2;">This is it — last chance<br/>for ${s.petName}!</h1>
          <p style="margin:0 0 20px;color:#52525b;font-size:16px;">Hey ${s.userName}, <strong>${s.contestName}</strong> ends <strong>tomorrow</strong>. ${s.petName} is currently ranked <strong>#${s.rank}</strong>.</p>
          ${statRow([
            { label: "Current Rank", value: `#${s.rank}` },
            { label: "To Top 3", value: `${s.votesNeededForTop3} votes` },
            { label: "Time Left", value: "~24h" },
          ])}
          ${infoBox(`<strong>${s.petName} needs ${s.votesNeededForTop3} more votes to crack the top 3.</strong> Tomorrow it'll be too late.`, "#fef2f2", "#fca5a5")}
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:20px 0;border:1px solid #fde68a;border-radius:12px;overflow:hidden;background:#fffbeb;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#b45309;text-transform:uppercase;letter-spacing:0.5px;">🎁 On The Line</p>
              <p style="margin:0;font-size:15px;color:#78350f;line-height:1.6;">${s.prizeDescription}</p>
            </td></tr>
          </table>
          ${ctaButton("Buy Votes Now — Last Chance", `${url}/dashboard#votes`, "#dc2626")}
        `, `${s.contestName} ends tomorrow — ${s.petName} is #${s.rank}.`),
      };

    case "countdown_3d":
      return {
        subject: `⏰ 3 days left — ${s.petName} needs your help!`,
        html: emailShell(`
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:1px;">⏰ Countdown</p>
          <h1 style="margin:0 0 20px;font-size:28px;font-weight:900;color:#18181b;line-height:1.2;">3 days left for<br/>${s.petName} to win! ⏰</h1>
          <p style="margin:0 0 20px;color:#52525b;font-size:16px;">Hey ${s.userName}, <strong>${s.petName}</strong> is still competing in <strong>${s.contestName}</strong> — and every vote in the final stretch counts double for momentum.</p>
          ${infoBox(`<strong>Do this right now:</strong><br/>1. Vote for ${s.petName}<br/>2. Share the link with friends & family<br/>3. Buy extra votes if you want to guarantee a top placement`, "#fef2f2", "#fca5a5")}
          ${ctaButton("Vote for " + s.petName, `${url}/contests/${s.contestId}`, "#d97706")}
          ${ctaButton("Buy Extra Votes", `${url}/dashboard#votes`, "#71717a")}
        `, `Only 3 days left — rally votes for ${s.petName}!`),
      };

    case "reentry":
      return {
        subject: `🎉 ${s.petName} is now competing in ${s.nextContestName}!`,
        html: emailShell(`
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:1px;">You're In! ✅</p>
          <h1 style="margin:0 0 20px;font-size:28px;font-weight:900;color:#18181b;line-height:1.2;">${s.petName} is competing<br/>in ${s.nextContestName}! 🎉</h1>
          <p style="margin:0 0 20px;color:#52525b;font-size:16px;">Hey ${s.userName}, great news — <strong>${s.petName}</strong> has been automatically entered into <strong>${s.nextContestName}</strong>. No action needed!</p>
          ${infoBox(`💡 <strong>Get a head start!</strong> Share ${s.petName}'s contest page and rally votes early to climb the leaderboard.`)}
          ${ctaButton("View " + s.petName + "'s Contest Page →", `${url}/contests/${s.contestId}`)}
          ${ctaButton("Buy Extra Votes →", `${url}/dashboard#votes`, "#71717a")}
        `, `${s.petName} is already in the next contest — start getting votes!`),
      };

    case "almost_won":
      return {
        subject: `😢 ${s.petName} was SO close — finished 4th, only 8 votes from Top 3`,
        html: emailShell(`
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:1px;">So Close!</p>
          <h1 style="margin:0 0 20px;font-size:28px;font-weight:900;color:#18181b;line-height:1.2;">${s.petName} finished 4th 😢<br/>Just 8 votes from winning!</h1>
          ${statRow([{ label: "Final Rank", value: "#4" }, { label: "Votes Short", value: "8" }, { label: "Next Contest", value: "LIVE NOW" }])}
          ${infoBox(`💡 <strong>Don't let it happen again.</strong> A quick boost of 30 votes for $4.99 would have changed everything. Start the next contest with an advantage.`, "#fef2f2", "#fca5a5")}
          ${ctaButton("Enter Next Contest — Win This Time", `${url}/contests/next`)}
        `, `${s.petName} was 4th — only 8 votes from Top 3.`),
      };

    case "winner_1":
      return {
        subject: `🏆 ${s.petName} WON 1st Place — $200 Prize Pack!`,
        html: emailShell(`
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#b45309;text-transform:uppercase;letter-spacing:1px;">Contest Winner</p>
          <h1 style="margin:0 0 20px;font-size:30px;font-weight:900;color:#18181b;line-height:1.2;">🏆 Congratulations!<br/>${s.petName} won 1st Place!</h1>
          ${statRow([{ label: "Prize Value", value: "$200" }, { label: "Placement", value: "1st 🥇" }])}
          <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#18181b;">Your Prize Pack Includes:</p>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 20px;">
            <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;font-size:15px;color:#3f3f46;">✅ &nbsp;$200 Gift Card</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;font-size:15px;color:#3f3f46;">✅ &nbsp;Premium Pet Box</td></tr>
            <tr><td style="padding:8px 0;font-size:15px;color:#3f3f46;">✅ &nbsp;Winner Badge on Profile</td></tr>
          </table>
          ${infoBox(`📦 <strong>Shipping & fulfillment details</strong> will be sent in a separate email within 2 business days.`, "#fff7ed", "#fdba74")}
        `, `${s.petName} won 1st place — $200 prize pack!`),
      };

    default:
      return null;
  }
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
