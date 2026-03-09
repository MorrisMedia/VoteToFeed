import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Runs daily at midnight UTC — creates next contest for ended recurring contests
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find ended recurring contests that are still active
  const endedRecurring = await prisma.contest.findMany({
    where: {
      isRecurring: true,
      isActive: true,
      endDate: { lt: now },
    },
  });

  const created: string[] = [];

  for (const contest of endedRecurring) {
    // Calculate new dates based on interval
    const interval = contest.recurringInterval || "biweekly";
    const durationMs = contest.endDate.getTime() - contest.startDate.getTime();
    let newStart: Date;

    switch (interval) {
      case "weekly":
        newStart = new Date(contest.endDate.getTime() + 1); // Start right after end
        break;
      case "biweekly":
        newStart = new Date(contest.endDate.getTime() + 1);
        break;
      case "monthly":
        newStart = new Date(contest.endDate.getTime() + 1);
        break;
      default:
        newStart = new Date(contest.endDate.getTime() + 1);
    }

    const newEnd = new Date(newStart.getTime() + durationMs);
    const nextCounter = contest.recurringCounter + 1;

    // Build name with counter — strip any existing counter suffix first
    const baseName = contest.name.replace(/\s*[—–-]\s*(Week|Round|Edition)\s*\d+$/i, "").trim();
    const counterLabel = interval === "monthly" ? `Edition ${nextCounter}` : `Week ${nextCounter}`;
    const newName = `${baseName} — ${counterLabel}`;

    // Calculate weekId
    const weekNum = getWeekNumber(newStart);
    const weekId = `${newStart.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;

    // Create next contest
    await prisma.contest.create({
      data: {
        name: newName,
        type: contest.type,
        petType: contest.petType,
        state: contest.state,
        weekId,
        startDate: newStart,
        endDate: newEnd,
        isActive: true,
        isFeatured: contest.isFeatured,
        description: contest.description,
        rules: contest.rules,
        coverImage: contest.coverImage,
        entryFee: contest.entryFee,
        maxEntries: contest.maxEntries,
        prizeDescription: contest.prizeDescription,
        sponsorName: contest.sponsorName,
        sponsorLogo: contest.sponsorLogo,
        sponsorUrl: contest.sponsorUrl,
        isRecurring: true,
        recurringInterval: contest.recurringInterval,
        recurringCounter: nextCounter,
      },
    });

    // Deactivate the old contest (it's ended)
    await prisma.contest.update({
      where: { id: contest.id },
      data: { isActive: false },
    });

    created.push(newName);
  }

  return NextResponse.json({
    checked: endedRecurring.length,
    created: created.length,
    contests: created,
    timestamp: now.toISOString(),
  });
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
