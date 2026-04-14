import { notFound } from "next/navigation";
import Link from "next/link";
import { PetCard } from "@/components/pets/PetCard";
import { ShelterBanner } from "@/components/layout/ShelterBanner";
import { getAnimalType, getWeeklyVoteGoal } from "@/lib/admin-settings";
import prisma from "@/lib/prisma";
import { getCurrentWeekId, getWeekDateRange, formatDisplayName } from "@/lib/utils";

type PageProps = { params: { type: string }; searchParams: { state?: string; page?: string } };

export default async function LeaderboardPage({ params, searchParams }: PageProps) {
  const type = params.type.toUpperCase();
  if (type !== "DOG" && type !== "CAT") notFound();

  const page = Math.max(1, parseInt(searchParams.page || "1"));
  const state = searchParams.state || undefined;
  const limit = 20;
  const weekId = getCurrentWeekId();
  const { start, end } = getWeekDateRange();

  const [animalType, weeklyGoal, stats, weeklyMealsAgg, entries, allTimeVotes, allTimeAnon] = await Promise.all([
    getAnimalType(),
    getWeeklyVoteGoal(),
    prisma.petWeeklyStats.aggregate({
      where: { weekId, pet: { type: type as "DOG" | "CAT", isActive: true, ...(state ? { state } : {}) } },
      _sum: { totalVotes: true, paidVotes: true },
    }),
    // Use stored mealsProvided from actual purchases — not recalculated
    prisma.purchase.aggregate({
      where: { status: "COMPLETED", createdAt: { gte: start, lt: end } },
      _sum: { mealsProvided: true },
    }),
    prisma.petWeeklyStats.findMany({
      where: { weekId, pet: { type: type as "DOG" | "CAT", isActive: true, ...(state ? { state } : {}) } },
      include: {
        pet: {
          include: { user: { select: { name: true, image: true } } },
        },
      },
      orderBy: { totalVotes: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.vote.groupBy({
      by: ["petId"],
      where: { pet: { type: type as "DOG" | "CAT", isActive: true } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
    }),
    prisma.anonymousVote.groupBy({
      by: ["petId"],
      where: { pet: { type: type as "DOG" | "CAT", isActive: true } },
      _count: true,
    }),
  ]);

  const total = await prisma.petWeeklyStats.count({
    where: { weekId, pet: { type: type as "DOG" | "CAT", isActive: true, ...(state ? { state } : {}) } },
  });

  // Build all-time totals map
  const allTimeTotals = new Map<string, number>();
  for (const v of allTimeVotes) allTimeTotals.set(v.petId, (allTimeTotals.get(v.petId) ?? 0) + (v._sum.quantity ?? 0));
  for (const v of allTimeAnon) allTimeTotals.set(v.petId, (allTimeTotals.get(v.petId) ?? 0) + v._count);

  const top3PetIds = [...allTimeTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);

  const top3Pets = top3PetIds.length
    ? await prisma.pet.findMany({
        where: { id: { in: top3PetIds } },
        select: { id: true, name: true, photos: true, ownerFirstName: true, ownerLastName: true, ownerName: true, state: true },
      })
    : [];
  const top3PetMap = Object.fromEntries(top3Pets.map((p) => [p.id, p]));
  const weeklyVotes = stats._sum.totalVotes ?? 0;
  const mealsHelped = Math.round(weeklyMealsAgg._sum.mealsProvided ?? 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Dog/Cat toggle */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/leaderboard/DOG"
          className={`px-4 py-3 rounded-lg text-base font-semibold transition-all ${
            type === "DOG" ? "bg-brand-500 text-white shadow-sm" : "text-surface-800 hover:bg-surface-100"
          }`}
        >
          Dogs
        </Link>
        <Link
          href="/leaderboard/CAT"
          className={`px-4 py-3 rounded-lg text-base font-semibold transition-all ${
            type === "CAT" ? "bg-brand-500 text-white shadow-sm" : "text-surface-800 hover:bg-surface-100"
          }`}
        >
          Cats
        </Link>
      </div>

      <h1 className="text-3xl font-extrabold text-surface-900 mb-1">
        {type === "DOG" ? "Dog" : "Cat"} Contest Leaderboard
      </h1>
      <p className="text-base text-surface-800 mb-6">
        Week of {start.toLocaleDateString("en-US")} – {end.toLocaleDateString("en-US")} · {total} contestants
      </p>

      <ShelterBanner
        weeklyVotes={weeklyVotes}
        animalType={animalType}
        mealsHelped={mealsHelped}
        weeklyGoal={weeklyGoal}
      />

      <div className="mt-8">

        {/* All-Time Top 3 */}
        {top3PetIds.length > 0 && (
          <div className="mb-10">
            <p className="text-xs font-bold uppercase tracking-wider text-surface-400 mb-4">All-Time Top 3</p>
            <div className="grid grid-cols-3 gap-3">
              {[1, 0, 2].map((posIndex, colIndex) => {
                const petId = top3PetIds[posIndex];
                const pet = petId ? top3PetMap[petId] : null;
                const votes = petId ? (allTimeTotals.get(petId) ?? 0) : 0;
                const isFirst = posIndex === 0;
                const medals = ["🥇", "🥈", "🥉"];
                const heightClass = isFirst ? "pt-0" : "pt-6";
                if (!pet) return <div key={colIndex} />;
                return (
                  <Link key={petId} href={`/pets/${pet.id}`} className={`flex flex-col items-center text-center group ${heightClass}`}>
                    <div className={`relative w-full aspect-square rounded-2xl overflow-hidden mb-2 ring-2 transition-all group-hover:ring-brand-400 ${isFirst ? "ring-yellow-400 shadow-lg" : "ring-surface-200"}`}>
                      <img src={pet.photos[0] || ""} alt={pet.name} className="w-full h-full object-cover" />
                      <span className={`absolute top-2 left-2 text-lg leading-none ${isFirst ? "text-2xl" : ""}`}>{medals[posIndex]}</span>
                    </div>
                    <p className="font-bold text-surface-900 text-sm truncate w-full">{pet.name}</p>
                    <p className="text-xs text-surface-500 truncate w-full">{formatDisplayName(pet.ownerFirstName, pet.ownerLastName, pet.ownerName)}</p>
                    <p className="text-xs font-semibold text-brand-600 mt-0.5">{votes.toLocaleString()} votes</p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-xs font-bold uppercase tracking-wider text-surface-400 mb-4">This Week</p>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {entries.map((s, i) => (
            <PetCard
              key={s.pet.id}
              id={s.pet.id}
              name={s.pet.name}
              ownerName={s.pet.ownerName}
              state={s.pet.state}
              photos={s.pet.photos}
              type={s.pet.type}
              weeklyVotes={s.totalVotes}
              weeklyRank={(page - 1) * limit + i + 1}
              isNew={
                new Date().getTime() - new Date(s.pet.createdAt).getTime() <
                7 * 24 * 60 * 60 * 1000
              }
              animalType={animalType}
            />
          ))}
        </div>

        {entries.length === 0 && (
          <div className="card p-12 text-center">
            <p className="text-surface-800">No entries yet this week.</p>
            <Link href="/pets/new" className="btn-primary mt-4">Add your pet</Link>
          </div>
        )}

        {total > limit && (
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {page > 1 && (
              <Link
                href={`/leaderboard/${type}?page=${page - 1}${state ? `&state=${state}` : ""}`}
                className="btn-secondary"
              >
                Previous
              </Link>
            )}
            <span className="px-4 py-3 text-sm text-surface-800">
              Page {page} of {Math.ceil(total / limit)}
            </span>
            {page < Math.ceil(total / limit) && (
              <Link
                href={`/leaderboard/${type}?page=${page + 1}${state ? `&state=${state}` : ""}`}
                className="btn-secondary"
              >
                Next
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
