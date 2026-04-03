import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail) {
      return NextResponse.json({ ok: true });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true },
    });

    if (user?.email) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://votetofeed.com";
      const resetUrl = `${appUrl}/auth/reset-password?token=${token}`;

      await prisma.passwordResetToken.create({
        data: {
          token,
          userId: user.id,
          expiresAt,
        },
      });

      await sendPasswordResetEmail(user.email, resetUrl);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[forgot-password] error:", error);
    return NextResponse.json({ ok: true });
  }
}
