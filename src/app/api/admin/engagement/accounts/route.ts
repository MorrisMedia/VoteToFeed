import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/admin/engagement/accounts — List all demo accounts with their pets + stats
export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as Record<string, unknown>)?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await prisma.user.findMany({
    where: { email: { contains: "@iheartdogs.com" } },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      freeVotesRemaining: true,
      paidVoteBalance: true,
      createdAt: true,
      pets: {
        select: {
          id: true,
          name: true,
          type: true,
          breed: true,
          photos: true,
          isActive: true,
          weeklyStats: {
            orderBy: { weekId: "desc" },
            take: 1,
            select: { totalVotes: true, rank: true, weekId: true },
          },
        },
      },
      _count: {
        select: {
          votes: true,
          comments: true,
          scheduledComments: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const totalEngagements = await prisma.engagementLog.count({
    where: { seedAccountId: { in: accounts.map((a) => a.id) } },
  });

  return NextResponse.json({
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      image: a.image,
      freeVotesRemaining: a.freeVotesRemaining,
      paidVoteBalance: a.paidVoteBalance,
      createdAt: a.createdAt.toISOString(),
      pets: a.pets.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        breed: p.breed,
        photo: p.photos[0] || null,
        isActive: p.isActive,
        currentWeekVotes: p.weeklyStats[0]?.totalVotes ?? 0,
        currentWeekRank: p.weeklyStats[0]?.rank ?? null,
      })),
      votesGiven: a._count.votes,
      commentsGiven: a._count.comments,
      scheduledComments: a._count.scheduledComments,
    })),
    totalAccounts: accounts.length,
    totalEngagements,
  });
}
