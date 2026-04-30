import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { put } from "@vercel/blob";

export const dynamic = "force-dynamic";

const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/ogg",
  "video/x-msvideo",
]);

const ACCEPTED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp",
  ".mp4", ".webm", ".mov", ".ogg", ".avi",
]);

const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".ogg", ".avi"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime", "video/ogg", "video/x-msvideo"]);

const HEIC_EXTENSIONS = new Set([".heic", ".heif"]);
const HEIC_TYPES = new Set(["image/heic", "image/heif"]);

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;  // 20 MB
const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200 MB
const MAX_FILE_SIZE = MAX_IMAGE_SIZE; // kept for compat
const MAX_FILES = 3; // aligned with post-creation cap (MAX_MEDIA=3 on client)

function validateFile(file: File) {
  const ext = path.extname(file.name).toLowerCase();

  // HEIC/HEIF files cannot be displayed in browsers — reject with a helpful message
  if (HEIC_EXTENSIONS.has(ext) || HEIC_TYPES.has(file.type)) {
    return `HEIC/HEIF photos aren't supported yet. Please convert ${file.name} to JPG or PNG first (on iPhone: Settings → Camera → Formats → Most Compatible).`;
  }

  const isValidType = ACCEPTED_TYPES.has(file.type) || ACCEPTED_EXTENSIONS.has(ext);
  if (!isValidType) {
    return `Unsupported file type: ${file.name}. Accepted: JPG, PNG, GIF, WebP, MP4, WebM, MOV`;
  }

  const isVideo = VIDEO_TYPES.has(file.type) || VIDEO_EXTENSIONS.has(ext);
  const sizeLimit = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (file.size > sizeLimit) {
    const limitMB = sizeLimit / 1024 / 1024;
    return `File too large: ${file.name}. Maximum ${limitMB}MB for ${isVideo ? "videos" : "images"}.`;
  }

  return null;
}

async function uploadToBlob(file: File) {
  const ext = path.extname(file.name).toLowerCase() || ".jpg";
  const baseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9-_]/g, "-") || "upload";
  const isVideo = VIDEO_EXTENSIONS.has(ext) || VIDEO_TYPES.has(file.type);
  const folder = isVideo ? "videos" : "posts";

  const blob = await put(`${folder}/${baseName}${ext}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type || undefined,
  });

  return blob.url;
}

async function uploadToLocalDisk(file: File) {
  const ext = path.extname(file.name).toLowerCase() || ".jpg";
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const uniqueId = crypto.randomBytes(12).toString("hex");
  const filename = `${uniqueId}${ext}`;
  const filepath = path.join(uploadDir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  return `/uploads/${filename}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const files = formData.getAll("photos").filter((value): value is File => value instanceof File);

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Maximum ${MAX_FILES} photos allowed` }, { status: 400 });
    }

    for (const file of files) {
      const validationError = validateFile(file);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
    }

    const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

    // Vercel's filesystem is read-only in production — local disk fallback won't work
    if (!useBlob && process.env.VERCEL) {
      return NextResponse.json(
        { error: "Image upload is not configured. Please contact support." },
        { status: 503 }
      );
    }

    const urls: string[] = [];

    for (const file of files) {
      const url = useBlob
        ? await uploadToBlob(file)
        : await uploadToLocalDisk(file);
      urls.push(url);
    }

    return NextResponse.json({ urls, storage: useBlob ? "blob" : "local" });
  } catch (error) {
    console.error("Upload error:", error);

    if (error instanceof Error && /token|blob/i.test(error.message)) {
      return NextResponse.json(
        { error: "Image upload service is misconfigured. Please contact support." },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
