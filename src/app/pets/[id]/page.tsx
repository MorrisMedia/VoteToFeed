import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getCurrentWeekId } from "@/lib/utils";
import { getAnimalType } from "@/lib/admin-settings";
import { VoteButton } from "@/components/voting/VoteButton";
import { CommentForm } from "@/components/pets/CommentForm";
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
          replies: {
            include: { user: { select: { name: true, image: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!pet || !pet.isActive) notFound();

  const weeklyVotes = pet.weeklyStats[0]?.totalVotes ?? 0;
  const weeklyRank = pet.weeklyStats[0]?.rank ?? null;
  const isOwner = session?.user && (session.user as { id?: string }).id === pet.userId;
  const freeVotes = session?.user
    ? await prisma.user
        .findUnique({
          where: { id: (session.user as { id: string }).id },
          select: { freeVotesRemaining: true, paidVoteBalance: true },
        })
        .then((u) => ({ free: u?.freeVotesRemaining ?? 0, paid: u?.paidVoteBalance ?? 0 }))
    : { free: 0, paid: 0 };

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
            <h1 className="text-4xl font-extrabold text-surface-900 tracking-tight lg:text-3xl">{pet.name}</h1>
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
            isOwner={!!isOwner}
            initialWeeklyVotes={weeklyVotes}
            freeVotesRemaining={freeVotes.free}
            paidVoteBalance={freeVotes.paid}
            animalType={animalType}
            weeklyRank={weeklyRank}
            petType={pet.type}
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
        <ul className="mt-5 space-y-0 divide-y divide-surface-100">
          {pet.comments.map((c) => (
            <li key={c.id} className="py-4">
              <div className="flex gap-3">
                <AvatarFallback
                  image={c.user.image}
                  name={c.user.name}
                  className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                  fallbackClassName="w-11 h-11 rounded-full bg-surface-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-surface-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold text-surface-900">{abbreviateName(c.user.name)}</p>
                    <p className="text-xs text-surface-600 font-medium">{timeAgo(new Date(c.createdAt))}</p>
                  </div>
                  <p className="text-base text-surface-800 font-medium mt-1">{c.text}</p>
                  {c.replies.length > 0 && (
                    <ul className="mt-3 ml-3 space-y-2 border-l-2 border-surface-100 pl-3">
                      {c.replies.map((r) => (
                        <li key={r.id}>
                          <p className="text-xs font-medium text-surface-700">{abbreviateName(r.user.name)}</p>
                          <p className="text-sm text-surface-700 font-medium">{r.text}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
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
