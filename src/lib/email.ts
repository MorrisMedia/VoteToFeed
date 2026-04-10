import { Resend } from "resend";
import { rankSuffix, VOTE_PACKAGES } from "@/lib/utils";

const FROM_EMAIL = "VoteToFeed <noreply@votetofeed.com>";

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

async function sendEmail(payload: Parameters<ReturnType<typeof getResend>["emails"]["send"]>[0]) {
  const resend = getResend();
  const { data, error } = await resend.emails.send(payload);
  if (error) {
    // Log full error so it shows in Vercel logs
    console.error("[Resend] email send failed:", JSON.stringify(error));
    throw new Error(`Resend error: ${error.message ?? JSON.stringify(error)}`);
  }
  return data;
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "https://www.votetofeed.com";
}

function emailShell(content: string, preheader = "") {
  const url = appUrl();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>VoteToFeed</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌</div>` : ""}
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f4f4f5;padding:32px 16px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;">

        <!-- HEADER -->
        <tr>
          <td style="background:linear-gradient(135deg,#dc2626 0%,#ef4444 100%);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
            <p style="margin:0;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">🐾 VoteToFeed</p>
            <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.80);letter-spacing:0.3px;text-transform:uppercase;">Every vote feeds a shelter pet</p>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="background:#ffffff;padding:40px;color:#18181b;font-size:16px;line-height:1.7;">
            ${content}
          </td>
        </tr>

        <!-- DIVIDER -->
        <tr>
          <td style="background:#ffffff;padding:0 40px;">
            <div style="height:1px;background:#f1f5f9;"></div>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#ffffff;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
            <p style="margin:0 0 8px;font-size:13px;color:#71717a;">
              <a href="${url}" style="color:#ef4444;text-decoration:none;font-weight:600;">VoteToFeed</a>
              &nbsp;·&nbsp;
              <a href="${url}/privacy" style="color:#a1a1aa;text-decoration:none;">Privacy</a>
              &nbsp;·&nbsp;
              <a href="${url}/terms" style="color:#a1a1aa;text-decoration:none;">Terms</a>
            </p>
            <p style="margin:0;font-size:12px;color:#a1a1aa;">You're receiving this because you have an account on VoteToFeed.</p>
          </td>
        </tr>

        <!-- SHADOW SPACER -->
        <tr><td style="height:24px;"></td></tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function ctaButton(label: string, href: string, color = "#ef4444") {
  return `<table cellpadding="0" cellspacing="0" role="presentation" style="margin-top:20px;margin-bottom:8px;">
  <tr>
    <td style="border-radius:10px;background:${color};" bgcolor="${color}">
      <a href="${href}" target="_blank"
         style="display:inline-block;padding:14px 30px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;letter-spacing:0.1px;">
        ${label} →
      </a>
    </td>
  </tr>
</table>`;
}

function infoBox(content: string, color = "#fef2f2", border = "#fca5a5") {
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:20px 0;">
  <tr>
    <td style="background:${color};border-left:4px solid ${border};border-radius:0 8px 8px 0;padding:16px 20px;font-size:15px;line-height:1.6;color:#18181b;">
      ${content}
    </td>
  </tr>
</table>`;
}

