import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkForSpam } from "@/lib/spam-filter";

// POST /api/comments - Create a comment (with spam filtering)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const { petId, text, parentId } = await req.json();

    if (!petId || !text) {
      return NextResponse.json({ error: "Pet ID and text required" }, { status: 400 });
    }

    if (text.length > 255) {
      return NextResponse.json({ error: "Comment must be 255 characters or less" }, { status: 400 });
    }

    // Spam check
    const spamCheck = checkForSpam(text);

    const comment = await prisma.comment.create({
      data: {
        petId,
        userId,
        text,
        parentId: parentId || null,
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    });

    // If flagged as spam, create moderation entry
    if (spamCheck.isSpam) {
      await prisma.flaggedComment.create({
        data: {
          commentId: comment.id,
          reason: spamCheck.reason || "unknown",
          matchedWords: spamCheck.matchedWords,
        },
      });
    }

    // Return comment regardless â€” user sees it, but admins can review flagged ones
    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
