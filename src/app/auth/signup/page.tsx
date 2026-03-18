"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(4);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/dashboard";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Step 1: Register the account
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Sign up failed"); setLoading(false); return; }

      // Step 2: Automatically log them in
      const loginRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (loginRes?.error) {
        // Fallback: redirect to sign-in page if auto-login fails
        window.location.href = `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
        return;
      }

      if (loginRes?.url) {
        setSuccess(true);
        setCountdown(4);
        const target = loginRes.url!;
        setTimeout(() => { window.location.href = target; }, 4000);
      }
    } catch {
      setError("Something went wrong.");
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!success) return;
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [success, countdown]);

  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-500 flex items-center justify-center shadow-glow mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <h2 className="text-2xl font-extrabold text-surface-900 mb-2">You're in! 🎉</h2>
          <p className="text-surface-700 mb-2">Your account is ready.</p>
          <p className="text-sm text-surface-500 mb-6">Redirecting to your dashboard in {countdown}s…</p>
          <div className="rounded-2xl bg-brand-50 border border-brand-100 p-5 text-left space-y-3">
            <p className="font-bold text-brand-700 text-sm flex items-center gap-2">
              <span className="text-lg">📧</span> Check your email inbox now
            </p>
            <p className="text-sm text-surface-700">We'll send you contest updates, vote alerts, and rank notifications. To make sure they land:</p>
            <ul className="space-y-2 text-sm text-surface-700">
              <li className="flex items-start gap-2">
                <span className="text-brand-500 font-bold mt-0.5">1.</span>
                <span>Open the welcome email from <strong>noreply@votetofeed.com</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-500 font-bold mt-0.5">2.</span>
                <span>If it's in spam — move it to your inbox</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-500 font-bold mt-0.5">3.</span>
                <span>⭐ Star it so contest alerts never get buried</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            </div>
          </Link>
          <h1 className="text-3xl font-extrabold text-surface-900 mt-4 tracking-tight">Create your free account</h1>
          <p className="text-base text-surface-800 mt-1">Vote, support shelter pets, or enter your own pet</p>
        </div>

        {/* Social login */}
        <div className="space-y-2.5 mb-4">
          <button type="button" onClick={() => signIn("google", { callbackUrl })} className="btn-secondary w-full justify-center py-2.5 gap-2.5">
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>
          <button type="button" onClick={() => signIn("facebook", { callbackUrl })} className="btn-secondary w-full justify-center py-2.5 gap-2.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Continue with Facebook
          </button>
        </div>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-surface-200" /></div>
          <div className="relative flex justify-center text-xs"><span className="px-3 bg-[#FAFAFA] text-surface-800">or sign up with email</span></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="input-field" />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="input-field" required />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 8 characters)" className="input-field" required minLength={8} />
          {error && <p className="text-base text-red-500">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 disabled:opacity-60">
            {loading ? "Creating account..." : "Create free account"}
          </button>
        </form>

        {/* Benefits callout */}
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
              Enter your own pet to win prizes (optional)
            </li>
          </ul>
        </div>

        <p className="mt-5 text-center text-base text-surface-800">
          Already have an account? <Link href="/auth/signin" className="text-brand-600 font-bold hover:underline">Log in</Link>
        </p>

        <p className="mt-4 text-center text-xs text-surface-500">
          By signing up you agree to our{" "}
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
