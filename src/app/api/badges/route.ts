import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/badges — list all badges with current user's earned status
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const badges = await prisma.badge.findMany({
    orderBy: [{ category: "asc" }, { threshold: "asc" }],
  });

  let earnedSlugs = new Set<string>();
  if (userId) {
    const userBadges = await prisma.userBadge.findMany({
      where: { userId },
      include: { badge: { select: { slug: true } } },
    });
    earnedSlugs = new Set(userBadges.map((ub) => ub.badge.slug));
  }

  return NextResponse.json(
    badges.map((b) => ({
      ...b,
      earned: earnedSlugs.has(b.slug),
    }))
  );
}
