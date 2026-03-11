import { notFound } from "next/navigation";
import Link from "next/link";
import { PetCard } from "@/components/pets/PetCard";
import { ShelterBanner } from "@/components/layout/ShelterBanner";
import { getAnimalType, getWeeklyVoteGoal } from "@/lib/admin-settings";
import prisma from "@/lib/prisma";
import { getCurrentWeekId, getWeekDateRange } from "@/lib/utils";

type PageProps = { params: { type: string }; searchParams: { state?: string; page?: string } };

export default async function LeaderboardPage({ params, searchParams }: PageProps) {
  const type = params.type.toUpperCase();
  if (type !== "DOG" && type !== "CAT") notFound();

  const page = Math.max(1, parseInt(searchParams.page || "1"));
  const state = searchParams.state || undefined;
  const limit = 20;
  const weekId = getCurrentWeekId();
  const { start, end } = getWeekDateRange();

  const [animalType, weeklyGoal, stats, weeklyMealsAgg, entries] = await Promise.all([
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
  ]);

  const total = await prisma.petWeeklyStats.count({
    where: { weekId, pet: { type: type as "DOG" | "CAT", isActive: true, ...(state ? { state } : {}) } },
  });
  const weeklyVotes = stats._sum.totalVotes ?? 0;
  const mealsHelped = Math.round(weeklyMealsAgg._sum.mealsProvided ?? 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Dog/Cat toggle */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/leaderboard/DOG"
          className={`px-4 py-3 rounded-lg text-base font-semibold transition-all ${
            type === "DOG" ? "bg-brand-500 text-white shadow-sm" : "text-surface-600 hover:bg-surface-100"
          }`}
        >
          Dogs
        </Link>
        <Link
          href="/leaderboard/CAT"
          className={`px-4 py-3 rounded-lg text-base font-semibold transition-all ${
            type === "CAT" ? "bg-brand-500 text-white shadow-sm" : "text-surface-600 hover:bg-surface-100"
          }`}
        >
          Cats
        </Link>
      </div>

      <h1 className="text-3xl font-extrabold text-surface-900 mb-1">
        {type === "DOG" ? "Dog" : "Cat"} Contest Leaderboard
      </h1>
      <p className="text-base text-surface-600 mb-6">
        Week of {start.toLocaleDateString("en-US")} – {end.toLocaleDateString("en-US")} · {total} contestants
      </p>

      <ShelterBanner
        weeklyVotes={weeklyVotes}
        animalType={animalType}
        mealsHelped={mealsHelped}
        weeklyGoal={weeklyGoal}
      />

      <div className="mt-8">
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
            <p className="text-surface-600">No entries yet this week.</p>
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
            <span className="px-4 py-3 text-sm text-surface-600">
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
