import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getCurrentWeekId } from "@/lib/utils";
import { getAnimalType, getMealRate } from "@/lib/admin-settings";
import { VoteButton } from "@/components/voting/VoteButton";
import { CommentForm } from "@/components/pets/CommentForm";
import { CommentList } from "@/components/pets/CommentList";
import { rankSuffix, timeAgo } from "@/lib/utils";
import { Metadata } from "next";
import { ShareButtons } from "./ShareButtons";
import { PetImage } from "./PetImage";
import { PetPhotoGallery } from "./PetPhotoGallery";
import { AvatarFallback } from "@/components/shared/AvatarFallback";

export const dynamic = "force-dynamic";

function abbreviateName(name?: string | null) {
  if (!name) return "Anonymous";

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || "Anonymous";

  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase();

  return lastInitial ? `${firstName} ${lastInitial}.` : firstName;
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const weekId = getCurrentWeekId();
  const pet = await prisma.pet.findUnique({
    where: { id: params.id },
    select: {
      name: true,
      type: true,
      breed: true,
      bio: true,
      photos: true,
      ownerName: true,
      weeklyStats: { where: { weekId }, take: 1 },
    },
  });

  if (!pet) return { title: "Pet not found" };

  const weeklyVotes = pet.weeklyStats[0]?.totalVotes ?? 0;
  const rank = pet.weeklyStats[0]?.rank ?? null;
  const photo = pet.photos && pet.photos.length > 0 ? pet.photos[0] : "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://votetofeed.com";

  const title = `Vote for ${pet.name} to win! | Vote to Feed`;
  const description = pet.bio
    ? `${pet.bio} — ${weeklyVotes} votes this week. Every vote helps feed shelter pets!`
    : `${pet.name} has ${weeklyVotes} votes this week. Vote now and help feed shelter pets in need!`;

  const ogParams = new URLSearchParams({
    name: pet.name,
    photo,
    votes: String(weeklyVotes),
    ...(pet.breed ? { breed: pet.breed } : {}),
    ...(rank ? { rank: String(rank) } : {}),
  });
  const ogImage = `${appUrl}/api/og?${ogParams.toString()}`;
  const petUrl = `${appUrl}/pets/${params.id}`;

  return {
    title,
    description,
    alternates: {
      canonical: petUrl,
    },
    openGraph: {
      title: `Vote for ${pet.name} to win! 🏆`,
      description,
      url: petUrl,
      images: [{ url: ogImage, width: 1200, height: 630, alt: `Vote for ${pet.name}` }],
      type: "website",
      siteName: "Vote to Feed",
    },
    twitter: {
      card: "summary_large_image",
      title: `Vote for ${pet.name} to win! 🏆`,
      description,
      images: [ogImage],
    },
  };
}