function statRow(items: Array<{ label: string; value: string }>) {
  const cells = items.map(i => `
    <td align="center" style="padding:16px;border-right:1px solid #f1f5f9;">
      <p style="margin:0 0 4px;font-size:24px;font-weight:800;color:#ef4444;">${i.value}</p>
      <p style="margin:0;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">${i.label}</p>
    </td>
  `).join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0;border:1px solid #f1f5f9;border-radius:12px;overflow:hidden;">
  <tr>${cells}</tr>
</table>`;
}

export async function sendVoteAlert(
  to: string,
  petName: string,
  voterName: string,
  voteCount: number,
  rank: number | null,
  animalType: string,
  isPaidVote: boolean
) {
  await sendEmail({
    from: FROM_EMAIL,
    to: [to],
    subject: `🐾 ${petName} just got a new vote!`,
    html: emailShell(`
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:1px;">New Vote</p>
      <h1 style="margin:0 0 20px;font-size:28px;font-weight:900;color:#18181b;line-height:1.2;">${petName} received<br/>a new vote! 🎉</h1>
      ${infoBox(`<strong>${voterName}</strong> just voted for <strong>${petName}</strong>!${isPaidVote ? " And their vote helps feed a shelter pet. 🐾" : ""}`)}
      ${statRow([{ label: "Total Votes", value: String(voteCount) }, ...(rank ? [{ label: "Current Rank", value: `#${rank}` }] : [])])}
      ${ctaButton(`View ${petName}'s Profile`, `${appUrl()}/pets/${encodeURIComponent(petName)}`)}
    `, `${voterName} voted for ${petName} — ${voteCount} total votes!`),
  });
}

export async function sendPurchaseConfirmation(
  to: string,
  votes: number,
  amount: number,
  mealsProvided: number,
  animalType: string
) {
  await sendEmail({
    from: FROM_EMAIL,
    to: [to],
    subject: `✅ ${votes} votes added to your account!`,
    html: emailShell(`
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:1px;">Purchase Confirmed</p>
      <h1 style="margin:0 0 20px;font-size:28px;font-weight:900;color:#18181b;line-height:1.2;">${votes} votes added<br/>to your account! ✅</h1>
      ${statRow([{ label: "Votes Added", value: String(votes) }, { label: "Amount Paid", value: `$${(amount / 100).toFixed(2)}` }, { label: "Meals Provided", value: String(Math.round(mealsProvided)) }])}
      ${infoBox(`<strong>🐾 ${Math.round(mealsProvided)} shelter pets</strong> will be fed because of your vote. Thank you for making a difference!`, "#f0fdf4", "#86efac")}
      ${ctaButton("Start Voting Now", appUrl(), "#16a34a")}
    `, `${votes} votes added — you helped feed ${Math.round(mealsProvided)} shelter pets!`),
  });
}

export async function sendFreeVoteReminder(
  to: string,
  userName: string,
  animalType: string,
  streak: number
) {
  await sendEmail({
    from: FROM_EMAIL,
    to: [to],
    subject: `⏰ ${userName}, your free votes are waiting!`,
    html: emailShell(`
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:1px;">Weekly Reminder</p>
      <h1 style="margin:0 0 20px;font-size:28px;font-weight:900;color:#18181b;line-height:1.2;">Your free votes<br/>are waiting, ${userName}! ⏰</h1>
      <p style="margin:0 0 16px;color:#52525b;font-size:16px;">You still have <strong>5 free votes</strong> available this week — use them before Sunday at 11:59 PM PST or they expire.</p>
      ${streak > 0 ? infoBox(`🔥 <strong>${streak}-week streak!</strong> You're on a roll — don't break it now.`, "#fff7ed", "#fdba74") : ""}
      ${infoBox(`Each vote you cast helps feed a real shelter pet. <strong>Free votes count just as much as paid ones. 🐾</strong>`)}
      ${ctaButton("Cast My Free Votes →", appUrl())}
      <p style="margin-top:20px;font-size:13px;color:#a1a1aa;">Votes reset every Sunday. You'll get 5 fresh votes next week regardless.</p>
    `, `You have 5 free votes ready to cast this week, ${userName}!`),
  });
}

export async function sendWeeklyDigest(
  to: string,
  userName: string,
  pets: Array<{ name: string; votes: number; rank: number | null }>,
  totalMeals: number,
  animalType: string
) {
  const petRows = pets.map((p) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #f4f4f5;font-weight:600;color:#18181b;">${p.name}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #f4f4f5;color:#ef4444;font-weight:700;">${p.votes} votes</td>
      <td style="padding:12px 16px;border-bottom:1px solid #f4f4f5;color:#71717a;">${p.rank ? `#${p.rank}` : "—"}</td>
    </tr>
  `).join("");

  await sendEmail({
    from: FROM_EMAIL,
    to: [to],
    subject: `📊 Your weekly VoteToFeed summary, ${userName}`,
    html: emailShell(`
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:1px;">Weekly Summary</p>
      <h1 style="margin:0 0 20px;font-size:28px;font-weight:900;color:#18181b;line-height:1.2;">Here's how your<br/>pets did this week 📊</h1>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #f1f5f9;border-radius:12px;overflow:hidden;margin:0 0 20px;">
        <tr style="background:#fafafa;">
          <th style="padding:10px 16px;text-align:left;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #f1f5f9;">Pet</th>
          <th style="padding:10px 16px;text-align:left;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #f1f5f9;">Votes</th>
          <th style="padding:10px 16px;text-align:left;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #f1f5f9;">Rank</th>
        </tr>
        ${petRows}
      </table>
      ${infoBox(`🐾 Together, your votes helped feed <strong>${Math.round(totalMeals)} shelter pets</strong> this week. That's incredible — thank you!`, "#f0fdf4", "#86efac")}
      <p style="font-size:14px;color:#71717a;">Your 5 free votes reset <strong>Sunday at 11:59 PM PST</strong>. Don't let them go to waste.</p>
      ${ctaButton("Vote Again This Week", appUrl())}
    `, `Your weekly update — your votes fed ${Math.round(totalMeals)} shelter pets!`),
  });
}

export async function sendWinnerNotification(
  to: string,
  petName: string,
  placement: number,
  prizeValue: number,
  prizeItems: string[]
) {
  const placementLabels = ["1st Place 🥇", "2nd Place 🥈", "3rd Place 🥉"];
  const label = placementLabels[placement - 1] || `${placement}th Place`;

  await sendEmail({
    from: FROM_EMAIL,
    to: [to],
    subject: `🏆 ${petName} Won ${label} — $${(prizeValue / 100).toLocaleString()} Prize!`,
    html: emailShell(`
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#b45309;text-transform:uppercase;letter-spacing:1px;">Contest Winner</p>
      <h1 style="margin:0 0 20px;font-size:30px;font-weight:900;color:#18181b;line-height:1.2;">Congratulations! 🏆<br/>${petName} won ${label}!</h1>
      ${statRow([{ label: "Prize Value", value: `$${(prizeValue / 100).toLocaleString()}` }, { label: "Placement", value: label.split(" ")[0] + " " + label.split(" ")[1] }])}
      <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#18181b;">Your Prize Pack Includes:</p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 20px;">
        ${prizeItems.map(item => `<tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;font-size:15px;color:#3f3f46;">✅ &nbsp;${item}</td></tr>`).join("")}
      </table>
      ${infoBox(`📦 <strong>Shipping & fulfillment details</strong> will be sent in a separate email within 2 business days. Expect delivery in <strong>2–4 weeks</strong>.`, "#fff7ed", "#fdba74")}
    `, `${petName} won ${label} — $${(prizeValue / 100).toLocaleString()} prize pack!`),
  });
}

export async function sendContestCountdown(
  to: string,
  userName: string,
  petName: string,
  contestName: string,
  contestId: string,
  daysLeft: number
) {
  const urgencyColor = daysLeft <= 1 ? "#dc2626" : daysLeft <= 3 ? "#d97706" : "#ef4444";
  await sendEmail({
    from: FROM_EMAIL,
    to: [to],
    subject: `⏰ ${daysLeft} day${daysLeft === 1 ? "" : "s"} left — ${petName} needs your help!`,
    html: emailShell(`
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:${urgencyColor};text-transform:uppercase;letter-spacing:1px;">${daysLeft <= 1 ? "🚨 Final Hours" : "⏰ Countdown"}</p>
      <h1 style="margin:0 0 20px;font-size:28px;font-weight:900;color:#18181b;line-height:1.2;">${daysLeft} day${daysLeft === 1 ? "" : "s"} left for<br/>${petName} to win! ⏰</h1>
      <p style="margin:0 0 20px;color:#52525b;font-size:16px;">Hey ${userName}, <strong>${petName}</strong> is still competing in <strong>${contestName}</strong> — and every vote in the final stretch counts double for momentum.</p>
      ${infoBox(`<strong>Do this right now:</strong><br/>1. Vote for ${petName}<br/>2. Share the link with friends & family<br/>3. Buy extra votes if you want to guarantee a top placement`, "#fef2f2", "#fca5a5")}
      ${ctaButton("Vote for " + petName, `${appUrl()}/contests/${contestId}`, urgencyColor)}
      ${ctaButton("Buy Extra Votes", appUrl(), "#71717a")}
      <p style="margin-top:20px;font-size:14px;color:#16a34a;">🐾 Every paid vote helps feed a shelter pet in need.</p>
    `, `Only ${daysLeft} day${daysLeft === 1 ? "" : "s"} left — rally votes for ${petName} in ${contestName}!`),
  });
}

export async function sendDailyRankEmail(
  to: string,
  userName: string,
  petName: string,
  contestName: string,
  contestId: string,
  rank: number,
  totalEntries: number,
  votesNeededForTop3: number
) {
  const isTop3 = votesNeededForTop3 <= 0;
  await sendEmail({
    from: FROM_EMAIL,
    to: [to],
    subject: `📈 ${petName} is #${rank} right now — top 3 wins`,
    html: emailShell(`
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:1px;">Daily Rank Update</p>
      <h1 style="margin:0 0 20px;font-size:28px;font-weight:900;color:#18181b;line-height:1.2;">${petName} is currently<br/>ranked #${rank} 📈</h1>
      ${statRow([{ label: "Current Rank", value: `#${rank}` }, { label: "Total Entries", value: String(totalEntries) }, { label: "Votes to Top 3", value: isTop3 ? "In Top 3!" : String(votesNeededForTop3) }])}
      ${isTop3
        ? infoBox(`🏆 <strong>${petName} is already in the top 3!</strong> Hold the position — keep sharing and voting to lock it in.`, "#f0fdf4", "#86efac")
        : infoBox(`${petName} needs just <strong>${votesNeededForTop3} more vote${votesNeededForTop3 === 1 ? "" : "s"}</strong> to break into the top 3. That's totally doable today!`)}
      ${ctaButton("Vote Now & Share", `${appUrl()}/contests/${contestId}`)}
      ${ctaButton("Buy Votes", appUrl(), "#71717a")}
      <p style="margin-top:20px;font-size:14px;color:#16a34a;">🐾 Paid votes help shelter pets get fed — every vote does good.</p>
    `, `${petName} is #${rank} out of ${totalEntries} — ${isTop3 ? "already in top 3!" : `${votesNeededForTop3} votes from top 3`}`),
  });
}

