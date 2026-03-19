import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUserId,
  getRequestIp,
  recordAnalyticsEvent,
} from "@/lib/internal-analytics";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const eventName = typeof body?.eventName === "string" ? body.eventName.trim() : "";

    if (!eventName) {
      return NextResponse.json({ error: "eventName required" }, { status: 400 });
    }

    await recordAnalyticsEvent({
      eventName,
      sessionId: body?.sessionId,
      currentUrl: body?.currentUrl,
      currentPath: body?.currentPath,
      currentReferrer: body?.currentReferrer,
      initialReferrer: body?.initialReferrer,
      initialReferringDomain: body?.initialReferringDomain,
      utmSource: body?.utmSource,
      utmMedium: body?.utmMedium,
      utmCampaign: body?.utmCampaign,
      utmContent: body?.utmContent,
      utmTerm: body?.utmTerm,
      creativeSource: body?.creativeSource,
      packageTier: body?.packageTier,
      petId: body?.petId,
      petType: body?.petType,
      voteType: body?.voteType,
      amountDollars: body?.amountDollars,
      votes: body?.votes,
      meals: body?.meals,
      properties: body?.properties,
      userId: await getCurrentUserId(),
      ipAddress: getRequestIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Analytics collection error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
