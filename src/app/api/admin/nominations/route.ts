import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendNominationEmail, sendEmail } from "@/lib/email";

function applyTemplateVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export const dynamic = "force-dynamic";

const EMAIL_DELAY_MS = 2000; // 2s between emails to avoid spam flags
const MAX_BATCH_SIZE = 50;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// GET /api/admin/nominations — list all nominations
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nominations = await prisma.nomination.findMany({
    include: {
      contest: { select: { id: true, name: true, petType: true, endDate: true, prizeDescription: true } },
      sentBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(nominations);
}

// POST /api/admin/nominations — create & send nominations (supports bulk)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { recipients, contestId, templateId } = body as {
    recipients?: Array<{ email: string; name: string; petName?: string }>;
    contestId?: string;
    templateId?: string;
  };

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0 || !contestId) {
    return NextResponse.json(
      { error: "recipients array and contestId are required" },
      { status: 400 }
    );
  }

  if (recipients.length > MAX_BATCH_SIZE) {
    return NextResponse.json(
      { error: `Maximum ${MAX_BATCH_SIZE} recipients per batch` },
      { status: 400 }
    );
  }

  // Validate all emails
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const r of recipients) {
    if (!r.email || !r.name) {
      return NextResponse.json({ error: "Each recipient needs email and name" }, { status: 400 });
    }
    if (!emailRegex.test(r.email)) {
      return NextResponse.json({ error: `Invalid email: ${r.email}` }, { status: 400 });
    }
  }

  // Verify contest exists with details for the email
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: { id: true, name: true, petType: true, endDate: true, prizeDescription: true },
  });
  if (!contest) {
    return NextResponse.json({ error: "Contest not found" }, { status: 404 });
  }

  // Load custom template if provided
  let customTemplate: { subject: string; html: string } | null = null;
  if (templateId) {
    customTemplate = await prisma.customEmailTemplate.findUnique({
      where: { id: templateId },
      select: { subject: true, html: true },
    });
  }

  const adminId = (session.user as { id: string }).id;
  const results: Array<{ email: string; success: boolean; error?: string }> = [];

  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];

    let nomination;
    try {
      // Create nomination record
      nomination = await prisma.nomination.create({
        data: {
          email: r.email,
          name: r.name,
          petName: r.petName || null,
          contestId,
          sentById: adminId,
          status: "PENDING",
        },
      });
    } catch (err) {
      console.error(`[Nomination] failed to create nomination for ${r.email}:`, err);
      results.push({ email: r.email, success: false, error: "Already nominated for this contest" });
      continue;
    }

    // Send email with delay between sends
    try {
      if (i > 0) await sleep(EMAIL_DELAY_MS);

      if (customTemplate) {
        const daysLeft = Math.max(
          0,
          Math.ceil((new Date(contest.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        );
        const petTypeLabel = contest.petType === "DOG" ? "dog" : contest.petType === "CAT" ? "cat" : "pet";
        const vars: Record<string, string> = {
          name: r.name,
          petName: r.petName || `your ${petTypeLabel}`,
          contestName: contest.name,
          daysLeft: String(daysLeft),
          petType: petTypeLabel,
          contestLink: `${process.env.NEXTAUTH_URL || "https://votetofeed.com"}/contests/${contest.id}`,
          signupLink: `${process.env.NEXTAUTH_URL || "https://votetofeed.com"}/auth/signup`,
        };
        await sendEmail({
          from: `VoteToFeed <noreply@votetofeed.com>`,
          to: r.email,
          subject: applyTemplateVars(customTemplate.subject, vars),
          html: applyTemplateVars(customTemplate.html, vars),
        });
      } else {
        await sendNominationEmail(r.email, r.name, contest.name, contest.petType, contest.endDate, r.petName || undefined);
      }

      await prisma.nomination.update({
        where: { id: nomination.id },
        data: { status: "SENT", sentAt: new Date() },
      });
      results.push({ email: r.email, success: true });
    } catch (err) {
      console.error(`[Nomination] email to ${r.email} failed:`, err);
      results.push({ email: r.email, success: false, error: "Email failed to send" });
    }
  }

  const sent = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return NextResponse.json({ sent, failed, total: recipients.length, results });
}
