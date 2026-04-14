import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/users/me/owner-info — returns owner info from the user's most recent pet
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  const lastPet = await prisma.pet.findFirst({
    where: { userId, isActive: true },
    select: {
      ownerFirstName: true,
      ownerLastName: true,
      address: true,
      city: true,
      state: true,
      zipCode: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!lastPet) {
    return NextResponse.json({});
  }

  return NextResponse.json({
    ownerFirstName: lastPet.ownerFirstName ?? "",
    ownerLastName: lastPet.ownerLastName ?? "",
    address: lastPet.address ?? "",
    city: lastPet.city ?? "",
    state: lastPet.state ?? "",
    zipCode: lastPet.zipCode ?? "",
  });
}
