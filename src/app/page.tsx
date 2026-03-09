import Link from "next/link";
import { PetCard } from "@/components/pets/PetCard";
import { ShelterBanner } from "@/components/layout/ShelterBanner";
import { VoteFeed } from "@/components/voting/VoteFeed";
import { getAnimalType, getWeeklyVoteGoal, getFreeVotesConfig } from "@/lib/admin-settings";
import prisma from "@/lib/prisma";
import { getCurrentWeekId, getWeekDateRange, daysRemainingInWeek } from "@/lib/utils";

async function getHomeData() {
  const weekId = getCurrentWeekId();
  const now = new Date();
  const { start, end } = getWeekDateRange();
  const [animalType, weeklyGoal, freeVotesConfig] = await Promise.all([
    getAnimalType(),
    getWeeklyVoteGoal(),
    getFreeVotesConfig(),
  ]);

  const [stats, weeklyMealsAgg, recentPets, popularPets, totalPets, activeContests] = await Promise.all([
    prisma.petWeeklyStats.aggregate({
      where: { weekId },
      _sum: { totalVotes: true, paidVotes: true },
    }),
    // Use stored mealsProvided from actual purchases — not recalculated with current rate
    prisma.purchase.aggregate({
      where: { status: "COMPLETED", createdAt: { gte: start, lt: end } },
      _sum: { mealsProvided: true },
    }),
    prisma.pet.findMany({
      where: { isActive: true },
      include: {
        user: { select: { name: true } },
        weeklyStats: { where: { weekId }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.petWeeklyStats.findMany({
      where: { weekId },
      include: {
        pet: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: { totalVotes: "desc" },
      take: 12,
    }),
    prisma.pet.count({ where: { isActive: true } }),
    prisma.contest.findMany({
      where: { isActive: true, endDate: { gte: now }, startDate: { lte: now } },
      include: {
        _count: { select: { entries: true } },
        prizes: { orderBy: { placement: "asc" }, select: { value: true } },
      },
      orderBy: [{ isFeatured: "desc" }, { endDate: "asc" }],
      take: 10,
    }),
  ]);

  const weeklyVotes = stats._sum.totalVotes ?? 0;
  const mealsHelped = Math.round(weeklyMealsAgg._sum.mealsProvided ?? 0);

  return {
    weeklyVotes,
    animalType,
    mealsHelped,
    weeklyGoal,
    totalPets,
    freeVotesAmount: freeVotesConfig.amount,
    freeVotesPeriod: freeVotesConfig.period,
    recent: recentPets.map((p) => ({
      id: p.id,
      name: p.name,
      ownerName: p.ownerName,
      state: p.state,
      photos: p.photos,
      type: p.type,
      weeklyVotes: p.weeklyStats[0]?.totalVotes ?? 0,
      weeklyRank: null,
      isNew: Date.now() - new Date(p.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000,
    })),
    popular: popularPets.map((s, i) => ({
      id: s.pet.id,
      name: s.pet.name,
      ownerName: s.pet.ownerName,
      state: s.pet.state,
      photos: s.pet.photos,
      type: s.pet.type,
      weeklyVotes: s.totalVotes,
      weeklyRank: i + 1,
      isNew: Date.now() - new Date(s.pet.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000,
    })),
    contests: activeContests.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      typeLabel: c.typeLabel,
      petType: c.petType,
      description: c.description,
      coverImage: c.coverImage,
      startDate: c.startDate.toISOString(),
      endDate: c.endDate.toISOString(),
      isFeatured: c.isFeatured,
      sponsorName: c.sponsorName,
      entryCount: c._count.entries,
      totalPrizeValue: c.prizes.reduce((sum, p) => sum + p.value, 0),
      daysLeft: Math.max(0, Math.ceil((c.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
    })),
  };
}

export default async function HomePage() {
  const data = await getHomeData();
  const daysLeft = daysRemainingInWeek();
  const pets = data.popular.length ? data.popular : data.recent;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-white border-b border-surface-100">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-50 via-transparent to-transparent opacity-60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <div className="flex items-center gap-10 lg:gap-16">
            {/* Left: Text */}
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-50 border border-accent-200/60 text-xs font-medium text-accent-700 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse-subtle" />
                Every vote helps shelter pets
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-surface-900 tracking-tight leading-[1.1]">
                Vote for adorable pets.
                <br />
                <span className="text-brand-500">Feed shelter pets.</span>
              </h1>
              <p className="mt-4 text-base sm:text-lg text-surface-500 leading-relaxed max-w-lg">
                Free photo contests with prize packs worth up to $2,000. Every vote helps feed shelter pets in need.
              </p>
              <p className="mt-2 text-sm text-surface-400">Powered by <span className="font-semibold text-surface-600">iHeartDogs</span> &amp; <span className="font-semibold text-surface-600">iHeartCats</span></p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/pets/new" className="btn-primary text-sm sm:text-base px-5 sm:px-6 py-2.5 sm:py-3">
                  Add your pet — free
                </Link>
                <Link href="/contests" className="btn-secondary text-sm sm:text-base px-5 sm:px-6 py-2.5 sm:py-3">
                  View contests
                </Link>
              </div>
              <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-surface-500">
                <span className="flex items-center gap-1.5">
                  <span className="font-semibold text-surface-900">{data.totalPets.toLocaleString()}</span> pets entered
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="font-semibold text-surface-900">{data.weeklyVotes.toLocaleString()}</span> votes this week
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="font-semibold text-brand-600">{daysLeft}d</span> remaining
                </span>
              </div>
            </div>

            {/* Right: Featured pet photos */}
            {pets.length >= 3 && (
              <div className="hidden md:block flex-shrink-0 w-[320px] lg:w-[400px]">
                <div className="relative">
                  {/* Main featured image */}
                  <Link href={`/pets/${pets[0].id}`} className="block relative rounded-2xl overflow-hidden shadow-card-hover aspect-[4/5] bg-surface-100 group">
                    <img
                      src={pets[0].photos[0] || `https://placedog.net/400/500?random=hero1`}
                      alt={pets[0].name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pt-16 pb-4 px-4">
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-white font-bold text-lg leading-tight">{pets[0].name}</p>
                          <p className="text-white/70 text-xs mt-0.5">{pets[0].ownerName}</p>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-brand-500">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>
                          </svg>
                          <span className="text-xs font-bold text-surface-900">{pets[0].weeklyVotes.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    {/* Rank badge */}
                    <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-bold shadow-md">
                      1
                    </div>
                  </Link>

                  {/* Two smaller overlapping images */}
                  <div className="absolute -bottom-4 -left-4 flex gap-2">
                    <Link href={`/pets/${pets[1].id}`} className="block w-20 h-20 lg:w-24 lg:h-24 rounded-xl overflow-hidden shadow-lg border-2 border-white bg-surface-100 group">
                      <img
                        src={pets[1].photos[0] || `https://placedog.net/200/200?random=hero2`}
                        alt={pets[1].name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </Link>
                    <Link href={`/pets/${pets[2].id}`} className="block w-20 h-20 lg:w-24 lg:h-24 rounded-xl overflow-hidden shadow-lg border-2 border-white bg-surface-100 group">
                      <img
                        src={pets[2].photos[0] || `https://placedog.net/200/200?random=hero3`}
                        alt={pets[2].name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Active Contests Slider */}
      {data.contests.length > 0 && (
        <section className="bg-surface-50/70 border-b border-surface-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-500"><path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26z"/></svg>
                Active Contests
              </h2>
              <Link href="/contests" className="text-xs font-medium text-brand-600 hover:text-brand-700">
                View all &rarr;
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar snap-x snap-mandatory -mx-1 px-1">
              {data.contests.map((contest) => {
                const typeBadge: Record<string, string> = { NATIONAL: "bg-brand-100 text-brand-700", SEASONAL: "bg-amber-100 text-amber-700", CHARITY: "bg-emerald-100 text-emerald-700", CALENDAR: "bg-violet-100 text-violet-700", BREED: "bg-sky-100 text-sky-700", STATE: "bg-orange-100 text-orange-700" };
                return (
                  <Link
                    key={contest.id}
                    href={`/contests/${contest.id}`}
                    className="flex-shrink-0 snap-start w-[280px] sm:w-[320px] rounded-xl overflow-hidden bg-white border border-surface-200/80 shadow-sm hover:shadow-md transition-shadow group"
                  >
                    {/* Cover image */}
                    <div className="relative h-28 sm:h-32 bg-surface-100 overflow-hidden">
                      {contest.coverImage ? (
                        <img src={contest.coverImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center">
                          <span className="text-4xl">{contest.petType === "DOG" ? "🐶" : "🐱"}</span>
                        </div>
                      )}
                      {/* Overlay badges */}
                      <div className="absolute top-2 left-2 flex gap-1.5">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full backdrop-blur-sm ${typeBadge[contest.type] || "bg-surface-100 text-surface-600"}`}>
                          {contest.typeLabel || contest.type}
                        </span>
                        {contest.isFeatured && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-yellow-100/90 text-yellow-700 backdrop-blur-sm">
                            Featured
                          </span>
                        )}
                      </div>
                      {/* Days left pill */}
                      <div className="absolute top-2 right-2">
                        <span className="text-[10px] font-bold bg-black/60 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                          {contest.daysLeft}d left
                        </span>
                      </div>
                    </div>
                    {/* Contest info */}
                    <div className="p-3.5">
                      <h3 className="font-semibold text-surface-900 text-sm leading-snug truncate">{contest.name}</h3>
                      {contest.description && (
                        <p className="text-xs text-surface-500 mt-1 line-clamp-2 leading-relaxed">{contest.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2.5 text-xs text-surface-500">
                        <span className="flex items-center gap-1">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/></svg>
                          {contest.entryCount} entries
                        </span>
                        {contest.totalPrizeValue > 0 && (
                          <span className="flex items-center gap-1 font-semibold text-emerald-600">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26z"/></svg>
                            ${(contest.totalPrizeValue / 100).toLocaleString()} in prizes
                          </span>
                        )}
                        {contest.sponsorName && (
                          <span className="text-surface-400">by {contest.sponsorName}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Shelter Banner */}
        <ShelterBanner
          weeklyVotes={data.weeklyVotes}
          animalType={data.animalType}
          mealsHelped={data.mealsHelped}
          weeklyGoal={data.weeklyGoal}
        />

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main content */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <h2 className="section-title">Top Pets This Week</h2>
              <Link href="/leaderboard/DOG" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                View all &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {pets.map((pet) => (
                <PetCard key={pet.id} {...pet} animalType={data.animalType} />
              ))}
            </div>
            {pets.length === 0 && (
              <div className="card p-16 text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-400"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </div>
                <p className="font-semibold text-surface-700">No pets yet</p>
                <p className="text-sm text-surface-400 mt-1">Be the first to enter!</p>
                <Link href="/pets/new" className="btn-primary mt-4">Add your pet</Link>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <VoteFeed />

            {/* Trust signals */}
            <div className="card p-5 space-y-4">
              <h3 className="text-sm font-semibold text-surface-900">How it works</h3>
              <div className="space-y-3">
                {[
                  { step: "1", title: "Add your pet", desc: "Upload a photo — completely free" },
                  { step: "2", title: "Collect votes", desc: `${data.freeVotesAmount} free votes per ${data.freeVotesPeriod === "daily" ? "day" : data.freeVotesPeriod === "monthly" ? "month" : "week"} for everyone` },
                  { step: "3", title: "Win prizes", desc: "Top pets win packs worth up to $2K" },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-brand-600">{item.step}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-surface-800">{item.title}</p>
                      <p className="text-xs text-surface-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
