import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function AdminGuidePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="mb-10">
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 mb-6 font-medium">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back to Admin Dashboard
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-sm flex-shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
            </div>
            <div>
              <h1 className="text-3xl font-black text-surface-900 tracking-tight">Admin Guide</h1>
              <p className="text-surface-500 text-sm mt-0.5">Complete walkthrough for managing VoteToFeed</p>
            </div>
          </div>
        </div>

        {/* Table of Contents */}
        <div className="card p-6 mb-10">
          <h2 className="text-sm font-bold text-surface-700 uppercase tracking-wider mb-4">On This Page</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { href: "#overview", label: "Overview Dashboard", icon: "📊" },
              { href: "#users", label: "User Management", icon: "👥" },
              { href: "#pets-contests", label: "Pets & Contests", icon: "🏆" },
              { href: "#revenue", label: "Revenue & Purchases", icon: "💰" },
              { href: "#settings", label: "Platform Settings", icon: "⚙️" },
              { href: "#moderation", label: "Moderation", icon: "🛡️" },
              { href: "#engagement", label: "Auto-Engagement", icon: "🤖" },
              { href: "#shelter", label: "Shelter Stories", icon: "🏠" },
              { href: "#workflows", label: "Common Workflows", icon: "📋" },
            ].map((item) => (
              <a key={item.href} href={item.href} className="flex items-center gap-2.5 text-sm text-surface-700 hover:text-brand-600 hover:bg-brand-50 rounded-lg px-3 py-2 transition-colors">
                <span>{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* ─── OVERVIEW ─── */}
        <section id="overview" className="mb-12 scroll-mt-8">
          <SectionHeader emoji="📊" title="Overview Dashboard" tab="Overview" />
          <div className="prose-guide">
            <p className="lead">The Overview tab is your command center — a live snapshot of platform health at a glance.</p>

            <SubSection title="What you see">
              <MetricGrid items={[
                { label: "Total Users", desc: "All registered accounts (all time)" },
                { label: "Total Pets", desc: "Active pet listings on the platform" },
                { label: "Total Votes", desc: "All votes cast since launch" },
                { label: "Total Revenue", desc: "Gross Stripe revenue (all time)" },
                { label: "Weekly Votes", desc: "Votes cast in the current week (resets Monday)" },
                { label: "Weekly Revenue", desc: "Stripe revenue in the last 7 days" },
                { label: "Meals Provided", desc: "Shelter meals funded through vote purchases" },
                { label: "Active Contests", desc: "Contests currently open for entries" },
              ]} />
            </SubSection>

            <SubSection title="Platform Breakdown">
              <p>Two pie-style breakdowns appear on the right side:</p>
              <ul>
                <li><strong>Users by Role</strong> — shows how many are USER vs ADMIN</li>
                <li><strong>Pets by Type</strong> — DOG vs CAT split</li>
              </ul>
            </SubSection>

            <SubSection title="Top Pets This Week">
              <p>A ranked list of the top 10 pets by vote count in the current weekly period. Includes pet name, type, and vote breakdown (free vs paid). Click the pet link to go to their public listing.</p>
            </SubSection>

            <SubSection title="Recent Purchases">
              <p>Last 15 completed Stripe transactions. Shows the user, vote package tier, amount paid, and how many meals it funded.</p>
            </SubSection>

            <Callout type="tip">
              The week ID shown in the header (e.g. <code>2026-W12</code>) tells you exactly which contest period you&apos;re viewing. It resets automatically each Monday.
            </Callout>
          </div>
        </section>

        {/* ─── USERS ─── */}
        <section id="users" className="mb-12 scroll-mt-8">
          <SectionHeader emoji="👥" title="User Management" tab="Users" />
          <div className="prose-guide">
            <p className="lead">Search, inspect, and manage every account on the platform.</p>

            <SubSection title="Finding users">
              <p>Use the search bar to look up by name or email. The table shows each user&apos;s registration date, role, vote balances, and activity counts.</p>
            </SubSection>

            <SubSection title="User detail panel">
              <p>Click any user row to expand a detail panel. From there you can:</p>
              <ul>
                <li><strong>Change role</strong> — promote to ADMIN or demote to USER. Changes take effect immediately on their next request.</li>
                <li><strong>Adjust vote balance</strong> — manually add or subtract paid vote credits. Useful for refunds, gifts, or fixing errors.</li>
                <li><strong>Reset free votes</strong> — manually trigger a free vote reset for that user without waiting for the scheduled cron job.</li>
                <li><strong>View their pets</strong> — links to each pet listing they&apos;ve submitted.</li>
              </ul>
            </SubSection>

            <Callout type="warning">
              Changing a user&apos;s role to ADMIN gives them full access to this dashboard, including Stripe keys and API credentials. Only do this for trusted team members.
            </Callout>
          </div>
        </section>

        {/* ─── PETS & CONTESTS ─── */}
        <section id="pets-contests" className="mb-12 scroll-mt-8">
          <SectionHeader emoji="🏆" title="Pets & Contests" tab="Pets & Contests" />
          <div className="prose-guide">
            <p className="lead">Manage the competitive heart of VoteToFeed — contest creation, winner selection, and pet oversight.</p>

            <SubSection title="Top Pets panel">
              <p>Shows the current week&apos;s top 10 by vote count with a live link to their listing. Use this to monitor competition health and spot unusual vote spikes that may indicate abuse.</p>
            </SubSection>

            <SubSection title="Contest Stats">
              <p>Quick breakdown of all active contests, total entries across contests, and pet type distribution. Helps you see if you need more contests for underrepresented pet types.</p>
            </SubSection>

            <SubSection title="Contest Management">
              <p>Create, edit, and close contests from here.</p>
              <FieldList fields={[
                { name: "Contest Name", desc: "Public-facing title, e.g. \"March Weekly Dog Contest\"" },
                { name: "Type", desc: "NATIONAL (weekly, all users), SEASONAL, CHARITY, BREED, STATE (regional)" },
                { name: "Pet Type", desc: "DOG, CAT, or ALL — only pets of this type can enter" },
                { name: "Start / End Date", desc: "Contest window. Ended contests are automatically archived." },
                { name: "Featured", desc: "Featured contests appear first on the homepage contest slider" },
                { name: "Entry Fee", desc: "Set to 0 for free entry. Paid contests are not yet commonly used." },
                { name: "Max Entries", desc: "Leave blank for unlimited. Set a cap for exclusive contests." },
                { name: "Cover Image", desc: "URL for the contest hero banner. Aim for 1200×400px landscape." },
                { name: "Sponsor", desc: "Optional sponsor name/logo/URL shown on the contest detail page." },
                { name: "Description & Rules", desc: "Markdown-supported text displayed on the contest page." },
              ]} />
            </SubSection>

            <SubSection title="Adding prizes to a contest">
              <p>After creating a contest, click <strong>Add Prize</strong> on that contest row. Each prize has:</p>
              <ul>
                <li><strong>Placement</strong> — 1st, 2nd, 3rd, etc.</li>
                <li><strong>Title</strong> — e.g. &quot;Grand Prize Pack&quot;</li>
                <li><strong>Value (cents)</strong> — monetary value, e.g. 150000 = $1,500</li>
                <li><strong>Description</strong> — optional one-liner</li>
                <li><strong>Items</strong> — line-by-line list of what&apos;s included</li>
              </ul>
            </SubSection>

            <SubSection title="Selecting & fulfilling winners">
              <p>When a contest ends, open it in Contest Management and click <strong>Manage Winners</strong>. You&apos;ll see the top pets ranked by votes alongside each prize placement.</p>
              <ol>
                <li>Click <strong>Assign Winner</strong> next to a prize to lock in the winning pet.</li>
                <li>Once assigned, the winner&apos;s shipping info is displayed (pulled from their pet submission form).</li>
                <li>Mark <strong>Fulfilled</strong> once the prize has been shipped. This updates the prize status and removes it from the fulfillment queue.</li>
              </ol>
            </SubSection>

            <Callout type="tip">
              Recurring contests (set <code>isRecurring = true</code>) auto-create a new edition each week/month via the cron job at midnight UTC. You don&apos;t need to manually recreate them — just set them up once.
            </Callout>
          </div>
        </section>

        {/* ─── REVENUE ─── */}
        <section id="revenue" className="mb-12 scroll-mt-8">
          <SectionHeader emoji="💰" title="Revenue & Purchases" tab="Revenue" />
          <div className="prose-guide">
            <p className="lead">Track every dollar coming in, broken down by package tier and over time.</p>

            <SubSection title="Revenue summary cards">
              <MetricGrid items={[
                { label: "Total Revenue", desc: "All-time gross revenue from Stripe" },
                { label: "Total Purchases", desc: "Count of completed Stripe sessions" },
                { label: "Avg Order Value", desc: "Revenue ÷ Purchases" },
                { label: "Total Meals Funded", desc: "Cumulative shelter meals from vote purchases" },
              ]} />
            </SubSection>

            <SubSection title="Revenue by Package">
              <p>A breakdown of each vote package tier — how many times it was purchased, total revenue from that tier, and average votes per purchase. Use this to spot which packages are most popular and inform pricing decisions.</p>
            </SubSection>

            <SubSection title="Purchase table">
              <p>Full paginated list of every completed purchase. Columns: date, user, package tier, vote count, amount, meals funded. Sortable and searchable.</p>
            </SubSection>

            <Callout type="info">
              Revenue data comes from Stripe webhooks — it reflects completed payments only. Failed or refunded payments are not included. To issue a refund, go directly to your Stripe dashboard; VoteToFeed does not process refunds natively.
            </Callout>
          </div>
        </section>

        {/* ─── SETTINGS ─── */}
        <section id="settings" className="mb-12 scroll-mt-8">
          <SectionHeader emoji="⚙️" title="Platform Settings" tab="Settings" />
          <div className="prose-guide">
            <p className="lead">All settings save automatically on blur (when you click away from a field). No submit button needed.</p>

            <SubSection title="Shelter Impact Configuration">
              <FieldList fields={[
                { name: "Meals per vote purchase", desc: "How many shelter meals are credited per vote package bought. Default: 10. Adjust as your shelter partnerships change." },
                { name: "Animal Type", desc: "Sets the platform-wide focus: dogs, cats, or both. Affects homepage copy and which pets show on the main feed." },
                { name: "Weekly Vote Goal", desc: "Target vote count shown on the shelter impact banner. Motivates users to collectively hit the milestone." },
              ]} />
            </SubSection>

            <SubSection title="Free Vote Allocation">
              <p>Controls how many free votes each registered user gets and when they refresh:</p>
              <FieldList fields={[
                { name: "Free votes per period", desc: "Number of votes each user can cast for free per period. 0 = no free votes." },
                { name: "Reset frequency", desc: "Daily, Weekly, or Monthly. Weekly is the default (resets Monday)." },
                { name: "Reset day / date", desc: "For weekly: which day of the week (0=Sunday). For monthly: day of month (1–28)." },
                { name: "Reset time (UTC)", desc: "Hour and minute in UTC when the reset cron fires. Default is midnight UTC." },
              ]} />
              <p>The configuration preview at the bottom shows the current cron expression — if you change settings, make sure the Vercel cron schedule in <code>vercel.json</code> matches.</p>
            </SubSection>

            <SubSection title="Stripe Payment Configuration">
              <p>Enter your Stripe keys here to activate vote purchases. These are stored encrypted in the database (not in environment variables).</p>
              <FieldList fields={[
                { name: "Stripe Secret Key", desc: "From your Stripe dashboard → Developers → API Keys. Starts with sk_live_ or sk_test_." },
                { name: "Stripe Publishable Key", desc: "The public-facing key. Starts with pk_live_ or pk_test_." },
                { name: "Stripe Webhook Secret", desc: "From Stripe → Webhooks. Needed to verify purchase confirmations. Starts with whsec_." },
              ]} />
            </SubSection>

            <SubSection title="Legal Pages">
              <p>The Terms of Service and Privacy Policy are editable directly in the admin. They support a simple markdown-like format:</p>
              <ul>
                <li><code>## Heading</code> → large section heading</li>
                <li><code>### Sub-heading</code> → smaller heading</li>
                <li><code>**bold text**</code> → bold</li>
                <li>Blank line → paragraph break</li>
              </ul>
              <p>Changes are live immediately at <code>/terms</code> and <code>/privacy</code>.</p>
            </SubSection>

            <SubSection title="Settings Change Log">
              <p>Every settings change is recorded at the bottom of the Settings tab — what changed, old value vs new value, and when. This is your audit trail if something breaks after a config change.</p>
            </SubSection>

            <Callout type="warning">
              Stripe keys are stored in the database and transmitted only over HTTPS. Never paste Stripe live keys into a chat, email, or document. If a key is compromised, rotate it in the Stripe dashboard immediately, then update it here.
            </Callout>
          </div>
        </section>

        {/* ─── MODERATION ─── */}
        <section id="moderation" className="mb-12 scroll-mt-8">
          <SectionHeader emoji="🛡️" title="Moderation" tab="Moderation" />
          <div className="prose-guide">
            <p className="lead">Review and remove comments that violate community guidelines.</p>

            <SubSection title="Comment queue">
              <p>Loads the most recent comments across all pets. Each row shows:</p>
              <ul>
                <li>Author (name + email)</li>
                <li>Pet the comment was left on</li>
                <li>Comment text</li>
                <li>Timestamp</li>
                <li><strong>Delete</strong> button — permanently removes the comment</li>
              </ul>
            </SubSection>

            <SubSection title="What to moderate">
              <ul>
                <li>Spam or solicitation</li>
                <li>Offensive or harassing language</li>
                <li>Comments that appear to be from bots (suspicious timing, generic text)</li>
              </ul>
            </SubSection>

            <Callout type="info">
              The auto-engagement system posts scheduled comments from seed accounts (see Engagement tab). These are pre-approved, wholesome messages — you don&apos;t need to moderate them. However if you see something off, you can delete them here like any other comment.
            </Callout>
          </div>
        </section>

        {/* ─── ENGAGEMENT ─── */}
        <section id="engagement" className="mb-12 scroll-mt-8">
          <SectionHeader emoji="🤖" title="Auto-Engagement" tab="Engagement" />
          <div className="prose-guide">
            <p className="lead">VoteToFeed uses a system of seed accounts to create organic-feeling activity on new pet listings. This tab lets you monitor and control it.</p>

            <SubSection title="How it works">
              <ol>
                <li>When a new pet is submitted, the system schedules 5 welcome comments from seed accounts.</li>
                <li>Every 3 hours, the auto-engage cron job runs: seed accounts cast free votes on recent listings and post encouraging comments.</li>
                <li>This gives new pets an initial boost so they don&apos;t start at zero — it looks more welcoming to real users.</li>
              </ol>
            </SubSection>

            <SubSection title="Seed accounts">
              <p>There are 20 seed accounts (<code>vote@iheartdogs.com</code> through <code>vote+19@iheartdogs.com</code>). They behave like normal users but their votes are free and their comments are pre-written. They do not affect revenue stats.</p>
            </SubSection>

            <SubSection title="Engagement Log">
              <p>Shows the last 100 auto-engagement events: which seed account acted, which pet they voted/commented on, and when. Use this to verify the system is running and to troubleshoot if it stops.</p>
            </SubSection>

            <SubSection title="Manual trigger">
              <p>The <strong>Run Engagement Now</strong> button triggers a manual engagement cycle immediately, without waiting for the 3-hour cron. Use this after seeding new pets or after the system has been dormant.</p>
            </SubSection>

            <Callout type="warning">
              Do not delete seed accounts from the Users tab — the engagement system depends on them. If you need to pause auto-engagement, the cleanest way is to disable the cron job in your Vercel project settings.
            </Callout>
          </div>
        </section>

        {/* ─── SHELTER ─── */}
        <section id="shelter" className="mb-12 scroll-mt-8">
          <SectionHeader emoji="🏠" title="Shelter Stories" tab="Shelter Stories" />
          <div className="prose-guide">
            <p className="lead">Publish impact stories from shelter partners — the Instagram-style feed at <code>/votesforshelters</code>.</p>

            <SubSection title="Shelter Posts">
              <p>Each post appears in the public shelter feed. Fields:</p>
              <FieldList fields={[
                { name: "Image URL", desc: "Direct link to the story photo. Aim for square or portrait aspect ratio." },
                { name: "Caption", desc: "The impact story — be specific: how many meals, which shelter, what changed." },
                { name: "Shelter Partner", desc: "Optional link to a shelter partner (created in the Partners section below)." },
                { name: "Meals Count", desc: "Number of meals this post represents. Shown as a badge on the post card." },
              ]} />
            </SubSection>

            <SubSection title="Shelter Partners">
              <p>Manage the organizations your platform funds. Partner profiles include name, logo, location, and a blurb. They&apos;re linked to shelter posts and shown on their profile page.</p>
            </SubSection>

            <Callout type="tip">
              Fresh shelter content builds trust and keeps users emotionally connected to why they&apos;re voting. Aim to post at least one new story per week.
            </Callout>
          </div>
        </section>

        {/* ─── COMMON WORKFLOWS ─── */}
        <section id="workflows" className="mb-12 scroll-mt-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-surface-900 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">📋</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-surface-900">Common Workflows</h2>
              <p className="text-sm text-surface-500">Step-by-step for the things you&apos;ll do most often</p>
            </div>
          </div>

          <div className="space-y-6">
            <Workflow
              title="Launch a new weekly contest"
              steps={[
                "Go to Pets & Contests → Contest Management",
                "Click Create New Contest",
                "Set Type = NATIONAL, Pet Type = DOG (or CAT), start date = this Monday, end date = next Sunday",
                "Check Featured if it should appear first on the homepage slider",
                "Click Add Prize, enter 1st/2nd/3rd placements with values and items",
                "Save — the contest is immediately live and new pet submissions will auto-enroll",
              ]}
            />

            <Workflow
              title="Award contest winners"
              steps={[
                "Wait until the contest end date has passed",
                "Go to Pets & Contests → Contest Management → find the ended contest → Manage Winners",
                "Review the top-ranked pets (sorted by total votes)",
                "Click Assign Winner next to each prize placement",
                "Copy the winner's shipping address from the detail panel",
                "Ship the prize, then click Fulfilled to close out that prize",
              ]}
            />

            <Workflow
              title="Change the free vote allocation"
              steps={[
                "Go to Settings → Free Vote Allocation",
                "Change \"Free votes per period\" (e.g. from 5 to 10)",
                "Click away from the field — it saves automatically",
                "The change takes effect at the next scheduled reset (not immediately)",
                "To force it now: go to Users, search for a user, and click Reset Free Votes on their account",
              ]}
            />

            <Workflow
              title="Investigate a suspicious user"
              steps={[
                "Go to Users → search by email or name",
                "Expand their row — check vote count vs purchases. A high vote count with zero purchases = they may be abusing free votes or IP limits",
                "Check their pets and the IPs associated with anonymous votes (via server logs or Stripe)",
                "To disable: you can zero out their paid vote balance and reset free votes to 0, or change their role to a restricted account",
                "To remove content: go to Moderation and delete any abusive comments",
              ]}
            />

            <Workflow
              title="Post a shelter story"
              steps={[
                "Go to Shelter Stories → Shelter Posts",
                "Click Create New Post",
                "Paste the image URL (upload the image to your CDN or Vercel Blob first)",
                "Write a specific, emotional caption: name the shelter, describe the animal helped",
                "Set the Meals Count to match the vote milestone it represents",
                "Click Save — the post appears immediately at /votesforshelters",
              ]}
            />

            <Workflow
              title="Connect Stripe for live payments"
              steps={[
                "Log into your Stripe dashboard → Developers → API Keys",
                "Copy the live Secret Key (sk_live_...) and Publishable Key (pk_live_...)",
                "Go to Webhooks → add endpoint: https://votetofeed.vercel.app/api/stripe/webhook",
                "Copy the signing secret (whsec_...)",
                "Go to VoteToFeed Admin → Settings → Stripe Payment Configuration",
                "Paste all three keys and click away to save each one",
                "Test with a real purchase — check the Revenue tab for the transaction",
              ]}
            />
          </div>
        </section>

        {/* Footer nav */}
        <div className="border-t border-surface-200 pt-8 mt-8 flex items-center justify-between text-sm">
          <Link href="/admin" className="btn-secondary py-2 px-4">
            ← Back to Dashboard
          </Link>
          <span className="text-surface-400 text-xs">VoteToFeed Admin Guide · Last updated Mar 2026</span>
        </div>
      </div>
    </div>
  );
}

