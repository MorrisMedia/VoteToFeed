import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { PetCard } from "@/components/pets/PetCard";
import { StorytellerEntry } from "@/components/contests/StorytellerEntry";
import { getAnimalType } from "@/lib/admin-settings";
import { formatDisplayName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ContestDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { reentry?: string; petId?: string };
}) {
  const animalType = await getAnimalType();
  const now = new Date();

  const contest = await prisma.contest.findUnique({
    where: { id: params.id },
    include: {
      prizes: { orderBy: { placement: "asc" } },
      entries: {
        include: {
          pet: {
            include: {
              user: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!contest) notFound();

  // Count votes per pet across the ENTIRE contest date range (not just current week)
  const petIds = [...new Set(contest.entries.map((e) => e.petId))];
  const dateFilter = { gte: contest.startDate, lte: contest.endDate };

  const [contestVotes, anonVotes] =
    petIds.length > 0
      ? await Promise.all([
          prisma.vote.groupBy({
            by: ["petId"],
            where: { petId: { in: petIds }, createdAt: dateFilter },
            _sum: { quantity: true },
          }),
          prisma.anonymousVote.groupBy({
            by: ["petId"],
            where: { petId: { in: petIds }, createdAt: dateFilter },
            _count: true,
          }),
        ])
      : [[], []];

  const votesByPet = new Map<string, number>();
  for (const v of contestVotes) votesByPet.set(v.petId, (votesByPet.get(v.petId) ?? 0) + (v._sum.quantity ?? 0));
  for (const v of anonVotes) votesByPet.set(v.petId, (votesByPet.get(v.petId) ?? 0) + v._count);

  const daysLeft = Math.max(0, Math.ceil((contest.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const hasEnded = contest.endDate < now;
  const prizeTotal = contest.prizes.reduce((s, p) => s + p.value, 0);

  const sortedEntries = contest.entries
    .filter((e) => e.pet.isActive)
    .sort((a, b) => {
      const aVotes = votesByPet.get(a.petId) ?? 0;
      const bVotes = votesByPet.get(b.petId) ?? 0;
      return bVotes - aVotes;
    });

  function typeLabel(type: string) {
    const map: Record<string, string> = { NATIONAL: "Weekly", SEASONAL: "Seasonal", CHARITY: "Charity", CALENDAR: "Calendar", BREED: "Breed", STATE: "Regional" };
    return map[type] || type;
  }
  function typeBadge(type: string) {
    const map: Record<string, string> = { NATIONAL: "bg-brand-100 text-brand-700", SEASONAL: "bg-amber-100 text-amber-700", CHARITY: "bg-emerald-100 text-emerald-700", CALENDAR: "bg-violet-100 text-violet-700", BREED: "bg-sky-100 text-sky-700", STATE: "bg-orange-100 text-orange-700" };
    return map[type] || "bg-surface-100 text-surface-600";
  }

  return (
    <div className="min-h-screen">
      <div className="relative h-48 sm:h-64 lg:h-72 bg-surface-100 overflow-hidden">
        {contest.coverImage ? (
          <img src={contest.coverImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand-200 to-brand-400 flex items-center justify-center">
            <span className="text-7xl">{contest.petType === "DOG" ? "🐶" : "🐱"}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${typeBadge(contest.type)}`}>
                {typeLabel(contest.type)}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm">
                {contest.petType === "DOG" ? "Dogs" : "Cats"}
              </span>
              {contest.isFeatured && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-yellow-100/90 text-yellow-700">Featured</span>
              )}
              {hasEnded && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-red-500/80 text-white">Contest Ended</span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">{contest.name}</h1>
            {contest.sponsorName && (
              <p className="text-sm text-white/70 mt-1">Sponsored by {contest.sponsorName}</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {searchParams?.reentry === "success" && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            ✅ Your pet is entered! Share to get more votes.
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="card p-4 text-center">
            <p className="text-xs font-medium text-surface-400 uppercase">Entries</p>
            <p className="text-2xl font-bold text-surface-900 mt-1">{sortedEntries.length}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs font-medium text-surface-400 uppercase">{hasEnded ? "Duration" : "Time Left"}</p>
            <p className="text-2xl font-bold text-surface-900 mt-1">{hasEnded ? "Ended" : `${daysLeft}d`}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs font-medium text-surface-400 uppercase">Total Prizes</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{prizeTotal > 0 ? `$${(prizeTotal / 100).toLocaleString()}` : "TBD"}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs font-medium text-surface-400 uppercase">Entry Fee</p>
            <p className="text-2xl font-bold text-surface-900 mt-1">{contest.entryFee === 0 ? "Free" : `$${(contest.entryFee / 100).toFixed(2)}`}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">Contestants ({sortedEntries.length})</h2>
              {!hasEnded && (
                <Link href="/pets/new" className="btn-primary text-sm px-4 py-2">
                  Enter your pet
                </Link>
              )}
            </div>

            {sortedEntries.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {sortedEntries.map((entry, i) => (
                  <div key={entry.pet.id} className="flex flex-col gap-2">
                    <PetCard
                      id={entry.pet.id}
                      name={entry.pet.name}
                      ownerName={formatDisplayName(entry.pet.ownerFirstName, entry.pet.ownerLastName, entry.pet.ownerName)}
                      state={entry.pet.state}
                      photos={entry.pet.photos}
                      type={entry.pet.type}
                      weeklyVotes={votesByPet.get(entry.petId) ?? 0}
                      weeklyRank={i + 1}
                      isNew={Date.now() - new Date(entry.pet.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000}
                      animalType={animalType}
                    />
                    <StorytellerEntry
                      story={entry.story ?? null}
                      bio={entry.pet.bio ?? null}
                      isStoryteller={contest.isStoryteller}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="card p-12 text-center">
                <p className="text-surface-500">No entries yet. Be the first!</p>
                <Link href="/pets/new" className="btn-primary mt-4 inline-flex">Enter your pet</Link>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="card p-5">
              <h3 className="text-sm font-bold text-surface-900 mb-3">Contest Details</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-surface-500">Starts</span>
                  <span className="font-medium text-surface-800">{contest.startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">Ends</span>
                  <span className="font-medium text-surface-800">{contest.endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">Pet Type</span>
                  <span className="font-medium text-surface-800">{contest.petType === "DOG" ? "Dogs" : "Cats"}</span>
                </div>
                {contest.maxEntries && (
                  <div className="flex justify-between">
                    <span className="text-surface-500">Max Entries</span>
                    <span className="font-medium text-surface-800">{contest.maxEntries}</span>
                  </div>
                )}
              </div>
            </div>

            {contest.description && (
              <div className="card p-5">
                <h3 className="text-sm font-bold text-surface-900 mb-2">About</h3>
                <p className="text-sm text-surface-600 leading-relaxed">{contest.description}</p>
              </div>
            )}

            {contest.rules && (
              <div className="card p-5">
                <h3 className="text-sm font-bold text-surface-900 mb-2">Rules</h3>
                <p className="text-sm text-surface-600 leading-relaxed">{contest.rules}</p>
              </div>
            )}

            {contest.prizes.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-bold text-surface-900 mb-3">Prizes</h3>
                <div className="space-y-3">
                  {contest.prizes.map((prize) => (
                    <div key={prize.id} className="flex items-start gap-3">
                      <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        prize.placement === 1 ? "bg-yellow-100 text-yellow-700" :
                        prize.placement === 2 ? "bg-surface-200 text-surface-600" :
                        prize.placement === 3 ? "bg-orange-100 text-orange-700" :
                        "bg-surface-100 text-surface-500"
                      }`}>
                        {prize.placement}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-surface-800">{prize.title}</span>
                          <span className="text-xs font-bold text-emerald-600">${(prize.value / 100).toLocaleString()}</span>
                        </div>
                        {prize.description && <p className="text-xs text-surface-500 mt-0.5">{prize.description}</p>}
                        {prize.items.length > 0 && (
                          <ul className="mt-1.5 space-y-0.5">
                            {prize.items.map((item, i) => (
                              <li key={i} className="text-xs text-surface-500 flex items-start gap-1.5">
                                <span className="text-brand-400 mt-0.5">•</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {contest.prizes.length === 0 && contest.prizeDescription && (
              <div className="card p-5">
                <h3 className="text-sm font-bold text-surface-900 mb-2">Prizes</h3>
                <p className="text-sm text-surface-600">{contest.prizeDescription}</p>
              </div>
            )}

            {!hasEnded && (
              <Link href="/pets/new" className="btn-primary w-full py-3 text-center block">
                Enter your pet — free
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
