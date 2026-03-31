import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  ANONYMOUS_VOTE_LIMIT,
  getAnonymousVotesRemaining,
  getClientIp,
} from "@/lib/anonymous-votes";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (session?.user) {
      const userId = (session.user as { id?: string }).id;

      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          freeVotesRemaining: true,
          paidVoteBalance: true,
        },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      return NextResponse.json({
        isAnonymous: false,
        freeVotesRemaining: user.freeVotesRemaining,
        paidVoteBalance: user.paidVoteBalance,
      });
    }

    const ip = getClientIp(req);
    const remainingVotes = await getAnonymousVotesRemaining(ip);

    return NextResponse.json({
      isAnonymous: true,
      freeVotesRemaining: remainingVotes,
      paidVoteBalance: 0,
      limit: ANONYMOUS_VOTE_LIMIT,
    });
  } catch (error) {
    console.error("Error fetching remaining votes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
