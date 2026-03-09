import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { put } from "@vercel/blob";

export const dynamic = "force-dynamic";

// Max 10MB
const MAX_SIZE = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    // Check for BLOB_READ_WRITE_TOKEN before doing any work
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("[upload/blob] BLOB_READ_WRITE_TOKEN is not set");
      return NextResponse.json(
        { error: "Image upload is not configured. Please contact support." },
        { status: 503 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, GIF, WebP allowed" }, { status: 400 });
    }

    // Upload to Vercel Blob
    const blob = await put(file.name, file, {
      access: "public",
      addRandomSuffix: true,
    });

    return NextResponse.json({
      url: blob.url,
      filename: file.name,
      size: file.size,
    });
  } catch (error) {
    console.error("Blob upload error:", error);

    // Surface Vercel Blob token errors explicitly
    if (error instanceof Error && error.message.includes("token")) {
      return NextResponse.json(
        { error: "Upload service misconfigured — BLOB_READ_WRITE_TOKEN is invalid or missing." },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
