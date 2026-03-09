import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentWeekId } from "@/lib/utils";
import { getFreeVotesConfig } from "@/lib/admin-settings";
import { verifyCronSecret } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

// Free vote reset endpoint
// Schedule depends on admin settings (daily/weekly/monthly).
// Default: every Sunday at 11:59 AM PST (19:59 UTC) → Vercel Cron: "59 19 * * 0"
// For daily: "59 19 * * *"  |  For monthly: "59 19 1 * *"
// Secured by CRON_SECRET in production
export async function GET(req: NextRequest) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  const weekId = getCurrentWeekId();
  const config = await getFreeVotesConfig();

  const result = await prisma.user.updateMany({
    data: {
      freeVotesRemaining: config.amount,
      lastFreeVoteReset: new Date(),
    },
  });

  const periodLabel = config.period === "daily" ? "Daily" : config.period === "monthly" ? "Monthly" : "Weekly (Sunday)";

  return NextResponse.json({
    success: true,
    weekId,
    usersReset: result.count,
    freeVotesGranted: config.amount,
    period: config.period,
    resetSchedule: `${periodLabel} at ${config.resetHour}:${String(config.resetMinute).padStart(2, "0")} UTC`,
  });
}