export default async function PetDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const weekId = getCurrentWeekId();
  const animalType = await getAnimalType();

  const pet = await prisma.pet.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, name: true, image: true } },
      weeklyStats: { where: { weekId }, take: 1 },
      votes: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { user: { select: { name: true, image: true } } },
      },
      comments: {
        where: { parentId: null },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          user: { select: { name: true, image: true } },
          _count: { select: { likes: true } },
          replies: {
            include: {
              user: { select: { name: true, image: true } },
              _count: { select: { likes: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!pet || !pet.isActive) notFound();

  // Find the active contest this pet is entered in
  const now = new Date();
  const activeContestEntry = await prisma.contestEntry.findFirst({
    where: {
      petId: pet.id,
      contest: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    },
    include: {
      contest: { select: { startDate: true, endDate: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Count total votes across the entire contest period (not just current week)
  let totalContestVotes: number;
  if (activeContestEntry) {
    const dateFilter = {
      gte: activeContestEntry.contest.startDate,
      lte: activeContestEntry.contest.endDate,
    };
    const [voteAgg, anonCount] = await Promise.all([
      prisma.vote.aggregate({
        where: { petId: pet.id, createdAt: dateFilter },
        _sum: { quantity: true },
      }),
      prisma.anonymousVote.count({
        where: { petId: pet.id, createdAt: dateFilter },
      }),
    ]);
    totalContestVotes = (voteAgg._sum.quantity ?? 0) + anonCount;
  } else {
    totalContestVotes = pet.weeklyStats[0]?.totalVotes ?? 0;
  }

  // Get rank based on contest leaderboard
  let contestRank: number | null = null;
  if (activeContestEntry) {
    const contestDateFilter = {
      gte: activeContestEntry.contest.startDate,
      lte: activeContestEntry.contest.endDate,
    };
    const allContestEntries = await prisma.contestEntry.findMany({
      where: { contestId: activeContestEntry.contestId },
      select: { petId: true },
    });
    const allPetIds = allContestEntries.map((e) => e.petId);
    const [allVotes, allAnonVotes] = await Promise.all([
      prisma.vote.groupBy({
        by: ["petId"],
        where: { petId: { in: allPetIds }, createdAt: contestDateFilter },
        _sum: { quantity: true },
      }),
      prisma.anonymousVote.groupBy({
        by: ["petId"],
        where: { petId: { in: allPetIds }, createdAt: contestDateFilter },
        _count: true,
      }),
    ]);
    const anonMap = new Map(allAnonVotes.map((v) => [v.petId, v._count]));
    const sorted = allPetIds
      .map((pid) => ({
        petId: pid,
        votes: (allVotes.find((v) => v.petId === pid)?._sum.quantity ?? 0) + (anonMap.get(pid) ?? 0),
      }))
      .sort((a, b) => b.votes - a.votes);
    contestRank = sorted.findIndex((s) => s.petId === pet.id) + 1 || null;
  }

  const weeklyVotes = totalContestVotes;
  const weeklyRank = contestRank ?? pet.weeklyStats[0]?.rank ?? null;

  // Calculate votes needed for top 3 (for competitive nudge)
  let votesNeededForTop3: number | null = null;
  if (activeContestEntry && weeklyRank != null && weeklyRank > 3) {
    const contestDateFilter2 = {
      gte: activeContestEntry.contest.startDate,
      lte: activeContestEntry.contest.endDate,
    };
    const allEntries2 = await prisma.contestEntry.findMany({
      where: { contestId: activeContestEntry.contestId },
      select: { petId: true },
    });
    const petIds2 = allEntries2.map((e) => e.petId);
    const [vg, ag] = await Promise.all([
      prisma.vote.groupBy({ by: ["petId"], where: { petId: { in: petIds2 }, createdAt: contestDateFilter2 }, _sum: { quantity: true } }),
      prisma.anonymousVote.groupBy({ by: ["petId"], where: { petId: { in: petIds2 }, createdAt: contestDateFilter2 }, _count: true }),
    ]);
    const am = new Map(ag.map((v) => [v.petId, v._count]));
    const ranked = petIds2
      .map((pid) => (vg.find((v) => v.petId === pid)?._sum.quantity ?? 0) + (am.get(pid) ?? 0))
      .sort((a, b) => b - a);
    const thirdPlaceVotes = ranked[2] ?? 0;
    votesNeededForTop3 = Math.max(0, thirdPlaceVotes - totalContestVotes + 1);
  }

  const contestEndDate = activeContestEntry?.contest.endDate?.toISOString() ?? null;
  const mealRate = await getMealRate();

  const isOwner = session?.user && (session.user as { id?: string }).id === pet.userId;
  const freeVotes = session?.user
    ? await prisma.user
        .findUnique({
          where: { id: (session.user as { id: string }).id },
          select: { freeVotesRemaining: true, paidVoteBalance: true },
        })
        .then((u) => ({ free: u?.freeVotesRemaining ?? 0, paid: u?.paidVoteBalance ?? 0 }))
    : { free: 0, paid: 0 };

  const currentUserId = session?.user ? (session.user as { id: string }).id : null;
  const likedCommentIds = currentUserId
    ? await prisma.commentLike
        .findMany({ where: { userId: currentUserId }, select: { commentId: true } })
        .then((rows) => new Set(rows.map((r) => r.commentId)))
    : new Set<string>();

  const morePets = await prisma.pet.findMany({
    where: {
      type: pet.type,
      isActive: true,
      id: { not: pet.id },
    },
    include: {
      weeklyStats: { where: { weekId }, take: 1 },
      _count: { select: { votes: true } },
    },
    take: 20,
    orderBy: { createdAt: "desc" },
  });
  const shuffled = morePets.sort(() => Math.random() - 0.5).slice(0, 12);

  const photo = pet.photos && pet.photos.length > 0
    ? pet.photos[0]
    : (pet.type === "CAT"
        ? "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&h=600&fit=crop"
        : "https://images.dog.ceo/breeds/labrador/n02099712_365.jpg");
  const isNew = Date.now() - new Date(pet.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <nav className="mb-6 hidden sm:flex">
        <ol className="flex items-center gap-2 text-sm text-surface-400">
          <li><Link href="/" className="hover:text-surface-600 transition-colors">Home</Link></li>
          <li><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg></li>
          <li><Link href={`/leaderboard/${pet.type}`} className="hover:text-surface-600 transition-colors">{pet.type === "DOG" ? "Dogs" : pet.type === "CAT" ? "Cats" : "Pets"}</Link></li>
          <li><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg></li>
          <li className="text-surface-700 font-medium">{pet.name}</li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
          <PetPhotoGallery
            photos={pet.photos}
            petId={pet.id}
            petName={pet.name}
            petType={pet.type}
            isNew={isNew}
            weeklyRank={weeklyRank}
            rankLabel={weeklyRank != null && weeklyRank <= 10 ? `${rankSuffix(weeklyRank)} this week` : undefined}
            weeklyVotes={weeklyVotes}
            canVote={freeVotes.free > 0 || freeVotes.paid > 0}
            votesRemaining={freeVotes.free + freeVotes.paid}
            isOwner={!!isOwner}
          />
        </div>

        <div className="lg:col-span-2 space-y-5 px-4 sm:px-0">
          <div>
            <div className="flex items-center justify-between">
              <h1 className="text-4xl font-extrabold text-surface-900 tracking-tight lg:text-3xl">{pet.name}</h1>
              {isOwner && <Link href={`/pets/${pet.id}/edit`} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-surface-100 text-surface-600 hover:bg-surface-200 transition-colors">Edit</Link>}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-base text-surface-500 lg:text-sm">{pet.type === "DOG" ? "Dog" : pet.type === "CAT" ? "Cat" : "Pet"}</span>
              {pet.breed && <><span className="text-surface-300">·</span><span className="text-base text-surface-500 lg:text-sm">{pet.breed}</span></>}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-base text-surface-400 lg:text-sm">by {abbreviateName(pet.ownerName)}</span>
              {(pet.city || pet.state) && (
                <span className="text-base text-surface-400 lg:text-sm">· {[pet.city, pet.state].filter(Boolean).join(", ")}</span>
              )}
            </div>
          </div>

          <ShareButtons
            petName={pet.name}
            petId={pet.id}
            petPhoto={photo}
            appUrl={process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}
          />

          <VoteButton
            petId={pet.id}
            petName={pet.name}
            isOwner={!!isOwner}
            initialWeeklyVotes={weeklyVotes}
            freeVotesRemaining={freeVotes.free}
            paidVoteBalance={freeVotes.paid}
            animalType={animalType}
            weeklyRank={weeklyRank}
            petType={pet.type}
            contestEndDate={contestEndDate}
            votesNeededForTop3={votesNeededForTop3}
            mealRate={mealRate}
          />

          {pet.votes.length > 0 && (
            <div>
              <p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-2">Recent voters</p>
              <div className="flex -space-x-2">
                {pet.votes.map((v) => (
                  <AvatarFallback
                    key={v.id}
                    image={v.user.image}
                    name={v.user.name}
                    title={`${v.user.name} · ${timeAgo(new Date(v.createdAt))}`}
                    className="w-10 h-10 lg:w-8 lg:h-8 rounded-full object-cover ring-2 ring-white"
                    fallbackClassName="w-10 h-10 lg:w-8 lg:h-8 rounded-full bg-brand-100 ring-2 ring-white flex items-center justify-center text-[10px] font-bold text-brand-600"
                  />
                ))}
              </div>
            </div>
          )}

          {pet.bio && (
            <div>
              <h3 className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-2">About</h3>
              <p className="text-base lg:text-sm text-surface-600 leading-relaxed">{pet.bio}</p>
            </div>
          )}
        </div>
      </div>

      <section className="mt-12 max-w-3xl">
        <h2 className="section-title mb-4">Comments ({pet.comments.length})</h2>
        {session?.user ? (
          <CommentForm petId={pet.id} />
        ) : (
          <div className="card p-4 text-center">
            <p className="text-sm text-surface-500">
              <Link href={`/auth/signin?callbackUrl=/pets/${pet.id}`} className="text-brand-600 font-medium hover:underline">
                Log in
              </Link>{" "}to comment
            </p>
          </div>
        )}
        <CommentList
          comments={pet.comments.map((c) => ({
            ...c,
            createdAt: c.createdAt.toISOString(),
            likeCount: c._count.likes,
            likedByMe: likedCommentIds.has(c.id),
            replies: c.replies.map((r) => ({
              ...r,
              createdAt: r.createdAt.toISOString(),
              likeCount: r._count.likes,
              likedByMe: likedCommentIds.has(r.id),
            })),
          }))}
          petId={pet.id}
          isLoggedIn={!!session?.user}
        />
      </section>

      {shuffled.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">More {pet.type === "DOG" ? "dogs" : pet.type === "CAT" ? "cats" : "pets"} to love</h2>
            <Link href={`/leaderboard/${pet.type}`} className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors flex items-center gap-1">
              View all
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory -mx-4 px-4">
            {shuffled.map((p) => {
              const pPhoto = p.photos[0] || (p.type === "CAT" ? "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&h=600&fit=crop" : "https://images.dog.ceo/breeds/labrador/n02099712_365.jpg");
              const pVotes = p.weeklyStats[0]?.totalVotes ?? 0;
              const pRank = p.weeklyStats[0]?.rank ?? null;
              return (
                <Link key={p.id} href={`/pets/${p.id}`} className="flex-shrink-0 snap-start w-44 sm:w-44 group">
                  <div className="relative rounded-xl overflow-hidden bg-surface-100 aspect-square shadow-sm group-hover:shadow-md transition-shadow">
                    <PetImage src={pPhoto} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" fallback={p.type === "CAT" ? "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&h=600&fit=crop" : "https://images.dog.ceo/breeds/labrador/n02099712_365.jpg"} />
                    {pRank != null && pRank <= 10 && (
                      <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-[10px] font-bold text-surface-700 px-1.5 py-0.5 rounded-full shadow-sm">
                        #{pRank}
                      </span>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-3 pt-8">
                      <p className="text-white text-sm font-bold truncate">{p.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] text-white/80">🐾</span>
                        <span className="text-[11px] text-white/90 font-medium">{pVotes} votes</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
