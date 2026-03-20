export const META_PIXEL_ID = "2009139989998970";

const DEFAULT_SOURCE_PREFIX = "creative_test";

const EMAIL_SIGNUP_SESSION_KEY = "vtf_meta_email_signup_tracked";
const PURCHASE_SESSION_KEY = "vtf_meta_purchase_tracked";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

type TrackMode = "track" | "trackCustom";

type StandardEventParams = {
  content_name: string;
  content_category: string;
  source?: string;
  value?: number;
  currency?: string;
  content_ids?: string[];
  num_items?: number;
  [key: string]: unknown;
};

function slugifySourcePart(value?: string | null) {
  if (!value) return "unknown";
  const cleaned = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || "unknown";
}

export function getCreativeSource(sourcePart?: string | null) {
  if (sourcePart) return `${DEFAULT_SOURCE_PREFIX}_${slugifySourcePart(sourcePart)}`;
  if (typeof window === "undefined") return DEFAULT_SOURCE_PREFIX;

  const params = new URLSearchParams(window.location.search);
  const explicit = params.get("creative_source") || params.get("utm_content") || params.get("breed");
  if (explicit) return `${DEFAULT_SOURCE_PREFIX}_${slugifySourcePart(explicit)}`;
  return DEFAULT_SOURCE_PREFIX;
}

export function trackMetaPixel(eventName: string, params?: Record<string, unknown>, mode: TrackMode = "trackCustom") {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq(mode, eventName, params || {});
}

export function trackVoteToFeedEvent(eventName: string, params: StandardEventParams) {
  trackMetaPixel(eventName, {
    currency: "USD",
    value: 0.1,
    source: getCreativeSource(),
    ...params,
  }, "track");
}

export function trackEmailSignupEvent(sourcePart?: string | null) {
  if (typeof window === "undefined") return;
  if (window.sessionStorage.getItem(EMAIL_SIGNUP_SESSION_KEY) === "1") return;
  trackVoteToFeedEvent("Subscribe", {
    content_name: "VoteToFeed_EmailSignup",
    content_category: "VoteToFeed_Newsletter",
    source: getCreativeSource(sourcePart),
    value: 0.1,
  });
  window.sessionStorage.setItem(EMAIL_SIGNUP_SESSION_KEY, "1");
}

export function trackCheckoutStartedEvent({
  tier,
  voteQuantity,
  amountDollars,
  sourcePart,
}: {
  tier: string;
  voteQuantity?: number;
  amountDollars?: number;
  sourcePart?: string | null;
}) {
  trackMetaPixel("InitiateCheckout", {
    content_name: `VoteToFeed_${tier}_Checkout`,
    content_category: "VoteToFeed_Revenue",
    source: getCreativeSource(sourcePart),
    value: amountDollars ?? 0,
    currency: "USD",
    num_items: voteQuantity,
  }, "track");
}

export function trackPetEntryEvent({
  petId,
  petName,
  petType,
  contestCount,
  sourcePart,
}: {
  petId: string;
  petName: string;
  petType: string;
  contestCount: number;
  sourcePart?: string | null;
}) {
  const source = getCreativeSource(sourcePart);

  trackMetaPixel("SubmitApplication", {
    content_name: "VoteToFeed_PetEntry",
    content_category: "VoteToFeed_ContestEntry",
    content_ids: [petId],
    source,
    value: 0.1,
    currency: "USD",
    num_items: contestCount,
    pet_name: petName,
    pet_type: petType,
  }, "track");

  trackMetaPixel("VoteToFeedEntry", {
    petId,
    petName,
    petType,
    contestCount,
    source,
  });
}

export function trackVoteCastEvent({
  petId,
  petType,
  voteType,
  weeklyVotes,
  isAnonymous,
}: {
  petId: string;
  petType: string;
  voteType: string;
  weeklyVotes: number;
  isAnonymous?: boolean;
}) {
  trackMetaPixel("VoteToFeedVote", {
    petId,
    petType,
    voteType,
    weeklyVotes,
    isAnonymous: isAnonymous || false,
    source: getCreativeSource(petType),
  });
}

export function trackStripePurchaseEvent({
  amountDollars,
  voteQuantity,
  photoId,
  sourcePart,
  tier,
}: {
  amountDollars: number;
  voteQuantity: number;
  photoId?: string | null;
  sourcePart?: string | null;
  tier?: string | null;
}) {
  if (typeof window === "undefined") return;
  const dedupeKey = `${PURCHASE_SESSION_KEY}:${amountDollars}:${voteQuantity}:${photoId || "none"}:${tier || "unknown"}`;
  if (window.sessionStorage.getItem(dedupeKey) === "1") return;

  const payload: StandardEventParams = {
    content_name: tier ? `VoteToFeed_${tier}_Purchase` : "VoteToFeed_PaidVote",
    content_category: "VoteToFeed_Revenue",
    source: getCreativeSource(sourcePart),
    value: amountDollars,
    currency: "USD",
    num_items: voteQuantity,
  };

  if (photoId) payload.content_ids = [photoId];

  trackMetaPixel("Purchase", payload, "track");
  window.sessionStorage.setItem(dedupeKey, "1");
}
