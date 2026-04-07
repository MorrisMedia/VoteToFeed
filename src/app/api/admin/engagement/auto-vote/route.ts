import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getCurrentWeekId } from "@/lib/utils";

export const dynamic = "force-dynamic";

// POST /api/admin/engagement/auto-vote — Schedule gradual votes from demo accounts to target pets
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as Record<string, unknown>)?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { mode, targetPetIds, totalVotes, spreadHours } = body as {
    mode: "all_pets" | "demo_pets" | "specific_pets";
    targetPetIds?: string[];
    totalVotes: number;
    spreadHours: number;
  };

  if (!mode || !totalVotes || totalVotes < 1 || totalVotes > 50000) {
    return NextResponse.json({ error: "mode and totalVotes (1-50000) required" }, { status: 400 });
  }

  if (!spreadHours || spreadHours < 1 || spreadHours > 168) {
    return NextResponse.json({ error: "spreadHours (1-168) required" }, { status: 400 });
  }

  // Get seed accounts
  const seedAccounts = await prisma.user.findMany({
    where: { email: { contains: "@iheartdogs.com" } },
    select: { id: true, email: true },
  });

  if (seedAccounts.length === 0) {
    return NextResponse.json({ error: "No demo accounts found. Run seed-engagement first." }, { status: 400 });
  }

  // Get target pets based on mode
  let targetPets: Array<{ id: string; name: string; userId: string }>;
  const seedAccountIds = seedAccounts.map((s) => s.id);

  if (mode === "demo_pets") {
    targetPets = await prisma.pet.findMany({
      where: { userId: { in: seedAccountIds }, isActive: true },
      select: { id: true, name: true, userId: true },
    });
  } else if (mode === "specific_pets" && targetPetIds?.length) {
    targetPets = await prisma.pet.findMany({
      where: { id: { in: targetPetIds }, isActive: true },
      select: { id: true, name: true, userId: true },
    });
  } else {
    // all_pets — vote on all non-demo active pets
    targetPets = await prisma.pet.findMany({
      where: {
        isActive: true,
        userId: { notIn: seedAccountIds },
      },
      select: { id: true, name: true, userId: true },
    });
  }

  if (targetPets.length === 0) {
    return NextResponse.json({ error: "No target pets found for selected mode" }, { status: 400 });
  }

  // Distribute votes across pets and schedule them
  const votesPerPet = Math.max(1, Math.floor(totalVotes / targetPets.length));
  const weekId = getCurrentWeekId();
  const now = Date.now();
  const spreadMs = spreadHours * 60 * 60 * 1000;
  let totalScheduled = 0;

  const scheduleData: Array<{
    petId: string;
    seedAccountId: string;
    votesAmount: number;
    scheduledFor: Date;
  }> = [];

  for (const pet of targetPets) {
    let remainingVotes = votesPerPet;
    let batchIndex = 0;

    while (remainingVotes > 0) {
      // Pick a random seed account (different from pet owner)
      const availableSeeds = seedAccounts.filter((s) => s.id !== pet.userId);
      if (availableSeeds.length === 0) break;

      const seed = availableSeeds[Math.floor(Math.random() * availableSeeds.length)];

      // Each batch is 1-5 votes
      const batchSize = Math.min(remainingVotes, Math.floor(Math.random() * 5) + 1);

      // Schedule at a random time within the spread window
      const offset = Math.floor(Math.random() * spreadMs);
      const scheduledFor = new Date(now + offset);

      scheduleData.push({
        petId: pet.id,
        seedAccountId: seed.id,
        votesAmount: batchSize,
        scheduledFor,
      });

      remainingVotes -= batchSize;
      batchIndex++;
      totalScheduled += batchSize;
    }
  }

  // Sort by scheduled time
  scheduleData.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());

  // Save to ScheduledVote table
  await prisma.scheduledVote.createMany({
    data: scheduleData.map((s) => ({
      petId: s.petId,
      seedAccountId: s.seedAccountId,
      votesAmount: s.votesAmount,
      scheduledFor: s.scheduledFor,
      weekId,
      status: "PENDING",
    })),
  });

  return NextResponse.json({
    success: true,
    message: `Scheduled ${totalScheduled} votes across ${targetPets.length} pets over ${spreadHours}h`,
    totalScheduled,
    targetPetsCount: targetPets.length,
    batchesCreated: scheduleData.length,
    estimatedCompletion: new Date(now + spreadMs).toISOString(),
  });
}
