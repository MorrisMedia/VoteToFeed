import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runAutoEngagement } from "@/lib/engagement";

export async function POST() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as Record<string, unknown>)?.role;

  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runAutoEngagement();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin engagement run error:", error);
    return NextResponse.json({ error: "Failed to run engagement", details: String(error) }, { status: 500 });
  }
}
