import { NextRequest, NextResponse } from "next/server";
import { runAutoEngagement } from "@/lib/engagement";
import { verifyCronSecret } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

/**
 * ⚠️ CRITICAL: This cron job MUST NEVER:
 * - Modify pet photos or images
 * - Upload images to pet profiles
 * - Create or update pet.photos array
 * - Perform any image-related operations
 *
 * ALLOWED ACTIONS ONLY:
 * - Create votes on pets
 * - Create comments on pets
 * - Create engagement logs
 *
 * Any attempt to modify images must be immediately removed.
 */

// GET /api/cron/auto-engage — Runs every 3 hours via Vercel Cron
export async function GET(req: NextRequest) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  try {
    const result = await runAutoEngagement();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Auto-engage cron error:", error);
    return NextResponse.json({ error: "Cron failed", details: String(error) }, { status: 500 });
  }
}
