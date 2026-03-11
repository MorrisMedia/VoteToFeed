import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Public routes that don't require authentication
const publicRoutes = [
  "/",
  "/api/og",
  "/api/pets", // GET to view pets
  "/privacy",
  "/terms",
  "/leaderboard",
  "/votesforshelters",
  "/winners",
  "/contests",
  "/breeds",
  "/pets", // GET to view pets
];

// Routes that require authentication
const protectedPrefixes = ["/admin", "/dashboard"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get("user-agent") || "";

  // Allow Facebook's scraper bot to access public content without authentication
  if (userAgent.includes("facebookexternalhit")) {
    // Check if the requested path is public
    const isPublic = publicRoutes.some(
      (route) => pathname === route || pathname.startsWith(route + "/")
    );

    if (isPublic) {
      return NextResponse.next();
    }
  }

  // Check if this is a protected route
  const isProtected = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isProtected) {
    // Get session for protected routes
    const session = await getServerSession(authOptions);

    if (!session) {
      // Redirect to sign in
      return NextResponse.redirect(new URL("/auth/signin", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
