import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendContestAddedEmail, sendEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

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

  const { contestId, petType, userIds, sendEmail: shouldSendEmail = true, templateId, fromContestId } = await req.json();

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
    select: { petId: true, pet: { select: { userId: true } } },
  });
  const existingPetIds = new Set(existingEntries.map((e) => e.petId));
  const existingTargetUserIds = new Set(existingEntries.map((e) => e.pet.userId));

  // Build list of pets to add (skip already entered)
  const toAdd: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    petId: string;
    petName: string;
  }> = [];
  let createdCount = 0;

  // ── RE-ADD MODE ─────────────────────────────────────────────
  // When fromContestId is provided, clone each source pet into a NEW Pet record
  // so the new contest entry starts from 0 votes and the original pet/votes
  // remain untouched in the source contest.
  if (fromContestId && typeof fromContestId === "string") {
    const filterUserIds = Array.isArray(userIds) && userIds.length > 0 ? new Set<string>(userIds) : null;

    const sourceEntries = await prisma.contestEntry.findMany({
      where: { contestId: fromContestId },
      select: {
        pet: {
          select: {
            id: true,
            name: true,
            type: true,
            breed: true,
            bio: true,
            ownerName: true,
            ownerFirstName: true,
            ownerLastName: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            country: true,
            photos: true,
            tags: true,
            optInDesigns: true,
            isActive: true,
            userId: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    for (const e of sourceEntries) {
      const src = e.pet;
      if (!src.isActive) continue;
      if (!src.user.email) continue;
      if (filterUserIds && !filterUserIds.has(src.userId)) continue;
      if (existingTargetUserIds.has(src.userId)) continue; // user already in target
      if (petType && src.type !== petType) continue;

      // Clone the Pet so it starts fresh in the new contest (no carry-over votes)
      const cloned = await prisma.pet.create({
        data: {
          name: src.name,
          type: src.type,
          breed: src.breed,
          bio: src.bio,
          ownerName: src.ownerName,
          ownerFirstName: src.ownerFirstName,
          ownerLastName: src.ownerLastName,
          address: src.address,
          city: src.city,
          state: src.state,
          zipCode: src.zipCode,
          country: src.country ?? "US",
          photos: src.photos,
          tags: src.tags,
          optInDesigns: src.optInDesigns,
          isActive: true,
          userId: src.userId,
        },
      });

      await prisma.contestEntry.create({
        data: { contestId, petId: cloned.id },
      });

      // Track this user so duplicate source entries (multiple pets) don't all skip;
      // keep adding pets for the same user, but block other future-source duplicates.
      // existingTargetUserIds.add(src.userId);  // commented: allow multiple pets per user

      createdCount++;
      toAdd.push({
        userId: src.userId,
        userName: src.user.name?.trim() || src.user.email.split("@")[0],
        userEmail: src.user.email,
        petId: cloned.id,
        petName: cloned.name,
      });
    }
  } else {
    // ── FRESH ADD MODE (default) ──────────────────────────────
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

    if (toAdd.length > 0) {
      const created = await prisma.contestEntry.createMany({
        data: toAdd.map((item) => ({
          contestId,
          petId: item.petId,
        })),
        skipDuplicates: true,
      });
      createdCount = created.count;
    }
  }

  if (toAdd.length === 0) {
    return NextResponse.json({
      added: 0,
      emailsSent: 0,
      skipped: existingEntries.length,
      message: fromContestId
        ? "No pets to re-add — all eligible users from the source contest are already entered."
        : "No new pets to add — all eligible pets are already entered.",
    });
  }

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

  // ── In-app notifications (one per user, regardless of email setting) ──
  let notificationsSent = 0;
  try {
    const notifiedUsers = new Set<string>();
    const contestLink = `/contests/${contest.id}`;
    for (const item of toAdd) {
      if (notifiedUsers.has(item.userId)) continue;
      notifiedUsers.add(item.userId);
      // Pick the first pet for this user as the message subject
      const userPets = toAdd.filter((t) => t.userId === item.userId);
      const petLabel =
        userPets.length === 1
          ? userPets[0].petName
          : `${userPets[0].petName} +${userPets.length - 1} more`;
      await createNotification({
        userId: item.userId,
        type: "CONTEST",
        title: "You're entered in a new contest!",
        message: `${petLabel} ${userPets.length === 1 ? "was" : "were"} added to ${contest.name}. Share to start collecting votes!`,
        linkUrl: contestLink,
      });
      notificationsSent++;
    }
  } catch (err) {
    console.error("[auto-add] notifications error:", err);
  }

  return NextResponse.json({
    added: createdCount,
    emailsSent,
    emailsFailed,
    notificationsSent,
    totalPets: toAdd.length,
    totalUsers: new Set(toAdd.map((t) => t.userId)).size,
    contestName: contest.name,
  });
}
