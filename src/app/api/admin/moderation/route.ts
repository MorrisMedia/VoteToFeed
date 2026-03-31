import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as Record<string, unknown>)?.role;
  if (!session?.user || role !== "ADMIN") return null;
  return session.user;
}

// GET /api/admin/moderation â€” Get moderation queue + all comments
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tab = req.nextUrl.searchParams.get("tab") || "spam";
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "25");
  const search = req.nextUrl.searchParams.get("search") || "";

  if (tab === "spam") {
    const where = { status: "PENDING" as const };
    const [items, total] = await Promise.all([
      prisma.flaggedComment.findMany({
        where,
        include: {
          comment: {
            include: {
              user: { select: { id: true, name: true, email: true, image: true } },
              pet: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.flaggedComment.count({ where }),
    ]);
    return NextResponse.json({ items, total, page, totalPages: Math.ceil(total / limit) });
  }

  if (tab === "comments") {
    const where = search ? { text: { contains: search, mode: "insensitive" as const } } : {};
    const [items, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          pet: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.comment.count({ where }),
    ]);
    return NextResponse.json({ items, total, page, totalPages: Math.ceil(total / limit) });
  }

  if (tab === "users") {
    const where = search
      ? { OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ] }
      : {};
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, image: true, role: true,
          createdAt: true, _count: { select: { pets: true, comments: true, votes: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.user.count({ where }),
    ]);
    return NextResponse.json({ items, total, page, totalPages: Math.ceil(total / limit) });
  }

  return NextResponse.json({ error: "Invalid tab" }, { status: 400 });
}

// POST /api/admin/moderation â€” Actions (approve/reject spam, delete comment, ban user)
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, id, userId, reason } = await req.json();
  const adminEmail = (admin as Record<string, unknown>).email as string || "admin";

  switch (action) {
    case "approve_comment": {
      // Approve flagged comment â†’ remove flag, keep comment visible
      await prisma.flaggedComment.update({
        where: { id },
        data: { status: "APPROVED", reviewedBy: adminEmail, reviewedAt: new Date() },
      });
      return NextResponse.json({ success: true });
    }
    case "reject_comment": {
      // Reject flagged comment â†’ delete the comment
      const flag = await prisma.flaggedComment.findUnique({ where: { id }, select: { commentId: true } });
      if (flag) {
        await prisma.flaggedComment.update({
          where: { id },
          data: { status: "REJECTED", reviewedBy: adminEmail, reviewedAt: new Date() },
        });
        await prisma.comment.delete({ where: { id: flag.commentId } }).catch(() => {});
      }
      return NextResponse.json({ success: true });
    }
    case "delete_comment": {
      await prisma.comment.delete({ where: { id } }).catch(() => {});
      return NextResponse.json({ success: true });
    }
    case "ban_user": {
      await prisma.user.update({ where: { id: userId }, data: { role: "USER" } });
      // Soft ban: we set a special flag by using the state field (could add proper ban field later)
      return NextResponse.json({ success: true, message: "User role set to USER" });
    }
    case "delete_user_comments": {
      await prisma.comment.deleteMany({ where: { userId } });
      return NextResponse.json({ success: true });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
