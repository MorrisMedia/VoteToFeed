"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef, useCallback, type RefObject } from "react";

type NavContest = {
  id: string;
  name: string;
  type: string;
  petType: string;
  daysLeft: number;
  totalPrizeValue: number;
  entryCount: number;
  coverImage: string | null;
  isFeatured: boolean;
  hasEnded: boolean;
};

function useDropdownAutoClose(
  ref: RefObject<HTMLElement | null>,
  isOpen: boolean,
  onClose: () => void,
) {
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose, ref]);
}

export function Nav({
  shelterCount,
  animalType,
}: {
  shelterCount?: number;
  animalType?: string;
  mealsHelped?: number;
}) {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [contestsOpen, setContestsOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [contests, setContests] = useState<NavContest[]>([]);
  const contestRef = useRef<HTMLDivElement>(null);
  const leaderboardRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeContests = useCallback(() => setContestsOpen(false), []);
  const closeLeaderboard = useCallback(() => setLeaderboardOpen(false), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useDropdownAutoClose(contestRef, contestsOpen, closeContests);
  useDropdownAutoClose(leaderboardRef, leaderboardOpen, closeLeaderboard);
  useDropdownAutoClose(menuRef, menuOpen, closeMenu);

  // Fetch active contests for the dropdown
  useEffect(() => {
    fetch("/api/contests")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setContests(data.filter((c: NavContest) => !c.hasEnded)); })
      .catch(() => {});
  }, []);

  function contestTypeLabel(type: string) {
    const map: Record<string, string> = { NATIONAL: "Weekly", SEASONAL: "Seasonal", CHARITY: "Charity", CALENDAR: "Calendar", BREED: "Breed", STATE: "Regional" };
    return map[type] || type;
  }
  function contestTypeBadgeColor(type: string) {
    const map: Record<string, string> = { NATIONAL: "bg-brand-100 text-brand-700", SEASONAL: "bg-amber-100 text-amber-700", CHARITY: "bg-emerald-100 text-emerald-700", CALENDAR: "bg-violet-100 text-violet-700", BREED: "bg-sky-100 text-sky-700", STATE: "bg-orange-100 text-orange-700" };
    return map[type] || "bg-surface-100 text-surface-800";
  }

  return (
    <header className="sticky top-0 z-50 glass border-b border-surface-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          {/* VoteToFeed icon: bowl + falling heart */}
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 group-hover:scale-105 transition-transform">
            {/* Bowl */}
            <path d="M6 20 Q6 29 18 29 Q30 29 30 20" stroke="#2EC4B6" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            <line x1="18" y1="29" x2="18" y2="32" stroke="#2EC4B6" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="12" y1="32" x2="24" y2="32" stroke="#2EC4B6" strokeWidth="2.5" strokeLinecap="round"/>
            {/* Bowl rim */}
            <line x1="5" y1="20" x2="31" y2="20" stroke="#2EC4B6" strokeWidth="2.5" strokeLinecap="round"/>
            {/* Falling heart */}
            <path d="M18 16 C18 16 14 12.5 14 10.5 C14 9 15.2 8 16.5 8 C17.2 8 17.8 8.4 18 8.9 C18.2 8.4 18.8 8 19.5 8 C20.8 8 22 9 22 10.5 C22 12.5 18 16 18 16Z" fill="#E8453C"/>
          </svg>
          <div className="flex flex-col">
            <span className="text-xl leading-tight font-extrabold text-surface-900 tracking-tight" style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 900 }}>VoteToFeed</span>
            <span className="text-[9px] text-surface-800 leading-tight hidden sm:block">Every vote helps shelter pets</span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {/* Contests dropdown */}
          <div className="relative" ref={contestRef}>
            <button
              onClick={() => setContestsOpen(!contestsOpen)}
              className="btn-ghost text-surface-800 flex items-center gap-1"
            >
              Contests
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${contestsOpen ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6"/></svg>
              {contests.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-brand-500 text-white text-[9px] font-bold flex items-center justify-center -ml-0.5">
                  {contests.length}
                </span>
              )}
            </button>
            {contestsOpen && (
              <div className="absolute left-0 mt-2 w-[380px] bg-white rounded-xl shadow-lg border border-surface-200/80 z-20 animate-fade-in overflow-hidden">
                <div className="px-4 pt-3 pb-2 border-b border-surface-100">
                  <p className="text-xs font-medium text-surface-800 uppercase tracking-wider">Active Contests</p>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {contests.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-surface-800 text-center">No active contests right now.</p>
                  ) : (
                    contests.map((c) => (
                      <Link
                        key={c.id}
                        href={`/contests/${c.id}`}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-surface-50 transition-colors border-b border-surface-50 last:border-0"
                        onClick={closeContests}
                      >
                        {c.coverImage ? (
                          <img src={c.coverImage} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-surface-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-lg">{c.petType === "DOG" ? "🐶" : "🐱"}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-semibold text-surface-900 truncate">{c.name}</span>
                            {c.isFeatured && <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">Featured</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-surface-700">
                            <span className={`font-bold uppercase tracking-wider px-1.5 py-0.5 rounded text-[9px] ${contestTypeBadgeColor(c.type)}`}>
                              {contestTypeLabel(c.type)}
                            </span>
                            <span>{c.daysLeft}d left</span>
                            <span>{c.entryCount} entries</span>
                            {c.totalPrizeValue > 0 && (
                              <span className="text-emerald-600 font-medium">${(c.totalPrizeValue / 100).toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
                <div className="border-t border-surface-100 px-4 py-2.5">
                  <Link href="/contests" className="text-xs font-medium text-brand-600 hover:text-brand-700" onClick={closeContests}>
                    View all contests &rarr;
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Leaderboard dropdown with Winners underneath */}
          <div className="relative" ref={leaderboardRef}>
            <button
              onClick={() => setLeaderboardOpen(!leaderboardOpen)}
              className="btn-ghost text-surface-800 flex items-center gap-1"
            >
              Leaderboard
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${leaderboardOpen ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {leaderboardOpen && (
              <div className="absolute left-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-surface-200/80 z-20 animate-fade-in overflow-hidden py-1.5">
                <Link href="/leaderboard/DOG" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-surface-700 hover:bg-surface-50 transition-colors" onClick={closeLeaderboard}>
                  <span className="text-base">🐶</span>
                  Dog Leaderboard
                </Link>
                <Link href="/leaderboard/CAT" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-surface-700 hover:bg-surface-50 transition-colors" onClick={closeLeaderboard}>
                  <span className="text-base">🐱</span>
                  Cat Leaderboard
                </Link>
                <div className="border-t border-surface-100 my-1" />
                <Link href="/winners" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-surface-700 hover:bg-surface-50 transition-colors" onClick={closeLeaderboard}>
                  <span className="text-base">🏆</span>
                  Winners
                </Link>
              </div>
            )}
          </div>

          <Link href="/votesforshelters" className="btn-ghost text-surface-800 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse-subtle" />
            Shelters
          </Link>
          {session && (
            <Link href="/dashboard" className="btn-ghost text-surface-800">My Pets</Link>
          )}

          {/* Flashing Buy Votes button */}
          <Link
            href={session ? "/dashboard#votes" : "/auth/signup"}
            className="ml-1 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-bold shadow-sm hover:bg-brand-600 transition-colors animate-glow-pulse flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white flex-shrink-0">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>
            </svg>
            Buy Votes <span className="hidden sm:inline text-white/80">| Feed Shelter Pets</span>
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Book a Call icon button */}
          <Link
            href="/book"
            title="Book a Call"
            className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-lg border border-surface-200 hover:bg-surface-50 hover:border-surface-300 transition-all text-surface-600 hover:text-brand-600"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </Link>

          <Link href="/pets/new" className="btn-primary hidden sm:inline-flex">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Pet
          </Link>

          {status === "loading" ? (
            <div className="w-9 h-9 rounded-full bg-surface-100 animate-pulse" />
          ) : session ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-full p-1 pr-3 border border-surface-200 hover:border-surface-300 hover:bg-surface-50 transition-all min-h-[44px]"
              >
                {session.user?.image ? (
                  <img src={session.user.image} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-xs">
                    {(session.user?.name || "U")[0].toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium text-surface-700 hidden sm:inline max-w-[80px] truncate">
                  {session.user?.name?.split(" ")[0] || "Account"}
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-surface-800"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-52 py-1.5 bg-white rounded-xl shadow-lg border border-surface-200/80 z-20 animate-fade-in">
                  <div className="px-3.5 py-2 border-b border-surface-100">
                    <p className="text-sm font-semibold text-surface-900">{session.user?.name}</p>
                    <p className="text-xs text-surface-700 truncate">{session.user?.email}</p>
                  </div>
                  <Link href="/dashboard" className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-surface-700 hover:bg-surface-50" onClick={closeMenu}>
                    My Pets
                  </Link>
                  {!!(session.user as Record<string, unknown>)?.id && (
                    <Link href={`/users/${(session.user as Record<string, unknown>).id}`} className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-surface-700 hover:bg-surface-50" onClick={closeMenu}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      My Profile
                    </Link>
                  )}
                  <Link href="/profile" className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-surface-700 hover:bg-surface-50" onClick={closeMenu}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Account Settings
                  </Link>
                  <Link href="/dashboard#votes" className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-surface-700 hover:bg-surface-50" onClick={closeMenu}>
                    Buy Votes
                  </Link>
                  <Link href="/book" className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-surface-700 hover:bg-surface-50" onClick={closeMenu}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    Book a Call
                  </Link>
                  {(session.user as Record<string, unknown>)?.role === "ADMIN" && (
                    <Link href="/admin" className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50" onClick={closeMenu}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                      Admin
                    </Link>
                  )}
                  <div className="border-t border-surface-100 mt-1 pt-1">
                    <button onClick={() => { closeMenu(); signOut(); }} className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50">
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/signin" className="btn-ghost text-surface-700 hidden sm:inline-flex">Log in</Link>
              <Link href="/auth/signup" className="btn-primary">Sign up</Link>
            </div>
          )}

          {/* Mobile menu button */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2.5 rounded-lg hover:bg-surface-100 min-w-[44px] min-h-[44px] flex items-center justify-center">
            {mobileOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-surface-200/60 bg-white animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            {/* Mobile contests section */}
            {contests.length > 0 && (
              <div className="pb-2 mb-2 border-b border-surface-100">
                <p className="px-3 py-1.5 text-[10px] font-bold text-surface-800 uppercase tracking-wider">Active Contests</p>
                {contests.slice(0, 5).map((c) => (
                  <Link
                    key={c.id}
                    href={`/contests/${c.id}`}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-surface-50"
                    onClick={() => setMobileOpen(false)}
                  >
                    {c.coverImage ? (
                      <img src={c.coverImage} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-surface-100 flex items-center justify-center flex-shrink-0 text-sm">
                        {c.petType === "DOG" ? "🐶" : "🐱"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-surface-800 truncate">{c.name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-surface-700">
                        <span className={`font-bold uppercase tracking-wider px-1 py-0.5 rounded text-[8px] ${contestTypeBadgeColor(c.type)}`}>
                          {contestTypeLabel(c.type)}
                        </span>
                        <span>{c.daysLeft}d left</span>
                        {c.totalPrizeValue > 0 && <span className="text-emerald-600 font-medium">${(c.totalPrizeValue / 100).toLocaleString()}</span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {/* Leaderboard section */}
            <div className="pb-2 mb-2 border-b border-surface-100">
              <p className="px-3 py-1.5 text-[10px] font-bold text-surface-800 uppercase tracking-wider">Leaderboard</p>
              <Link href="/leaderboard/DOG" className="flex items-center gap-2.5 px-3 py-3 text-base font-semibold text-surface-700 rounded-lg hover:bg-surface-50" onClick={() => setMobileOpen(false)}>
                <span>🐶</span> Dog Leaderboard
              </Link>
              <Link href="/leaderboard/CAT" className="flex items-center gap-2.5 px-3 py-3 text-base font-semibold text-surface-700 rounded-lg hover:bg-surface-50" onClick={() => setMobileOpen(false)}>
                <span>🐱</span> Cat Leaderboard
              </Link>
              <Link href="/winners" className="flex items-center gap-2.5 px-3 py-3 text-base font-semibold text-surface-700 rounded-lg hover:bg-surface-50" onClick={() => setMobileOpen(false)}>
                <span>🏆</span> Winners
              </Link>
            </div>

            <Link href="/votesforshelters" className="flex items-center gap-2 px-3 py-3 text-base font-semibold text-surface-700 rounded-lg hover:bg-surface-50" onClick={() => setMobileOpen(false)}>
              <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse-subtle" />
              Shelters
            </Link>
            {session && (
              <>
                <Link href="/dashboard" className="block px-3 py-3 text-base font-semibold text-surface-700 rounded-lg hover:bg-surface-50" onClick={() => setMobileOpen(false)}>My Pets</Link>
                {!!(session.user as Record<string, unknown>)?.id && (
                  <Link href={`/users/${(session.user as Record<string, unknown>).id}`} className="block px-3 py-3 text-base font-semibold text-surface-700 rounded-lg hover:bg-surface-50" onClick={() => setMobileOpen(false)}>My Profile</Link>
                )}
                <Link href="/profile" className="block px-3 py-3 text-base font-semibold text-surface-700 rounded-lg hover:bg-surface-50" onClick={() => setMobileOpen(false)}>Account Settings</Link>
              </>
            )}
            <Link href="/pets/new" className="block px-3 py-3 text-base font-semibold text-surface-700 rounded-lg hover:bg-surface-50" onClick={() => setMobileOpen(false)}>+ Add Pet</Link>
            <Link href="/book" className="flex items-center gap-2.5 px-3 py-3 text-base font-semibold text-surface-700 rounded-lg hover:bg-surface-50" onClick={() => setMobileOpen(false)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Book a Call
            </Link>

            {/* Flashing Buy Votes CTA - mobile */}
            <Link
              href={session ? "/dashboard#votes" : "/auth/signup"}
              className="flex items-center justify-center gap-2 mx-3 mt-2 px-4 py-3 rounded-xl bg-brand-500 text-white text-sm font-bold shadow-sm animate-glow-pulse"
              onClick={() => setMobileOpen(false)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white flex-shrink-0">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>
              </svg>
              Buy Votes | Feed Shelter Pets
            </Link>

            {!session && (
              <Link href="/auth/signin" className="block px-3 py-3 text-base font-semibold text-surface-700 rounded-lg hover:bg-surface-50" onClick={() => setMobileOpen(false)}>Log in</Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
