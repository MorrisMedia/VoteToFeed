"use client";

import { useState, useEffect, useCallback } from "react";

type ProofItem = {
  name: string;
  votes: number;
  meals: number;
  tier: string;
  timeAgo: string;
};

type SocialProofData = {
  recentPurchases: ProofItem[];
  totalMeals: number;
  totalVotes: number;
};

export function SocialProofToast() {
  const [data, setData] = useState<SocialProofData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/stats/social-proof", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch {
      // non-blocking
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!data || data.recentPurchases.length === 0 || dismissed) return;

    // Show first toast after 8 seconds
    const initialDelay = setTimeout(() => {
      setVisible(true);
      // Hide after 5 seconds
      setTimeout(() => setVisible(false), 5000);
    }, 8000);

    // Then cycle every 25-40 seconds (randomized)
    const interval = setInterval(() => {
      if (dismissed) return;
      setCurrentIndex((prev) => (prev + 1) % data.recentPurchases.length);
      setVisible(true);
      setTimeout(() => setVisible(false), 5000);
    }, 25000 + Math.random() * 15000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [data, dismissed]);

  if (!data || data.recentPurchases.length === 0 || dismissed) return null;

  const item = data.recentPurchases[currentIndex];
  if (!item) return null;

  const tierEmoji: Record<string, string> = {
    STARTER: "⭐",
    FRIEND: "💛",
    SUPPORTER: "🔥",
    CHAMPION: "🏆",
    HERO: "🦸",
    LEGEND: "👑",
  };

  return (
    <div
      className={`fixed bottom-4 left-4 z-50 transition-all duration-500 ${
        visible
          ? "translate-x-0 opacity-100"
          : "-translate-x-full opacity-0 pointer-events-none"
      }`}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-surface-100 p-4 max-w-[320px] relative">
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full text-surface-300 hover:text-surface-500 hover:bg-surface-100 transition-colors text-xs"
          aria-label="Dismiss"
        >
          ✕
        </button>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-lg flex-shrink-0">
            {tierEmoji[item.tier] || "❤️"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-surface-900 leading-tight">
              {item.name} bought {item.votes} votes
            </p>
            <p className="text-xs text-accent-600 font-medium mt-0.5">
              🐾 Fed ~{item.meals} shelter pets
            </p>
            <p className="text-[10px] text-surface-400 mt-1">{item.timeAgo}</p>
          </div>
        </div>

        {/* Total impact line */}
        <div className="mt-3 pt-2.5 border-t border-surface-100 flex items-center justify-between">
          <p className="text-[10px] text-surface-400">
            Community total:
          </p>
          <p className="text-[10px] font-bold text-accent-700">
            🍖 {data.totalMeals.toLocaleString()} meals provided
          </p>
        </div>
      </div>
    </div>
  );
}
