"use client";

type Badge = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  earnedAt: string;
};

const CATEGORY_META: Record<string, { label: string; icon: string; gradient: string; bg: string; text: string; border: string; glow: string }> = {
  VOTING: { label: "Voting", icon: "🗳️", gradient: "from-blue-500 to-indigo-500", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200/60", glow: "shadow-blue-200/50" },
  SOCIAL: { label: "Social", icon: "👥", gradient: "from-purple-500 to-violet-500", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200/60", glow: "shadow-purple-200/50" },
  PETS: { label: "Pets", icon: "🐾", gradient: "from-emerald-500 to-teal-500", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200/60", glow: "shadow-emerald-200/50" },
  STREAK: { label: "Streaks", icon: "🔥", gradient: "from-orange-500 to-amber-500", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200/60", glow: "shadow-orange-200/50" },
  COMMUNITY: { label: "Community", icon: "💝", gradient: "from-pink-500 to-rose-500", bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200/60", glow: "shadow-pink-200/50" },
};

export function BadgeGrid({ badges }: { badges: Badge[] }) {
  if (badges.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-surface-200/60">
        <div className="text-5xl mb-3 animate-bounce">🏅</div>
        <p className="font-bold text-surface-700 text-lg">No badges earned yet</p>
        <p className="text-sm text-surface-400 mt-1">Keep voting and following to earn badges!</p>
      </div>
    );
  }

  const grouped = badges.reduce<Record<string, Badge[]>>((acc, badge) => {
    const cat = badge.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(badge);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([category, catBadges]) => {
        const meta = CATEGORY_META[category] || {
          label: category, icon: "🏅", gradient: "from-gray-400 to-gray-500",
          bg: "bg-surface-50", text: "text-surface-700", border: "border-surface-200", glow: "shadow-surface-200/50",
        };
        return (
          <div key={category}>
            <div className="flex items-center gap-2.5 mb-4">
              <span className={`w-8 h-8 rounded-lg bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-sm shadow-sm`}>
                {meta.icon}
              </span>
              <h3 className="text-sm font-bold text-surface-700 uppercase tracking-wider">
                {meta.label}
              </h3>
              <span className="text-xs font-semibold text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">
                {catBadges.length}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {catBadges.map((badge, i) => (
                <div
                  key={badge.id}
                  className={`relative group rounded-2xl border ${meta.border} ${meta.bg} p-5 text-center transition-all duration-300 hover:shadow-lg hover:${meta.glow} hover:-translate-y-1 hover:scale-[1.02] cursor-default animate-profile-slide-up`}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="text-4xl mb-3 group-hover:scale-110 group-hover:animate-badge-bounce transition-transform duration-300">
                    {badge.icon}
                  </div>
                  <p className={`font-bold text-sm ${meta.text}`}>{badge.name}</p>
                  <p className="text-xs mt-1.5 text-surface-500 leading-relaxed">
                    {badge.description}
                  </p>
                  <p className="text-[10px] mt-3 text-surface-400 font-medium">
                    ✨ Earned {new Date(badge.earnedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
