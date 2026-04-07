import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getCurrentWeekId } from "@/lib/utils";

export const dynamic = "force-dynamic";

// POST /api/admin/engagement/grant-votes — Grant votes to demo account pets
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as Record<string, unknown>)?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { accountId, petId, amount } = body as {
    accountId?: string;
    petId?: string;
    amount?: number;
  };

  if (!accountId || !amount || amount < 1 || amount > 10000) {
    return NextResponse.json({ error: "accountId and amount (1-10000) required" }, { status: 400 });
  }

  // Verify this is a demo account
  const account = await prisma.user.findUnique({
    where: { id: accountId },
    select: { id: true, email: true, paidVoteBalance: true },
  });

  if (!account || !account.email?.includes("@iheartdogs.com")) {
    return NextResponse.json({ error: "Not a demo account" }, { status: 400 });
  }

  // If petId provided, create actual votes on that pet
  if (petId) {
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      select: { id: true, userId: true, isActive: true },
    });

    if (!pet || !pet.isActive) {
      return NextResponse.json({ error: "Pet not found or inactive" }, { status: 404 });
    }

    const weekId = getCurrentWeekId();

    await prisma.$transaction(async (tx) => {
      await tx.vote.create({
        data: {
          userId: accountId,
          petId,
          voteType: "FREE",
          quantity: amount,
          contestWeek: weekId,
        },
      });

      await tx.petWeeklyStats.upsert({
        where: { petId_weekId: { petId, weekId } },
        create: { petId, weekId, totalVotes: amount, freeVotes: amount, paidVotes: 0 },
        update: {
          totalVotes: { increment: amount },
          freeVotes: { increment: amount },
        },
      });
    });

    // Recalculate rankings
    const weekId2 = getCurrentWeekId();
    const stats = await prisma.petWeeklyStats.findMany({
      where: { weekId: weekId2 },
      orderBy: [{ totalVotes: "desc" }, { updatedAt: "asc" }],
      select: { id: true },
    });
    await prisma.$transaction(
      stats.map((stat, index) =>
        prisma.petWeeklyStats.update({
          where: { id: stat.id },
          data: { rank: index + 1 },
        }),
      ),
    );

    return NextResponse.json({
      success: true,
      message: `Granted ${amount} votes to pet ${petId} from account ${account.email}`,
    });
  }

  // If no petId, just add to paid vote balance
  await prisma.user.update({
    where: { id: accountId },
    data: { paidVoteBalance: { increment: amount } },
  });

  return NextResponse.json({
    success: true,
    message: `Added ${amount} paid votes to ${account.email}'s balance`,
  });
}
