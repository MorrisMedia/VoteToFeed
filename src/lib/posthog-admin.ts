import "server-only";

type QueryRow = Record<string, string | number | boolean | null>;

type AdminAnalyticsData = {
  enabled: boolean;
  reason?: string;
  host?: string;
  trafficSummary: QueryRow[];
  funnelSummary: QueryRow[];
  recentPurchases: QueryRow[];
  recentEvents: QueryRow[];
};

const eventList = [
  "landing_attribution_captured",
  "analytics_booted",
  "auth_provider_click",
  "auth_signup_started",
  "auth_signup_completed",
  "pet_photo_upload_completed",
  "pet_entry_completed",
  "vote_cast",
  "vote_paywall_shown",
  "checkout_started",
  "checkout_completed",
  "checkout_cancelled",
  "analytics_health_viewed",
];

type DisabledConfig = {
  enabled: false;
  host: string;
  reason: string;
};

type EnabledConfig = {
  enabled: true;
  projectId: string;
  apiKey: string;
  host: string;
};

function normalizePostHogHost(raw?: string) {
  if (!raw) return "https://us.posthog.com";
  return raw
    .replace("https://us.i.posthog.com", "https://us.posthog.com")
    .replace("https://eu.i.posthog.com", "https://eu.posthog.com")
    .replace("https://i.posthog.com", "https://app.posthog.com");
}

function getConfig(): DisabledConfig | EnabledConfig {
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY || process.env.POSTHOG_API_KEY;
  const host = normalizePostHogHost(process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST);

  if (!projectId || !apiKey) {
    return {
      enabled: false,
      host,
      reason: "Set POSTHOG_PROJECT_ID and POSTHOG_PERSONAL_API_KEY to load aggregate analytics into the admin page.",
    };
  }

  return {
    enabled: true,
    projectId,
    apiKey,
    host,
  };
}

function unwrapRows(payload: any): QueryRow[] {
  if (Array.isArray(payload?.results)) return payload.results as QueryRow[];
  if (Array.isArray(payload?.result)) return payload.result as QueryRow[];
  if (Array.isArray(payload?.results?.results)) return payload.results.results as QueryRow[];
  if (Array.isArray(payload?.query?.results)) return payload.query.results as QueryRow[];
  return [];
}

async function runQuery(name: string, query: string, projectId: string, apiKey: string, host: string) {
  const res = await fetch(`${host}/api/projects/${projectId}/query/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: {
        kind: "HogQLQuery",
        query,
      },
      name,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PostHog query failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const json = await res.json();
  return unwrapRows(json);
}

export async function getAdminAnalyticsData(): Promise<AdminAnalyticsData> {
  const config = getConfig();
  if (!config.enabled) {
    return {
      enabled: false,
      host: config.host,
      reason: config.reason,
      trafficSummary: [],
      funnelSummary: [],
      recentPurchases: [],
      recentEvents: [],
    };
  }

  const { projectId, apiKey, host } = config;
  const eventSql = eventList.map((event) => `'${event}'`).join(", ");

  try {
    const [trafficSummary, funnelSummary, recentPurchases, recentEvents] = await Promise.all([
      runQuery(
        "admin_analytics_traffic_summary_14d",
        `SELECT
          coalesce(nullIf(properties.utm_source, ''), 'direct') AS utm_source,
          coalesce(nullIf(properties.utm_medium, ''), 'none') AS utm_medium,
          coalesce(nullIf(properties.utm_campaign, ''), 'none') AS utm_campaign,
          countIf(event = 'landing_attribution_captured') AS landings,
          countIf(event = 'auth_signup_completed') AS signups,
          countIf(event = 'pet_entry_completed') AS pet_entries,
          countIf(event = 'vote_cast') AS votes,
          countIf(event = 'checkout_started') AS checkouts,
          countIf(event = 'checkout_completed') AS purchases
        FROM events
        WHERE timestamp >= now() - INTERVAL 14 DAY
          AND event IN (${eventSql})
        GROUP BY utm_source, utm_medium, utm_campaign
        ORDER BY purchases DESC, signups DESC, landings DESC
        LIMIT 50`,
        projectId,
        apiKey,
        host
      ),
      runQuery(
        "admin_analytics_funnel_summary_7d",
        `SELECT
          event,
          count() AS total_events,
          uniq(distinct_id) AS unique_people
        FROM events
        WHERE timestamp >= now() - INTERVAL 7 DAY
          AND event IN (${eventSql})
        GROUP BY event
        ORDER BY total_events DESC`,
        projectId,
        apiKey,
        host
      ),
      runQuery(
        "admin_analytics_recent_paid_14d",
        `SELECT
          formatDateTime(timestamp, '%Y-%m-%d %H:%i:%s') AS happened_at_utc,
          distinct_id,
          coalesce(nullIf(properties.utm_source, ''), 'direct') AS utm_source,
          coalesce(nullIf(properties.utm_campaign, ''), 'none') AS utm_campaign,
          coalesce(nullIf(properties.package_tier, ''), 'unknown') AS package_tier,
          properties.amount_dollars AS amount_dollars,
          properties.votes AS votes,
          properties.meals AS meals
        FROM events
        WHERE timestamp >= now() - INTERVAL 14 DAY
          AND event = 'checkout_completed'
        ORDER BY timestamp DESC
        LIMIT 50`,
        projectId,
        apiKey,
        host
      ),
      runQuery(
        "admin_analytics_recent_events_3d",
        `SELECT
          formatDateTime(timestamp, '%Y-%m-%d %H:%i:%s') AS happened_at_utc,
          event,
          distinct_id,
          coalesce(nullIf(properties.utm_source, ''), 'direct') AS utm_source,
          coalesce(nullIf(properties.utm_campaign, ''), 'none') AS utm_campaign,
          coalesce(nullIf(properties.package_tier, ''), '') AS package_tier,
          coalesce(nullIf(properties.pet_type, ''), '') AS pet_type,
          coalesce(nullIf(properties.vote_type, ''), '') AS vote_type
        FROM events
        WHERE timestamp >= now() - INTERVAL 3 DAY
          AND event IN (${eventSql})
        ORDER BY timestamp DESC
        LIMIT 100`,
        projectId,
        apiKey,
        host
      ),
    ]);

    return {
      enabled: true,
      host,
      trafficSummary,
      funnelSummary,
      recentPurchases,
      recentEvents,
    };
  } catch (error) {
    return {
      enabled: false,
      host,
      reason: error instanceof Error ? error.message : "Unknown PostHog query error",
      trafficSummary: [],
      funnelSummary: [],
      recentPurchases: [],
      recentEvents: [],
    };
  }
}
