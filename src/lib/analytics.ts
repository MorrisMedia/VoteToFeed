"use client";

import posthog from "posthog-js";
import { getCreativeSource } from "@/lib/meta-pixel";

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

type AttributionData = {
  initial_path?: string;
  initial_referrer?: string;
  initial_referring_domain?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  creative_source?: string;
  landing_captured_at?: string;
};

const ATTRIBUTION_KEY = "vtf_first_touch_attribution";
const ATTRIBUTION_CAPTURED_KEY = "vtf_first_touch_attribution_captured";
const SESSION_ID_KEY = "vtf_analytics_session_id";

function clean(value?: string | null) {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function getAnalyticsSessionId() {
  if (typeof window === "undefined") return undefined;

  const existing = window.localStorage.getItem(SESSION_ID_KEY);
  if (existing) return existing;

  const next = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `vtf-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  window.localStorage.setItem(SESSION_ID_KEY, next);
  return next;
}

function getCurrentAttribution(): AttributionData {
  if (typeof window === "undefined") return {};

  const params = new URLSearchParams(window.location.search);
  const initial_referrer = clean(document.referrer);
  let initial_referring_domain: string | undefined;

  if (initial_referrer) {
    try {
      initial_referring_domain = clean(new URL(initial_referrer).hostname);
    } catch {
      initial_referring_domain = undefined;
    }
  }

  const utm_source = clean(params.get("utm_source"));
  const utm_medium = clean(params.get("utm_medium"));
  const utm_campaign = clean(params.get("utm_campaign"));
  const utm_content = clean(params.get("utm_content"));
  const utm_term = clean(params.get("utm_term"));

  return {
    initial_path: clean(`${window.location.pathname}${window.location.search}`),
    initial_referrer,
    initial_referring_domain,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    creative_source: getCreativeSource(utm_content || utm_campaign || utm_source),
    landing_captured_at: new Date().toISOString(),
  };
}

export function readStoredAttribution(): AttributionData | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AttributionData;
  } catch {
    return null;
  }
}

export function ensureAttribution(): AttributionData {
  if (typeof window === "undefined") return {};

  const stored = readStoredAttribution();
  if (stored) return stored;

  const attribution = getCurrentAttribution();
  try {
    window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  } catch {
    // Ignore storage failures.
  }
  return attribution;
}

export function getAnalyticsContext(extra: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return extra;

  const attribution = ensureAttribution();

  return {
    sessionId: getAnalyticsSessionId(),
    initialReferrer: attribution.initial_referrer,
    initialReferringDomain: attribution.initial_referring_domain,
    utmSource: attribution.utm_source,
    utmMedium: attribution.utm_medium,
    utmCampaign: attribution.utm_campaign,
    utmContent: attribution.utm_content,
    utmTerm: attribution.utm_term,
    creativeSource: attribution.creative_source,
    currentPath: window.location.pathname,
    currentUrl: window.location.href,
    currentReferrer: clean(document.referrer),
    ...extra,
  };
}

function sendInternalAnalyticsEvent(eventName: string, properties: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  const payload = {
    eventName,
    ...getAnalyticsContext(properties),
    properties,
  };

  try {
    fetch("/api/analytics/collect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Ignore analytics transport errors.
  }
}

export function registerAnalyticsContext() {
  if (typeof window === "undefined") return;
  posthog.register(getAnalyticsContext());
}

export function applyClarityTags() {
  if (typeof window === "undefined" || typeof window.clarity !== "function") return;

  const attribution = ensureAttribution();
  const pairs = Object.entries(attribution).filter(([, value]) => value != null && value !== "");

  for (const [key, value] of pairs) {
    window.clarity("set", key, value);
  }
}

export function captureLandingAttribution() {
  if (typeof window === "undefined") return;
  ensureAttribution();

  if (window.sessionStorage.getItem(ATTRIBUTION_CAPTURED_KEY) === "1") return;

  posthog.capture("landing_attribution_captured", getAnalyticsContext());
  sendInternalAnalyticsEvent("landing_attribution_captured");
  window.sessionStorage.setItem(ATTRIBUTION_CAPTURED_KEY, "1");
}

export function trackPostHogEvent(eventName: string, properties: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  posthog.capture(eventName, getAnalyticsContext(properties));
  sendInternalAnalyticsEvent(eventName, properties);
}
