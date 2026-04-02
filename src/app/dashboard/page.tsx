import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

type DashboardPageProps = {
  searchParams?: {
    purchase?: string;
    tier?: string;
  };
};
import { authOptions } from "@/lib/auth";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import prisma from "@/lib/prisma";
import { getCurrentWeekId } from "@/lib/utils";
import { getMealRate, getAnimalType } from "@/lib/admin-settings";
import { getStripeAsync } from "@/lib/stripe";

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin?callbackUrl=/dashboard");

  const userId = (session.user as { id: string }).id;
  const weekId = getCurrentWeekId();

  // Always complete any stuck PENDING purchases for this user.
  // This covers cases where the Stripe webhook failed or was delayed.
  // Only completes purchases that Stripe confirms were actually paid.
  const pendingPurchases = await prisma.purchase.findMany({
    where: { userId, status: "PENDING" },
  });
  if (pendingPurchases.length > 0) {
    let stripe;
    try {
      stripe = await getStripeAsync();
    } catch {
      // Stripe not configured — skip auto-completion
    }
    if (stripe) {
      for (const p of pendingPurchases) {
        try {
          // Verify with Stripe that this checkout session was actually paid
          if (!p.stripeSessionId) continue;
          const stripeSession = await stripe.checkout.sessions.retrieve(p.stripeSessionId);
          if (stripeSession.payment_status !== "paid") continue;

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
              where: { id: userId },
              data: { paidVoteBalance: { increment: p.votes } },
            });
          });
        } catch (err) {
          console.error(`Dashboard: failed to complete pending purchase ${p.id}:`, err);
        }
      }
    }
  }

  const [user, mealRate, animalType] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        freeVotesRemaining: true,
        paidVoteBalance: true,
        votingStreak: true,
        lastVotedWeek: true,
        pets: {
          where: { isActive: true },
          include: {
            weeklyStats: { where: { weekId }, take: 1 },
            _count: { select: { votes: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        purchases: {
          where: { status: "COMPLETED" },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        votes: {
          orderBy: { createdAt: "desc" },
          take: 30,
          include: {
            pet: { select: { name: true, photos: true } },
          },
        },
      },
    }),
    getMealRate(),
    getAnimalType(),
  ]);

  if (!user) redirect("/auth/signin");

  const [lifetimeAgg, totalVotesCast] = await Promise.all([
    prisma.purchase.aggregate({
      where: { userId, status: "COMPLETED" },
      _sum: { mealsProvided: true, amount: true },
    }),
    prisma.vote.count({ where: { userId } }),
  ]);

  return (
    <DashboardClient
      userName={user.name || "User"}
      userEmail={user.email || ""}
      freeVotesRemaining={user.freeVotesRemaining}
      paidVoteBalance={user.paidVoteBalance}
      votingStreak={user.votingStreak}
      animalType={animalType}
      mealRate={mealRate}
      lifetimeMeals={lifetimeAgg._sum.mealsProvided ?? 0}
      lifetimePurchaseAmount={lifetimeAgg._sum.amount ?? 0}
      totalVotesCast={totalVotesCast}
      pets={user.pets.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        breed: p.breed,
        photos: p.photos,
        weeklyVotes: p.weeklyStats[0]?.totalVotes ?? 0,
        weeklyRank: p.weeklyStats[0]?.rank ?? null,
        totalVotes: p._count.votes,
      }))}
      recentPurchases={user.purchases.map((p) => ({
        tier: p.packageTier,
        votes: p.votes,
        meals: p.mealsProvided,
        amount: p.amount,
        createdAt: p.createdAt.toISOString(),
      }))}
      recentVotes={user.votes.map((v) => ({
        id: v.id,
        petName: v.pet.name,
        petPhoto: v.pet.photos[0] ?? null,
        type: v.voteType,
        quantity: v.quantity,
        createdAt: v.createdAt.toISOString(),
      }))}
      purchaseStatus={searchParams?.purchase === "success" || searchParams?.purchase === "cancelled"
        ? searchParams.purchase
        : null}
      purchaseTier={searchParams?.tier ?? null}
    />
  );
}
