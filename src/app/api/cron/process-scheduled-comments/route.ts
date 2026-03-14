import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { processScheduledComments } from "@/lib/scheduled-comments";

export const dynamic = "force-dynamic";

// GET /api/cron/process-scheduled-comments — Runs every 5 minutes via Vercel Cron
export async function GET(req: NextRequest) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  try {
    const result = await processScheduledComments();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Process scheduled comments cron error:", error);
    return NextResponse.json(
      { error: "Cron failed", details: String(error) },
      { status: 500 },
    );
  }
}
