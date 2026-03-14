import prisma from "@/lib/prisma";
import { COMMENT_TEMPLATES } from "@/lib/scheduled-comments";
import { getCurrentWeekId } from "@/lib/utils";

const MAX_ENGAGEMENT_ACTIONS_PER_USER = 6;
const MIN_SEEDS_PER_USER = 1;
const MAX_SEEDS_PER_USER = 3;

type EngagementLogSummary = { user: string; action: string; seed: string };

type EngagementPet = {
  id: string;
  name: string;
  breed: string | null;
};

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function renderTemplate(template: string, vars: { petname: string; breed: string }): string {
  return template.replace(/\{petname\}/g, vars.petname).replace(/\{breed\}/g, vars.breed);
}

async function incrementWeeklyVoteStats(petId: string, weekId: string) {
  await prisma.petWeeklyStats.upsert({
    where: { petId_weekId: { petId, weekId } },
    create: {
      petId,
      weekId,
      totalVotes: 1,
      freeVotes: 1,
      paidVotes: 0,
    },
    update: {
      totalVotes: { increment: 1 },
      freeVotes: { increment: 1 },
    },
  });
}

async function recalculateWeeklyRanks(weekId: string) {
  const stats = await prisma.petWeeklyStats.findMany({
    where: { weekId },
    orderBy: [{ totalVotes: "desc" }, { updatedAt: "asc" }, { petId: "asc" }],
    select: { id: true },
  });

  await prisma.$transaction(
    stats.map((stat, index) =>
      prisma.petWeeklyStats.update({
        where: { id: stat.id },
        data: { rank: index + 1 },
      }),
    ),
  );
}

async function createVoteIfNeeded(seedId: string, targetUserId: string, pet: EngagementPet, weekId: string, logs: EngagementLogSummary[]) {
  const existingVote = await prisma.vote.findFirst({
    where: { userId: seedId, petId: pet.id, contestWeek: weekId },
  });

  if (existingVote) {
    return false;
  }

  await prisma.vote.create({
    data: {
      userId: seedId,
      petId: pet.id,
      voteType: "FREE",
      quantity: 1,
      contestWeek: weekId,
    },
  });

  await incrementWeeklyVoteStats(pet.id, weekId);

  await prisma.engagementLog.create({
    data: { targetUserId, seedAccountId: seedId, petId: pet.id, action: "like" },
  });

  logs.push({ user: targetUserId, action: "like", seed: seedId });
  return true;
}

async function createComment(seedId: string, targetUserId: string, pet: EngagementPet, logs: EngagementLogSummary[]) {
  const template = pickRandom(COMMENT_TEMPLATES, 1)[0];
  const commentText = renderTemplate(template, {
    petname: pet.name,
    breed: pet.breed || "pet",
  });

  await prisma.comment.create({
    data: { userId: seedId, petId: pet.id, text: commentText },
  });

  await prisma.engagementLog.create({
    data: { targetUserId, seedAccountId: seedId, petId: pet.id, action: "comment", commentText },
  });

  logs.push({ user: targetUserId, action: "comment", seed: seedId });
  return true;
}

export type AutoEngagementResult = {
  message: string;
  newUsersFound: number;
  seedAccountsAvailable: number;
  totalEngagements: number;
  logs: Array<{ user: string; action: string; seed: string }>;
};

type RunAutoEngagementOptions = {
  manual?: boolean;
};

export async function runAutoEngagement(options: RunAutoEngagementOptions = {}): Promise<AutoEngagementResult> {
  const now = new Date();
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const manual = options.manual === true;
  const weekId = getCurrentWeekId();

  const candidateUsers = await prisma.user.findMany({
    where: {
      role: "USER",
      email: { not: { contains: "@iheartdogs.com" } },
      ...(manual ? {} : { createdAt: { gte: fortyEightHoursAgo } }),
    },
    orderBy: { createdAt: "desc" },
    take: manual ? 50 : undefined,
    include: {
      pets: {
        where: { isActive: true },
        take: 1,
        select: {
          id: true,
          name: true,
          breed: true,
        },
      },
    },
  });

  const seedAccounts = await prisma.user.findMany({
    where: { email: { contains: "@iheartdogs.com" } },
    select: { id: true, email: true },
  });

  if (seedAccounts.length === 0) {
    return {
      message: "No seed accounts found. Run /api/admin/seed-engagement first.",
      newUsersFound: candidateUsers.length,
      seedAccountsAvailable: 0,
      totalEngagements: 0,
      logs: [],
    };
  }

  let totalEngagements = 0;
  const logs: EngagementLogSummary[] = [];
  let statsChanged = false;

  for (const user of candidateUsers) {
    const pet = user.pets[0];
    if (!pet) continue;

    const existingEngagements = await prisma.engagementLog.count({
      where: { targetUserId: user.id },
    });

    if (existingEngagements >= MAX_ENGAGEMENT_ACTIONS_PER_USER) continue;

    const usedSeedIds = (
      await prisma.engagementLog.findMany({
        where: { targetUserId: user.id },
        select: { seedAccountId: true },
        distinct: ["seedAccountId"],
      })
    ).map((entry) => entry.seedAccountId);

    const availableSeeds = seedAccounts.filter((seed) => !usedSeedIds.includes(seed.id));
    if (availableSeeds.length === 0) continue;

    const actionsRemaining = MAX_ENGAGEMENT_ACTIONS_PER_USER - existingEngagements;
    const maxSeedsByCapacity = Math.max(1, Math.floor(actionsRemaining / 2));
    const seedsToUse = Math.min(
      availableSeeds.length,
      maxSeedsByCapacity,
      Math.max(MIN_SEEDS_PER_USER, Math.floor(Math.random() * MAX_SEEDS_PER_USER) + 1),
    );

    const selectedSeeds = pickRandom(availableSeeds, seedsToUse);
    let actionsForUser = existingEngagements;

    for (const seed of selectedSeeds) {
      try {
        if (actionsForUser >= MAX_ENGAGEMENT_ACTIONS_PER_USER) break;

        const voteCreated = await createVoteIfNeeded(seed.id, user.id, pet, weekId, logs);
        if (voteCreated) {
          totalEngagements++;
          actionsForUser++;
          statsChanged = true;
        }

        if (actionsForUser >= MAX_ENGAGEMENT_ACTIONS_PER_USER) break;

        const commentCreated = await createComment(seed.id, user.id, pet, logs);
        if (commentCreated) {
          totalEngagements++;
          actionsForUser++;
        }
      } catch (error) {
        console.error("Engagement error:", error);
      }
    }
  }

  if (statsChanged) {
    await recalculateWeeklyRanks(weekId);
  }

  const userIdToEmail = new Map(candidateUsers.map((user) => [user.id, user.email || user.id]));
  const seedIdToEmail = new Map(seedAccounts.map((seed) => [seed.id, seed.email || seed.id]));

  return {
    message: `${manual ? "Manual" : "Auto"} engagement complete. ${totalEngagements} actions performed.`,
    newUsersFound: candidateUsers.length,
    seedAccountsAvailable: seedAccounts.length,
    totalEngagements,
    logs: logs.map((entry) => ({
      user: userIdToEmail.get(entry.user) || entry.user,
      action: entry.action,
      seed: seedIdToEmail.get(entry.seed) || entry.seed,
    })),
  };
}
