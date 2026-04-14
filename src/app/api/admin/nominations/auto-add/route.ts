import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendContestAddedEmail, sendEmail } from "@/lib/email";

function applyTemplateVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min for large batches

const BATCH_SIZE = 10;
const DELAY_MS = 1500; // 1.5s between emails

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POST /api/admin/nominations/auto-add
 *
 * Auto-adds users' pets into a contest (creates ContestEntry records)
 * and sends them a notification email.
 *
 * Body: {
 *   contestId: string,
 *   petType?: "DOG" | "CAT" | "OTHER",  // filter by pet type
 *   userIds?: string[],                  // specific users (optional — if omitted, adds all matching)
 *   sendEmail?: boolean                  // default true
 * }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contestId, petType, userIds, sendEmail: shouldSendEmail = true, templateId } = await req.json();

  if (!contestId || typeof contestId !== "string") {
    return NextResponse.json({ error: "contestId is required" }, { status: 400 });
  }

  // Fetch contest
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: {
      id: true,
      name: true,
      petType: true,
      endDate: true,
      startDate: true,
      isActive: true,
      prizeDescription: true,
    },
  });

  if (!contest) {
    return NextResponse.json({ error: "Contest not found" }, { status: 404 });
  }

  // Get existing entries to avoid duplicates
  const existingEntries = await prisma.contestEntry.findMany({
    where: { contestId },
    select: { petId: true },
  });
  const existingPetIds = new Set(existingEntries.map((e) => e.petId));

  // Find eligible users and their pets
  const effectivePetType = petType || contest.petType;

  const whereClause: Record<string, unknown> = {
    email: { not: null },
    pets: {
      some: {
        type: effectivePetType,
        isActive: true,
      },
    },
  };

  if (userIds && Array.isArray(userIds) && userIds.length > 0) {
    whereClause.id = { in: userIds };
  }

  const users = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      email: true,
      pets: {
        where: {
          type: effectivePetType as "DOG" | "CAT" | "OTHER",
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
  });

  // Build list of pets to add (skip already entered)
  const toAdd: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    petId: string;
    petName: string;
  }> = [];

  for (const user of users) {
    if (!user.email) continue;
    for (const pet of user.pets) {
      if (existingPetIds.has(pet.id)) continue;
      toAdd.push({
        userId: user.id,
        userName: user.name?.trim() || user.email.split("@")[0],
        userEmail: user.email,
        petId: pet.id,
        petName: pet.name,
      });
    }
  }

  if (toAdd.length === 0) {
    return NextResponse.json({
      added: 0,
      emailsSent: 0,
      skipped: existingEntries.length,
      message: "No new pets to add — all eligible pets are already entered.",
    });
  }

  // Bulk create ContestEntry records
  const created = await prisma.contestEntry.createMany({
    data: toAdd.map((item) => ({
      contestId,
      petId: item.petId,
    })),
    skipDuplicates: true,
  });

  // Send notification emails (dedup by user — one email per user even if multiple pets)
  let emailsSent = 0;
  let emailsFailed = 0;

  if (shouldSendEmail) {
    const daysLeft = Math.max(
      0,
      Math.ceil((contest.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );

    // Load custom template if provided
    let customTemplate: { subject: string; html: string } | null = null;
    if (templateId && typeof templateId === "string") {
      customTemplate = await prisma.customEmailTemplate.findUnique({
        where: { id: templateId },
        select: { subject: true, html: true },
      });
    }

    // Group by user to send one email per user (use first pet name)
    const byUser = new Map<string, typeof toAdd[0]>();
    for (const item of toAdd) {
      if (!byUser.has(item.userId)) {
        byUser.set(item.userId, item);
      }
    }

    const emailList = Array.from(byUser.values());

    for (let i = 0; i < emailList.length; i += BATCH_SIZE) {
      const batch = emailList.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map((item) => {
          if (customTemplate) {
            const petTypeLabel = contest.petType === "DOG" ? "dog" : contest.petType === "CAT" ? "cat" : "pet";
            const vars: Record<string, string> = {
              name: item.userName,
              petName: item.petName,
              contestName: contest.name,
              daysLeft: String(daysLeft),
              petType: petTypeLabel,
              contestLink: `${process.env.NEXTAUTH_URL || "https://votetofeed.com"}/contests/${contest.id}`,
              signupLink: `${process.env.NEXTAUTH_URL || "https://votetofeed.com"}/auth/signup`,
            };
            return sendEmail({
              from: `VoteToFeed <noreply@votetofeed.com>`,
              to: item.userEmail,
              subject: applyTemplateVars(customTemplate.subject, vars),
              html: applyTemplateVars(customTemplate.html, vars),
            });
          }
          return sendContestAddedEmail(
            item.userEmail,
            item.userName,
            item.petName,
            contest.name,
            contest.id,
            daysLeft,
            contest.prizeDescription,
          );
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled") emailsSent++;
        else emailsFailed++;
      }

      // Rate limit
      if (i + BATCH_SIZE < emailList.length) {
        await sleep(DELAY_MS);
      }
    }
  }

  return NextResponse.json({
    added: created.count,
    emailsSent,
    emailsFailed,
    totalPets: toAdd.length,
    totalUsers: new Set(toAdd.map((t) => t.userId)).size,
    contestName: contest.name,
  });
}
