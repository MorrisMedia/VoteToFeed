import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

// GET /api/users/profile — fetch profile for editing
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      city: true,
      state: true,
      country: true,
      zipCode: true,
      password: true,
      createdAt: true,
      accounts: { select: { provider: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    city: user.city,
    state: user.state,
    country: user.country,
    zipCode: user.zipCode,
    hasPassword: !!user.password,
    isOAuth: user.accounts.length > 0,
    oauthProviders: user.accounts.map((a) => a.provider),
    createdAt: user.createdAt.toISOString(),
  });
}

// PATCH /api/users/profile — update profile fields
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, city, state, country, zipCode, image, currentPassword, newPassword } = body as {
    name?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
    image?: string;
    currentPassword?: string;
    newPassword?: string;
  };

  // Build update data — only include provided fields
  const updateData: Record<string, unknown> = {};

  if (typeof name === "string") {
    const trimmed = name.trim();
    if (trimmed.length > 100) {
      return NextResponse.json({ error: "Name must be 100 characters or less" }, { status: 400 });
    }
    updateData.name = trimmed || null;
  }

  if (typeof city === "string") {
    const trimmed = city.trim();
    if (trimmed.length > 100) {
      return NextResponse.json({ error: "City must be 100 characters or less" }, { status: 400 });
    }
    updateData.city = trimmed || null;
  }

  if (typeof state === "string") {
    const trimmed = state.trim();
    if (trimmed.length > 100) {
      return NextResponse.json({ error: "State must be 100 characters or less" }, { status: 400 });
    }
    updateData.state = trimmed || null;
  }

  if (typeof country === "string") {
    const trimmed = country.trim();
    if (trimmed.length > 100) {
      return NextResponse.json({ error: "Country must be 100 characters or less" }, { status: 400 });
    }
    updateData.country = trimmed || null;
  }

  if (typeof zipCode === "string") {
    const trimmed = zipCode.trim();
    if (trimmed.length > 20) {
      return NextResponse.json({ error: "Zip code must be 20 characters or less" }, { status: 400 });
    }
    updateData.zipCode = trimmed || null;
  }

  if (typeof image === "string") {
    // Allow clearing image or setting a URL
    updateData.image = image || null;
  }

  // Password change
  if (newPassword) {
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true, accounts: { select: { provider: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If user has a password, require current password
    if (user.password) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Current password is required" }, { status: 400 });
      }
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }
    }

    updateData.password = await bcrypt.hash(newPassword, 12);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      city: true,
      state: true,
      country: true,
      zipCode: true,
    },
  });

  return NextResponse.json(updated);
}
