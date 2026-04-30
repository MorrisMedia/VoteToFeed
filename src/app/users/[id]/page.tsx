import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Metadata } from "next";
import { PublicProfileClient } from "./PublicProfileClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { name: true },
  });
  if (!user) return { title: "User Not Found | VoteToFeed" };
  return {
    title: `${user.name || "User"}'s Profile | VoteToFeed`,
    description: `Check out ${user.name || "this user"}'s pets and badges on VoteToFeed`,
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      image: true,
      city: true,
      state: true,
      country: true,
      createdAt: true,
      votingStreak: true,
      pets: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          type: true,
          breed: true,
          photos: true,
          createdAt: true,
          weeklyStats: {
            orderBy: { totalVotes: "desc" },
            take: 1,
            select: { totalVotes: true, weekId: true },
          },
          contestEntries: {
            orderBy: { createdAt: "desc" },
            select: {
              contest: {
                select: { id: true, name: true, isActive: true, endDate: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          pets: true,
          votes: true,
          followers: true,
          following: true,
        },
      },
      badges: {
        include: { badge: true },
        orderBy: { earnedAt: "desc" },
      },
    },
  });

  if (!user) notFound();

  let isFollowing = false;
  if (currentUserId && currentUserId !== params.id) {
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: params.id,
        },
      },
    });
    isFollowing = !!follow;
  }

  return (
    <PublicProfileClient
      profile={{
        id: user.id,
        name: user.name || "Anonymous",
        image: user.image,
        city: user.city,
        state: user.state,
        country: user.country,
        createdAt: user.createdAt.toISOString(),
        votingStreak: user.votingStreak,
        pets: user.pets.map((p) => {
          const now = new Date();
          return {
            id: p.id,
            name: p.name,
            type: p.type,
            breed: p.breed,
            photos: p.photos,
            createdAt: p.createdAt.toISOString(),
            totalVotes: p.weeklyStats[0]?.totalVotes ?? 0,
            contests: p.contestEntries.map((ce) => ({
              id: ce.contest.id,
              name: ce.contest.name,
              isActive: ce.contest.isActive && ce.contest.endDate >= now,
            })),
          };
        }),
        followerCount: user._count.followers,
        followingCount: user._count.following,
        petCount: user._count.pets,
        voteCount: user._count.votes,
        badges: user.badges.map((ub) => ({
          id: ub.badge.id,
          slug: ub.badge.slug,
          name: ub.badge.name,
          description: ub.badge.description,
          icon: ub.badge.icon,
          category: ub.badge.category,
          earnedAt: ub.earnedAt.toISOString(),
        })),
        isFollowing,
        isOwnProfile: currentUserId === params.id,
      }}
      isLoggedIn={!!currentUserId}
      currentUserId={currentUserId || undefined}
    />
  );
}
