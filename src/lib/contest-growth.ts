import Anthropic from "@anthropic-ai/sdk";
import prisma from "@/lib/prisma";
import { rankSuffix } from "@/lib/utils";

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

export const CONTEST_EMAIL_TYPES = {
  COUNTDOWN_7D: "countdown_7d",
  COUNTDOWN_3D: "countdown_3d",
  COUNTDOWN_24H: "countdown_24h",
  DAILY_RANK: "daily_rank",
  REENTRY: "reentry",
  WINNER_1: "winner_1",
  WINNER_2: "winner_2",
  WINNER_3: "winner_3",
  WINNER_RANDOM: "winner_random",
} as const;

export type ContestEmailType = (typeof CONTEST_EMAIL_TYPES)[keyof typeof CONTEST_EMAIL_TYPES];

export type ContestLeaderboardRow = {
  petId: string;
  petName: string;
  userId: string;
  userName: string;
  userEmail: string | null;
  totalVotes: number;
  rank: number;
  votesNeededForTop3: number;
};

export async function getContestLeaderboard(contestId: string): Promise<ContestLeaderboardRow[]> {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    include: {
      entries: {
        include: {
          pet: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!contest) {
    return [];
  }

  const petIds = [...new Set(contest.entries.map((entry) => entry.petId))];
  if (petIds.length === 0) {
    return [];
  }

  const registeredVotes = await prisma.vote.groupBy({
    by: ["petId"],
    where: {
      petId: { in: petIds },
      createdAt: {
        gte: contest.startDate,
        lte: contest.endDate,
      },
    },
    _sum: { quantity: true },
  });

  const totals = new Map<string, number>();
  for (const petId of petIds) totals.set(petId, 0);

  for (const vote of registeredVotes) {
    totals.set(vote.petId, (totals.get(vote.petId) ?? 0) + (vote._sum.quantity ?? 0));
  }

  const entriesByPet = new Map(
    contest.entries.map((entry) => [
      entry.petId,
      {
        petName: entry.pet.name,
        petCreatedAt: entry.pet.createdAt,
        userId: entry.pet.userId,
        userName: entry.pet.user.name?.trim() || entry.pet.ownerFirstName?.trim() || entry.pet.ownerName?.trim() || "friend",
        userEmail: entry.pet.user.email,
      },
    ])
  );

  const rankedPetIds = [...petIds].sort((a, b) => {
    const totalDiff = (totals.get(b) ?? 0) - (totals.get(a) ?? 0);
    if (totalDiff !== 0) return totalDiff;

    const aCreatedAt = entriesByPet.get(a)?.petCreatedAt?.getTime() ?? 0;
    const bCreatedAt = entriesByPet.get(b)?.petCreatedAt?.getTime() ?? 0;
    return aCreatedAt - bCreatedAt;
  });

  const thirdPlaceVotes = rankedPetIds[2] ? (totals.get(rankedPetIds[2]) ?? 0) : null;

  return rankedPetIds.map((petId, index) => {
    const entry = entriesByPet.get(petId);
    const totalVotes = totals.get(petId) ?? 0;

    return {
      petId,
      petName: entry?.petName ?? "Pet",
      userId: entry?.userId ?? "",
      userName: entry?.userName ?? "friend",
      userEmail: entry?.userEmail ?? null,
      totalVotes,
      rank: index + 1,
      votesNeededForTop3: thirdPlaceVotes === null || index < 3 ? 0 : Math.max(0, thirdPlaceVotes - totalVotes + 1),
    };
  });
}

export async function hasContestEmailBeenSent(contestId: string, userId: string, emailType: string) {
  const existing = await prisma.contestEmailLog.findUnique({
    where: {
      contestId_userId_emailType: {
        contestId,
        userId,
        emailType,
      },
    },
  });

  return Boolean(existing);
}

export async function logContestEmail(contestId: string, userId: string, emailType: ContestEmailType) {
  await prisma.contestEmailLog.upsert({
    where: {
      contestId_userId_emailType: {
        contestId,
        userId,
        emailType,
      },
    },
    create: {
      contestId,
      userId,
      emailType,
    },
    update: {},
  });
}

export async function hasDailyRankEmailBeenSentToday(contestId: string, userId: string) {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const existing = await prisma.contestEmailLog.findFirst({
    where: {
      contestId,
      userId,
      emailType: CONTEST_EMAIL_TYPES.DAILY_RANK,
      sentAt: { gte: startOfDay },
    },
  });

  return Boolean(existing);
}

export function getCountdownEmailType(daysLeft: number): ContestEmailType | null {
  if (daysLeft === 7) return CONTEST_EMAIL_TYPES.COUNTDOWN_7D;
  if (daysLeft === 3) return CONTEST_EMAIL_TYPES.COUNTDOWN_3D;
  if (daysLeft === 1) return CONTEST_EMAIL_TYPES.COUNTDOWN_24H;
  return null;
}

export function isCountdownWindow(endDate: Date, daysLeft: number) {
  const diffDays = (endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return Math.abs(diffDays - daysLeft) <= 0.5;
}

export function getWinnerEmailType(placement: number): ContestEmailType {
  if (placement === 1) return CONTEST_EMAIL_TYPES.WINNER_1;
  if (placement === 2) return CONTEST_EMAIL_TYPES.WINNER_2;
  if (placement === 3) return CONTEST_EMAIL_TYPES.WINNER_3;
  return CONTEST_EMAIL_TYPES.WINNER_RANDOM;
}

export function formatPlacement(placement: number) {
  return placement === 0 ? "Random Winner" : rankSuffix(placement);
}

export async function generateContestName(petType: "DOG" | "CAT") {
  if (!anthropic) {
    return `Cutest ${petType === "DOG" ? "Dogs" : "Cats"} Contest`;
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: `Generate a short, catchy contest name for a bi-weekly ${petType === "DOG" ? "dog" : "cat"} photo contest.
Formula: [Emotion/Adjective] + [Pet Trait] + [Time/Theme]
Examples: "Cutest Pups of March", "Fluffiest Friends Showdown", "Most Loveable Pets Spring Edition"
Brand voice: warm, pet-as-family, playful not corporate.
Current date: ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}.
Return ONLY the contest name, nothing else. Max 8 words.`
        },
      ],
    });

    const textBlock = response.content.find((item) => item.type === "text");
    return textBlock?.type === "text"
      ? textBlock.text.trim()
      : `Cutest ${petType === "DOG" ? "Dogs" : "Cats"} Contest`;
  } catch (error) {
    console.error("Failed to generate contest name:", error);
    return `Cutest ${petType === "DOG" ? "Dogs" : "Cats"} Contest`;
  }
}

