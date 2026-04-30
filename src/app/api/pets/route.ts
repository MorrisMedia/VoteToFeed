import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { schedulePetWelcomeComments } from "@/lib/scheduled-comments";
import { getCurrentWeekId } from "@/lib/utils";

export const dynamic = "force-dynamic";

// GET /api/pets - List pets with filtering
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // DOG, CAT
    const sort = searchParams.get("sort") || "recent"; // recent, popular, votes
    const state = searchParams.get("state");
    const breed = searchParams.get("breed");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const weekId = getCurrentWeekId();

    const where: Record<string, unknown> = { isActive: true };
    if (type) where.type = type;
    if (state) where.state = state;
    if (breed) where.breed = { contains: breed, mode: "insensitive" };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { ownerName: { contains: search, mode: "insensitive" } },
        { breed: { contains: search, mode: "insensitive" } },
      ];
    }

    let orderBy: Record<string, string> = { createdAt: "desc" };
    if (sort === "popular") {
      // We'll sort by weekly stats
      orderBy = { createdAt: "desc" }; // Fallback, real sorting done below
    }

    const [pets, total] = await Promise.all([
      prisma.pet.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, image: true } },
          weeklyStats: {
            where: { weekId },
            take: 1,
          },
          _count: { select: { votes: true, comments: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.pet.count({ where }),
    ]);

    // If sorting by popular, sort by this week's votes
    let sortedPets = pets;
    if (sort === "popular" || sort === "votes") {
      sortedPets = [...pets].sort((a, b) => {
        const aVotes = a.weeklyStats[0]?.totalVotes || 0;
        const bVotes = b.weeklyStats[0]?.totalVotes || 0;
        return bVotes - aVotes;
      });
    }

    return NextResponse.json({
      pets: sortedPets.map((pet) => ({
        id: pet.id,
        name: pet.name,
        type: pet.type,
        breed: pet.breed,
        bio: pet.bio,
        ownerName: pet.ownerName,
        city: pet.city,
        state: pet.state,
        photos: pet.photos,
        tags: pet.tags,
        createdAt: pet.createdAt,
        user: pet.user,
        weeklyVotes: pet.weeklyStats[0]?.totalVotes || 0,
        weeklyRank: pet.weeklyStats[0]?.rank || null,
        totalVotes: pet._count.votes,
        commentCount: pet._count.comments,
        isNew:
          new Date().getTime() - new Date(pet.createdAt).getTime() <
          7 * 24 * 60 * 60 * 1000,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching pets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/pets - Create a new pet
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const body = await req.json();
    const { name, type, breed, bio, ownerName, ownerFirstName, ownerLastName, address, city, state, zipCode, photos, tags, contestIds, story } = body;

    // Support both combined ownerName and separate first/last
    const finalOwnerName = ownerName || [ownerFirstName, ownerLastName].filter(Boolean).join(" ");

    if (!name || !type || !finalOwnerName) {
      return NextResponse.json(
        { error: "Name, type, and owner name are required" },
        { status: 400 }
      );
    }

    if (name.length > 60) {
      return NextResponse.json(
        { error: "Name must be 60 characters or less" },
        { status: 400 }
      );
    }

    if (bio && bio.length > 255) {
      return NextResponse.json(
        { error: "Bio must be 255 characters or less" },
        { status: 400 }
      );
    }

    const weekId = getCurrentWeekId();

    const pet = await prisma.$transaction(async (tx) => {
      const createdPet = await tx.pet.create({
        data: {
          name,
          type,
          breed: breed || null,
          bio: bio || null,
          ownerName: finalOwnerName,
          ownerFirstName: ownerFirstName || null,
          ownerLastName: ownerLastName || null,
          address: address || null,
          city: city || null,
          state: state || null,
          zipCode: zipCode || null,
          photos: photos || [],
          tags: tags || [],
          userId,
        },
        select: {
          id: true,
          name: true,
          type: true,
          breed: true,
          photos: true,
          createdAt: true,
        },
      });

      const selectedContestIds = contestIds && Array.isArray(contestIds) && contestIds.length > 0
        ? await tx.contest.findMany({
            where: {
              id: { in: contestIds },
              isActive: true,
              petType: { in: [type, "ALL"] },
              endDate: { gte: new Date() },
            },
            select: { id: true },
          }).then((contests) => contests.map((contest) => contest.id))
        : await tx.contest.findMany({
            where: { isActive: true, weekId, petType: { in: [type, "ALL"] }, type: "NATIONAL" },
            select: { id: true },
          }).then((contests) => contests.map((contest) => contest.id));

      if (selectedContestIds.length > 0) {
        await tx.contestEntry.createMany({
          data: selectedContestIds.map((contestId) => ({ contestId, petId: createdPet.id, story: story || null })),
          skipDuplicates: true,
        });
      }

      await tx.petWeeklyStats.create({
        data: { petId: createdPet.id, weekId },
      });

      return createdPet;
    });

    try {
      await schedulePetWelcomeComments({
        petId: pet.id,
        petName: pet.name,
        petBreed: pet.breed,
        targetUserId: userId,
        count: 5,
      });
    } catch (scheduleError) {
      console.error("Failed to schedule welcome comments:", scheduleError);
    }

    return NextResponse.json(pet, { status: 201 });
  } catch (error) {
    console.error("Error creating pet:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
