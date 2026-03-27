import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/google-calendar";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  // Reject past dates
  const todayStr = new Date().toISOString().slice(0, 10);
  if (date < todayStr) {
    return NextResponse.json({ slots: [] });
  }

  const slots = await getAvailableSlots(date);
  return NextResponse.json({ slots });
}
