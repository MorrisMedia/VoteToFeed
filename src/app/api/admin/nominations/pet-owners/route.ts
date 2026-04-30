import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/admin/nominations/pet-owners?petType=DOG&contestId=xxx
// Returns users who own pets of that type, excluding those already entered or nominated for the contest
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const petType = searchParams.get("petType"); // DOG, CAT, OTHER
  const contestId = searchParams.get("contestId");
  const fromContestId = searchParams.get("fromContestId"); // re-add mode: source contest

  if (!petType && !fromContestId) {
    return NextResponse.json({ error: "petType or fromContestId is required" }, { status: 400 });
  }

  // Get user IDs that already have an entry in this contest
  let excludeUserIds: string[] = [];
  if (contestId) {
    const existingEntries = await prisma.contestEntry.findMany({
      where: { contestId },
      select: { pet: { select: { userId: true } } },
    });
    const entryUserIds = existingEntries.map((e) => e.pet.userId);

    // Also exclude users already nominated for this contest
    const existingNominations = await prisma.nomination.findMany({
      where: { contestId },
      select: { email: true },
    });
    const nominatedEmails = new Set(existingNominations.map((n) => n.email));

    // Get user IDs for nominated emails
    if (nominatedEmails.size > 0) {
      const nominatedUsers = await prisma.user.findMany({
        where: { email: { in: Array.from(nominatedEmails) } },
        select: { id: true },
      });
      excludeUserIds = [...new Set([...entryUserIds, ...nominatedUsers.map((u) => u.id)])];
    } else {
      excludeUserIds = [...new Set(entryUserIds)];
    }
  }

  // RE-ADD MODE: list users whose pets were entered in `fromContestId`
  if (fromContestId) {
    const sourceEntries = await prisma.contestEntry.findMany({
      where: { contestId: fromContestId },
      select: {
        pet: {
          select: {
            id: true,
            name: true,
            type: true,
            isActive: true,
            userId: true,
          },
        },
      },
    });

    // Group pets by user, applying optional petType filter and excluding users already in target
    const userMap = new Map<string, { id: string; name: string; type: string }[]>();
    for (const e of sourceEntries) {
      const p = e.pet;
      if (!p.isActive) continue;
      if (excludeUserIds.includes(p.userId)) continue;
      if (petType && p.type !== petType) continue;
      const list = userMap.get(p.userId) ?? [];
      list.push({ id: p.id, name: p.name, type: p.type });
      userMap.set(p.userId, list);
    }

    const userIds = Array.from(userMap.keys());
    if (userIds.length === 0) return NextResponse.json([]);

    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, email: { not: null } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        pets: userMap.get(u.id) ?? [],
      }))
    );
  }

  // Find users with pets of the specified type
  const users = await prisma.user.findMany({
    where: {
      id: { notIn: excludeUserIds },
      email: { not: null },
      pets: {
        some: {
          type: petType as "DOG" | "CAT" | "OTHER",
          isActive: true,
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      pets: {
        where: {
          type: petType as "DOG" | "CAT" | "OTHER",
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}
