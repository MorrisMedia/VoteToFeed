import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import prisma from "@/lib/prisma";
import { CHAT_SYSTEM_PROMPT } from "@/lib/chat-knowledge";
import { getCurrentWeekId, getWeekDateRange } from "@/lib/utils";

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// Simple in-memory rate limiter (per session) — resets on redeploy
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 20; // max messages per window
const RATE_LIMIT_WINDOW = 60_000; // 1 minute

function isRateLimited(sessionId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(sessionId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(sessionId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) return true;
  return false;
}

// Auto-detect preferred provider based on which API keys are present
// CHAT_AI_PROVIDER can still override manually if needed
const preferredProvider: "openai" | "anthropic" =
  process.env.CHAT_AI_PROVIDER === "anthropic"
    ? "anthropic"
    : process.env.CHAT_AI_PROVIDER === "openai"
    ? "openai"
    : process.env.OPENAI_API_KEY
    ? "openai"
    : "anthropic";

// Fetch live site context for the AI
async function getLiveContext(userId?: string) {
  try {
    const weekId = getCurrentWeekId();
    const now = new Date();
    const { start, end } = getWeekDateRange();

  const [
    weeklyStats,
    totalPets,
    activeContests,
    weeklyMeals,
    topPets,
    userPets,
    userData,
  ] = await Promise.all([
    prisma.petWeeklyStats.aggregate({
      where: { weekId },
      _sum: { totalVotes: true },
    }),
    prisma.pet.count({ where: { isActive: true } }),
    prisma.contest.findMany({
      where: { isActive: true, endDate: { gte: now }, startDate: { lte: now } },
      select: { id: true, name: true, petType: true, endDate: true, _count: { select: { entries: true } } },
      orderBy: { endDate: "asc" },
      take: 5,
    }),
    prisma.purchase.aggregate({
      where: { status: "COMPLETED", createdAt: { gte: start, lt: end } },
      _sum: { mealsProvided: true },
    }),
    prisma.petWeeklyStats.findMany({
      where: { weekId, pet: { isActive: true } },
      include: { pet: { select: { name: true, type: true } } },
      orderBy: { totalVotes: "desc" },
      take: 3,
    }),
    userId
      ? prisma.pet.findMany({
          where: { userId, isActive: true },
          select: {
            id: true, name: true, type: true,
            weeklyStats: { where: { weekId }, select: { totalVotes: true, rank: true } },
          },
        })
      : Promise.resolve([]),
    userId
      ? prisma.user.findUnique({
          where: { id: userId },
          select: { freeVotesRemaining: true, paidVoteBalance: true },
        })
      : Promise.resolve(null),
  ]);

  const lines: string[] = [];
  lines.push(`\n--- LIVE SITE DATA (right now) ---`);
  lines.push(`This week's total votes: ${weeklyStats._sum.totalVotes ?? 0}`);
  lines.push(`Total active pets: ${totalPets}`);
  lines.push(`Meals provided this week: ${Math.round(weeklyMeals._sum.mealsProvided ?? 0)}`);

  if (activeContests.length > 0) {
    lines.push(`\nActive contests right now:`);
    activeContests.forEach((c) => {
      const daysLeft = Math.ceil((c.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      lines.push(`- "${c.name}" (${c.petType}) — ${c._count.entries} entries, ${daysLeft} days left`);
    });
  } else {
    lines.push(`No active contests right now.`);
  }

  if (topPets.length > 0) {
    lines.push(`\nTop pets this week:`);
    topPets.forEach((p, i) => {
      lines.push(`${i + 1}. ${p.pet.name} (${p.pet.type}) — ${p.totalVotes} votes`);
    });
  }

  if (userPets.length > 0) {
    lines.push(`\nThis user's pets:`);
    userPets.forEach((p) => {
      const stats = p.weeklyStats[0];
      lines.push(`- ${p.name} (${p.type}) — ${stats?.totalVotes ?? 0} votes this week, rank #${stats?.rank ?? "unranked"}`);
    });
  }

  if (userData) {
    lines.push(`\nThis user's vote balance:`);
    lines.push(`- Free votes remaining this week: ${userData.freeVotesRemaining}`);
    lines.push(`- Paid votes available: ${userData.paidVoteBalance}`);
    if (userData.paidVoteBalance === 0) {
      lines.push(`- HINT: This user has no paid votes. If they want more votes or want to help their pet win, suggest buying a vote package!`);
    }
  }

  return lines.join("\n");
  } catch (err) {
    console.error("getLiveContext error:", err);
    return "\n--- LIVE SITE DATA ---\nLive data temporarily unavailable.";
  }
}

async function getAIResponse(
  history: { role: "user" | "assistant"; content: string }[],
  systemPrompt: string,
): Promise<string> {
  // Try preferred provider first, then fallback
  const providers = preferredProvider === "openai"
    ? [{ name: "openai", client: openai }, { name: "anthropic", client: anthropic }]
    : [{ name: "anthropic", client: anthropic }, { name: "openai", client: openai }];

  for (const provider of providers) {
    if (!provider.client) continue;

    try {
      if (provider.name === "openai") {
        const response = await (provider.client as OpenAI).chat.completions.create({
          model: "gpt-4o-mini",
          max_tokens: 500,
          messages: [
            { role: "system", content: systemPrompt },
            ...history,
          ],
        });
        return response.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
      } else {
        const response = await (provider.client as Anthropic).messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          system: systemPrompt,
          messages: history,
        });
        const textBlock = response.content.find((b) => b.type === "text");
        return textBlock ? textBlock.text : "I'm sorry, I couldn't generate a response.";
      }
    } catch (err) {
      console.error(`Chat AI error (${provider.name}):`, err);
      continue; // try next provider
    }
  }

  return "I'm sorry, I'm having trouble right now. Would you like me to connect you with a human support agent? Just say 'yes' and we'll get someone to help you! 🐾";
}

// POST: Send a message and get AI response
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, sessionId, userName, userEmail, userId } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }
    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    // Validate userId: if provided, verify it matches the authenticated session
    let verifiedUserId: string | null = null;
    let verifiedUserName: string | null = typeof userName === "string" ? userName : null;
    let verifiedUserEmail: string | null = typeof userEmail === "string" ? userEmail : null;

    if (userId) {
      const { getServerSession } = await import("next-auth");
      const { authOptions } = await import("@/lib/auth");
      const session = await getServerSession(authOptions);
      const sessionUser = session?.user as { id?: string; name?: string; email?: string } | undefined;

      if (sessionUser && sessionUser.id === userId) {
        verifiedUserId = userId;
        verifiedUserName = sessionUser.name || verifiedUserName;
        verifiedUserEmail = sessionUser.email || verifiedUserEmail;
      }
      // If userId doesn't match session, silently ignore it (don't trust client)
    }

    const trimmedMessage = message.trim().slice(0, 1000);

    // Rate limit check
    if (isRateLimited(sessionId)) {
      return NextResponse.json(
        { error: "Too many messages. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    // Find or create conversation
    let conversation = await prisma.chatConversation.findUnique({
      where: { sessionId },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
    });

    if (!conversation) {
      conversation = await prisma.chatConversation.create({
        data: {
          sessionId,
          lastMessage: trimmedMessage,
          userName: verifiedUserName,
          userEmail: verifiedUserEmail,
          userId: verifiedUserId,
        },
        include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
      });
    } else if (verifiedUserId && !conversation.userId) {
      // Link user if they logged in after starting the conversation
      await prisma.chatConversation.update({
        where: { id: conversation.id },
        data: {
          userId: verifiedUserId,
          userName: verifiedUserName || conversation.userName,
          userEmail: verifiedUserEmail || conversation.userEmail,
        },
      });
    }

    // Save user message
    await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        content: trimmedMessage,
      },
    });

    // Build message history
    const history: { role: "user" | "assistant"; content: string }[] =
      conversation.messages.map((m) => ({
        role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      }));
    history.push({ role: "user", content: trimmedMessage });

    // Build dynamic system prompt with live data + user context
    const liveContext = await getLiveContext(verifiedUserId || conversation.userId || undefined);
    let fullPrompt = CHAT_SYSTEM_PROMPT;

    if (verifiedUserName || conversation.userName) {
      const name = verifiedUserName || conversation.userName;
      fullPrompt += `\n\n--- USER INFO ---\nThe user's name is "${name}". They are logged in. Address them by their first name naturally.`;
    } else {
      fullPrompt += `\n\n--- USER INFO ---\nThis is an anonymous visitor (not logged in). Be welcoming and suggest creating a free account when appropriate.`;
    }

    fullPrompt += liveContext;

    const aiResponse = await getAIResponse(history, fullPrompt);

    // Save AI response
    await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: aiResponse,
      },
    });

    // Update conversation
    await prisma.chatConversation.update({
      where: { id: conversation.id },
      data: { lastMessage: trimmedMessage },
    });

    return NextResponse.json({ reply: aiResponse });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

// GET: Load conversation history for a session
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId || sessionId.length > 100) {
    return NextResponse.json({ messages: [] });
  }

  const conversation = await prisma.chatConversation.findUnique({
    where: { sessionId },
    include: {
      messages: { orderBy: { createdAt: "asc" }, take: 100 },
    },
  });

  if (!conversation) {
    return NextResponse.json({ messages: [] });
  }

  return NextResponse.json({
    messages: conversation.messages.map((m) => ({
      role: m.role === "USER" ? "user" : m.role === "ADMIN" ? "admin" : "assistant",
      content: m.content,
      createdAt: m.createdAt,
    })),
  });
}
