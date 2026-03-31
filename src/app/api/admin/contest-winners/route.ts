import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getAdminContestWinners } from "@/lib/contest-winners";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const user = await prisma.user.findUnique({
    where: { id: (session.user as { id: string }).id },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") return null;
  return session.user;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const winners = await getAdminContestWinners();
  return NextResponse.json({ winners });
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const prizeId = body?.prizeId as string | undefined;
  const prizeSent = Boolean(body?.prizeSent);

  if (!prizeId) {
    return NextResponse.json({ error: "prizeId is required" }, { status: 400 });
  }

  const prize = await prisma.prize.findUnique({ where: { id: prizeId } });
  if (!prize) return NextResponse.json({ error: "Prize not found" }, { status: 404 });

  const updated = await prisma.prize.update({
    where: { id: prizeId },
    data: {
      fulfilledAt: prizeSent ? new Date() : null,
      status: prizeSent ? "SHIPPED" : "AWARDED",
    },
  });

  return NextResponse.json({
    ok: true,
    prizeId: updated.id,
    prizeSent: Boolean(updated.fulfilledAt || updated.status === "SHIPPED" || updated.status === "FULFILLED"),
    fulfilledAt: updated.fulfilledAt?.toISOString() ?? null,
    status: updated.status,
  });
}
