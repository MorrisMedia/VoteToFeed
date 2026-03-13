import prisma from "@/lib/prisma";
import { getCurrentWeekId } from "@/lib/utils";

const COMMENT_TEMPLATES = [
  "What a beautiful {breed}! 😍 Welcome to VoteToFeed!",
  "Oh my goodness, {petname} is ADORABLE! 🐾",
  "Welcome {petname}! You're going to love it here! 💕",
  "That face! {petname} is such a cutie! 🥰",
  "Is {petname} always this photogenic? What a star! ⭐",
  "I can't get over how cute {petname} is! Welcome! 🎉",
  "A {breed}! One of my favorite breeds! Welcome {petname}! 🐕",
  "Those eyes! {petname} has stolen my heart! 💖",
  "{petname} looks like the goodest boy/girl! Welcome! 🎀",
  "So happy to see another {breed} here! Welcome {petname}! 🌟",
  "That {breed} smile is everything! Hi {petname}! 👋",
  "Welcome to the family, {petname}! You're gonna get so many votes! 🗳️",
  "{petname} is absolutely precious! What a sweet {breed}! 💝",
  "OMG look at that face! Welcome {petname}! You're a natural! 📸",
  "Hey {petname}! Ready to help feed some shelter pups? 🍖",
  "What a gorgeous {breed}! {petname} is a superstar! 🌈",
  "I'm voting for {petname} every single day! So cute! 🐶",
  "That {breed} energy is real! Welcome {petname}! 💫",
  "New best friend alert! Welcome {petname}! 🚨❤️",
  "Okay {petname} just won the cutest pet contest IMO! 🏆",
  "A {breed} named {petname}? Perfect combo! Welcome! 🎊",
  "{petname} is giving major model vibes! 📷✨",
  "Can we talk about how precious {petname} is?! 😭💕",
  "Welcome welcome welcome {petname}! This {breed} is stunning! 🤩",
  "I need to meet {petname} in real life! What a sweetheart! 🥹",
  "That little face! {petname} you are TOO cute! 🧡",
  "Another gorgeous {breed} joins the party! Welcome {petname}! 🎈",
  "Aww {petname}! I bet you give the best cuddles! 🤗",
  "VoteToFeed just got cuter thanks to {petname}! Welcome! 🌸",
  "Hands down one of the cutest {breed}s I've ever seen! Hi {petname}! 🫶",
  "That tail must be wagging non-stop! Welcome {petname}! 🐕🦺",
  "So glad {petname} is here! What a beautiful pup! 🌻",
  "I'll be cheering for {petname} every week! Go {breed}s! 📣",
  "{petname} has main character energy and I'm here for it! 🎬",
  "Somebody get {petname} a modeling contract! Gorgeous {breed}! 😎",
  "The cutest {breed} in town! Welcome to VoteToFeed, {petname}! 🏠",
  "I showed {petname}'s photo to my dog and now they want to be friends! 🐾🐾",
  "Look at those paws! {petname} you are perfection! ✨",
  "{petname} and that {breed} charm — instant vote from me! 🗳️💖",
  "Just when I thought this app couldn't get cuter... {petname} showed up! 😍",
  "Welcome aboard, {petname}! Every vote helps feed a shelter dog! 🍖💕",
  "That {breed} face is making my day! Go {petname}! 🌞",
  "Cannot. Handle. The cuteness. Welcome {petname}! 💀❤️",
  "A+ entry right here! {petname} the {breed} is a winner! 🏅",
  "This might be the cutest {breed} photo ever! Welcome {petname}! 📸🐶",
  "I'm obsessed with {petname}! Such a beautiful {breed}! 😭💖",
  "New here? Welcome {petname}! You're already getting my vote! 👍",
  "That smile tho! {petname} you just made everyone's day! 😊",
  "Can {petname} teach my dog how to pose? A natural! 📷🌟",
  "Bring on the votes for {petname}! This {breed} deserves them all! 🗳️🎉",
];

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
