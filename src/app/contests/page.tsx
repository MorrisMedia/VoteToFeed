import prisma from "@/lib/prisma";
import { ContestCard } from "./ContestCard";

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-surface-900 tracking-tight">Contests</h1>
        <p className="text-base text-surface-800 mt-1">Browse active contests, enter your pet, and win epic prize packs.</p>
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
          <p className="text-surface-700">No contests available right now. Check back soon!</p>
        </div>
      )}
    </div>
  );
}
