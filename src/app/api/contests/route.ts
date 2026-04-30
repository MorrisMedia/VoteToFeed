import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/contests - Get active contests, optionally filtered
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const petType = searchParams.get("petType");
    const includeEnded = searchParams.get("includeEnded") === "true";
    const includeNotStarted = searchParams.get("includeNotStarted") === "true";
    const featured = searchParams.get("featured");

    const now = new Date();

    const where: Record<string, unknown> = {};
    if (!includeEnded) {
      where.isActive = true;
      where.endDate = { gte: now };
      if (!includeNotStarted) {
        where.startDate = { lte: now };
      }
    }
    if (petType) where.petType = petType;
    if (featured === "true") where.isFeatured = true;

    const contests = await prisma.contest.findMany({
      where,
      include: {
        _count: { select: { entries: true } },
        prizes: {
          orderBy: { placement: "asc" },
          select: {
            id: true,
            placement: true,
            title: true,
            description: true,
            value: true,
            items: true,
          },
        },
      },
      orderBy: [{ isFeatured: "desc" }, { endDate: "asc" }],
    });

    return NextResponse.json(
      contests.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        petType: c.petType,
        state: c.state,
        startDate: c.startDate,
        endDate: c.endDate,
        isActive: c.isActive,
        isFeatured: c.isFeatured,
        description: c.description,
        rules: c.rules,
        coverImage: c.coverImage,
        entryFee: c.entryFee,
        maxEntries: c.maxEntries,
        prizeDescription: c.prizeDescription,
        sponsorName: c.sponsorName,
        sponsorLogo: c.sponsorLogo,
        sponsorUrl: c.sponsorUrl,
        isRecurring: c.isRecurring,
        recurringInterval: c.recurringInterval,
        recurringCounter: c.recurringCounter,
        isStoryteller: c.isStoryteller,
        entryCount: c._count.entries,
        prizes: c.prizes,
        // FLAGSHIP round fields
        currentPhase: c.currentPhase,
        round2StartDate: c.round2StartDate,
        round3StartDate: c.round3StartDate,
        finaleStartDate: c.finaleStartDate,
        top100CutSize: c.top100CutSize,
        top25CutSize: c.top25CutSize,
        top5CutSize: c.top5CutSize,
        // Computed fields
        daysLeft: Math.max(0, Math.ceil((new Date(c.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
        totalPrizeValue: c.prizes.reduce((sum, p) => sum + p.value, 0),
        hasStarted: new Date(c.startDate) <= now,
        hasEnded: new Date(c.endDate) < now,
      }))
    );
  } catch (error) {
    console.error("Error fetching contests:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/contests - Create a new contest (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role
    const user = await prisma.user.findUnique({
      where: { id: (session.user as { id: string }).id },
      select: { role: true },
    });
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      name, type, petType, state, startDate, endDate, description, rules,
      coverImage, entryFee, maxEntries, prizeDescription, sponsorName,
      sponsorLogo, sponsorUrl, isFeatured, isRecurring, recurringInterval, prizes, isStoryteller,
      currentPhase, round2StartDate, round3StartDate, finaleStartDate,
      top100CutSize, top25CutSize, top5CutSize,
    } = body;

    if (!name || !type || !petType || !startDate || !endDate) {
      return NextResponse.json({ error: "Name, type, petType, startDate, endDate are required" }, { status: 400 });
    }

    const VALID_PHASES = ["OPEN", "TOP100", "TOP25", "TOP5", "ENDED"] as const;
    const validatedPhase = VALID_PHASES.includes(currentPhase as typeof VALID_PHASES[number])
      ? (currentPhase as string)
      : "OPEN";

    const contest = await prisma.contest.create({
      data: {
        name,
        type,
        petType,
        state: state || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        description: description || null,
        rules: rules || null,
        coverImage: coverImage || null,
        entryFee: entryFee || 0,
        maxEntries: maxEntries || null,
        prizeDescription: prizeDescription || null,
        sponsorName: sponsorName || null,
        sponsorLogo: sponsorLogo || null,
        sponsorUrl: sponsorUrl || null,
        isFeatured: isFeatured || false,
        isRecurring: isRecurring || false,
        recurringInterval: isRecurring ? (recurringInterval || "biweekly") : null,
        isStoryteller: isStoryteller || false,
        isActive: true,
        currentPhase: validatedPhase,
        round2StartDate: round2StartDate ? new Date(round2StartDate) : null,
        round3StartDate: round3StartDate ? new Date(round3StartDate) : null,
        finaleStartDate: finaleStartDate ? new Date(finaleStartDate) : null,
        top100CutSize: top100CutSize || 100,
        top25CutSize: top25CutSize || 25,
        top5CutSize: top5CutSize || 5,
        prizes: prizes?.length
          ? {
              create: prizes.map((p: { placement: number; title: string; description?: string; value: number; items?: string[] }) => ({
                placement: p.placement,
                title: p.title,
                description: p.description || null,
                value: p.value,
                items: p.items || [],
              })),
            }
          : undefined,
      },
      include: {
        prizes: true,
        _count: { select: { entries: true } },
      },
    });

    // Notify ALL users about the new contest asynchronously (batched in pages of 500)
    notifyAllUsersOfContest(contest.id, name).catch((e) =>
      console.error("Failed to notify users about new contest", e)
    );

    return NextResponse.json(contest, { status: 201 });
  } catch (error) {
    console.error("Error creating contest:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function notifyAllUsersOfContest(contestId: string, name: string) {
  const PAGE = 500;
  let cursor: string | undefined;

  while (true) {
    const users = await prisma.user.findMany({
      select: { id: true },
      take: PAGE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
    });

    if (!users.length) break;

    await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        type: "CONTEST" as const,
        title: "New Contest!",
        message: `A new contest '${name}' has just started! Enter your pet now! 🏆`,
        linkUrl: `/contests/${contestId}`,
      })),
      skipDuplicates: true,
    });

    cursor = users[users.length - 1].id;
    if (users.length < PAGE) break;
  }
}
