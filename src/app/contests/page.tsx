import Link from "next/link";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ContestsPage() {
  const now = new Date();

  const contests = await prisma.contest.findMany({
    where: { isActive: true },
    include: {
      _count: { select: { entries: true } },
      prizes: { orderBy: { placement: "asc" }, select: { value: true, placement: true, title: true } },
    },
    orderBy: [{ endDate: "asc" }],
  });

  const active = contests.filter((c) => c.endDate >= now && c.startDate <= now);
  const upcoming = contests.filter((c) => c.startDate > now);
  const ended = contests.filter((c) => c.endDate < now);

  function daysLeft(end: Date) {
    return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }


  function typeBadge(type: string) {
    const map: Record<string, string> = { NATIONAL: "bg-brand-100 text-brand-700", SEASONAL: "bg-amber-100 text-amber-700", CHARITY: "bg-emerald-100 text-emerald-700", CALENDAR: "bg-violet-100 text-violet-700", BREED: "bg-sky-100 text-sky-700", STATE: "bg-orange-100 text-orange-700" };
    return map[type] || "bg-surface-100 text-surface-600";
  }

  function ContestCard({ contest, isEnded }: { contest: typeof contests[0]; isEnded?: boolean }) {
    const prizeTotal = contest.prizes.reduce((s, p) => s + p.value, 0);
    return (
      <Link
        href={`/contests/${contest.id}`}
        className={`rounded-xl overflow-hidden bg-white border border-surface-200/80 shadow-sm hover:shadow-md transition-shadow group ${isEnded ? "opacity-70" : ""}`}
      >
        <div className="relative h-36 sm:h-44 bg-surface-100 overflow-hidden">
          {contest.coverImage ? (
            <img src={contest.coverImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center">
              <span className="text-5xl">{contest.petType === "DOG" ? "🐶" : "🐱"}</span>
            </div>
          )}
          <div className="absolute top-2.5 left-2.5 flex gap-1.5">
            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full backdrop-blur-sm ${typeBadge(contest.type)}`}>
              {contest.typeLabel || contest.type}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-100/90 text-surface-600 backdrop-blur-sm">
              {contest.petType === "DOG" ? "Dogs" : "Cats"}
            </span>
            {contest.isFeatured && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-yellow-100/90 text-yellow-700 backdrop-blur-sm">Featured</span>
            )}
          </div>
          {!isEnded && (
            <div className="absolute top-2.5 right-2.5">
              <span className="text-[10px] font-bold bg-black/60 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                {daysLeft(contest.endDate)}d left
              </span>
            </div>
          )}
          {isEnded && (
            <div className="absolute top-2.5 right-2.5">
              <span className="text-[10px] font-bold bg-red-600/80 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">Ended</span>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-bold text-surface-900 text-base leading-snug">{contest.name}</h3>
          {contest.description && (
            <p className="text-sm text-surface-500 mt-1 line-clamp-2 leading-relaxed">{contest.description}</p>
          )}
          <div className="flex items-center gap-3 mt-3 text-xs text-surface-500 flex-wrap">
            <span>{contest._count.entries} entries</span>
            <span>{contest.startDate.toLocaleDateString()} — {contest.endDate.toLocaleDateString()}</span>
            {prizeTotal > 0 && (
              <span className="font-semibold text-emerald-600">${(prizeTotal / 100).toLocaleString()} in prizes</span>
            )}
            {contest.sponsorName && <span>Sponsored by {contest.sponsorName}</span>}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 tracking-tight">Contests</h1>
        <p className="text-sm text-surface-500 mt-1">Browse active contests, enter your pet, and win epic prize packs.</p>
      </div>

      {/* Active */}
      {active.length > 0 && (
        <div className="mb-10">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-subtle" />
            Active Now ({active.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map((c) => <ContestCard key={c.id} contest={c} />)}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="mb-10">
          <h2 className="section-title mb-4">Coming Soon ({upcoming.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map((c) => <ContestCard key={c.id} contest={c} />)}
          </div>
        </div>
      )}

      {/* Ended */}
      {ended.length > 0 && (
        <div>
          <h2 className="section-title mb-4">Past Contests ({ended.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ended.map((c) => <ContestCard key={c.id} contest={c} isEnded />)}
          </div>
        </div>
      )}

      {contests.length === 0 && (
        <div className="card p-16 text-center">
          <p className="text-surface-500">No contests available right now. Check back soon!</p>
        </div>
      )}
    </div>
  );
}