export async function sendContestReEntry(
  to: string,
  userName: string,
  petName: string,
  oldContestName: string,
  newContestName: string,
  newContestId: string,
  reEntryToken: string,
  applicationUrl: string
) {
  const reentryUrl = `${applicationUrl}/api/contests/reenter?token=${encodeURIComponent(reEntryToken)}`;

  await sendEmail({
    from: FROM_EMAIL,
    to: [to],
    subject: `🐾 ${petName} was SO close — let's run it back`,
    html: emailShell(`
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:1px;">New Contest Available</p>
      <h1 style="margin:0 0 20px;font-size:28px;font-weight:900;color:#18181b;line-height:1.2;">${petName} was so close...<br/>Time for round 2! 🐾</h1>
      <p style="margin:0 0 20px;color:#52525b;font-size:16px;">Hey ${userName}, ${petName} made a strong run in <strong>${oldContestName}</strong>. Now there's a new shot in <strong>${newContestName}</strong>.</p>
      ${infoBox(`Your re-entry link will <strong>auto-fill everything</strong> — one click and ${petName} is back in the running. You can update the photo afterward.`)}
      ${ctaButton(`Re-Enter ${petName} →`, reentryUrl)}
      <p style="margin-top:20px;font-size:14px;color:#16a34a;">🐾 Each new round means more chances to win while helping shelter pets in need.</p>
      <p style="margin-top:16px;font-size:12px;color:#a1a1aa;">Button not working? Copy this link into your browser:<br/><span style="color:#71717a;">${reentryUrl}</span></p>
    `, `${petName} has a spot in ${newContestName} — one click to enter!`),
  });
}

