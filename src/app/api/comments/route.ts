import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkForSpam } from "@/lib/spam-filter";
import { sendCommentNotification, sendReplyNotification } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

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

    // Notify pet owner (skip if they're commenting on their own pet, skip if spam)
    if (!spamCheck.isSpam) {
      // Fetch pet once for both notification paths below
      let petForNotif: { id: string; name: string; user: { id: string; email: string | null; name: string | null; notifications: { commentAlerts: boolean } | null } } | null = null;
      try {
        petForNotif = await prisma.pet.findUnique({
          where: { id: petId },
          include: { user: { select: { id: true, email: true, name: true, notifications: true } } },
        });
      } catch (fetchErr) {
        console.error("[email] failed to fetch pet for notifications:", fetchErr);
      }

      // Notify pet owner
      if (
        petForNotif?.user?.email &&
        petForNotif.user.id !== userId &&
        (petForNotif.user.notifications === null || petForNotif.user.notifications.commentAlerts !== false)
      ) {
        const ownerFirstName = petForNotif.user.name?.split(" ")[0] ?? "there";
        const isReply = Boolean(parentId);

        sendCommentNotification(
          petForNotif.user.email,
          ownerFirstName,
          petForNotif.name,
          petForNotif.id,
          comment.user.name ?? "Someone",
          text,
          isReply
        ).catch((err) => console.error("[email] comment notification failed:", err));
      }

      // In-app notification for pet owner (independent of email opt-in for the bell)
      if (petForNotif?.user?.id && petForNotif.user.id !== userId) {
        const isReply = Boolean(parentId);
        createNotification({
          userId: petForNotif.user.id,
          type: "COMMENT",
          title: isReply ? "New reply on your pet" : "New comment on your pet",
          message: `${comment.user.name ?? "Someone"} ${isReply ? "replied to a comment on" : "commented on"} ${petForNotif.name}: "${text.slice(0, 80)}${text.length > 80 ? "…" : ""}"`,
          linkUrl: `/pets/${petForNotif.id}`,
          sourceUserId: userId,
        }).catch((err) => console.error("[notif] comment notification failed:", err));
      }

      // If this is a reply, also notify the original commenter — unless they ARE the pet owner
      // (pet owner already received the comment notification above)
      if (parentId) {
        try {
          const parentComment = await prisma.comment.findUnique({
            where: { id: parentId },
            include: { user: { select: { id: true, email: true, name: true, notifications: true } } },
          });

          const isOriginalCommenter = parentComment?.user?.id === userId;
          const isPetOwner = parentComment?.user?.id === petForNotif?.user?.id;
          const canNotify =
            parentComment?.user?.email &&
            !isOriginalCommenter &&
            !isPetOwner &&
            (parentComment.user.notifications === null || parentComment.user.notifications.commentAlerts !== false);

          if (canNotify && parentComment?.user?.email) {
            const recipientFirstName = parentComment.user.name?.split(" ")[0] ?? "there";

            sendReplyNotification(
              parentComment.user.email,
              recipientFirstName,
              petForNotif?.name ?? "your pet",
              petId,
              comment.user.name ?? "Someone",
              parentComment.text,
              text
            ).catch((err) => console.error("[email] reply notification failed:", err));
          }

          // In-app notification for original commenter (independent of email opt-in)
          if (
            parentComment?.user?.id &&
            parentComment.user.id !== userId &&
            parentComment.user.id !== petForNotif?.user?.id
          ) {
            createNotification({
              userId: parentComment.user.id,
              type: "COMMENT",
              title: "Someone replied to your comment",
              message: `${comment.user.name ?? "Someone"} replied: "${text.slice(0, 80)}${text.length > 80 ? "…" : ""}"`,
              linkUrl: `/pets/${petId}`,
              sourceUserId: userId,
            }).catch((err) => console.error("[notif] reply notification failed:", err));
          }
        } catch (replyNotifErr) {
          console.error("[email] failed to send reply notification:", replyNotifErr);
        }
      }
    }

    // Return comment regardless — user sees it, but admins can review flagged ones
    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
