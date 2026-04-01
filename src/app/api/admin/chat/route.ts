import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = req.nextUrl.searchParams.get("status") || undefined;
  const conversationId = req.nextUrl.searchParams.get("conversationId");

  // If requesting a specific conversation's messages
  if (conversationId) {
    const conversation = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        user: { select: { name: true, email: true } },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ conversation });
  }

  // List all conversations
  const conversations = await prisma.chatConversation.findMany({
    where: status ? { status: status as "OPEN" | "CLOSED" } : undefined,
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      user: { select: { name: true, email: true } },
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json({ conversations });
}

// PATCH: Close a conversation
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { conversationId, status } = body;

  if (!conversationId || !["OPEN", "CLOSED"].includes(status)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await prisma.chatConversation.update({
    where: { id: conversationId },
    data: { status },
  });

  return NextResponse.json({ success: true });
}

// POST: Admin sends a manual reply to a conversation
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { conversationId, message } = body;

  if (!conversationId || !message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "conversationId and message are required" }, { status: 400 });
  }

  const conversation = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const trimmedMessage = message.trim().slice(0, 2000);

  const newMessage = await prisma.chatMessage.create({
    data: {
      conversationId,
      role: "ADMIN",
      content: trimmedMessage,
    },
  });

  // Reopen conversation if it was closed
  await prisma.chatConversation.update({
    where: { id: conversationId },
    data: {
      lastMessage: `[Admin] ${trimmedMessage.slice(0, 100)}`,
      status: "OPEN",
    },
  });

  return NextResponse.json({ success: true, message: newMessage });
}
