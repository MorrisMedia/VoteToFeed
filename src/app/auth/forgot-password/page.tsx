"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setDone(true);
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-3xl font-extrabold text-surface-900 mt-4 tracking-tight">Forgot your password?</h1>
          <p className="text-base text-surface-700 mt-1">Enter your email and we&apos;ll send a reset link.</p>
        </div>

        <div className="card p-6">
          {done ? (
            <div className="space-y-4 text-center">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                Check your email — we sent a reset link.
              </div>
              <Link href="/auth/signin" className="text-sm font-medium text-brand-600 hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="input-field"
                required
              />
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 disabled:opacity-60">
                {loading ? "Sending..." : "Send reset link"}
              </button>
              <div className="text-center">
                <Link href="/auth/signin" className="text-sm text-brand-600 hover:underline">
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-surface-500">
          <Link href="/privacy" className="underline hover:text-surface-700">Privacy Policy</Link>
          {" · "}
          <Link href="/terms" className="underline hover:text-surface-700">Terms of Service</Link>
        </p>
      </div>
    </div>
  );
}
