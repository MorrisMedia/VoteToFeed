import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/admin/users — Search, filter, paginate users
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "SUPPORT"].includes((session.user as { role?: string }).role as string)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || ""; // USER, ADMIN, MODERATOR
    const sort = searchParams.get("sort") || "newest"; // newest, oldest, most_votes, most_spent
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "25"), 100);
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (role && role !== "ALL") {
      where.role = role;
    }

    // Build orderBy
    let orderBy: Record<string, string> = { createdAt: "desc" };
    if (sort === "oldest") orderBy = { createdAt: "asc" };
    else if (sort === "most_votes") orderBy = { paidVoteBalance: "desc" };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          city: true,
          state: true,
          freeVotesRemaining: true,
          paidVoteBalance: true,
          votingStreak: true,
          createdAt: true,
          _count: { select: { pets: true, votes: true, purchases: true, comments: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    // Get total spend per user in this result set
    const userIds = users.map((u) => u.id);
    const spendData = await prisma.purchase.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, status: "COMPLETED" },
      _sum: { amount: true, mealsProvided: true },
    });
    const spendMap = new Map(spendData.map((s) => [s.userId, { amount: s._sum.amount ?? 0, meals: s._sum.mealsProvided ?? 0 }]));

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        image: u.image,
        city: u.city,
        state: u.state,
        freeVotesRemaining: u.freeVotesRemaining,
        paidVoteBalance: u.paidVoteBalance,
        votingStreak: u.votingStreak,
        petsCount: u._count.pets,
        votesCount: u._count.votes,
        purchasesCount: u._count.purchases,
        commentsCount: u._count.comments,
        totalSpent: spendMap.get(u.id)?.amount ?? 0,
        totalMeals: spendMap.get(u.id)?.meals ?? 0,
        createdAt: u.createdAt.toISOString(),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Admin users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/admin/users — Update a user's role or grant votes
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "SUPPORT"].includes((session.user as { role?: string }).role as string)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { userId, action, value } = await req.json();

    if (!userId || !action) {
      return NextResponse.json({ error: "userId and action required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (action === "changeRole") {
      const validRoles = ["USER", "ADMIN", "MODERATOR", "SUPPORT"];
      if (!validRoles.includes(value)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      await prisma.user.update({ where: { id: userId }, data: { role: value } });
      return NextResponse.json({ success: true, message: `${user.name || user.id} role changed to ${value}` });
    }

    if (action === "grantVotes") {
      const amount = parseInt(value);
      if (isNaN(amount) || amount < 1 || amount > 10000) return NextResponse.json({ error: "Invalid vote amount (1-10000)" }, { status: 400 });
      await prisma.user.update({ where: { id: userId }, data: { paidVoteBalance: { increment: amount } } });
      return NextResponse.json({ success: true, message: `Granted ${amount} paid votes to ${user.name || user.id}` });
    }

    if (action === "resetFreeVotes") {
      await prisma.user.update({ where: { id: userId }, data: { freeVotesRemaining: 5 } });
      return NextResponse.json({ success: true, message: `Reset free votes for ${user.name || user.id}` });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Admin user update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