// ─── HELPER COMPONENTS ───────────────────────────────────────────────────────

function SectionHeader({ emoji, title, tab }: { emoji: string; title: string; tab: string }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200/60 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-xl">{emoji}</span>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <h2 className="text-2xl font-bold text-surface-900">{title}</h2>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-surface-100 text-surface-500">
            {tab} tab
          </span>
        </div>
      </div>
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-base font-bold text-surface-900 mb-2 flex items-center gap-2">
        <span className="w-1 h-4 bg-brand-400 rounded-full inline-block" />
        {title}
      </h3>
      <div className="pl-4 space-y-2 text-sm text-surface-700 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_code]:bg-surface-100 [&_code]:text-surface-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono">
        {children}
      </div>
    </div>
  );
}

function Callout({ type, children }: { type: "tip" | "warning" | "info"; children: React.ReactNode }) {
  const styles = {
    tip: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-800", label: "💡 Tip", icon: "text-emerald-600" },
    warning: { bg: "bg-amber-50 border-amber-200", text: "text-amber-800", label: "⚠️ Warning", icon: "text-amber-600" },
    info: { bg: "bg-blue-50 border-blue-200", text: "text-blue-800", label: "ℹ️ Note", icon: "text-blue-600" },
  }[type];

  return (
    <div className={`my-5 rounded-xl border p-4 ${styles.bg}`}>
      <p className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${styles.icon}`}>{styles.label}</p>
      <div className={`text-sm leading-relaxed ${styles.text} [&_code]:bg-white/60 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono`}>
        {children}
      </div>
    </div>
  );
}

function MetricGrid({ items }: { items: { label: string; desc: string }[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-start gap-2.5 p-3 rounded-lg bg-surface-50 border border-surface-200/60">
          <div className="w-2 h-2 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-surface-900">{item.label}</p>
            <p className="text-xs text-surface-500 mt-0.5">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function FieldList({ fields }: { fields: { name: string; desc: string }[] }) {
  return (
    <div className="space-y-2 my-3">
      {fields.map((f) => (
        <div key={f.name} className="flex gap-3 text-sm">
          <span className="font-semibold text-surface-900 w-44 flex-shrink-0">{f.name}</span>
          <span className="text-surface-600">{f.desc}</span>
        </div>
      ))}
    </div>
  );
}

function Workflow({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="card p-6">
      <h3 className="text-base font-bold text-surface-900 mb-4 flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">→</span>
        {title}
      </h3>
      <ol className="space-y-2.5">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-surface-700">
            <span className="w-6 h-6 rounded-full bg-surface-100 text-surface-500 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span className="leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
