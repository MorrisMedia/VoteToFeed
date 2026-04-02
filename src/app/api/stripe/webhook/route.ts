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
  purchase: { id: string; status: string; userId: string; votes: number; amount: number; mealsProvided: number };
  stripePaymentId?: string | null;
  userId?: string;
  votes?: number;
  amount?: number;
  meals?: number;
}) {
  if (purchase.status === "COMPLETED") return;

  // Fall back to the Purchase record's own data when Stripe metadata is missing
  const resolvedUserId = userId || purchase.userId;
  const resolvedVotes = votes || purchase.votes;
  const resolvedAmount = amount ?? purchase.amount;
  const resolvedMeals = meals ?? purchase.mealsProvided;

  if (!resolvedUserId || !resolvedVotes) {
    console.error(`completePurchase: missing userId or votes for purchase ${purchase.id}`, {
      metadataUserId: userId,
      metadataVotes: votes,
      purchaseUserId: purchase.userId,
      purchaseVotes: purchase.votes,
    });
    return;
  }

  // Use updateMany with a status guard inside the transaction to prevent
  // double-incrementing if both checkout.session.completed and
  // payment_intent.succeeded fire at the same time.
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.purchase.updateMany({
      where: { id: purchase.id, status: { not: "COMPLETED" } },
      data: {
        status: "COMPLETED",
        stripePaymentId: stripePaymentId || undefined,
      },
    });

    // If no rows were updated, another webhook already completed this purchase
    if (result.count === 0) return false;

    await tx.user.update({
      where: { id: resolvedUserId },
      data: {
        paidVoteBalance: { increment: resolvedVotes },
      },
    });

    return true;
  });

  if (!updated) return;

  const user = await prisma.user.findUnique({
    where: { id: resolvedUserId },
    select: { email: true },
  });

  if (user?.email) {
    const animalType = await getAnimalType();
    await sendPurchaseConfirmation(
      user.email,
      resolvedVotes,
      resolvedAmount || 0,
      resolvedMeals || 0,
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

        if (!purchase) {
          console.error("checkout.session.completed: no matching purchase found", {
            metadata,
            sessionId: session.id,
          });
          break;
        }

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

        if (!purchase) {
          console.error("payment_intent.succeeded: no matching purchase found", {
            metadata,
            intentId: intent.id,
          });
          break;
        }

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
