import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendPostCommentNotification } from "@/lib/email";

export const dynamic = "force-dynamic";

// POST — add a comment
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; postId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await req.json();
  const content = (body.content || "").trim();

  if (!content) return NextResponse.json({ error: "Content required" }, { status: 400 });
  if (content.length > 500) return NextResponse.json({ error: "Too long" }, { status: 400 });

  const comment = await prisma.postComment.create({
    data: { postId: params.postId, userId, content },
    include: { user: { select: { id: true, name: true, image: true } } },
  });

  // Send notification to post owner (fire-and-forget, skip self-comment)
  prisma.userPost.findUnique({
    where: { id: params.postId },
    select: { content: true, userId: true, user: { select: { email: true, name: true } } },
  }).then((post) => {
    if (!post || post.userId === userId) return;
    if (!post.user.email) return;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.votetofeed.com";
    return sendPostCommentNotification(
      post.user.email,
      post.user.name || "there",
      comment.user.name || "Someone",
      content,
      post.content,
      `${appUrl}/users/${post.userId}`,
    );
  }).catch((e) => console.error("[email] post comment notification failed:", e));

  return NextResponse.json({
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    user: comment.user,
  }, { status: 201 });
}

// DELETE — delete own comment
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; postId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { commentId } = await req.json();

  await prisma.postComment.deleteMany({
    where: { id: commentId, postId: params.postId, userId },
  });

  return NextResponse.json({ ok: true });
}
