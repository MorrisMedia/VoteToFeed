"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { getCreativeSource, trackEmailSignupEvent, trackVoteToFeedEvent } from "@/lib/meta-pixel";
import { trackPostHogEvent } from "@/lib/analytics";

function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/dashboard";

  useEffect(() => {
    trackPostHogEvent("signup_page_viewed", {
      callback_url: callbackUrl,
      has_callback_url: Boolean(searchParams?.get("callbackUrl")),
      utm_source: searchParams?.get("utm_source") || undefined,
      utm_medium: searchParams?.get("utm_medium") || undefined,
      utm_campaign: searchParams?.get("utm_campaign") || undefined,
      utm_content: searchParams?.get("utm_content") || undefined,
    });
  }, [callbackUrl, searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    trackPostHogEvent("auth_signup_started", {
      method: "email",
      has_name: Boolean(name.trim()),
      callback_url: callbackUrl,
    });
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Sign up failed");
        trackPostHogEvent("auth_signup_failed", {
          method: "email",
          callback_url: callbackUrl,
          error_message: data.error || "Sign up failed",
          status_code: res.status,
        });
        setLoading(false);
        return;
      }

      trackVoteToFeedEvent("CompleteRegistration", {
        content_name: "VoteToFeed_AccountSignup",
        content_category: "VoteToFeed_Account",
        source: getCreativeSource(),
        value: 0.10,
      });
      trackEmailSignupEvent();
      trackPostHogEvent("auth_signup_completed", {
        method: "email",
        callback_url: callbackUrl,
      });

      const loginRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (loginRes?.error) {
        trackPostHogEvent("auth_auto_login_failed", {
          callback_url: callbackUrl,
          provider: "credentials",
        });
        window.location.href = `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
        return;
      }

      if (loginRes?.url) {
        window.location.href = loginRes.url;
        return;
      }

      window.location.href = callbackUrl;
    } catch {
      setError("Something went wrong.");
      trackPostHogEvent("auth_signup_failed", {
        method: "email",
        callback_url: callbackUrl,
        error_message: "Something went wrong.",
      });
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-8 bg-[#FAFAFA]">
      <div className="w-full max-w-sm rounded-3xl border border-surface-200 bg-white shadow-sm p-6 sm:p-7">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2" aria-label="VoteToFeed home">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-sm">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            </div>
          </Link>
          <h1 className="text-3xl font-extrabold text-surface-900 mt-4 tracking-tight">Create your free account</h1>
          <p className="text-base text-surface-800 mt-1">Start free, then go straight to your pet entry.</p>
        </div>

        <div className="space-y-2.5 mb-4">
          <button
            type="button"
            onClick={() => {
              trackPostHogEvent("auth_provider_click", { provider: "google", callback_url: callbackUrl });
              signIn("google", { callbackUrl });
            }}
            className="btn-secondary w-full justify-center py-2.5 gap-2.5"
          >
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>
        </div>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-surface-200" /></div>
          <div className="relative flex justify-center text-xs"><span className="px-3 bg-white text-surface-800">or sign up with email</span></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="input-field" autoComplete="name" />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="input-field" required autoComplete="email" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 8 characters)" className="input-field" required minLength={8} autoComplete="new-password" />
          {error && <p className="text-base text-red-500">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 disabled:opacity-60">
            {loading ? "Creating account..." : "Create free account"}
          </button>
        </form>

        <div className="mt-5 rounded-xl bg-accent-50/60 border border-accent-200/40 p-3.5">
          <p className="text-sm font-bold text-accent-700 mb-2">What you get for free:</p>
          <ul className="space-y-1.5 text-base text-surface-700">
            <li className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-accent-500 flex-shrink-0"><path d="M20 6L9 17l-5-5"/></svg>
              5 free votes every week
            </li>
            <li className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-accent-500 flex-shrink-0"><path d="M20 6L9 17l-5-5"/></svg>
              Vote for any pet you love
            </li>
            <li className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-accent-500 flex-shrink-0"><path d="M20 6L9 17l-5-5"/></svg>
              Every vote helps feed shelter pets
            </li>
            <li className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-accent-500 flex-shrink-0"><path d="M20 6L9 17l-5-5"/></svg>
              Enter your own pet to win prizes
            </li>
          </ul>
        </div>

        <p className="mt-5 text-center text-base text-surface-800">
          Already have an account? <Link href="/auth/signin" className="text-brand-600 font-bold hover:underline">Log in</Link>
        </p>

        <p className="mt-4 text-center text-xs text-surface-500">
          By signing up you agree to our {" "}
          <Link href="/terms" className="underline hover:text-surface-700">Terms</Link>
          {" "}and{" "}
          <Link href="/privacy" className="underline hover:text-surface-700">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" /></div>}>
      <SignUpForm />
    </Suspense>
  );
}
