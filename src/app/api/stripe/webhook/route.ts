import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import Stripe from "stripe";
import { getStripeAsync } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { sendPurchaseConfirmation } from "@/lib/email";
import { getAnimalType } from "@/lib/admin-settings";

async function findPurchase(metadata?: Record<string, string | undefined>, stripeSessionId?: string | null) {
  const purchaseId = metadata?.purchaseId;

  if (purchaseId) {
    return prisma.purchase.findUnique({ where: { id: purchaseId } });
  }

  if (stripeSessionId) {
    return prisma.purchase.findUnique({ where: { stripeSessionId } });
  }

  return null;
}

async function completePurchase({
  purchase,
  stripePaymentId,
  userId,
  votes,
  amount,
  meals,
}: {
  purchase: { id: string; status: string };
  stripePaymentId?: string | null;
  userId?: string;
  votes?: number;
  amount?: number;
  meals?: number;
}) {
  if (purchase.status === "COMPLETED") return;
  if (!userId || !votes) return;

  await prisma.$transaction(async (tx) => {
    await tx.purchase.update({
      where: { id: purchase.id },
      data: {
        status: "COMPLETED",
        stripePaymentId: stripePaymentId || undefined,
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        paidVoteBalance: { increment: votes },
      },
    });
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (user?.email) {
    const animalType = await getAnimalType();
    await sendPurchaseConfirmation(
      user.email,
      votes,
      amount || 0,
      meals || 0,
      animalType
    ).catch(console.error);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const stripe = await getStripeAsync();
  const { getStripeWebhookSecret } = await import("@/lib/admin-settings");
  const webhookSecret = await getStripeWebhookSecret();

  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = (session.metadata || {}) as Record<string, string>;
        const purchase = await findPurchase(metadata, session.id);

        if (!purchase) break;

        await completePurchase({
          purchase,
          stripePaymentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
          userId: metadata.userId,
          votes: metadata.votes ? parseInt(metadata.votes, 10) : undefined,
          amount: metadata.amount ? parseInt(metadata.amount, 10) : undefined,
          meals: metadata.meals ? parseFloat(metadata.meals) : undefined,
        });
        break;
      }

      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const metadata = (intent.metadata || {}) as Record<string, string>;
        const purchase = await findPurchase(metadata, null);

        if (!purchase) break;

        await completePurchase({
          purchase,
          stripePaymentId: intent.id,
          userId: metadata.userId,
          votes: metadata.votes ? parseInt(metadata.votes, 10) : undefined,
          amount: metadata.amount ? parseInt(metadata.amount, 10) : undefined,
          meals: metadata.meals ? parseFloat(metadata.meals) : undefined,
        });
        break;
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const metadata = (intent.metadata || {}) as Record<string, string>;
        const purchase = await findPurchase(metadata, null);

        if (purchase && purchase.status !== "COMPLETED") {
          await prisma.purchase.update({
            where: { id: purchase.id },
            data: {
              status: "FAILED",
              stripePaymentId: intent.id,
            },
          });
        }
        break;
      }

      case "invoice.payment_succeeded":
      case "invoice.payment_failed":
      case "customer.subscription.deleted":
      case "customer.subscription.updated": {
        // Placeholder for future recurring support. We verify and accept these events now so
        // Stripe can deliver them cleanly when VoteToFeed adds subscriptions.
        break;
      }

      default:
        break;
    }
  } catch (error) {
    console.error("Error processing Stripe webhook:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
