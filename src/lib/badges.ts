import prisma from "@/lib/prisma";

// Badge definitions — these get seeded into the Badge table
export const BADGE_DEFINITIONS = [
  // VOTING badges
  { slug: "first-vote",       name: "First Vote",        description: "Cast your first vote",             icon: "🗳️",  category: "VOTING" as const,    threshold: 1 },
  { slug: "vote-10",          name: "Voter",             description: "Cast 10 votes",                    icon: "✅",  category: "VOTING" as const,    threshold: 10 },
  { slug: "vote-50",          name: "Super Voter",       description: "Cast 50 votes",                    icon: "🌟",  category: "VOTING" as const,    threshold: 50 },
  { slug: "vote-100",         name: "Vote Champion",     description: "Cast 100 votes",                   icon: "🏆",  category: "VOTING" as const,    threshold: 100 },
  { slug: "vote-500",         name: "Vote Legend",        description: "Cast 500 votes",                   icon: "👑",  category: "VOTING" as const,    threshold: 500 },

  // SOCIAL badges
  { slug: "first-follower",   name: "Getting Popular",   description: "Get your first follower",          icon: "👋",  category: "SOCIAL" as const,    threshold: 1 },
  { slug: "followers-10",     name: "Rising Star",       description: "Reach 10 followers",               icon: "⭐",  category: "SOCIAL" as const,    threshold: 10 },
  { slug: "followers-50",     name: "Influencer",        description: "Reach 50 followers",               icon: "🔥",  category: "SOCIAL" as const,    threshold: 50 },
  { slug: "followers-100",    name: "Celebrity",         description: "Reach 100 followers",              icon: "💎",  category: "SOCIAL" as const,    threshold: 100 },
  { slug: "first-follow",     name: "Friendly",          description: "Follow your first user",           icon: "🤝",  category: "SOCIAL" as const,    threshold: 1 },
  { slug: "following-10",     name: "Social Butterfly",  description: "Follow 10 users",                  icon: "🦋",  category: "SOCIAL" as const,    threshold: 10 },

  // PET badges
  { slug: "first-pet",        name: "Pet Parent",        description: "Register your first pet",          icon: "🐾",  category: "PETS" as const,      threshold: 1 },
  { slug: "pets-3",           name: "Pet Family",        description: "Register 3 pets",                  icon: "🏠",  category: "PETS" as const,      threshold: 3 },
  { slug: "pets-5",           name: "Pet Squad",         description: "Register 5 pets",                  icon: "🐕‍🦺", category: "PETS" as const,      threshold: 5 },

  // STREAK badges
  { slug: "streak-3",         name: "On a Roll",         description: "3-week voting streak",             icon: "🔥",  category: "STREAK" as const,    threshold: 3 },
  { slug: "streak-5",         name: "Dedicated Voter",   description: "5-week voting streak",             icon: "💪",  category: "STREAK" as const,    threshold: 5 },
  { slug: "streak-10",        name: "Unstoppable",       description: "10-week voting streak",            icon: "⚡",  category: "STREAK" as const,    threshold: 10 },

  // COMMUNITY badges
  { slug: "early-adopter",    name: "Early Adopter",     description: "Joined during the first month",    icon: "🚀",  category: "COMMUNITY" as const, threshold: 0 },
  { slug: "shelter-supporter", name: "Shelter Hero",     description: "Contributed to shelter feeding",    icon: "❤️",  category: "COMMUNITY" as const, threshold: 0 },
];

/**
 * Check and award badges for a given user.
 * Call this after voting, following, registering pets, etc.
 */
export async function checkAndAwardBadges(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      votingStreak: true,
      createdAt: true,
      _count: {
        select: {
          votes: true,
          pets: true,
          followers: true,
          following: true,
        },
      },
      badges: { select: { badge: { select: { slug: true } } } },
      purchases: { where: { status: "COMPLETED" }, select: { id: true } },
    },
  });

  if (!user) return [];

  const existingSlugs = new Set(user.badges.map((b) => b.badge.slug));
  const newBadgeSlugs: string[] = [];

  const checks: { slug: string; earned: boolean }[] = [
    // Voting
    { slug: "first-vote",      earned: user._count.votes >= 1 },
    { slug: "vote-10",         earned: user._count.votes >= 10 },
    { slug: "vote-50",         earned: user._count.votes >= 50 },
    { slug: "vote-100",        earned: user._count.votes >= 100 },
    { slug: "vote-500",        earned: user._count.votes >= 500 },

    // Social — followers
    { slug: "first-follower",  earned: user._count.followers >= 1 },
    { slug: "followers-10",    earned: user._count.followers >= 10 },
    { slug: "followers-50",    earned: user._count.followers >= 50 },
    { slug: "followers-100",   earned: user._count.followers >= 100 },

    // Social — following
    { slug: "first-follow",    earned: user._count.following >= 1 },
    { slug: "following-10",    earned: user._count.following >= 10 },

    // Pets
    { slug: "first-pet",       earned: user._count.pets >= 1 },
    { slug: "pets-3",          earned: user._count.pets >= 3 },
    { slug: "pets-5",          earned: user._count.pets >= 5 },

    // Streak
    { slug: "streak-3",        earned: user.votingStreak >= 3 },
    { slug: "streak-5",        earned: user.votingStreak >= 5 },
    { slug: "streak-10",       earned: user.votingStreak >= 10 },

    // Community
    {
      slug: "early-adopter",
      earned: user.createdAt < new Date("2026-05-01"),
    },
    {
      slug: "shelter-supporter",
      earned: user.purchases.length > 0,
    },
  ];

  for (const check of checks) {
    if (check.earned && !existingSlugs.has(check.slug)) {
      newBadgeSlugs.push(check.slug);
    }
  }

  if (newBadgeSlugs.length === 0) return [];

  // Find badge IDs
  const badges = await prisma.badge.findMany({
    where: { slug: { in: newBadgeSlugs } },
    select: { id: true, slug: true },
  });

  // Award them
  await prisma.userBadge.createMany({
    data: badges.map((b) => ({ userId, badgeId: b.id })),
    skipDuplicates: true,
  });

  return badges.map((b) => b.slug);
}

/**
 * Seed all badge definitions into the database.
 */
export async function seedBadges() {
  for (const def of BADGE_DEFINITIONS) {
    await prisma.badge.upsert({
      where: { slug: def.slug },
      create: def,
      update: { name: def.name, description: def.description, icon: def.icon, category: def.category, threshold: def.threshold },
    });
  }
}
