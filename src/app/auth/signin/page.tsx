"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false, callbackUrl });
    setLoading(false);
    if (res?.error) { setError("Invalid email or password."); return; }
    if (res?.url) window.location.href = res.url;
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
          <h1 className="text-3xl font-extrabold text-surface-900 mt-4 tracking-tight">Welcome back</h1>
          <p className="text-base font-bold text-surface-600 mt-1">Vote to Feed</p>
          <p className="text-base text-surface-500 mt-0.5">Log in to vote, buy votes, or manage your pets</p>
        </div>

        <div className="space-y-2.5">
          <button type="button" onClick={() => signIn("google", { callbackUrl })} className="btn-secondary w-full justify-center py-2.5">
            Continue with Google
          </button>
          <button type="button" onClick={() => signIn("facebook", { callbackUrl })} className="btn-secondary w-full justify-center py-2.5">
            Continue with Facebook
          </button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-surface-200" /></div>
          <div className="relative flex justify-center text-xs"><span className="px-3 bg-[#FAFAFA] text-surface-400">or</span></div>
        </div>

        <form onSubmit={handleCredentials} className="space-y-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="input-field" required />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="input-field" required />
          {error && <p className="text-base text-red-500">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 disabled:opacity-60">
            {loading ? "Signing in..." : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-base text-surface-600">
          No account? <Link href="/auth/signup" className="text-brand-600 font-bold hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" /></div>}>
      <SignInForm />
    </Suspense>
  );
}
