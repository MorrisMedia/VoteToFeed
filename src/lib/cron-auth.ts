import { NextRequest, NextResponse } from "next/server";

/**
 * Verify the cron request is authorized via CRON_SECRET.
 * Returns null if authorized, or a 401 NextResponse if not.
 *
 * Usage:
 *   const authError = verifyCronSecret(req);
 *   if (authError) return authError;
 */
export function verifyCronSecret(req: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  // Always enforce — if CRON_SECRET isn't set, block all requests
  // to prevent accidental open endpoints in production.
  if (!cronSecret) {
    console.error("[cron-auth] CRON_SECRET env var is not set — blocking request");
    return NextResponse.json({ error: "Cron secret not configured" }, { status: 401 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null; // authorized
}
