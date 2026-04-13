import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/nominations/send-job
// Returns the most recent active/paused send job for this admin
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminId = (session.user as { id: string }).id;

  const job = await prisma.nominationSendJob.findFirst({
    where: {
      startedById: adminId,
      status: { in: ["running", "paused"] },
    },
    orderBy: { startedAt: "desc" },
  });

  return NextResponse.json({ job });
}

// POST /api/admin/nominations/send-job
// Create a new send job
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminId = (session.user as { id: string }).id;
  const body = await req.json();
  const { contestId, contestName, recipients, total } = body;

  if (!contestId || !contestName || !Array.isArray(recipients) || !total) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Mark any previous active jobs as stopped
  await prisma.nominationSendJob.updateMany({
    where: { startedById: adminId, status: { in: ["running", "paused"] } },
    data: { status: "stopped" },
  });

  const job = await prisma.nominationSendJob.create({
    data: {
      contestId,
      contestName,
      recipients,
      total,
      sent: 0,
      failed: 0,
      status: "running",
      startedById: adminId,
    },
  });

  return NextResponse.json({ job });
}

// PATCH /api/admin/nominations/send-job
// Update progress (sent, failed, status)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminId = (session.user as { id: string }).id;
  const body = await req.json();
  const { id, sent, failed, status } = body;

  if (!id) {
    return NextResponse.json({ error: "Missing job id" }, { status: 400 });
  }

  const job = await prisma.nominationSendJob.findFirst({
    where: { id, startedById: adminId },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const updated = await prisma.nominationSendJob.update({
    where: { id },
    data: {
      ...(sent !== undefined && { sent }),
      ...(failed !== undefined && { failed }),
      ...(status !== undefined && { status }),
    },
  });

  return NextResponse.json({ job: updated });
}

// DELETE /api/admin/nominations/send-job
// Dismiss (delete) the latest terminal job for this admin
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminId = (session.user as { id: string }).id;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  await prisma.nominationSendJob.deleteMany({
    where: { id, startedById: adminId },
  });

  return NextResponse.json({ ok: true });
}
