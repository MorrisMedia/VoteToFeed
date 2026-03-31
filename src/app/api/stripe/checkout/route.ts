import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStripeAsync } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { VOTE_PACKAGES, calculateMeals } from "@/lib/utils";
import { getMealRate } from "@/lib/admin-settings";

const VTF_BRAND = "votetofeed";
const VTF_SITE = "votetofeed.com";

export async function POST(req: NextRequest) {
  let purchaseId: string | null = null;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const { tier } = await req.json();

    const pkg = VOTE_PACKAGES.find((p) => p.tier === tier);
    if (!pkg) {
      return NextResponse.json(
        { error: "Invalid package tier" },
        { status: 400 }
      );
    }

    // Validate Stripe configuration before creating a pending purchase.
    let stripe;
    try {
      stripe = await getStripeAsync();
    } catch (error) {
      console.error("Stripe is not configured for checkout:", error);
      return NextResponse.json(
        { error: "Vote purchases are temporarily unavailable. Please try again shortly." },
        { status: 503 }
      );
    }

    const mealRate = await getMealRate();
    const meals = calculateMeals(pkg.price, mealRate);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://votetofeed.com";

    // Create pending purchase record first so we can attach its ID to Stripe metadata
    const purchase = await prisma.purchase.create({
      data: {
        userId,
        packageTier: tier,
        votes: pkg.votes,
        amount: pkg.price,
        status: "PENDING",
        mealsProvided: meals,
        mealRateAtPurchase: mealRate,
      },
    });
    purchaseId = purchase.id;

    const metadata = {
      brand: VTF_BRAND,
      site: VTF_SITE,
      purchaseId: purchase.id,
      userId,
      tier,
      votes: pkg.votes.toString(),
      amount: pkg.price.toString(),
      mealRate: mealRate.toString(),
      meals: meals.toString(),
    };

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      client_reference_id: purchase.id,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `[VTF] ${pkg.label} Vote Pack - ${pkg.votes} Votes`,
              description: `Feeds ~${meals} shelter pets in need`,
              metadata: {
                brand: VTF_BRAND,
                site: VTF_SITE,
              },
            },
            unit_amount: pkg.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${appUrl}/dashboard?purchase=success&tier=${tier}`,
      cancel_url: `${appUrl}/dashboard?purchase=cancelled&tier=${tier}`,
      metadata,
      payment_intent_data: {
        metadata,
        description: `VoteToFeed ${pkg.label} vote pack (${pkg.votes} votes)`,
      },
    });

    await prisma.purchase.update({
      where: { id: purchase.id },
      data: {
        stripeSessionId: checkoutSession.id,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    if (purchaseId) {
      await prisma.purchase.delete({ where: { id: purchaseId } }).catch((cleanupError) => {
        console.error("Failed to clean up pending purchase after checkout error:", cleanupError);
      });
    }

    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Unable to start checkout right now. Please try again shortly." },
      { status: 500 }
    );
  }
}
