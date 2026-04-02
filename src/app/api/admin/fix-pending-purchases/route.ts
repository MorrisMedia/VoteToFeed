import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getStripeAsync } from "@/lib/stripe";

export const dynamic = "force-dynamic";

// POST /api/admin/fix-pending-purchases — Complete all stuck PENDING purchases
// Verifies each purchase was actually paid via Stripe before completing.
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as { role?: string }).role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const stripe = await getStripeAsync();

    const pendingPurchases = await prisma.purchase.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    if (pendingPurchases.length === 0) {
      return NextResponse.json({ message: "No pending purchases found", fixed: 0 });
    }

    const results: { id: string; userId: string; userEmail: string | null; votes: number; status: string; reason?: string }[] = [];

    for (const p of pendingPurchases) {
      try {
        // Skip purchases without a Stripe session — they never reached Stripe
        if (!p.stripeSessionId) {
          results.push({ id: p.id, userId: p.userId, userEmail: p.user.email, votes: p.votes, status: "skipped", reason: "no stripeSessionId" });
          continue;
        }

        // Verify with Stripe that this was actually paid
        const stripeSession = await stripe.checkout.sessions.retrieve(p.stripeSessionId);
        if (stripeSession.payment_status !== "paid") {
          results.push({ id: p.id, userId: p.userId, userEmail: p.user.email, votes: p.votes, status: "skipped", reason: `payment_status: ${stripeSession.payment_status}` });
          continue;
        }

        await prisma.$transaction(async (tx) => {
          const result = await tx.purchase.updateMany({
            where: { id: p.id, status: "PENDING" },
            data: {
              status: "COMPLETED",
              stripePaymentId: typeof stripeSession.payment_intent === "string"
                ? stripeSession.payment_intent
                : undefined,
            },
          });
          if (result.count === 0) return;
          await tx.user.update({
            where: { id: p.userId },
            data: { paidVoteBalance: { increment: p.votes } },
          });
        });
        results.push({ id: p.id, userId: p.userId, userEmail: p.user.email, votes: p.votes, status: "fixed" });
      } catch (err) {
        console.error(`Failed to fix purchase ${p.id}:`, err);
        results.push({ id: p.id, userId: p.userId, userEmail: p.user.email, votes: p.votes, status: "error" });
      }
    }

    return NextResponse.json({
      message: `Processed ${results.length} pending purchases`,
      fixed: results.filter((r) => r.status === "fixed").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      errors: results.filter((r) => r.status === "error").length,
      results,
    });
  } catch (error) {
    console.error("Fix pending purchases error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
