import Link from "next/link";
import { getServerSession } from "next-auth";
import { PetImage } from "@/app/pets/[id]/PetImage";
import { getAnimalType, getWeeklyVoteGoal } from "@/lib/admin-settings";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getCurrentWeekId, getWeekDateRange, formatDisplayName } from "@/lib/utils";

const signupHref = "/auth/signup?callbackUrl=%2Fpets%2Fnew";

async function getHomeData() {
  const weekId = getCurrentWeekId();
  const now = new Date();
  const { start, end } = getWeekDateRange();
  const [animalType, weeklyGoal] = await Promise.all([
    getAnimalType(),
    getWeeklyVoteGoal(),
  ]);

  const [stats, weeklyMealsAgg, totalPets, topPets, featuredContest] = await Promise.all([
    prisma.petWeeklyStats.aggregate({
      where: { weekId, pet: { isActive: true } },
      _sum: { totalVotes: true },
    }),
    prisma.purchase.aggregate({
      where: { status: "COMPLETED", createdAt: { gte: start, lt: end } },
      _sum: { mealsProvided: true },
    }),
    prisma.pet.count({ where: { isActive: true } }),
    prisma.petWeeklyStats.findMany({
      where: { weekId, pet: { isActive: true } },
      include: {
        pet: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: { totalVotes: "desc" },
      take: 3,
    }),
    prisma.contest.findFirst({
      where: { isActive: true, endDate: { gte: now }, startDate: { lte: now } },
      include: {
        _count: { select: { entries: true } },
        prizes: { orderBy: { placement: "asc" }, select: { value: true } },
      },
      orderBy: [{ isFeatured: "desc" }, { endDate: "asc" }],
    }),
  ]);

  return {
    animalType,
    weeklyGoal,
    weeklyVotes: stats._sum.totalVotes ?? 0,
    mealsHelped: Math.round(weeklyMealsAgg._sum.mealsProvided ?? 0),
    totalPets,
    featuredContest: featuredContest
      ? {
          id: featuredContest.id,
          name: featuredContest.name,
          petType: featuredContest.petType,
          entryCount: featuredContest._count.entries,
          totalPrizeValue: featuredContest.prizes.reduce((sum, prize) => sum + prize.value, 0),
        }
      : null,
    topPets: topPets.map((entry, index) => ({
      id: entry.pet.id,
      name: entry.pet.name,
      ownerName: formatDisplayName(entry.pet.ownerFirstName, entry.pet.ownerLastName, entry.pet.ownerName),
      photos: entry.pet.photos,
      type: entry.pet.type,
      weeklyVotes: entry.totalVotes,
      weeklyRank: index + 1,
    })),
  };
}

function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg width="40" height="40" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M6 20 Q6 29 18 29 Q30 29 30 20" stroke="#2EC4B6" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <line x1="18" y1="29" x2="18" y2="32" stroke="#2EC4B6" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="12" y1="32" x2="24" y2="32" stroke="#2EC4B6" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="5" y1="20" x2="31" y2="20" stroke="#2EC4B6" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M18 16 C18 16 14 12.5 14 10.5 C14 9 15.2 8 16.5 8 C17.2 8 17.8 8.4 18 8.9 C18.2 8.4 18.8 8 19.5 8 C20.8 8 22 9 22 10.5 C22 12.5 18 16 18 16Z" fill="#E8453C"/>
    </svg>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="card p-6">
      <div className="w-10 h-10 rounded-2xl bg-brand-500 text-white flex items-center justify-center text-sm font-black shadow-sm">
        {step}
      </div>
      <h3 className="mt-4 text-xl font-extrabold text-surface-900 tracking-tight">{title}</h3>
      <p className="mt-2 text-base text-surface-700 leading-relaxed">{description}</p>
    </div>
  );
}

