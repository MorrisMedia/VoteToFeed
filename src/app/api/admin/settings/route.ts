import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllSettings, updateSetting } from "@/lib/admin-settings";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/admin/settings
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as Record<string, unknown>).role;
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const settings = await getAllSettings();

    // Get change logs
    const logs = await prisma.adminSettingLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { setting: { select: { key: true } } },
    });

    return NextResponse.json({ settings, logs });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/settings
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as Record<string, unknown>).role;
    const userId = (session.user as Record<string, unknown>).id as string;
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { key, value } = await req.json();

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: "Key and value required" },
        { status: 400 }
      );
    }

    // Validate specific settings
    if (key === "meal_rate") {
      const rate = parseFloat(value);
      if (isNaN(rate) || rate <= 0) {
        return NextResponse.json(
          { error: "Meal rate must be a positive number" },
          { status: 400 }
        );
      }
    }

    if (key === "animal_type") {
      const valid = ["dogs", "cats", "dogs and cats", "animals"];
      if (!valid.includes(value.toLowerCase())) {
        return NextResponse.json(
          { error: `Animal type must be one of: ${valid.join(", ")}` },
          { status: 400 }
        );
      }
    }

    if (key === "free_votes_amount") {
      const amt = parseInt(value);
      if (isNaN(amt) || amt < 0 || amt > 1000) {
        return NextResponse.json(
          { error: "Free votes must be between 0 and 1000" },
          { status: 400 }
        );
      }
    }

    if (key === "free_votes_period") {
      const valid = ["daily", "weekly", "monthly"];
      if (!valid.includes(value)) {
        return NextResponse.json(
          { error: `Period must be one of: ${valid.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Stripe keys — validate format loosely
    if (key === "stripe_secret_key" && value && !value.startsWith("sk_") && !value.startsWith("rk_")) {
      return NextResponse.json(
        { error: "Stripe secret key should start with sk_ or rk_" },
        { status: 400 }
      );
    }
    if (key === "stripe_publishable_key" && value && !value.startsWith("pk_")) {
      return NextResponse.json(
        { error: "Stripe publishable key should start with pk_" },
        { status: 400 }
      );
    }
    if (key === "stripe_webhook_secret" && value && !value.startsWith("whsec_")) {
      return NextResponse.json(
        { error: "Stripe webhook secret should start with whsec_" },
        { status: 400 }
      );
    }

    await updateSetting(key, value, userId);

    const settings = await getAllSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error updating setting:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
