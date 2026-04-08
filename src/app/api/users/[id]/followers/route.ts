import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/users/[id]/followers — list followers
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "followers"; // "followers" or "following"
  const take = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);
  const skip = parseInt(url.searchParams.get("offset") || "0");

  if (type === "following") {
    const records = await prisma.follow.findMany({
      where: { followerId: params.id },
      include: {
        following: {
          select: {
            id: true,
            name: true,
            image: true,
            _count: { select: { followers: true, pets: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    });

    const total = await prisma.follow.count({
      where: { followerId: params.id },
    });

    return NextResponse.json({
      users: records.map((r) => r.following),
      total,
    });
  }

  // Default: followers
  const records = await prisma.follow.findMany({
    where: { followingId: params.id },
    include: {
      follower: {
        select: {
          id: true,
          name: true,
          image: true,
          _count: { select: { followers: true, pets: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take,
    skip,
  });

  const total = await prisma.follow.count({
    where: { followingId: params.id },
  });

  return NextResponse.json({
    users: records.map((r) => r.follower),
    total,
  });
}
