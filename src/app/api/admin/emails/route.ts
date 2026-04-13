import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/admin/emails — email stats + recent logs
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setUTCHours(0, 0, 0, 0);

  const startOf7d = new Date(now);
  startOf7d.setUTCDate(startOf7d.getUTCDate() - 7);

  const startOf30d = new Date(now);
  startOf30d.setUTCDate(startOf30d.getUTCDate() - 30);

  const [
    totalEmails,
    emailsToday,
    emails7d,
    emails30d,
    byType,
    byTypeToday,
    recentLogs,
    byDay,
  ] = await Promise.all([
    prisma.contestEmailLog.count(),
    prisma.contestEmailLog.count({ where: { sentAt: { gte: startOfToday } } }),
    prisma.contestEmailLog.count({ where: { sentAt: { gte: startOf7d } } }),
    prisma.contestEmailLog.count({ where: { sentAt: { gte: startOf30d } } }),
    prisma.contestEmailLog.groupBy({
      by: ["emailType"],
      _count: true,
      orderBy: { _count: { emailType: "desc" } },
    }),
    prisma.contestEmailLog.groupBy({
      by: ["emailType"],
      where: { sentAt: { gte: startOfToday } },
      _count: true,
      orderBy: { _count: { emailType: "desc" } },
    }),
    prisma.contestEmailLog.findMany({
      orderBy: { sentAt: "desc" },
      take: 50,
      include: {
        user: { select: { id: true, name: true, email: true } },
        contest: { select: { id: true, name: true } },
      },
    }),
    // Daily breakdown for the last 14 days
    prisma.$queryRaw<Array<{ day: string; count: bigint }>>`
      SELECT DATE("sentAt") as day, COUNT(*) as count
      FROM "ContestEmailLog"
      WHERE "sentAt" >= ${startOf7d}
      GROUP BY DATE("sentAt")
      ORDER BY day DESC
    `,
  ]);

  return NextResponse.json({
    stats: {
      total: totalEmails,
      today: emailsToday,
      last7d: emails7d,
      last30d: emails30d,
    },
    byType: byType.map((t) => ({ type: t.emailType, count: t._count })),
    byTypeToday: byTypeToday.map((t) => ({ type: t.emailType, count: t._count })),
    recentLogs: recentLogs.map((log) => ({
      id: log.id,
      emailType: log.emailType,
      sentAt: log.sentAt,
      userName: log.user?.name || log.user?.email || log.userId,
      userEmail: log.user?.email || null,
      contestName: log.contest?.name || log.contestId,
    })),
    byDay: byDay.map((d) => ({ day: String(d.day), count: Number(d.count) })),
  });
}
