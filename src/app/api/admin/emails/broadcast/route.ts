import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5min for large batches

// POST /api/admin/emails/broadcast — send email to users
// Body: { subject, html, contestId?, sendToAll? }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subject, html, contestId, sendToAll } = await req.json();

  if (!subject || typeof subject !== "string") {
    return NextResponse.json({ error: "Subject required" }, { status: 400 });
  }
  if (!html || typeof html !== "string") {
    return NextResponse.json({ error: "HTML content required" }, { status: 400 });
  }
  if (!contestId && !sendToAll) {
    return NextResponse.json(
      { error: "Must specify contestId or sendToAll" },
      { status: 400 }
    );
  }

  // Build recipient list
  let users: { email: string; name: string | null }[] = [];

  if (sendToAll) {
    const raw = await prisma.user.findMany({
      where: { email: { not: null } },
      select: { email: true, name: true },
    });
    users = raw.filter((u): u is { email: string; name: string | null } => u.email !== null);
  } else if (contestId) {
    // Users who have entries in this contest (via ContestEntry → Pet → User)
    const entries = await prisma.contestEntry.findMany({
      where: { contestId },
      select: {
        pet: {
          select: {
            user: {
              select: { email: true, name: true },
            },
          },
        },
      },
    });
    const seen = new Set<string>();
    for (const entry of entries) {
      const u = entry.pet?.user;
      if (u?.email && !seen.has(u.email)) {
        seen.add(u.email);
        users.push({ email: u.email, name: u.name });
      }
    }
  }

  // Filter out null emails
  const recipients = users.filter(
    (u): u is { email: string; name: string | null } => !!u.email
  );

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No recipients found" }, { status: 400 });
  }

  // Send in batches with rate limiting  
  const BATCH_SIZE = 10;
  const DELAY_MS = 1000;
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((u) =>
        sendEmail({
          from: "VoteToFeed <noreply@votetofeed.com>",
          to: u.email,
          subject,
          html,
        })
      )
    );

    for (const r of results) {
      if (r.status === "fulfilled") sent++;
      else {
        failed++;
        errors.push(String(r.reason));
      }
    }

    // Rate limit between batches
    if (i + BATCH_SIZE < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  return NextResponse.json({
    total: recipients.length,
    sent,
    failed,
    errors: errors.slice(0, 5), // first 5 errors
  });
}