export async function sendAlmostWonEmail(
  to: string,
  userName: string,
  petName: string,
  contestName: string,
  rank: number,
  votesFromTop3: number,
  nextContestId: string,
) {
  const rSuffix = rankSuffix(rank);
  const bestPkg = VOTE_PACKAGES.find(p => p.votes >= votesFromTop3) ?? VOTE_PACKAGES[VOTE_PACKAGES.length - 1];
  const suggestedPkg = `${bestPkg.votes} votes for $${(bestPkg.price / 100).toFixed(2)}`;
  await sendEmail({
    from: FROM_EMAIL,
    to: [to],
    subject: `😢 ${petName} was SO close — finished ${rSuffix}, only ${votesFromTop3} votes from Top 3`,
    html: emailShell(`
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:1px;">So Close!</p>
      <h1 style="margin:0 0 20px;font-size:28px;font-weight:900;color:#18181b;line-height:1.2;">${petName} finished ${rSuffix} 😢<br/>Just ${votesFromTop3} vote${votesFromTop3 !== 1 ? "s" : ""} from winning!</h1>
      <p style="margin:0 0 20px;color:#52525b;font-size:16px;">Hey ${userName}, <strong>${petName}</strong> was <strong>only ${votesFromTop3} vote${votesFromTop3 !== 1 ? "s" : ""} away</strong> from cracking the top 3 in <strong>${contestName}</strong>. That's heartbreakingly close.</p>
      ${statRow([{ label: "Final Rank", value: `#${rank}` }, { label: "Votes Short", value: String(votesFromTop3) }, { label: "Next Contest", value: "LIVE NOW" }])}
      ${infoBox(`💡 <strong>Don't let it happen again.</strong> A quick boost of ${suggestedPkg} would have changed everything. Start the next contest with an advantage.`, "#fef2f2", "#fca5a5")}
      ${ctaButton("Enter Next Contest — Win This Time", `${appUrl()}/contests/${nextContestId}`)}
      ${ctaButton("Buy Votes Now", `${appUrl()}/dashboard#votes`, "#71717a")}
      <p style="margin-top:20px;font-size:14px;color:#16a34a;">🐾 Every vote purchase feeds shelter pets — your support matters win or lose.</p>
    `, `${petName} was ${rSuffix} — only ${votesFromTop3} votes from Top 3. Next contest is live!`),
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await sendEmail({
    from: FROM_EMAIL,
    to: [to],
    subject: "Reset your VoteToFeed password",
    html: emailShell(`
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:1px;">Password Reset</p>
      <h1 style="margin:0 0 20px;font-size:28px;font-weight:900;color:#18181b;line-height:1.2;">Reset your<br/>password 🔐</h1>
      <p style="margin:0 0 20px;color:#52525b;font-size:16px;">We received a request to reset your VoteToFeed password. Click the button below to choose a new one.</p>
      ${infoBox(`⏰ <strong>This link expires in 1 hour.</strong> If you didn't request a password reset, you can safely ignore this email.`, "#fef2f2", "#fca5a5")}
      ${ctaButton("Reset My Password", resetUrl)}
      <p style="margin-top:20px;font-size:12px;color:#a1a1aa;">Button not working? Copy this URL into your browser:<br/><span style="color:#71717a;word-break:break-all;">${resetUrl}</span></p>
    `, "Click the link to reset your VoteToFeed password — expires in 1 hour."),
  });
}

export async function sendContestWinner(
  to: string,
  petName: string,
  contestName: string,
  placement: number,
  prizeTitle: string,
  prizeItems: string[],
  prizeValue: number
) {
  const isRandom = placement === 0;
  const subject = isRandom
    ? `🎉 ${petName} was selected as our Random Winner!`
    : placement === 1
      ? `🏆 ${petName} WON 1st Place — $${(prizeValue / 100).toFixed(0)} Prize Pack!`
      : `🎉 ${petName} won ${rankSuffix(placement)} place in ${contestName}!`;

  const placementLabel = isRandom ? "Random Winner 🎲" : `${rankSuffix(placement)} Place ${placement === 1 ? "🥇" : placement === 2 ? "🥈" : "🥉"}`;

  await sendEmail({
    from: FROM_EMAIL,
    to: [to],
    subject,
    html: emailShell(`
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#b45309;text-transform:uppercase;letter-spacing:1px;">${isRandom ? "You Won!" : "Contest Winner"}</p>
      <h1 style="margin:0 0 20px;font-size:30px;font-weight:900;color:#18181b;line-height:1.2;">${isRandom ? "🎲 Lucky you!" : "🏆 Congratulations!"}<br/>${petName} won ${placementLabel}!</h1>
      <p style="margin:0 0 20px;color:#52525b;font-size:16px;">${petName} placed in <strong>${contestName}</strong> and earned the <strong>${prizeTitle}</strong>.</p>
      ${statRow([{ label: "Prize Value", value: `$${(prizeValue / 100).toFixed(0)}` }, { label: "Placement", value: placementLabel }])}
      <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#18181b;">Your prize pack includes:</p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 20px;">
        ${prizeItems.map(item => `<tr><td style="padding:8px 0;border-bottom:1px solid #f4f4f5;font-size:15px;color:#3f3f46;">✅ &nbsp;${item}</td></tr>`).join("")}
      </table>
      ${infoBox(`📦 We'll follow up with fulfillment details within <strong>2 business days</strong>. Expect delivery in <strong>2–4 weeks</strong>.`, "#fff7ed", "#fdba74")}
      <p style="margin-top:20px;font-size:14px;color:#16a34a;">🐾 Thanks for helping turn contest energy into real support for shelter pets.</p>
    `, `${petName} won ${placementLabel} in ${contestName} — $${(prizeValue / 100).toFixed(0)} prize!`),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMENT NOTIFICATION — sent to pet owner when someone comments on their pet
// ─────────────────────────────────────────────────────────────────────────────
export async function sendCommentNotification(
  to: string,
  petOwnerName: string,
  petName: string,
  petId: string,
  commenterName: string,
  commentText: string,
  isReply: boolean
) {
  const petUrl = `${appUrl()}/pets/${petId}`;
  const subject = isReply
    ? `💬 ${commenterName} replied to a comment on ${petName}`
    : `💬 ${commenterName} commented on ${petName}`;

  await sendEmail({
    from: FROM_EMAIL,
    to: [to],
    subject,
    html: emailShell(`
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:1px;">${isReply ? "New Reply" : "New Comment"}</p>
      <h1 style="margin:0 0 20px;font-size:26px;font-weight:900;color:#18181b;line-height:1.2;">${commenterName} ${isReply ? "replied on" : "commented on"}<br/>${petName}! 💬</h1>
      <p style="margin:0 0 16px;color:#52525b;font-size:15px;">Hey ${petOwnerName}, here's what they wrote:</p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 24px;">
        <tr>
          <td style="background:#faf5ff;border-left:4px solid #a855f7;border-radius:0 8px 8px 0;padding:16px 20px;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#7c3aed;">${commenterName}</p>
            <p style="margin:0;font-size:16px;color:#18181b;line-height:1.6;">"${commentText}"</p>
          </td>
        </tr>
      </table>
      ${ctaButton("View & Reply", petUrl, "#7c3aed")}
      <p style="margin-top:20px;font-size:13px;color:#a1a1aa;">You can manage comment notifications in your account settings.</p>
    `, `${commenterName} ${isReply ? "replied on" : "left a comment on"} ${petName}`),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// REPLY NOTIFICATION — sent to the original commenter when someone replies
// ─────────────────────────────────────────────────────────────────────────────
export async function sendReplyNotification(
  to: string,
  recipientName: string,
  petName: string,
  petId: string,
  replierName: string,
  originalText: string,
  replyText: string
) {
  const petUrl = `${appUrl()}/pets/${petId}`;

  await sendEmail({
    from: FROM_EMAIL,
    to: [to],
    subject: `💬 ${replierName} replied to your comment on ${petName}`,
    html: emailShell(`
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:1px;">New Reply</p>
      <h1 style="margin:0 0 20px;font-size:26px;font-weight:900;color:#18181b;line-height:1.2;">${replierName} replied to your comment! 💬</h1>
      <p style="margin:0 0 16px;color:#52525b;font-size:15px;">Hey ${recipientName}, someone replied to what you wrote on <strong>${petName}</strong>:</p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 12px;">
        <tr>
          <td style="background:#f4f4f5;border-left:4px solid #d4d4d8;border-radius:0 8px 8px 0;padding:12px 16px;">
            <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Your comment</p>
            <p style="margin:0;font-size:14px;color:#52525b;line-height:1.5;">"${originalText}"</p>
          </td>
        </tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 24px;">
        <tr>
          <td style="background:#faf5ff;border-left:4px solid #a855f7;border-radius:0 8px 8px 0;padding:14px 18px;">
            <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#7c3aed;">${replierName} replied</p>
            <p style="margin:0;font-size:16px;color:#18181b;line-height:1.6;">"${replyText}"</p>
          </td>
        </tr>
      </table>
      ${ctaButton("View Conversation", petUrl, "#7c3aed")}
      <p style="margin-top:20px;font-size:13px;color:#a1a1aa;">You can manage comment notifications in your account settings.</p>
    `, `${replierName} replied to your comment on ${petName}`),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// BATCHED VOTE ALERT — sent when cooldown expires (shows total accumulated votes)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendBatchedVoteAlert(
  to: string,
  petOwnerName: string,
  petName: string,
  petId: string,
  newVoteCount: number,
  totalWeeklyVotes: number,
  rank: number | null
) {
  const petUrl = `${appUrl()}/pets/${petId}`;
  const subject = newVoteCount === 1
    ? `🐾 ${petName} just got a new vote!`
    : `🐾 ${petName} got ${newVoteCount} new votes!`;

  await sendEmail({
    from: FROM_EMAIL,
    to: [to],
    subject,
    html: emailShell(`
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:1px;">Vote Update</p>
      <h1 style="margin:0 0 20px;font-size:28px;font-weight:900;color:#18181b;line-height:1.2;">
        ${newVoteCount === 1 ? `New vote for` : `${newVoteCount} new votes for`}<br/>${petName}! 🐾
      </h1>
      ${statRow([
        { label: newVoteCount === 1 ? "New Vote" : "New Votes", value: String(newVoteCount) },
        { label: "Total This Week", value: String(totalWeeklyVotes) },
        ...(rank ? [{ label: "Current Rank", value: `#${rank}` }] : []),
      ])}
      ${infoBox("🌟 <strong>Share " + petName + "'s profile</strong> to keep the votes rolling in! Every vote helps feed a shelter pet. 🐾")}
      ${ctaButton(`View ${petName}'s Profile`, petUrl)}
    `, `${newVoteCount === 1 ? `1 new vote` : `${newVoteCount} new votes`} for ${petName} — ${totalWeeklyVotes} total this week!`),
  });
}

export async function sendFollowNotification(
  to: string,
  recipientName: string,
  followerName: string,
  followerImage: string | null,
  profileUrl: string,
) {
  const initial = followerName[0]?.toUpperCase() || "?";
  const avatarHtml = followerImage
    ? `<img src="${followerImage}" width="48" height="48" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid #fca5a5;" alt="${followerName}" />`
    : `<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#ef4444,#dc2626);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#fff;text-align:center;line-height:48px;">${initial}</div>`;

  await sendEmail({
    from: FROM_EMAIL,
    to: [to],
    subject: `👋 ${followerName} started following you on VoteToFeed`,
    html: emailShell(`
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:1px;">New Follower</p>
      <h1 style="margin:0 0 20px;font-size:26px;font-weight:900;color:#18181b;line-height:1.2;">You have a new follower! 🎉</h1>
      <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 20px;">
        <tr>
          <td style="vertical-align:middle;padding-right:16px;">${avatarHtml}</td>
          <td style="vertical-align:middle;">
            <p style="margin:0;font-size:17px;font-weight:800;color:#18181b;">${followerName}</p>
            <p style="margin:4px 0 0;font-size:14px;color:#71717a;">is now following you</p>
          </td>
        </tr>
      </table>
      ${infoBox(`Hi <strong>${recipientName}</strong>, <strong>${followerName}</strong> just started following you. They'll see your posts and activity on VoteToFeed.`)}
      ${ctaButton("View Their Profile", profileUrl)}
    `, `${followerName} started following you on VoteToFeed`),
  });
}

export async function sendPostLikeNotification(
  to: string,
  recipientName: string,
  likerName: string,
  postPreview: string,
  profileUrl: string,
) {
  const preview = postPreview.length > 100 ? postPreview.slice(0, 100) + "…" : postPreview;
  await sendEmail({
    from: FROM_EMAIL,
    to: [to],
    subject: `❤️ ${likerName} liked your post`,
    html: emailShell(`
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:1px;">Post Like</p>
      <h1 style="margin:0 0 20px;font-size:26px;font-weight:900;color:#18181b;line-height:1.2;">Someone liked your post! ❤️</h1>
      ${infoBox(`<strong>${likerName}</strong> liked your post:<br/><em style="color:#52525b;">"${preview}"</em>`)}
      ${ctaButton("View Your Profile", profileUrl)}
    `, `${likerName} liked your post on VoteToFeed`),
  });
}

export async function sendPostCommentNotification(
  to: string,
  recipientName: string,
  commenterName: string,
  commentText: string,
  postPreview: string,
  profileUrl: string,
) {
  const preview = postPreview.length > 80 ? postPreview.slice(0, 80) + "…" : postPreview;
  const comment = commentText.length > 120 ? commentText.slice(0, 120) + "…" : commentText;
  await sendEmail({
    from: FROM_EMAIL,
    to: [to],
    subject: `💬 ${commenterName} commented on your post`,
    html: emailShell(`
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:1px;">New Comment</p>
      <h1 style="margin:0 0 20px;font-size:26px;font-weight:900;color:#18181b;line-height:1.2;">New comment on your post 💬</h1>
      ${infoBox(`<strong>${commenterName}</strong> commented on your post "<em>${preview}</em>":<br/><br/><span style="font-size:15px;color:#18181b;">"${comment}"</span>`)}
      ${ctaButton("View Your Profile", profileUrl)}
    `, `${commenterName} commented on your post`),
  });
}
