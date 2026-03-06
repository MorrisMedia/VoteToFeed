import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

function isSupportOrAdmin(role: unknown): boolean {
  return role === "ADMIN" || role === "SUPPORT";
}

// GET /api/support/users/[id] — Full user detail with all history
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isSupportOrAdmin((session.user as Record<string, unknown>).role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        pets: {
          orderBy: { createdAt: "desc" },
          include: {
            _count: { select: { votes: true, comments: true } },
            weeklyStats: { orderBy: { weekId: "desc" }, take: 4 },
          },
        },
        purchases: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        votes: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            pet: { select: { id: true, name: true, photos: true } },
          },
        },
        comments: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            pet: { select: { id: true, name: true } },
          },
        },
        accounts: {
          select: { provider: true, providerAccountId: true, type: true },
        },
        notifications: true,
      },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const lifetimeAgg = await prisma.purchase.aggregate({
      where: { userId: params.id, status: "COMPLETED" },
      _sum: { amount: true, mealsProvided: true, votes: true },
      _count: true,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
        city: user.city,
        state: user.state,
        country: user.country,
        zipCode: user.zipCode,
        freeVotesRemaining: user.freeVotesRemaining,
        paidVoteBalance: user.paidVoteBalance,
        votingStreak: user.votingStreak,
        lastVotedWeek: user.lastVotedWeek,
        lastFreeVoteReset: user.lastFreeVoteReset?.toISOString(),
        emailVerified: user.emailVerified?.toISOString(),
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        hasPassword: !!user.password,
        linkedAccounts: user.accounts.map((a) => ({ provider: a.provider, type: a.type })),
        notificationPrefs: user.notifications,
      },
      pets: user.pets.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        breed: p.breed,
        bio: p.bio,
        photos: p.photos,
        isActive: p.isActive,
        createdAt: p.createdAt.toISOString(),
        totalVotes: p._count.votes,
        totalComments: p._count.comments,
        weeklyStats: p.weeklyStats,
      })),
      purchases: user.purchases.map((p) => ({
        id: p.id,
        tier: p.packageTier,
        votes: p.votes,
        amount: p.amount,
        status: p.status,
        mealsProvided: p.mealsProvided,
        stripeSessionId: p.stripeSessionId,
        stripePaymentId: p.stripePaymentId,
        createdAt: p.createdAt.toISOString(),
      })),
      votes: user.votes.map((v) => ({
        id: v.id,
        petId: v.petId,
        petName: v.pet.name,
        petPhoto: v.pet.photos[0] || null,
        type: v.voteType,
        quantity: v.quantity,
        contestWeek: v.contestWeek,
        createdAt: v.createdAt.toISOString(),
      })),
      comments: user.comments.map((c) => ({
        id: c.id,
        petId: c.petId,
        petName: c.pet.name,
        text: c.text,
        createdAt: c.createdAt.toISOString(),
      })),
      lifetime: {
        totalSpent: lifetimeAgg._sum.amount ?? 0,
        totalMeals: lifetimeAgg._sum.mealsProvided ?? 0,
        totalVotesPurchased: lifetimeAgg._sum.votes ?? 0,
        totalPurchases: lifetimeAgg._count,
      },
    });
  } catch (error) {
    console.error("Support user detail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/support/users/[id] — Comprehensive user actions
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isSupportOrAdmin((session.user as Record<string, unknown>).role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { action, value } = await req.json();
    const user = await prisma.user.findUnique({ where: { id: params.id } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const agentId = (session.user as Record<string, unknown>).id as string;
    const agentName = (session.user as Record<string, unknown>).name || "Support";

    switch (action) {
      case "changeRole": {
        const validRoles = ["USER", "ADMIN", "MODERATOR", "SUPPORT"];
        if (!validRoles.includes(value))
          return NextResponse.json({ error: "Invalid role" }, { status: 400 });
        await prisma.user.update({ where: { id: params.id }, data: { role: value } });
        return NextResponse.json({ success: true, message: `Role changed to ${value}` });
      }

      case "grantVotes": {
        const amount = parseInt(value);
        if (isNaN(amount) || amount < 1 || amount > 100000)
          return NextResponse.json({ error: "Amount must be 1-100,000" }, { status: 400 });
        await prisma.user.update({ where: { id: params.id }, data: { paidVoteBalance: { increment: amount } } });
        return NextResponse.json({ success: true, message: `Granted ${amount} paid votes` });
      }

      case "removeVotes": {
        const amount = parseInt(value);
        if (isNaN(amount) || amount < 1)
          return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
        const newBalance = Math.max(0, user.paidVoteBalance - amount);
        await prisma.user.update({ where: { id: params.id }, data: { paidVoteBalance: newBalance } });
        return NextResponse.json({ success: true, message: `Removed ${amount} votes. New balance: ${newBalance}` });
      }

      case "resetFreeVotes": {
        const amount = parseInt(value) || 5;
        await prisma.user.update({ where: { id: params.id }, data: { freeVotesRemaining: amount, lastFreeVoteReset: new Date() } });
        return NextResponse.json({ success: true, message: `Free votes reset to ${amount}` });
      }

      case "resetPassword": {
        if (!value || value.length < 8)
          return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
        const hashed = await bcrypt.hash(value, 12);
        await prisma.user.update({ where: { id: params.id }, data: { password: hashed } });
        return NextResponse.json({ success: true, message: "Password reset successfully" });
      }

      case "updateProfile": {
        const { name, email, city, state, country, zipCode } = value || {};
        const data: Record<string, string> = {};
        if (name !== undefined) data.name = name;
        if (email !== undefined) data.email = email;
        if (city !== undefined) data.city = city;
        if (state !== undefined) data.state = state;
        if (country !== undefined) data.country = country;
        if (zipCode !== undefined) data.zipCode = zipCode;
        await prisma.user.update({ where: { id: params.id }, data });
        return NextResponse.json({ success: true, message: "Profile updated" });
      }

      case "removePetPhoto": {
        const { petId, photoIndex } = value || {};
        if (!petId || photoIndex === undefined)
          return NextResponse.json({ error: "petId and photoIndex required" }, { status: 400 });
        const pet = await prisma.pet.findUnique({ where: { id: petId } });
        if (!pet) return NextResponse.json({ error: "Pet not found" }, { status: 404 });
        const newPhotos = [...pet.photos];
        newPhotos.splice(photoIndex, 1);
        await prisma.pet.update({ where: { id: petId }, data: { photos: newPhotos } });
        return NextResponse.json({ success: true, message: `Photo removed from ${pet.name}` });
      }

      case "deactivatePet": {
        const { petId } = value || {};
        if (!petId) return NextResponse.json({ error: "petId required" }, { status: 400 });
        await prisma.pet.update({ where: { id: petId }, data: { isActive: false } });
        return NextResponse.json({ success: true, message: "Pet deactivated" });
      }

      case "reactivatePet": {
        const { petId } = value || {};
        if (!petId) return NextResponse.json({ error: "petId required" }, { status: 400 });
        await prisma.pet.update({ where: { id: petId }, data: { isActive: true } });
        return NextResponse.json({ success: true, message: "Pet reactivated" });
      }

      case "refundPurchase": {
        const { purchaseId } = value || {};
        if (!purchaseId) return NextResponse.json({ error: "purchaseId required" }, { status: 400 });
        const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
        if (!purchase) return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
        if (purchase.status === "REFUNDED")
          return NextResponse.json({ error: "Already refunded" }, { status: 400 });

        await prisma.$transaction([
          prisma.purchase.update({ where: { id: purchaseId }, data: { status: "REFUNDED" } }),
          prisma.user.update({
            where: { id: params.id },
            data: { paidVoteBalance: { decrement: Math.min(purchase.votes, user.paidVoteBalance) } },
          }),
        ]);
        return NextResponse.json({
          success: true,
          message: `Refunded ${purchase.packageTier} ($${(purchase.amount / 100).toFixed(2)}). ${purchase.votes} votes removed.`,
        });
      }

      case "deleteComment": {
        const { commentId } = value || {};
        if (!commentId) return NextResponse.json({ error: "commentId required" }, { status: 400 });
        await prisma.comment.delete({ where: { id: commentId } });
        return NextResponse.json({ success: true, message: "Comment deleted" });
      }

      case "deleteAccount": {
        await prisma.user.delete({ where: { id: params.id } });
        return NextResponse.json({ success: true, message: `Account ${user.email || user.id} permanently deleted` });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Support user action error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
