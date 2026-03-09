import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-surface-900 text-surface-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10">
          <div className="sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-5">
              {/* VoteToFeed icon: bowl + falling heart */}
              <svg width="28" height="28" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                <path d="M6 20 Q6 29 18 29 Q30 29 30 20" stroke="#2EC4B6" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                <line x1="18" y1="29" x2="18" y2="32" stroke="#2EC4B6" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="12" y1="32" x2="24" y2="32" stroke="#2EC4B6" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="5" y1="20" x2="31" y2="20" stroke="#2EC4B6" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M18 16 C18 16 14 12.5 14 10.5 C14 9 15.2 8 16.5 8 C17.2 8 17.8 8.4 18 8.9 C18.2 8.4 18.8 8 19.5 8 C20.8 8 22 9 22 10.5 C22 12.5 18 16 18 16Z" fill="#E8453C"/>
              </svg>
              <div className="flex flex-col">
                <span className="text-sm font-black text-white tracking-tight" style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 900 }}>VoteToFeed</span>
                <span className="text-[9px] text-surface-500">Every vote helps shelter pets</span>
              </div>
            </div>
            <p className="text-sm leading-relaxed">
              Every vote helps feed shelter pets in need. Join thousands of pet lovers making a difference.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-4">Contests</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/leaderboard/DOG" className="hover:text-white transition-colors">Dog Contest</Link></li>
              <li><Link href="/leaderboard/CAT" className="hover:text-white transition-colors">Cat Contest</Link></li>
              <li><Link href="/winners" className="hover:text-white transition-colors">Winners</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-4">Community</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/votesforshelters" className="hover:text-white transition-colors">VotesForShelters</Link></li>
              <li><Link href="/breeds" className="hover:text-white transition-colors">Breed Directory</Link></li>
              <li><Link href="/dashboard" className="hover:text-white transition-colors">My Pets</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-4">Company</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/auth/signin" className="hover:text-white transition-colors">Log in</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-surface-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-surface-500">&copy; {new Date().getFullYear()} VoteToFeed. All rights reserved.</p>
          <p className="text-xs text-surface-500">Every vote helps feed shelter pets in need.</p>
        </div>
      </div>
    </footer>
  );
}
