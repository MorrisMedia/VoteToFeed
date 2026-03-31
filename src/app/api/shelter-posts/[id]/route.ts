import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const user = await prisma.user.findUnique({ where: { id: (session.user as { id: string }).id }, select: { role: true } });
  return user?.role === "ADMIN" ? session.user : null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await prisma.shelterPost.findUnique({
    where: { id },
    include: { author: { select: { name: true, image: true } }, contest: { select: { id: true, name: true } } },
  });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(post);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const key of ["title", "featuredImage", "content", "caption", "videoUrl", "location", "contestId", "isPublished"]) {
    if (body[key] !== undefined) data[key] = body[key] || null;
  }
  if (body.isPublished !== undefined) data.isPublished = body.isPublished;
  if (body.photos !== undefined) data.photos = body.photos;
  if (body.tags !== undefined) data.tags = body.tags;
  if (body.type !== undefined) data.type = body.type;
  const updated = await prisma.shelterPost.update({ where: { id }, data, include: { author: { select: { name: true, image: true } }, contest: { select: { id: true, name: true } } } });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.shelterPost.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
