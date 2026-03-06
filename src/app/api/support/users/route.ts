import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isSupportOrAdmin(role: unknown): boolean {
  return role === "ADMIN" || role === "SUPPORT";
}

// GET /api/support/users — Full user search with comprehensive data
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isSupportOrAdmin((session.user as Record<string, unknown>).role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const sort = searchParams.get("sort") || "newest";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "25"), 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { id: search },
      ];
    }
    if (role && role !== "ALL") where.role = role;

    let orderBy: Record<string, string> = { createdAt: "desc" };
    if (sort === "oldest") orderBy = { createdAt: "asc" };
    else if (sort === "most_spent") orderBy = { paidVoteBalance: "desc" };
    else if (sort === "most_votes") orderBy = { paidVoteBalance: "desc" };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, role: true, image: true,
          city: true, state: true, country: true, zipCode: true,
          freeVotesRemaining: true, paidVoteBalance: true, votingStreak: true,
          lastFreeVoteReset: true, lastVotedWeek: true,
          createdAt: true, updatedAt: true, emailVerified: true,
          _count: { select: { pets: true, votes: true, purchases: true, comments: true, accounts: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const userIds = users.map((u) => u.id);
    const spendData = await prisma.purchase.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, status: "COMPLETED" },
      _sum: { amount: true, mealsProvided: true, votes: true },
      _count: true,
    });
    const spendMap = new Map(spendData.map((s) => [s.userId, {
      amount: s._sum.amount ?? 0,
      meals: s._sum.mealsProvided ?? 0,
      votesPurchased: s._sum.votes ?? 0,
      purchaseCount: s._count,
    }]));

    return NextResponse.json({
      users: users.map((u) => ({
        ...u,
        petsCount: u._count.pets,
        votesCount: u._count.votes,
        purchasesCount: u._count.purchases,
        commentsCount: u._count.comments,
        linkedAccounts: u._count.accounts,
        totalSpent: spendMap.get(u.id)?.amount ?? 0,
        totalMeals: spendMap.get(u.id)?.meals ?? 0,
        totalVotesPurchased: spendMap.get(u.id)?.votesPurchased ?? 0,
        lastFreeVoteReset: u.lastFreeVoteReset?.toISOString(),
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Support users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
