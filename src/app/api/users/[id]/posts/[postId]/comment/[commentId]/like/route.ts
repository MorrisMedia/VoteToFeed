import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST — toggle like on a comment
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; postId: string; commentId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const existing = await prisma.postCommentLike.findUnique({
    where: { commentId_userId: { commentId: params.commentId, userId } },
  });

  if (existing) {
    await prisma.postCommentLike.delete({ where: { id: existing.id } });
    const count = await prisma.postCommentLike.count({ where: { commentId: params.commentId } });
    return NextResponse.json({ liked: false, likeCount: count });
  } else {
    await prisma.postCommentLike.create({ data: { commentId: params.commentId, userId } });
    const count = await prisma.postCommentLike.count({ where: { commentId: params.commentId } });
    return NextResponse.json({ liked: true, likeCount: count });
  }
}
