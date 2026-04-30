import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  let excludeId = "";
  if (session?.user) {
    excludeId = (session.user as { id: string }).id;
  }

  try {
    let followingIds = new Set<string>();
    if (excludeId) {
      const follows = await prisma.follow.findMany({
        where: { followerId: excludeId },
        select: { followingId: true },
      });
      follows.forEach((f) => followingIds.add(f.followingId));
    }

    const users = await prisma.user.findMany({
      where: {
        ...(excludeId ? { id: { not: excludeId } } : {}),
        ...(followingIds.size > 0 ? { id: { notIn: [...followingIds] } } : {}),
      },
      take: 8,
      orderBy: { followers: { _count: "desc" } },
      select: {
        id: true,
        name: true,
        image: true,
        city: true,
        state: true,
        _count: { select: { followers: true } },
      },
    });

    return NextResponse.json(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        image: u.image,
        followerCount: u._count.followers,
      }))
    );
  } catch {
    return NextResponse.json({ error: "Failed to fetch suggested users" }, { status: 500 });
  }
}
