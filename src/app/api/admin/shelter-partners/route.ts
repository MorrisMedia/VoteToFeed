import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const user = await prisma.user.findUnique({ where: { id: (session.user as { id: string }).id }, select: { role: true } });
  return user?.role === "ADMIN" ? session.user : null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const partners = await prisma.shelterPartner.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ partners });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, logoUrl, website, description } = await req.json();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const partner = await prisma.shelterPartner.create({ data: { name, logoUrl: logoUrl || null, website: website || null, description: description || null } });
  return NextResponse.json({ partner }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, ...data } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  const updated = await prisma.shelterPartner.update({ where: { id }, data });
  return NextResponse.json({ partner: updated });
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  await prisma.shelterPartner.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
