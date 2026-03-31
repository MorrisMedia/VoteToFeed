import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import crypto from "crypto";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as Record<string, unknown>)?.role;
  if (!session?.user || role !== "ADMIN") {
    return null;
  }
  return session.user;
}

// GET /api/admin/api-keys â€” List all API keys
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, prefix: true, isActive: true,
      lastUsedAt: true, usageCount: true, createdBy: true,
      createdAt: true, revokedAt: true,
    },
  });

  return NextResponse.json({ keys });
}

// POST /api/admin/api-keys â€” Create a new API key
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const rawKey = `vtf_${crypto.randomBytes(32).toString("hex")}`;
  const prefix = rawKey.slice(0, 12);

  const apiKey = await prisma.apiKey.create({
    data: {
      name,
      key: rawKey,
      prefix,
      createdBy: (admin as Record<string, unknown>).email as string || "admin",
    },
  });

  // Return the full key ONCE (won't be shown again)
  return NextResponse.json({ key: rawKey, apiKey: { id: apiKey.id, name: apiKey.name, prefix: apiKey.prefix, createdAt: apiKey.createdAt } }, { status: 201 });
}

// DELETE /api/admin/api-keys â€” Revoke an API key
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await prisma.apiKey.update({
    where: { id },
    data: { isActive: false, revokedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
