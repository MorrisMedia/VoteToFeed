import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";
import { getCurrentWeekId } from "@/lib/utils";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "SUPPORT") redirect("/dashboard");

  const weekId = getCurrentWeekId();

  const [
    settings,
    settingLogs,
    totalUsers,
    totalPets,
    totalVotes,
    weeklyVoteStats,
    totalRevenue,
    weeklyRevenue,
    recentUsers,
    recentPurchases,
    topPetsThisWeek,
    activeContests,
    usersByRole,
    petsByType,
    commentCount,
  ] = await Promise.all([
    prisma.adminSetting.findMany(),
    prisma.adminSettingLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { setting: { select: { key: true } } },
    }),
    prisma.user.count(),
    prisma.pet.count({ where: { isActive: true } }),
    prisma.vote.count(),
    prisma.petWeeklyStats.aggregate({
      where: { weekId },
      _sum: { totalVotes: true, paidVotes: true, freeVotes: true },
    }),
    prisma.purchase.aggregate({
      where: { status: "COMPLETED" },
      _sum: { amount: true, mealsProvided: true },
      _count: true,
    }),
    prisma.purchase.aggregate({
      where: {
        status: "COMPLETED",
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true, name: true, email: true, role: true, createdAt: true,
        paidVoteBalance: true, freeVotesRemaining: true,
        _count: { select: { pets: true, votes: true, purchases: true } },
      },
    }),
    prisma.purchase.findMany({
      where: { status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.petWeeklyStats.findMany({
      where: { weekId },
      orderBy: { totalVotes: "desc" },
      take: 10,
      include: {
        pet: {
          select: { id: true, name: true, type: true, photos: true, ownerName: true },
        },
      },
    }),
    prisma.contest.count({ where: { isActive: true } }),
    prisma.user.groupBy({ by: ["role"], _count: true }),
    prisma.pet.groupBy({ by: ["type"], where: { isActive: true }, _count: true }),
    prisma.comment.count(),
  ]);

  const settingsMap: Record<string, string> = {};
  settings.forEach((s) => (settingsMap[s.key] = s.value));

  return (
    <AdminDashboardClient
      settings={{
        mealRate: settingsMap.meal_rate ?? "10",
        animalType: settingsMap.animal_type ?? "dogs",
        weeklyGoal: settingsMap.weekly_vote_goal ?? "100000",
        termsOfService: settingsMap.terms_of_service ?? "",
        privacyPolicy: settingsMap.privacy_policy ?? "",
        freeVotesAmount: settingsMap.free_votes_amount ?? "5",
        freeVotesPeriod: settingsMap.free_votes_period ?? "weekly",
        freeVotesResetDay: settingsMap.free_votes_reset_day ?? "0",
        freeVotesResetHour: settingsMap.free_votes_reset_hour ?? "19",
        freeVotesResetMinute: settingsMap.free_votes_reset_minute ?? "59",
        stripeSecretKey: settingsMap.stripe_secret_key ?? "",
        stripePublishableKey: settingsMap.stripe_publishable_key ?? "",
        stripeWebhookSecret: settingsMap.stripe_webhook_secret ?? "",
        googleClientId: settingsMap.google_client_id ?? "",
        googleClientSecret: settingsMap.google_client_secret ?? "",
        facebookClientId: settingsMap.facebook_client_id ?? "",
        facebookClientSecret: settingsMap.facebook_client_secret ?? "",
        nextauthSecret: settingsMap.nextauth_secret ?? "",
        nextauthUrl: settingsMap.nextauth_url ?? "",
        appUrl: settingsMap.app_url ?? "",
        resendApiKey: settingsMap.resend_api_key ?? "",
        resendFromEmail: settingsMap.resend_from_email ?? "",
        posthogKey: settingsMap.posthog_key ?? "",
      }}
      settingLogs={settingLogs.map((l) => ({
        key: l.setting.key,
        oldValue: l.oldValue,
        newValue: l.newValue,
        createdAt: l.createdAt.toISOString(),
      }))}
      overview={{
        totalUsers,
        totalPets,
        totalVotes,
        totalComments: commentCount,
        activeContests,
        weeklyVotes: weeklyVoteStats._sum.totalVotes ?? 0,
        weeklyPaidVotes: weeklyVoteStats._sum.paidVotes ?? 0,
        weeklyFreeVotes: weeklyVoteStats._sum.freeVotes ?? 0,
        totalRevenueCents: totalRevenue._sum.amount ?? 0,
        totalPurchases: totalRevenue._count,
        totalMealsProvided: totalRevenue._sum.mealsProvided ?? 0,
        weeklyRevenueCents: weeklyRevenue._sum.amount ?? 0,
        weeklyPurchases: weeklyRevenue._count,
      }}
      usersByRole={usersByRole.map((r) => ({ role: r.role, count: r._count }))}
      petsByType={petsByType.map((p) => ({ type: p.type, count: p._count }))}
      recentUsers={recentUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        paidVoteBalance: u.paidVoteBalance,
        freeVotesRemaining: u.freeVotesRemaining,
        petsCount: u._count.pets,
        votesCount: u._count.votes,
        purchasesCount: u._count.purchases,
        createdAt: u.createdAt.toISOString(),
      }))}
      recentPurchases={recentPurchases.map((p) => ({
        id: p.id,
        tier: p.packageTier,
        votes: p.votes,
        amount: p.amount,
        meals: p.mealsProvided,
        userName: p.user.name,
        userEmail: p.user.email,
        createdAt: p.createdAt.toISOString(),
      }))}
      topPetsThisWeek={topPetsThisWeek.map((s, i) => ({
        rank: i + 1,
        petId: s.pet.id,
        petName: s.pet.name,
        petType: s.pet.type,
        photo: s.pet.photos[0] ?? null,
        ownerName: s.pet.ownerName,
        votes: s.totalVotes,
        paidVotes: s.paidVotes,
        freeVotes: s.freeVotes,
      }))}
      weekId={weekId}
    />
  );
}
