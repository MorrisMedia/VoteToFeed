import { emailShell, ctaButton, infoBox, statRow } from "@/lib/email";

export type TemplateData = {
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

export const TEMPLATE_FALLBACK: TemplateData = {
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

export function renderBuiltinTemplate(templateId: string, s: TemplateData): { subject: string; html: string } | null {
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

    /* ─────────────── FLAGSHIP ROUND EMAILS ─────────────── */

    case "qualified_top100":
      return {
        subject: `🎉 ${s.petName} made Round 2! You're in the Top 100`,
        html: emailShell(`
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:1px;">Round 2 — Top 100</p>
          <h1 style="margin:0 0 20px;font-size:28px;font-weight:900;color:#18181b;line-height:1.2;">🎉 ${s.petName} made it<br/>to Round 2!</h1>
          <p style="margin:0 0 20px;color:#52525b;font-size:16px;">Hey ${s.userName}, great news — <strong>${s.petName}</strong> survived the first cut and is now in the <strong>Top 100</strong> of <strong>${s.contestName}</strong>!</p>
          ${statRow([
            { label: "Current Rank", value: `#${s.rank}` },
            { label: "Round", value: "2 of 4" },
            { label: "Phase", value: "TOP 100" },
          ])}
          ${infoBox(`💡 <strong>Only the top 25 advance to Round 3.</strong> This is where the real competition begins — keep voting and share your pet's page to stay in the top!`)}
          ${ctaButton("Vote for " + s.petName + " Now →", `${url}/contests/${s.contestId}`, "#16a34a")}
          ${ctaButton("Buy Extra Votes — Stay in Top 25", `${url}/dashboard#votes`, "#71717a")}
        `, `${s.petName} is in the Top 100 — Round 2 of ${s.contestName}!`),
      };

    case "qualified_top25":
      return {
        subject: `🔥 ${s.petName} is in Round 3 — Top 25! Only 25 pets remain`,
        html: emailShell(`
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:1px;">Round 3 — Top 25</p>
          <h1 style="margin:0 0 20px;font-size:28px;font-weight:900;color:#18181b;line-height:1.2;">🔥 ${s.petName} made it<br/>to the Top 25!</h1>
          <p style="margin:0 0 20px;color:#52525b;font-size:16px;">Hey ${s.userName}, <strong>${s.petName}</strong> survived Round 2 and is now in the <strong>Top 25</strong> semifinalists of <strong>${s.contestName}</strong>!</p>
          ${statRow([
            { label: "Current Rank", value: `#${s.rank}` },
            { label: "Round", value: "3 of 4" },
            { label: "Gap to #1", value: `${s.votesNeededFor1st} votes` },
          ])}
          ${infoBox(`🏆 <strong>Only 5 pets advance to the Grand Finale.</strong> Push hard now — every vote counts more than ever!`, "#fffbeb", "#fde68a")}
          ${ctaButton("Vote & Advance to Finale →", `${url}/contests/${s.contestId}`, "#d97706")}
          ${ctaButton("Get Icon Pack — Maximum Votes", `${url}/dashboard#votes`, "#71717a")}
        `, `${s.petName} is in the Top 25 — round 3 of ${s.contestName}!`),
      };

    case "qualified_top5":
      return {
        subject: `🏅 ${s.petName} IS IN THE FINALE — Top 5!`,
        html: emailShell(`
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:1px;">🏅 Grand Finale</p>
          <h1 style="margin:0 0 20px;font-size:32px;font-weight:900;color:#18181b;line-height:1.2;">${s.petName} is one of<br/>5 finalists! 🏅</h1>
          <p style="margin:0 0 20px;color:#52525b;font-size:16px;">Hey ${s.userName}, <strong>${s.petName}</strong> made it to the <strong>Grand Finale</strong> of <strong>${s.contestName}</strong>! You're competing against only 4 other pets for the top prize.</p>
          ${statRow([
            { label: "Current Rank", value: `#${s.rank}` },
            { label: "Round", value: "FINALE" },
            { label: "Pets Left", value: "5" },
          ])}
          ${infoBox(`🥇 <strong>Everything is on the line.</strong> The finalists who win the most votes in this last round take home the grand prize. Give it everything you've got!`, "#faf5ff", "#c4b5fd")}
          ${ctaButton("VOTE IN THE FINALE →", `${url}/contests/${s.contestId}`, "#7c3aed")}
          ${ctaButton("Max Out Your Votes — Icon Pack", `${url}/dashboard#votes`, "#71717a")}
        `, `${s.petName} is a TOP 5 FINALIST in ${s.contestName}!`),
      };

    case "eliminated": {
      // couponCode passed via dynamic data — fall back to generic message
      const extData = s as TemplateData & { couponCode?: string; couponExpiry?: string };
      return {
        subject: `💔 ${s.petName} was eliminated — here's your 20% off coupon`,
        html: emailShell(`
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:1px;">Round Update</p>
          <h1 style="margin:0 0 20px;font-size:28px;font-weight:900;color:#18181b;line-height:1.2;">Sadly, ${s.petName}<br/>didn't advance 💔</h1>
          <p style="margin:0 0 20px;color:#52525b;font-size:16px;">Hey ${s.userName}, <strong>${s.petName}</strong> finished at <strong>#${s.rank}</strong> and didn't make the next cut in <strong>${s.contestName}</strong>. You made it this far — that's worth celebrating!</p>
          ${infoBox(`🎁 <strong>As a thank-you for competing, here's an exclusive 20% off coupon</strong> for your next vote purchase. Use it when the next contest starts!`, "#f0fdf4", "#86efac")}
          ${extData.couponCode ? `
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 20px;border:2px dashed #16a34a;border-radius:12px;background:#f0fdf4;">
            <tr><td style="padding:20px;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:1px;">Your Coupon Code</p>
              <p style="margin:0;font-size:28px;font-weight:900;color:#15803d;letter-spacing:2px;">${extData.couponCode}</p>
              ${extData.couponExpiry ? `<p style="margin:8px 0 0;font-size:12px;color:#166534;">Expires ${extData.couponExpiry}</p>` : ""}
            </td></tr>
          </table>
          ` : ""}
          ${ctaButton("Enter the Next Contest →", `${url}/contests`, "#16a34a")}
          ${ctaButton("Buy Votes (20% off) →", `${url}/dashboard#votes`, "#71717a")}
        `, `${s.petName} was eliminated — here's a 20% off coupon for you.`),
      };
    }

    case "rank_drop":
      return {
        subject: `📉 ${s.petName} dropped to #${s.rank} — act now!`,
        html: emailShell(`
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:1px;">Rank Drop Alert</p>
          <h1 style="margin:0 0 20px;font-size:28px;font-weight:900;color:#18181b;line-height:1.2;">📉 ${s.petName} just dropped<br/>to #${s.rank}</h1>
          <p style="margin:0 0 20px;color:#52525b;font-size:16px;">Hey ${s.userName}, another pet just passed <strong>${s.petName}</strong> in <strong>${s.contestName}</strong>. They're now at #${s.rank}.</p>
          ${statRow([
            { label: "New Rank", value: `#${s.rank}` },
            { label: "Votes to Climb Back", value: `${s.votesGap}` },
            { label: "Days Left", value: `${s.daysLeft}d` },
          ])}
          ${infoBox(`⚡ <strong>Don't wait — a quick vote boost can recover the rank in minutes.</strong>`, "#fef2f2", "#fca5a5")}
          ${ctaButton("Recover Rank — Vote Now", `${url}/contests/${s.contestId}`, "#dc2626")}
          ${ctaButton("Buy Votes", `${url}/dashboard#votes`, "#71717a")}
        `, `${s.petName} dropped to #${s.rank} in ${s.contestName} — recover now!`),
      };

    case "near_first":
      return {
        subject: `⭐ ${s.petName} is only ${s.votesNeededFor1st} votes from #1!`,
        html: emailShell(`
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:1px;">⭐ So Close!</p>
          <h1 style="margin:0 0 20px;font-size:28px;font-weight:900;color:#18181b;line-height:1.2;">${s.petName} is within striking<br/>distance of #1!</h1>
          <p style="margin:0 0 20px;color:#52525b;font-size:16px;">Hey ${s.userName}, <strong>${s.petName}</strong> is ranked <strong>#${s.rank}</strong> and needs just <strong>${s.votesNeededFor1st} more votes</strong> to take the lead in <strong>${s.contestName}</strong>.</p>
          ${statRow([
            { label: "Current Rank", value: `#${s.rank}` },
            { label: "Votes to #1", value: `${s.votesNeededFor1st}` },
            { label: "Days Left", value: `${s.daysLeft}d` },
          ])}
          ${infoBox(`🥇 <strong>You're this close!</strong> A single purchase could put ${s.petName} at #1. Don't leave it to chance.`, "#fffbeb", "#fde68a")}
          ${ctaButton("Take the Lead — Buy Votes", `${url}/dashboard#votes`, "#d97706")}
          ${ctaButton("Share & Get Free Votes", `${url}/contests/${s.contestId}`, "#71717a")}
        `, `${s.petName} needs only ${s.votesNeededFor1st} votes to hit #1!`),
      };

    case "round_countdown":
      return {
        subject: `⏰ ${(s as TemplateData & { hoursLeft?: number }).hoursLeft || s.daysLeft * 24}h left in this round — ${s.petName} needs votes!`,
        html: emailShell(`
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:1px;">⏰ Round Closing Soon</p>
          <h1 style="margin:0 0 20px;font-size:28px;font-weight:900;color:#18181b;line-height:1.2;">This round ends in<br/>${(s as TemplateData & { hoursLeft?: number }).hoursLeft || s.daysLeft * 24} hours!</h1>
          <p style="margin:0 0 20px;color:#52525b;font-size:16px;">Hey ${s.userName}, the current round in <strong>${s.contestName}</strong> is closing soon. <strong>${s.petName}</strong> is currently at <strong>#${s.rank}</strong>.</p>
          ${statRow([
            { label: "Current Rank", value: `#${s.rank}` },
            { label: "Hours Left", value: `${(s as TemplateData & { hoursLeft?: number }).hoursLeft || s.daysLeft * 24}h` },
            { label: "Votes to #1", value: `${s.votesNeededFor1st}` },
          ])}
          ${infoBox(`🚨 <strong>When the round closes, only the top ranked pets advance.</strong> Make sure ${s.petName} is safe!`, "#fef2f2", "#fca5a5")}
          ${ctaButton("Vote Before the Cut →", `${url}/contests/${s.contestId}`, "#d97706")}
          ${ctaButton("Buy a Vote Boost", `${url}/dashboard#votes`, "#71717a")}
        `, `Round closes in ${(s as TemplateData & { hoursLeft?: number }).hoursLeft || s.daysLeft * 24}h — ${s.petName} at #${s.rank}.`),
      };

    default:
      return null;
  }
}