function BenefitCard({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-surface-200 bg-white p-6 shadow-sm">
      <div className="text-2xl">{emoji}</div>
      <h3 className="mt-3 text-lg font-extrabold text-surface-900 tracking-tight">{title}</h3>
      <p className="mt-2 text-base text-surface-700 leading-relaxed">{description}</p>
    </div>
  );
}

export default async function HomePage() {
  const [data, session] = await Promise.all([getHomeData(), getServerSession(authOptions)]);
  const isLoggedIn = !!session?.user;
  const featuredPet = data.topPets[0] ?? null;
  const spotlightPets = data.topPets;
  const goalPercent = data.weeklyGoal > 0 ? Math.min(100, Math.round((data.weeklyVotes / data.weeklyGoal) * 100)) : 0;

  return (
    <div className="min-h-screen bg-white">
      <section className="relative overflow-hidden border-b border-surface-100 bg-[linear-gradient(180deg,#fff_0%,#fff7f1_45%,#ffffff_100%)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(232,69,60,0.10),transparent_28%),radial-gradient(circle_at_top_left,rgba(46,196,182,0.12),transparent_30%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full border border-brand-100 bg-white px-4 py-2 shadow-sm">
                <LogoMark className="w-7 h-7" />
                <span className="text-sm font-bold text-surface-800">VoteToFeed</span>
                <span className="hidden sm:inline text-sm text-surface-700">Free pet photo contests that help feed shelter pets</span>
              </div>

              <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-black text-surface-900 tracking-tight leading-[1.02]">
                Enter your pet.
                <br />
                <span className="text-brand-500">Win prizes.</span>
                <br />
                Feed shelter pets.
              </h1>

              <p className="mt-5 max-w-2xl text-lg sm:text-xl text-surface-700 leading-relaxed">
                Upload your dog or cat, rally votes, and compete for weekly prizes — while every vote helps put food in a shelter bowl.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                {isLoggedIn ? (
                  <>
                    <Link href="/pets/new" className="btn-primary text-base sm:text-lg px-6 py-4">
                      Add Pet
                    </Link>
                    <Link href="/pets" className="btn-secondary text-base sm:text-lg px-6 py-4">
                      Vote Now
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href={signupHref} className="btn-primary text-base sm:text-lg px-6 py-4">
                      Enter Your Pet Free
                    </Link>
                    <Link href="/auth/signup" className="btn-secondary text-base sm:text-lg px-6 py-4">
                      Sign Up to Vote
                    </Link>
                  </>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm sm:text-base text-surface-700">
                <span className="font-semibold text-surface-900">Free to enter</span>
                <span>Dogs & cats</span>
                <span>Weekly winners</span>
                <span>Mobile-friendly signup</span>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[32px] border border-surface-200 bg-white p-4 sm:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
                {featuredPet ? (
                  <div className="grid grid-cols-1 gap-4">
                    <Link href={`/pets/${featuredPet.id}`} className="relative block overflow-hidden rounded-[28px] bg-surface-100 aspect-[4/5] group">
                      <PetImage
                        src={featuredPet.photos[0] || ""}
                        alt={featuredPet.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        petId={featuredPet.id}
                        petType={featuredPet.type}
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-5 py-5">
                        <div className="flex items-end justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-white text-2xl font-black leading-tight truncate">{featuredPet.name}</p>
                            <p className="text-white/80 text-sm truncate">{featuredPet.ownerName}</p>
                          </div>
                          <div className="rounded-full bg-white/90 px-3 py-1.5 text-sm font-bold text-surface-900 backdrop-blur-sm">
                            #{featuredPet.weeklyRank}
                          </div>
                        </div>
                      </div>
                    </Link>

                    <div className="rounded-[24px] bg-surface-50 p-4 border border-surface-200">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-surface-900">This week&apos;s featured pet</p>
                          <p className="text-sm text-surface-700">{featuredPet.weeklyVotes.toLocaleString()} votes and climbing</p>
                        </div>
                        <Link href={isLoggedIn ? "/pets/new" : signupHref} className="btn-primary px-4 py-3 text-sm whitespace-nowrap">
                          {isLoggedIn ? "Add Pet" : "Join Free"}
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[28px] bg-surface-50 border border-surface-200 p-8 text-center">
                    <div className="mx-auto w-16 h-16 rounded-3xl bg-brand-100 flex items-center justify-center text-3xl">🐾</div>
                    <h2 className="mt-4 text-2xl font-black text-surface-900">Your pet could be next.</h2>
                    <p className="mt-2 text-surface-700">{isLoggedIn ? "Be the first to enter this week." : "Create a free account and be the first to enter this week."}</p>
                    <Link href={isLoggedIn ? "/pets/new" : signupHref} className="btn-primary mt-5">{isLoggedIn ? "Add Pet" : "Enter Your Pet Free"}</Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-surface-100 bg-surface-50/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-surface-700">Powered by pet communities trusted by millions</p>
              <p className="mt-1 text-sm sm:text-base text-surface-700">iHeartDogs • iHeartCats • Veteran-owned & operated since 2014</p>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:gap-4 text-sm sm:text-base">
              <div className="rounded-2xl bg-white border border-surface-200 px-4 py-3 text-center font-bold text-surface-900">5.2M Facebook followers</div>
              <div className="rounded-2xl bg-white border border-surface-200 px-4 py-3 text-center font-bold text-surface-900">20M+ total reach</div>
              <div className="rounded-2xl bg-white border border-surface-200 px-4 py-3 text-center font-bold text-surface-900">Weekly prize packs</div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-600">How it works</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-black text-surface-900 tracking-tight">Three quick steps. Built for mobile. Straight into signup.</h2>
          <p className="mt-4 text-lg text-surface-700 leading-relaxed">No maze. No clutter. Just a clean path from click to account to pet entry.</p>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          <StepCard step="1" title="Create your free account" description="Start with signup so every visitor can vote, save progress, and enter a pet without getting lost." />
          <StepCard step="2" title="Upload your pet" description="Add a photo, pick the contest, and set up your pet profile in under a minute on mobile." />
          <StepCard step="3" title="Collect votes and win" description="Share your profile, climb the leaderboard, and help fund meals for shelter pets with every vote." />
        </div>
      </section>

      <section className="bg-surface-50 border-y border-surface-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-18">
          <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-8 lg:gap-12 items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-600">Why people enter</p>
              <h2 className="mt-3 text-3xl sm:text-4xl font-black text-surface-900 tracking-tight">More than a cute pet contest.</h2>
              <p className="mt-4 text-lg text-surface-700 leading-relaxed">
                The page is now centered on the actual offer: free entry, weekly prizes, social exposure, and shelter impact.
              </p>

              <div className="mt-6 rounded-3xl border border-surface-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-surface-900">Weekly shelter impact</p>
                    <p className="text-sm text-surface-700">{data.weeklyVotes.toLocaleString()} votes so far this week for {data.animalType} in need</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-brand-600">{goalPercent}%</p>
                    <p className="text-xs text-surface-700">of weekly goal</p>
                  </div>
                </div>
                <div className="mt-4 h-3 rounded-full bg-surface-100 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500" style={{ width: `${goalPercent}%` }} />
                </div>
              </div>

              {data.featuredContest ? (
                <div className="mt-4 rounded-3xl border border-brand-100 bg-brand-50/50 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">Current contest</p>
                  <h3 className="mt-2 text-xl font-black text-surface-900">{data.featuredContest.name}</h3>
                  <p className="mt-2 text-base text-surface-700">
                    {data.featuredContest.entryCount.toLocaleString()} entries • {data.featuredContest.totalPrizeValue > 0 ? `$${(data.featuredContest.totalPrizeValue / 100).toLocaleString()} in prizes` : "Weekly prize packs"}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <BenefitCard emoji="🏆" title="Weekly prizes" description="Pets compete for prize packs worth hundreds of dollars, with fresh winners every week." />
              <BenefitCard emoji="📣" title="Big audience" description="Top pets get exposure through iHeartDogs and iHeartCats communities with massive reach." />
              <BenefitCard emoji="🍖" title="Real shelter impact" description="Every vote supports meal donations for shelter pets — it is built into the experience, not tacked on." />
              <BenefitCard emoji="📱" title="Fast on mobile" description="The landing flow is optimized for phone traffic so ad clicks can convert cleanly into signups." />
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-18">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-600">Social proof</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black text-surface-900 tracking-tight">Top pets this week</h2>
          </div>
          <Link href="/leaderboard/DOG" className="hidden sm:inline-flex btn-secondary">See leaderboard</Link>
        </div>

        {spotlightPets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {spotlightPets.map((pet) => (
              <Link key={pet.id} href={`/pets/${pet.id}`} className="group rounded-[28px] overflow-hidden border border-surface-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="relative aspect-[5/6] bg-surface-100 overflow-hidden">
                  <PetImage
                    src={pet.photos[0] || ""}
                    alt={pet.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    petId={pet.id}
                    petType={pet.type}
                  />
                  <div className="absolute top-3 left-3 rounded-full bg-white/95 px-3 py-1 text-sm font-black text-surface-900 shadow-sm">
                    #{pet.weeklyRank}
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-xl font-black text-surface-900 tracking-tight truncate">{pet.name}</h3>
                      <p className="mt-1 text-sm text-surface-700 truncate">{pet.ownerName}</p>
                    </div>
                    <div className="rounded-2xl bg-brand-50 px-3 py-2 text-right">
                      <div className="text-lg font-black text-brand-600 leading-none">{pet.weeklyVotes.toLocaleString()}</div>
                      <div className="text-[11px] text-surface-700 mt-1">votes</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center">
            <p className="text-lg font-bold text-surface-900">No pets entered yet.</p>
            <p className="mt-2 text-surface-700">Be the first one on the board.</p>
            <Link href={isLoggedIn ? "/pets/new" : signupHref} className="btn-primary mt-5">{isLoggedIn ? "Add Pet" : "Enter Your Pet Free"}</Link>
          </div>
        )}

        <div className="mt-6 sm:hidden">
          <Link href="/leaderboard/DOG" className="btn-secondary w-full">See leaderboard</Link>
        </div>
      </section>

      <section className="border-t border-surface-100 bg-[linear-gradient(180deg,#fff7f1_0%,#ffffff_100%)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-18 text-center">
          <div className="mx-auto inline-flex items-center gap-3 rounded-full bg-white border border-surface-200 px-4 py-2 shadow-sm">
            <LogoMark className="w-6 h-6" />
            <span className="text-sm font-bold text-surface-800">VoteToFeed</span>
          </div>
          <h2 className="mt-5 text-3xl sm:text-5xl font-black text-surface-900 tracking-tight leading-tight">
            Ready to make your pet the next star?
          </h2>
          <p className="mt-4 text-lg sm:text-xl text-surface-700 leading-relaxed max-w-3xl mx-auto">
            Free account. Fast mobile signup. Straight into pet entry. Every vote helps feed shelter pets in need.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            {isLoggedIn ? (
              <>
                <Link href="/pets/new" className="btn-primary text-base sm:text-lg px-6 py-4">
                  Add Pet
                </Link>
                <Link href="/pets" className="btn-secondary text-base sm:text-lg px-6 py-4">
                  Vote Now
                </Link>
              </>
            ) : (
              <>
                <Link href={signupHref} className="btn-primary text-base sm:text-lg px-6 py-4">
                  Start Free and Enter Your Pet
                </Link>
                <Link href="/auth/signup" className="btn-secondary text-base sm:text-lg px-6 py-4">
                  Create Account to Vote
                </Link>
              </>
            )}
          </div>
          <p className="mt-4 text-sm text-surface-700">No credit card. Dogs and cats welcome. New winners every week.</p>
        </div>
      </section>
    </div>
  );
}
