import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const FROM_EMAIL = "VoteToFeed <noreply@votetofeed.com>";

// POST /api/admin/emails/test-send — send a test email to a private address
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { to, subject, html } = await req.json();

  if (!to || typeof to !== "string" || !to.includes("@")) {
    return NextResponse.json({ error: "Valid email address required" }, { status: 400 });
  }
  if (!subject || typeof subject !== "string") {
    return NextResponse.json({ error: "Subject required" }, { status: 400 });
  }
  if (!html || typeof html !== "string") {
    return NextResponse.json({ error: "HTML content required" }, { status: 400 });
  }

  try {
    await sendEmail({
      from: FROM_EMAIL,
      to: [to],
      subject: `[TEST] ${subject}`,
      html,
    });

    return NextResponse.json({ ok: true, sentTo: to });
  } catch (error) {
    console.error("Test email send failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send test email" },
      { status: 500 }
    );
  }
}
