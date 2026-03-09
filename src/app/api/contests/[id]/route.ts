import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const user = await prisma.user.findUnique({
    where: { id: (session.user as { id: string }).id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") return null;
  return session.user;
}

// GET /api/contests/[id] — Get single contest details
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const contest = await prisma.contest.findUnique({
    where: { id },
    include: {
      _count: { select: { entries: true } },
      prizes: { orderBy: { placement: "asc" } },
    },
  });
  if (!contest) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(contest);
}

// PUT /api/contests/[id] — Update a contest (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.contest.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};

  // Only update fields that were provided
  if (body.name !== undefined) data.name = body.name;
  if (body.type !== undefined) data.type = body.type;
  if (body.petType !== undefined) data.petType = body.petType;
  if (body.state !== undefined) data.state = body.state || null;
  if (body.startDate !== undefined) data.startDate = new Date(body.startDate);
  if (body.endDate !== undefined) data.endDate = new Date(body.endDate);
  if (body.isActive !== undefined) data.isActive = body.isActive;
  if (body.isFeatured !== undefined) data.isFeatured = body.isFeatured;
  if (body.description !== undefined) data.description = body.description || null;
  if (body.rules !== undefined) data.rules = body.rules || null;
  if (body.coverImage !== undefined) data.coverImage = body.coverImage || null;
  if (body.entryFee !== undefined) data.entryFee = body.entryFee;
  if (body.maxEntries !== undefined) data.maxEntries = body.maxEntries || null;
  if (body.prizeDescription !== undefined) data.prizeDescription = body.prizeDescription || null;
  if (body.sponsorName !== undefined) data.sponsorName = body.sponsorName || null;
  if (body.sponsorLogo !== undefined) data.sponsorLogo = body.sponsorLogo || null;
  if (body.sponsorUrl !== undefined) data.sponsorUrl = body.sponsorUrl || null;

  const updated = await prisma.contest.update({
    where: { id },
    data,
    include: { _count: { select: { entries: true } }, prizes: { orderBy: { placement: "asc" } } },
  });

  return NextResponse.json(updated);
}

// DELETE /api/contests/[id] — Delete a contest (admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const contest = await prisma.contest.findUnique({
    where: { id },
    include: { _count: { select: { entries: true } } },
  });

  if (!contest) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (contest._count.entries > 0) {
    // Soft delete — has entries, just deactivate
    await prisma.contest.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ message: "Contest deactivated (has entries)" });
  } else {
    // Hard delete — no entries
    await prisma.contest.delete({ where: { id } });
    return NextResponse.json({ message: "Contest deleted" });
  }
}
