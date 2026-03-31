import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * Admin utility to identify and fix pets with multiple photos
 * Some pets may have accumulated extra photos (e.g., from auto-engage cron)
 * This endpoint allows admins to:
 * 1. List pets with multiple photos
 * 2. Reset a pet to only show its first (original) photo
 */

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as Record<string, unknown>)?.role;
  
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const action = searchParams.get("action");
  const petId = searchParams.get("petId");

  if (action === "list") {
    // List all pets with multiple photos
    const petsWithMultiplePhotos = await prisma.pet.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        ownerName: true,
        photos: true,
        user: { select: { email: true } },
      },
    });

    const filtered = petsWithMultiplePhotos.filter((p) => p.photos.length > 1);

    return NextResponse.json({
      totalPets: petsWithMultiplePhotos.length,
      petsWithMultiplePhotos: filtered.length,
      pets: filtered.map((p) => ({
        id: p.id,
        name: p.name,
        owner: p.ownerName,
        email: p.user.email,
        photoCount: p.photos.length,
        firstPhoto: p.photos[0],
        allPhotos: p.photos,
      })),
    });
  }

  if (action === "reset" && petId) {
    // Reset a pet to only its first photo
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      select: { photos: true, name: true },
    });

    if (!pet) {
      return NextResponse.json({ error: "Pet not found" }, { status: 404 });
    }

    if (pet.photos.length <= 1) {
      return NextResponse.json({
        message: `Pet "${pet.name}" already has only 1 photo`,
        photoCount: pet.photos.length,
      });
    }

    // Keep only the first photo
    const firstPhoto = pet.photos[0];
    await prisma.pet.update({
      where: { id: petId },
      data: { photos: [firstPhoto] },
    });

    return NextResponse.json({
      success: true,
      message: `Pet "${pet.name}" reset to first photo only`,
      previousCount: pet.photos.length,
      newCount: 1,
    });
  }

  return NextResponse.json({
    message: "Cleanup utility for pet photos",
    usage: {
      list: "/api/admin/cleanup-pet-photos?action=list",
      reset: "/api/admin/cleanup-pet-photos?action=reset&petId=<petId>",
    },
  });
}
