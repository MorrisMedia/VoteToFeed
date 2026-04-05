import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/stats/social-proof — Recent purchases for social proof toasts
export async function GET() {
  try {
    const recentPurchases = await prisma.purchase.findMany({
      where: { status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        packageTier: true,
        votes: true,
        mealsProvided: true,
        createdAt: true,
        user: {
          select: { name: true },
        },
      },
    });

    const totalMeals = await prisma.purchase.aggregate({
      where: { status: "COMPLETED" },
      _sum: { mealsProvided: true },
    });

    const totalVotes = await prisma.vote.count();
    const anonymousVotes = await prisma.anonymousVote.count();

    return NextResponse.json({
      recentPurchases: recentPurchases.map((p) => {
        const nameParts = (p.user.name || "Someone").trim().split(/\s+/);
        const displayName =
          nameParts.length >= 2
            ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]?.toUpperCase()}.`
            : nameParts[0];
        return {
          name: displayName,
          votes: p.votes,
          meals: Math.round(p.mealsProvided),
          tier: p.packageTier,
          timeAgo: getTimeAgo(p.createdAt),
        };
      }),
      totalMeals: Math.round(totalMeals._sum.mealsProvided ?? 0),
      totalVotes: totalVotes + anonymousVotes,
    });
  } catch (error) {
    console.error("Error fetching social proof:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
