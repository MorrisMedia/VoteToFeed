import prisma from "@/lib/prisma";

const COMMENT_TEMPLATES = [
  "What a beautiful {breed}! 😍 Welcome to VoteToFeed!",
  "Oh my goodness, {dogname} is ADORABLE! 🐾",
  "Welcome {dogname}! You're going to love it here! 💕",
  "That face! {dogname} is such a cutie! 🥰",
  "Is {dogname} always this photogenic? What a star! ⭐",
  "I can't get over how cute {dogname} is! Welcome! 🎉",
  "A {breed}! One of my favorite breeds! Welcome {dogname}! 🐕",
  "Those eyes! {dogname} has stolen my heart! 💖",
  "{dogname} looks like the goodest boy/girl! Welcome! 🎀",
  "So happy to see another {breed} here! Welcome {dogname}! 🌟",
  "That {breed} smile is everything! Hi {dogname}! 👋",
  "Welcome to the family, {dogname}! You're gonna get so many votes! 🗳️",
  "{dogname} is absolutely precious! What a sweet {breed}! 💝",
  "OMG look at that face! Welcome {dogname}! You're a natural! 📸",
  "Hey {dogname}! Ready to help feed some shelter pups? 🍖",
  "What a gorgeous {breed}! {dogname} is a superstar! 🌈",
  "I'm voting for {dogname} every single day! So cute! 🐶",
  "That {breed} energy is real! Welcome {dogname}! 💫",
  "New best friend alert! Welcome {dogname}! 🚨❤️",
  "Okay {dogname} just won the cutest pet contest IMO! 🏆",
  "A {breed} named {dogname}? Perfect combo! Welcome! 🎊",
  "{dogname} is giving major model vibes! 📷✨",
  "Can we talk about how precious {dogname} is?! 😭💕",
  "Welcome welcome welcome {dogname}! This {breed} is stunning! 🤩",
  "I need to meet {dogname} in real life! What a sweetheart! 🥹",
  "That little face! {dogname} you are TOO cute! 🧡",
  "Another gorgeous {breed} joins the party! Welcome {dogname}! 🎈",
  "Aww {dogname}! I bet you give the best cuddles! 🤗",
  "VoteToFeed just got cuter thanks to {dogname}! Welcome! 🌸",
  "Hands down one of the cutest {breed}s I've ever seen! Hi {dogname}! 🫶",
  "That tail must be wagging non-stop! Welcome {dogname}! 🐕🦺",
  "So glad {dogname} is here! What a beautiful pup! 🌻",
  "I'll be cheering for {dogname} every week! Go {breed}s! 📣",
  "{dogname} has main character energy and I'm here for it! 🎬",
  "Somebody get {dogname} a modeling contract! Gorgeous {breed}! 😎",
  "The cutest {breed} in town! Welcome to VoteToFeed, {dogname}! 🏠",
  "I showed {dogname}'s photo to my dog and now they want to be friends! 🐾🐾",
  "Look at those paws! {dogname} you are perfection! ✨",
  "{dogname} and that {breed} charm — instant vote from me! 🗳️💖",
  "Just when I thought this app couldn't get cuter... {dogname} showed up! 😍",
  "Welcome aboard, {dogname}! Every vote helps feed a shelter dog! 🍖💕",
  "That {breed} face is making my day! Go {dogname}! 🌞",
  "Cannot. Handle. The cuteness. Welcome {dogname}! 💀❤️",
  "A+ entry right here! {dogname} the {breed} is a winner! 🏅",
  "This might be the cutest {breed} photo ever! Welcome {dogname}! 📸🐶",
  "I'm obsessed with {dogname}! Such a beautiful {breed}! 😭💖",
  "New here? Welcome {dogname}! You're already getting my vote! 👍",
  "That smile tho! {dogname} you just made everyone's day! 😊",
  "Can {dogname} teach my dog how to pose? A natural! 📷🌟",
  "Bring on the votes for {dogname}! This {breed} deserves them all! 🗳️🎉",
];

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function renderTemplate(template: string, vars: { dogname: string; breed: string }): string {
  return template.replace(/\{dogname\}/g, vars.dogname).replace(/\{breed\}/g, vars.breed);
}

function getContestWeek(now: Date): string {
  const weekNum = Math.ceil(
    ((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 +
      new Date(now.getFullYear(), 0, 1).getDay() +
      1) / 7,
  );

  return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export type AutoEngagementResult = {
  message: string;
  newUsersFound: number;
  seedAccountsAvailable: number;
  totalEngagements: number;
  logs: Array<{ user: string; action: string; seed: string }>;
};

export async function runAutoEngagement(): Promise<AutoEngagementResult> {
  const now = new Date();
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const newUsers = await prisma.user.findMany({
    where: {
      createdAt: { gte: fortyEightHoursAgo },
      role: "USER",
      email: { not: { contains: "@iheartdogs.com" } },
    },
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
  });

  if (seedAccounts.length === 0) {
    return {
      message: "No seed accounts found. Run /api/admin/seed-engagement first.",
      newUsersFound: newUsers.length,
      seedAccountsAvailable: 0,
      totalEngagements: 0,
      logs: [],
    };
  }

  let totalEngagements = 0;
  const logs: Array<{ user: string; action: string; seed: string }> = [];

  for (const user of newUsers) {
    const pet = user.pets[0];
    if (!pet) continue;

    const existingEngagements = await prisma.engagementLog.count({
      where: { targetUserId: user.id },
    });

    if (existingEngagements >= 6) continue;

    const usedSeedIds = (
      await prisma.engagementLog.findMany({
        where: { targetUserId: user.id },
        select: { seedAccountId: true },
        distinct: ["seedAccountId"],
      })
    ).map((entry) => entry.seedAccountId);

    const availableSeeds = seedAccounts.filter((seed) => !usedSeedIds.includes(seed.id));
    if (availableSeeds.length === 0) continue;

    const selectedSeeds = pickRandom(availableSeeds, Math.floor(Math.random() * 3) + 1);

    for (const seed of selectedSeeds) {
      try {
        const existingVote = await prisma.vote.findFirst({
          where: { userId: seed.id, petId: pet.id },
        });

        if (!existingVote) {
          await prisma.vote.create({
            data: {
              userId: seed.id,
              petId: pet.id,
              voteType: "FREE",
              contestWeek: getContestWeek(new Date()),
            },
          });

          await prisma.engagementLog.create({
            data: { targetUserId: user.id, seedAccountId: seed.id, petId: pet.id, action: "like" },
          });

          logs.push({ user: user.email || user.id, action: "like", seed: seed.email || seed.id });
          totalEngagements++;
        }

        const template = pickRandom(COMMENT_TEMPLATES, 1)[0];
        const commentText = renderTemplate(template, {
          dogname: pet.name,
          breed: pet.breed || "pup",
        });

        await prisma.comment.create({
          data: { userId: seed.id, petId: pet.id, text: commentText },
        });

        await prisma.engagementLog.create({
          data: { targetUserId: user.id, seedAccountId: seed.id, petId: pet.id, action: "comment", commentText },
        });

        logs.push({ user: user.email || user.id, action: "comment", seed: seed.email || seed.id });
        totalEngagements++;
      } catch (error) {
        console.error("Engagement error:", error);
      }
    }
  }

  return {
    message: `Auto-engagement complete. ${totalEngagements} actions performed.`,
    newUsersFound: newUsers.length,
    seedAccountsAvailable: seedAccounts.length,
    totalEngagements,
    logs,
  };
}
