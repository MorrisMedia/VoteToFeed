import prisma from "@/lib/prisma";
import { getContestLeaderboard } from "@/lib/contest-growth";

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
      prizes: {
        orderBy: { placement: "asc" },
      },
    },
  });

  for (const contest of contests) {
    // Only resolve prizes that have no winner yet — once a contest ends, votes are final.
    const prizesToResolve = contest.prizes.filter((prize) => !prize.winnerId);
    if (prizesToResolve.length === 0) continue;

    const leaderboard = await getContestLeaderboard(contest.id);
    if (leaderboard.length === 0) continue;

    const topThreePetIds = new Set(leaderboard.slice(0, 3).map((r) => r.petId));
    const nonTopRows = leaderboard.filter((r) => !topThreePetIds.has(r.petId));

    for (const prize of prizesToResolve) {
      if (prize.placement === 0) {
        const eligible = nonTopRows;
        const randomWinner = eligible[Math.floor(Math.random() * eligible.length)];
        if (!randomWinner) continue;

        await prisma.prize.update({
          where: { id: prize.id },
          data: {
            winnerId: randomWinner.petId,
            awardedAt: now,
            status: prize.fulfilledAt ? "SHIPPED" : "AWARDED",
          },
        });

        continue;
      }

      const winner = leaderboard[prize.placement - 1];
      if (!winner) continue;

      await prisma.prize.update({
        where: { id: prize.id },
        data: {
          winnerId: winner.petId,
          awardedAt: now,
          status: prize.fulfilledAt ? "SHIPPED" : "AWARDED",
        },
      });
    }

    // Deactivate ended contests so cron-missed ones are properly closed
    if (contest.isActive) {
      await prisma.contest.update({
        where: { id: contest.id },
        data: { isActive: false },
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
          ownerFirstName: true,
          ownerLastName: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          user: true,
        },
      })
    : [];

  const petMap = new Map(
    pets.map((pet) => [
      pet.id,
      {
        petName: pet.name,
        ownerUserName:
          buildAddress([pet.ownerFirstName, pet.ownerLastName]) ||
          pet.user.name?.trim() ||
          pet.ownerName ||
          "—",
        ownerAddress:
          buildAddress([
            pet.address,
            pet.city || pet.user.city,
            pet.state || pet.user.state,
            pet.zipCode || pet.user.zipCode,
          ]) ||
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
