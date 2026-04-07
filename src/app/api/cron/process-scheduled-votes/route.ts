import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/cron/process-scheduled-votes — Runs every 5 minutes via Vercel Cron
export async function GET(req: NextRequest) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  try {
    const dueVotes = await prisma.scheduledVote.findMany({
      where: {
        status: "PENDING",
        scheduledFor: { lte: new Date() },
      },
      orderBy: { scheduledFor: "asc" },
      take: 100,
    });

    let processedCount = 0;
    let failedCount = 0;

    for (const sv of dueVotes) {
      try {
        const claimed = await prisma.scheduledVote.updateMany({
          where: { id: sv.id, status: "PENDING" },
          data: { status: "PROCESSING" },
        });

        if (claimed.count === 0) continue;

        await prisma.$transaction(async (tx) => {
          await tx.vote.create({
            data: {
              userId: sv.seedAccountId,
              petId: sv.petId,
              voteType: "FREE",
              quantity: sv.votesAmount,
              contestWeek: sv.weekId,
            },
          });

          await tx.petWeeklyStats.upsert({
            where: { petId_weekId: { petId: sv.petId, weekId: sv.weekId } },
            create: {
              petId: sv.petId,
              weekId: sv.weekId,
              totalVotes: sv.votesAmount,
              freeVotes: sv.votesAmount,
              paidVotes: 0,
            },
            update: {
              totalVotes: { increment: sv.votesAmount },
              freeVotes: { increment: sv.votesAmount },
            },
          });

          await tx.scheduledVote.update({
            where: { id: sv.id },
            data: { status: "PROCESSED", processedAt: new Date() },
          });
        });

        processedCount++;
      } catch (error) {
        failedCount++;
        await prisma.scheduledVote
          .update({
            where: { id: sv.id },
            data: {
              status: "FAILED",
              errorMessage: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
            },
          })
          .catch(() => {});
      }
    }

    // Recalculate rankings if any votes were processed
    if (processedCount > 0) {
      const weekIds = [...new Set(dueVotes.map((v) => v.weekId))];
      for (const weekId of weekIds) {
        const stats = await prisma.petWeeklyStats.findMany({
          where: { weekId },
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
      }
    }

    return NextResponse.json({
      success: true,
      dueCount: dueVotes.length,
      processedCount,
      failedCount,
    });
  } catch (error) {
    console.error("Process scheduled votes cron error:", error);
    return NextResponse.json(
      { error: "Cron failed", details: String(error) },
      { status: 500 },
    );
  }
}
