import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/admin/engagement/scheduled-votes — Get scheduled vote status
export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as Record<string, unknown>)?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [pending, processing, processed, failed] = await Promise.all([
    prisma.scheduledVote.count({ where: { status: "PENDING" } }),
    prisma.scheduledVote.count({ where: { status: "PROCESSING" } }),
    prisma.scheduledVote.count({ where: { status: "PROCESSED" } }),
    prisma.scheduledVote.count({ where: { status: "FAILED" } }),
  ]);

  const pendingVotesTotal = await prisma.scheduledVote.aggregate({
    where: { status: "PENDING" },
    _sum: { votesAmount: true },
  });

  const recentBatches = await prisma.scheduledVote.findMany({
    where: { status: "PENDING" },
    orderBy: { scheduledFor: "asc" },
    take: 20,
    include: {
      pet: { select: { name: true, type: true } },
      seedAccount: { select: { email: true, name: true } },
    },
  });

  return NextResponse.json({
    counts: { pending, processing, processed, failed },
    pendingVotesTotal: pendingVotesTotal._sum.votesAmount ?? 0,
    recentPendingBatches: recentBatches.map((b) => ({
      id: b.id,
      petName: b.pet.name,
      petType: b.pet.type,
      seedEmail: b.seedAccount.email,
      votesAmount: b.votesAmount,
      scheduledFor: b.scheduledFor.toISOString(),
    })),
  });
}

// DELETE /api/admin/engagement/scheduled-votes — Cancel all pending scheduled votes
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as Record<string, unknown>)?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (id) {
    // Cancel specific scheduled vote
    const result = await prisma.scheduledVote.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "FAILED", errorMessage: "Cancelled by admin" },
    });
    return NextResponse.json({ success: true, cancelled: result.count });
  }

  // Cancel all pending
  const result = await prisma.scheduledVote.updateMany({
    where: { status: "PENDING" },
    data: { status: "FAILED", errorMessage: "Bulk cancelled by admin" },
  });

  return NextResponse.json({ success: true, cancelled: result.count });
}
