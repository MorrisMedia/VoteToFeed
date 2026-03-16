import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getCurrentWeekId } from "@/lib/utils";

export const dynamic = "force-dynamic";

// GET /api/pets/[id] - Get pet details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const weekId = getCurrentWeekId();

    const pet = await prisma.pet.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, name: true, image: true } },
        weeklyStats: {
          where: { weekId },
          take: 1,
        },
        votes: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
        },
        comments: {
          where: { parentId: null },
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            user: { select: { id: true, name: true, image: true } },
            replies: {
              include: {
                user: { select: { id: true, name: true, image: true } },
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
        contestEntries: {
          include: {
            contest: true,
          },
        },
        productDesigns: {
          where: { isActive: true },
          include: {
            mockups: { where: { isActive: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: { select: { votes: true, comments: true } },
      },
    });

    if (!pet || !pet.isActive) {
      return NextResponse.json({ error: "Pet not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...pet,
      weeklyVotes: pet.weeklyStats[0]?.totalVotes || 0,
      weeklyRank: pet.weeklyStats[0]?.rank || null,
      isNew:
        new Date().getTime() - new Date(pet.createdAt).getTime() <
        7 * 24 * 60 * 60 * 1000,
    });
  } catch (error) {
    console.error("Error fetching pet:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/pets/[id] - Update pet
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const pet = await prisma.pet.findUnique({ where: { id: params.id } });

    if (!pet) {
      return NextResponse.json({ error: "Pet not found" }, { status: 404 });
    }

    if (pet.userId !== userId) {
      return NextResponse.json({ error: "Not your pet" }, { status: 403 });
    }

    const body = await req.json();
    const { name, breed, bio, ownerName, city, state, zipCode, photos, tags, optInDesigns } = body;

    const updated = await prisma.pet.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(breed !== undefined && { breed }),
        ...(bio !== undefined && { bio }),
        ...(ownerName !== undefined && { ownerName }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(zipCode !== undefined && { zipCode }),
        ...(photos !== undefined && { photos }),
        ...(tags !== undefined && { tags }),
        ...(optInDesigns !== undefined && { optInDesigns }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating pet:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/pets/[id] - Delete pet
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const userRole = (session.user as Record<string, unknown>).role as string;
    const pet = await prisma.pet.findUnique({ where: { id: params.id } });

    if (!pet) {
      return NextResponse.json({ error: "Pet not found" }, { status: 404 });
    }

    if (pet.userId !== userId && userRole !== "ADMIN") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    await prisma.pet.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting pet:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
