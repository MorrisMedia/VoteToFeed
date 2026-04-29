import prisma from "@/lib/prisma";

export async function createNotification(data: {
  userId: string;
  type: "CONTEST" | "LIKE" | "COMMENT" | "FOLLOW" | "SYSTEM";
  title: string;
  message: string;
  linkUrl?: string;
  sourceUserId?: string;
}) {
  try {
    await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        linkUrl: data.linkUrl,
        sourceUserId: data.sourceUserId,
      },
    });
  } catch (error) {
    console.error("Failed to create notification", error);
  }
}
