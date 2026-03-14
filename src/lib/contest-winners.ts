import prisma from "@/lib/prisma";

function buildAddress(parts: Array<string | null | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join(", ");
}

export async function ensureContestWinnersResolved(contestId?: string) {
  const now = new Date();

  const contests = await prisma.contest.findMany({
    where: {
      ...(contestId ? { id: contestId } : {}),
      endDate: { lt: now },
      prizes: { some: {} },
    },
    include: {
      entries: {
        select: {
          petId: true,
          pet: {
            select: {
              id: true,
              createdAt: true,
            },
          },
        },
      },
      prizes: {
        orderBy: { placement: "asc" },
      },
    },
  });

  for (const contest of contests) {
    const unresolvedPrizes = contest.prizes.filter((prize) => !prize.winnerId);
    if (unresolvedPrizes.length === 0 || contest.entries.length === 0) continue;

    const petIds = [...new Set(contest.entries.map((entry) => entry.petId))];
    if (petIds.length === 0) continue;

    const registeredVotes = await prisma.vote.groupBy({
      by: ["petId"],
      where: contest.weekId
        ? { contestWeek: contest.weekId, petId: { in: petIds } }
        : {
            petId: { in: petIds },
            createdAt: { gte: contest.startDate, lte: contest.endDate },
          },
      _sum: { quantity: true },
      _count: { _all: true },
    });

    const anonymousVotes = await prisma.anonymousVote.groupBy({
      by: ["petId"],
      where: contest.weekId
        ? { contestWeek: contest.weekId, petId: { in: petIds } }
        : {
            petId: { in: petIds },
            createdAt: { gte: contest.startDate, lte: contest.endDate },
          },
      _count: { _all: true },
    });

    const totals = new Map<string, number>();
    for (const petId of petIds) totals.set(petId, 0);

    for (const vote of registeredVotes) {
      totals.set(vote.petId, (totals.get(vote.petId) ?? 0) + (vote._sum.quantity ?? vote._count._all ?? 0));
    }

    for (const vote of anonymousVotes) {
      totals.set(vote.petId, (totals.get(vote.petId) ?? 0) + vote._count._all);
    }

    const createdAtByPet = new Map(contest.entries.map((entry) => [entry.petId, entry.pet.createdAt.getTime()]));
    const rankedPetIds = [...petIds].sort((a, b) => {
      const totalDiff = (totals.get(b) ?? 0) - (totals.get(a) ?? 0);
      if (totalDiff !== 0) return totalDiff;
      return (createdAtByPet.get(a) ?? 0) - (createdAtByPet.get(b) ?? 0);
    });

    for (const prize of unresolvedPrizes) {
      const winnerId = rankedPetIds[prize.placement - 1];
      if (!winnerId) continue;

      await prisma.prize.update({
        where: { id: prize.id },
        data: {
          winnerId,
          awardedAt: prize.awardedAt ?? now,
          status: prize.fulfilledAt ? "SHIPPED" : "AWARDED",
        },
      });
    }
  }
}

export async function getAdminContestWinners() {
  await ensureContestWinnersResolved();

  const prizes = await prisma.prize.findMany({
    where: {
      winnerId: { not: null },
      contest: { endDate: { lt: new Date() } },
    },
    include: {
      contest: {
        select: {
          id: true,
          name: true,
          endDate: true,
          isActive: true,
        },
      },
    },
    orderBy: [{ contest: { endDate: "desc" } }, { placement: "asc" }],
  });

  const winnerIds = [...new Set(prizes.map((prize) => prize.winnerId).filter(Boolean) as string[])];
  const pets = winnerIds.length
    ? await prisma.pet.findMany({
        where: { id: { in: winnerIds } },
        select: {
          id: true,
          name: true,
          ownerName: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          user: {
            select: {
              name: true,
              city: true,
              state: true,
              zipCode: true,
            },
          },
        },
      })
    : [];

  const petMap = new Map(
    pets.map((pet) => [
      pet.id,
      {
        petName: pet.name,
        ownerUserName: pet.user.name || pet.ownerName,
        ownerAddress:
          buildAddress([pet.address]) ||
          buildAddress([pet.city, pet.state, pet.zipCode]) ||
          buildAddress([pet.user.city, pet.user.state, pet.user.zipCode]) ||
          "—",
      },
    ])
  );

  return prizes.map((prize) => {
    const pet = prize.winnerId ? petMap.get(prize.winnerId) : null;
    return {
      id: prize.id,
      contestId: prize.contestId,
      contestName: prize.contest.name,
      contestEndedAt: prize.contest.endDate.toISOString(),
      placement: prize.placement,
      title: prize.title,
      winnerPetId: prize.winnerId,
      winnerPetName: pet?.petName || "—",
      ownerUserName: pet?.ownerUserName || "—",
      ownerAddress: pet?.ownerAddress || "—",
      prizeSent: Boolean(prize.fulfilledAt || prize.status === "SHIPPED" || prize.status === "FULFILLED"),
      fulfilledAt: prize.fulfilledAt?.toISOString() ?? null,
      awardedAt: prize.awardedAt?.toISOString() ?? null,
      status: prize.status,
      value: prize.value,
    };
  });
}
