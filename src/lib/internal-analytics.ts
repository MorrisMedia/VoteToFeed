import "server-only";

import { getServerSession } from "next-auth";
import type { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

type AnalyticsEventInput = {
  eventName: string;
  sessionId?: string | null;
  currentUrl?: string | null;
  currentPath?: string | null;
  currentReferrer?: string | null;
  initialReferrer?: string | null;
  initialReferringDomain?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  creativeSource?: string | null;
  packageTier?: string | null;
  petId?: string | null;
  petType?: string | null;
  voteType?: string | null;
  amountDollars?: number | null;
  votes?: number | null;
  meals?: number | null;
  properties?: Record<string, unknown> | null;
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

let ensured = false;

function clean(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function numberOrNull(value: unknown) {
  if (value == null || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function getReportingStartAt() {
  const raw = clean(process.env.INTERNAL_ANALYTICS_REPORTING_START_AT || process.env.ANALYTICS_REPORTING_START_AT);
  if (!raw) return null;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed;
}

function toSqlTimestamp(date: Date) {
  return date.toISOString().replace("T", " ").replace("Z", "+00:00");
}

function buildWindowClause(column: string, interval: string, reportingStartAt: Date | null) {
  const rollingWindow = `${column} >= NOW() - INTERVAL '${interval}'`;
  if (!reportingStartAt) return rollingWindow;
  return `${column} >= GREATEST(NOW() - INTERVAL '${interval}', TIMESTAMPTZ '${toSqlTimestamp(reportingStartAt)}')`;
}

function buildSinceClause(column: string, reportingStartAt: Date | null) {
  if (!reportingStartAt) return "TRUE";
  return `${column} >= TIMESTAMPTZ '${toSqlTimestamp(reportingStartAt)}'`;
}

export async function ensureAnalyticsTable() {
  if (ensured) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS site_analytics_events (
      id BIGSERIAL PRIMARY KEY,
      event_name TEXT NOT NULL,
      session_id TEXT,
      user_id TEXT,
      current_url TEXT,
      current_path TEXT,
      current_referrer TEXT,
      initial_referrer TEXT,
      initial_referring_domain TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_content TEXT,
      utm_term TEXT,
      creative_source TEXT,
      package_tier TEXT,
      pet_id TEXT,
      pet_type TEXT,
      vote_type TEXT,
      amount_dollars NUMERIC,
      votes INTEGER,
      meals NUMERIC,
      properties JSONB,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_site_analytics_events_created_at ON site_analytics_events(created_at DESC);`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_site_analytics_events_event_name ON site_analytics_events(event_name);`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_site_analytics_events_utm ON site_analytics_events(utm_source, utm_medium, utm_campaign);`);

  ensured = true;
}

export function getRequestIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return clean(req.headers.get("x-real-ip"));
}

export async function getCurrentUserId() {
  const session = await getServerSession(authOptions);
  return ((session?.user as Record<string, unknown> | undefined)?.id as string | undefined) || null;
}

export async function recordAnalyticsEvent(input: AnalyticsEventInput) {
  await ensureAnalyticsTable();

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO site_analytics_events (
        event_name, session_id, user_id, current_url, current_path, current_referrer,
        initial_referrer, initial_referring_domain, utm_source, utm_medium, utm_campaign,
        utm_content, utm_term, creative_source, package_tier, pet_id, pet_type, vote_type,
        amount_dollars, votes, meals, properties, ip_address, user_agent
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,$11,
        $12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22::jsonb,$23,$24
      )
    `,
    input.eventName,
    clean(input.sessionId),
    clean(input.userId),
    clean(input.currentUrl),
    clean(input.currentPath),
    clean(input.currentReferrer),
    clean(input.initialReferrer),
    clean(input.initialReferringDomain),
    clean(input.utmSource),
    clean(input.utmMedium),
    clean(input.utmCampaign),
    clean(input.utmContent),
    clean(input.utmTerm),
    clean(input.creativeSource),
    clean(input.packageTier),
    clean(input.petId),
    clean(input.petType),
    clean(input.voteType),
    numberOrNull(input.amountDollars),
    numberOrNull(input.votes),
    numberOrNull(input.meals),
    JSON.stringify(input.properties || {}),
    clean(input.ipAddress),
    clean(input.userAgent)
  );
}

export async function getInternalAnalyticsDashboardData() {
  await ensureAnalyticsTable();

  const reportingStartAt = getReportingStartAt();
  const trafficWindow = buildWindowClause("created_at", "14 days", reportingStartAt);
  const funnelWindow = buildWindowClause("created_at", "7 days", reportingStartAt);
  const purchasesWindow = buildWindowClause("created_at", "14 days", reportingStartAt);
  const eventsWindow = buildWindowClause("created_at", "3 days", reportingStartAt);
  const userWindow = buildWindowClause('"createdAt"', "7 days", reportingStartAt);
  const petWindow = buildWindowClause('"createdAt"', "7 days", reportingStartAt);
  const voteWindow = buildWindowClause('"createdAt"', "7 days", reportingStartAt);
  const purchaseWindow = buildWindowClause('"createdAt"', "7 days", reportingStartAt);
  const landingSince = buildSinceClause("created_at", reportingStartAt);

  const [trafficSummary, funnelSummary, recentPurchases, recentEvents, overviewRows] = await Promise.all([
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
      SELECT
        COALESCE(NULLIF(utm_source, ''), 'direct') AS utm_source,
        COALESCE(NULLIF(utm_medium, ''), 'none') AS utm_medium,
        COALESCE(NULLIF(utm_campaign, ''), 'none') AS utm_campaign,
        COUNT(*) FILTER (WHERE event_name = 'landing_attribution_captured') AS landings,
        COUNT(*) FILTER (WHERE event_name = 'auth_signup_completed') AS signups,
        COUNT(*) FILTER (WHERE event_name = 'pet_entry_completed') AS pet_entries,
        COUNT(*) FILTER (WHERE event_name = 'vote_cast') AS votes,
        COUNT(*) FILTER (WHERE event_name = 'checkout_started') AS checkouts,
        COUNT(*) FILTER (WHERE event_name = 'checkout_completed') AS purchases
      FROM site_analytics_events
      WHERE ${trafficWindow}
      GROUP BY 1,2,3
      ORDER BY purchases DESC, signups DESC, landings DESC
      LIMIT 50
    `),
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
      SELECT
        event_name AS event,
        COUNT(*) AS total_events,
        COUNT(DISTINCT COALESCE(NULLIF(user_id, ''), NULLIF(session_id, ''))) AS unique_people
      FROM site_analytics_events
      WHERE ${funnelWindow}
      GROUP BY 1
      ORDER BY total_events DESC
    `),
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
      SELECT
        TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') AS happened_at_utc,
        COALESCE(NULLIF(utm_source, ''), 'direct') AS utm_source,
        COALESCE(NULLIF(utm_campaign, ''), 'none') AS utm_campaign,
        COALESCE(NULLIF(package_tier, ''), 'unknown') AS package_tier,
        amount_dollars,
        votes,
        meals
      FROM site_analytics_events
      WHERE ${purchasesWindow}
        AND event_name = 'checkout_completed'
      ORDER BY created_at DESC
      LIMIT 50
    `),
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
      SELECT
        TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') AS happened_at_utc,
        event_name AS event,
        COALESCE(NULLIF(utm_source, ''), 'direct') AS utm_source,
        COALESCE(NULLIF(utm_campaign, ''), 'none') AS utm_campaign,
        COALESCE(NULLIF(package_tier, ''), '') AS package_tier,
        COALESCE(NULLIF(vote_type, ''), NULLIF(pet_type, ''), '') AS event_type
      FROM site_analytics_events
      WHERE ${eventsWindow}
      ORDER BY created_at DESC
      LIMIT 100
    `),
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
      SELECT
        (SELECT COUNT(*) FROM site_analytics_events WHERE event_name = 'landing_attribution_captured' AND ${landingSince}) AS landings_14d,
        (SELECT COUNT(*) FROM "User" WHERE ${userWindow}) AS signups_7d,
        (SELECT COUNT(*) FROM "Pet" WHERE ${petWindow}) AS entries_7d,
        (SELECT COUNT(*) FROM "Vote" WHERE ${voteWindow}) AS votes_7d,
        (SELECT COUNT(*) FROM "Purchase" WHERE "status" = 'COMPLETED' AND ${purchaseWindow}) AS purchases_7d,
        (SELECT COALESCE(SUM("amount"), 0) / 100.0 FROM "Purchase" WHERE "status" = 'COMPLETED' AND ${purchaseWindow}) AS revenue_7d
    `),
  ]);

  const overview = overviewRows[0] || {};

  return {
    trafficSummary,
    funnelSummary,
    recentPurchases,
    recentEvents,
    reportingStartAt: reportingStartAt?.toISOString() || null,
    overview: {
      landings14d: Number(overview.landings_14d || 0),
      signups7d: Number(overview.signups_7d || 0),
      entries7d: Number(overview.entries_7d || 0),
      votes7d: Number(overview.votes_7d || 0),
      purchases7d: Number(overview.purchases_7d || 0),
      revenue7d: Number(overview.revenue_7d || 0),
    },
  };
}