export function getNextContestWindow(now = new Date()) {
  const startDate = new Date(now);
  const day = startDate.getUTCDay();
  const hour = startDate.getUTCHours();

  if (day === 1 && hour < 12) {
    startDate.setUTCMinutes(0, 0, 0);
  } else {
    const daysUntilNextMonday = ((8 - day) % 7) || 7;
    startDate.setUTCDate(startDate.getUTCDate() + daysUntilNextMonday);
    startDate.setUTCHours(0, 0, 0, 0);
  }

  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + 14);

  return { startDate, endDate };
}

export async function findUpcomingContest(
  petType: "DOG" | "CAT",
  type: "NATIONAL" | "STATE" | "SEASONAL" | "BREED" | "CHARITY" | "CALENDAR" = "NATIONAL"
) {
  return prisma.contest.findFirst({
    where: {
      petType,
      type,
      isActive: true,
      startDate: { gt: new Date() },
    },
    orderBy: { startDate: "asc" },
  });
}

export async function createBiWeeklyContest(
  petType: "DOG" | "CAT",
  type: "NATIONAL" | "STATE" | "SEASONAL" | "BREED" | "CHARITY" | "CALENDAR" = "NATIONAL"
) {
  const existing = await findUpcomingContest(petType, type);
  if (existing) return existing;

  const { startDate, endDate } = getNextContestWindow();
  const name = await generateContestName(petType);

  return prisma.contest.create({
    data: {
      name,
      type,
      petType,
      startDate,
      endDate,
      isActive: true,
      isRecurring: true,
      recurringInterval: "biweekly",
      description: `Enter your ${petType === "DOG" ? "dog" : "cat"} for a shot at featured prizes while helping feed shelter pets in need.`,
      prizeDescription: "Top 3 placements plus one random participant win prize packs.",
      rules: "Winners are determined by votes cast during the contest window. No purchase necessary.",
      prizes: {
        create: [
          {
            placement: 1,
            title: "Grand Prize Bundle",
            value: 30000,
            items: [
              "$250 product bundle (premium treats, toys, and swag)",
              "$50 iHeartDogs/Cats Gift Card",
              "Featured post to 5M+ audience",
            ],
          },
          {
            placement: 2,
            title: "Runner-Up",
            value: 5000,
            items: ["$50 Gift Card"],
          },
          {
            placement: 3,
            title: "Third Place",
            value: 2500,
            items: ["$25 Gift Card"],
          },
          {
            placement: 0,
            title: "Random Participant Prize",
            value: 5000,
            items: ["$50 Gift Card"],
          },
        ],
      },
    },
    include: { prizes: true },
  });
}
