import Link from "next/link";
import prisma from "@/lib/prisma";
import { formatDisplayName } from "@/lib/utils";
import { ensureContestWinnersResolved } from "@/lib/contest-winners";

export default async function WinnersPage() {
  // Ensures any ended contests have their final winners set (fixes premature awards)
  await ensureContestWinnersResolved();

  const prizes = await prisma.prize.findMany({
    where: {
      status: "AWARDED",
      winnerId: { not: null },
      contest: { endDate: { lt: new Date() } },
    },
    include: {
      contest: { select: { name: true, petType: true, weekId: true } },
    },
    orderBy: { awardedAt: "desc" },
    take: 30,
  });

  const winnerIds = prizes.map((p) => p.winnerId).filter(Boolean) as string[];
  const pets = winnerIds.length
    ? await prisma.pet.findMany({
        where: { id: { in: winnerIds } },
        select: { id: true, name: true, photos: true, ownerName: true, ownerFirstName: true, ownerLastName: true, type: true },
      })
    : [];
  const petMap = Object.fromEntries(pets.map((p) => [p.id, p]));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <h1 className="text-xl sm:text-2xl font-bold text-surface-900 mb-1">Winners</h1>
      <p className="text-sm text-surface-500 mb-8">Recent contest winners and their prize packs.</p>

      {prizes.length === 0 ? (
        <div className="card p-12 sm:p-16 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-400"><path d="M12 15l-2 5 7-4H7l7 4-2-5M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          </div>
          <p className="font-semibold text-surface-700">No winners yet</p>
          <p className="text-sm text-surface-400 mt-1">Contests are running — winners announced every Monday!</p>
          <Link href="/leaderboard/DOG" className="btn-primary mt-4 text-sm">
            View leaderboard
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {prizes.map((prize) => {
            const pet = prize.winnerId ? petMap[prize.winnerId] : null;
            return (
              <div key={prize.id} className="card overflow-hidden">
                {pet && (
                  <Link href={`/pets/${pet.id}`} className="block aspect-square bg-surface-100">
                    <img
                      src={pet.photos[0] || "https://via.placeholder.com/400?text=Winner"}
                      alt={pet.name}
                      className="w-full h-full object-cover"
                    />
                  </Link>
                )}
                <div className="p-4">
                  {pet && (
                    <>
                      <p className="font-bold text-surface-900">{pet.name}</p>
                      <p className="text-sm text-surface-500">{formatDisplayName(pet.ownerFirstName, pet.ownerLastName, pet.ownerName)}</p>
                    </>
                  )}
                  <p className="text-brand-600 font-semibold mt-2">
                    {prize.placement === 0 ? "Lucky Winner" : prize.placement === 1 ? "1st Place" : prize.placement === 2 ? "2nd Place" : "3rd Place"} — $
                    {(prize.value / 100).toLocaleString()} value
                  </p>
                  <p className="text-xs text-surface-400 mt-1">{prize.contest.name}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
