import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendPostLikeNotification } from "@/lib/email";

export const dynamic = "force-dynamic";

// POST — toggle like on a post
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; postId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const existing = await prisma.postLike.findUnique({
    where: { postId_userId: { postId: params.postId, userId } },
  });

  if (existing) {
    await prisma.postLike.delete({ where: { id: existing.id } });
    const count = await prisma.postLike.count({ where: { postId: params.postId } });
    return NextResponse.json({ liked: false, likeCount: count });
  } else {
    await prisma.postLike.create({ data: { postId: params.postId, userId } });
    const count = await prisma.postLike.count({ where: { postId: params.postId } });

    // Send notification to post owner (fire-and-forget, skip self-like)
    prisma.userPost.findUnique({
      where: { id: params.postId },
      select: { content: true, userId: true, user: { select: { email: true, name: true, id: true } } },
    }).then((post) => {
      if (!post || post.userId === userId) return;
      if (!post.user.email) return;
      return prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      }).then((liker) => {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.votetofeed.com";
        return sendPostLikeNotification(
          post.user.email!,
          post.user.name || "there",
          liker?.name || "Someone",
          post.content,
          `${appUrl}/users/${post.userId}`,
        );
      });
    }).catch((e) => console.error("[email] post like notification failed:", e));

    return NextResponse.json({ liked: true, likeCount: count });
  }
}
