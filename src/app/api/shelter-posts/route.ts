import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/shelter-posts — Public + admin feed
export async function GET(req: NextRequest) {
  const includeUnpublished = req.nextUrl.searchParams.get("all") === "true";
  const typeFilter = req.nextUrl.searchParams.get("type");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");

  const where: Record<string, unknown> = {};
  if (!includeUnpublished) where.isPublished = true;
  if (typeFilter) where.type = typeFilter;

  const posts = await prisma.shelterPost.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      author: { select: { name: true, image: true } },
      contest: { select: { id: true, name: true, type: true, petType: true } },
    },
  });

  // Also fetch active partners for the public page
  const partners = await prisma.shelterPartner.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ posts, partners });
}

// POST /api/shelter-posts — Create (admin only)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  const post = await prisma.shelterPost.create({
    data: {
      title: body.title || null,
      featuredImage: body.featuredImage || null,
      content: body.content || null,
      photos: body.photos || [],
      caption: body.caption || null,
      videoUrl: body.videoUrl || null,
      tags: body.tags || [],
      type: body.type || "UPDATE",
      location: body.location || null,
      contestId: body.contestId || null,
      authorId: userId,
      isPublished: body.isPublished ?? true,
    },
    include: {
      author: { select: { name: true, image: true } },
      contest: { select: { id: true, name: true, type: true, petType: true } },
    },
  });

  return NextResponse.json(post, { status: 201 });
}
