"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import {
  applyClarityTags,
  captureLandingAttribution,
  registerAnalyticsContext,
  trackPostHogEvent,
} from "@/lib/analytics";

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
let didInitPostHog = false;

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (!posthogKey || didInitPostHog) return;

    posthog.init(posthogKey, {
      api_host: posthogHost,
      person_profiles: "identified_only",
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      session_recording: {
        maskAllInputs: true,
        maskInputOptions: {
          password: true,
        },
      },
    });

    didInitPostHog = true;
    registerAnalyticsContext();
    applyClarityTags();
    captureLandingAttribution();
    trackPostHogEvent("analytics_booted", {
      has_clarity: typeof window !== "undefined" && typeof window.clarity === "function",
      posthog_host: posthogHost,
    });
  }, []);

  useEffect(() => {
    if (!posthogKey || status === "loading") return;

    if (status !== "authenticated" || !session?.user?.id) {
      posthog.reset();
      registerAnalyticsContext();
      applyClarityTags();
      return;
    }

    const userId = session.user.id;
    const traits = {
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
    };

    posthog.identify(userId, traits);
    registerAnalyticsContext();

    if (typeof window !== "undefined" && typeof window.clarity === "function") {
      window.clarity(
        "identify",
        userId,
        undefined,
        undefined,
        session.user.email || session.user.name || userId
      );

      if (session.user.role) {
        window.clarity("set", "role", session.user.role);
      }

      applyClarityTags();
    }
  }, [session, status]);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
