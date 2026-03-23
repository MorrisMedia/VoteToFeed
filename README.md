# Vote to Feed

**Pet photo contest platform where every vote helps feed shelter pets.**
Powered by iHeartDogs & iHeartCats.

Users submit pet photos, collect votes, and compete for epic prize packs worth up to $2,000. Every vote purchased helps feed shelter animals in need.

---

## Features

### For Users
- **Free pet submissions** — upload up to 5 photos (HEIC, JPG, PNG, WebP)
- **Free votes** — configurable allocation (default: 5 per week, admin-adjustable)
- **Premium vote packages** — $0.99 to $99.99, with every purchase feeding shelter pets
- **Social sharing** — share pet profiles on Facebook, Twitter/X, WhatsApp, iMessage with auto-generated OG images
- **Real-time leaderboards** — national, by state, by breed
- **Contest system** — multiple concurrent contests with independent prizes and timing
- **Breed directory** — 200+ searchable dog and cat breeds
- **Comments** — threaded commenting on pet profiles

### For Admins
- **Full dashboard** — users, revenue, contests, pets overview with search/filter/pagination
- **Stripe integration** — configure payment keys directly from admin UI (or via .env)
- **Free vote control** — set # of free votes, reset frequency (daily/weekly/monthly), reset time
- **Meal rate configuration** — adjust shelter impact metrics; historical purchases preserved
- **Contest management** — create contests with cover images, prizes, date ranges
- **Shelter impact feed** — Instagram-style feed of shelter photos tagged to contests
- **Legal pages** — edit Terms of Service and Privacy Policy from admin
- **Settings change log** — full audit trail of all admin changes

### Social Sharing & OG Images
- Dynamic Open Graph meta tags on every pet profile
- Auto-generated 1200x630 branded share images with pet photo, name, vote count, and rank
- Twitter Card support (summary_large_image)
- Share buttons: Copy Link, Facebook, X/Twitter, WhatsApp, Text/iMessage

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | NextAuth.js (Credentials, Google, Facebook) |
| Payments | Stripe Checkout |
| Email | SendGrid |
| Styling | Tailwind CSS |
| OG Images | Next.js Edge Runtime (ImageResponse) |
| Deployment | Vercel (recommended) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL (local or Docker)
- npm

### 1. Clone & Install

```bash
git clone https://github.com/MorrisMedia/VoteToFeed.git
cd VoteToFeed
npm install
```

### 2. Environment Setup

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — random secret for session encryption
- `NEXTAUTH_URL` — your app URL (http://localhost:3000 for local dev)

Optional (can also be set in Admin > Settings):
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - Backwards-compatible fallback: `CLIENT_ID`, `CLIENT_SECRET`
  - Optional explicit Google callback override: `GOOGLE_REDIRECT_URI` or `REDIRECT_URI`
- `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`

### 3. Database Setup

**Using Docker (recommended for local dev):**

```bash
docker run --name petvoter-db -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -e POSTGRES_DB=petvoter -p 5434:5432 -d postgres:15
```

**Push schema & seed data:**

```bash
npx prisma db push
npx ts-node prisma/seed.ts
npx ts-node prisma/seed-breeds.ts
npx ts-node prisma/seed-contests.ts
npx ts-node prisma/seed-shelter-posts.ts
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Default Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@petvoter.com | admin123 |
| User | demo@petvoter.com | demo123 |

---

## Project Structure

```
src/
├── app/
│   ├── admin/            # Admin dashboard
│   ├── api/              # API routes
│   │   ├── admin/        # Admin APIs (users, revenue, settings, stats)
│   │   ├── auth/         # NextAuth + registration
│   │   ├── breeds/       # Breed directory API
│   │   ├── comments/     # Comment CRUD
│   │   ├── contests/     # Contest CRUD
│   │   ├── cron/         # Free vote reset cron
│   │   ├── leaderboard/  # Leaderboard API
│   │   ├── og/           # OG image generation (Edge)
│   │   ├── pets/         # Pet CRUD
│   │   ├── shelter-posts/# Shelter impact feed
│   │   ├── stats/        # Live stats + shelter stats
│   │   ├── stripe/       # Checkout + webhook
│   │   ├── upload/       # File upload (multi-photo)
│   │   ├── users/        # User profile API
│   │   └── votes/        # Vote casting + feed
│   ├── auth/             # Sign in / Sign up pages
│   ├── breeds/           # Breed directory page
│   ├── contests/         # Contest listing + detail
│   ├── dashboard/        # User dashboard
│   ├── leaderboard/      # Leaderboard pages (Dog/Cat)
│   ├── pets/             # Pet detail + submission
│   ├── privacy/          # Privacy policy (admin-editable)
│   ├── terms/            # Terms of service (admin-editable)
│   ├── votesforshelters/ # Shelter impact page
│   └── winners/          # Winners gallery
├── components/
│   ├── admin/            # Admin dashboard client
│   ├── dashboard/        # User dashboard client
│   ├── layout/           # Nav, Footer, ShelterBanner
│   ├── pets/             # PetCard, CommentForm
│   ├── shelter/          # ShelterFeed
│   └── voting/           # VoteButton, VoteFeed
├── lib/
│   ├── admin-settings.ts # DB-backed admin settings
│   ├── auth.ts           # NextAuth config
│   ├── prisma.ts         # Prisma client
│   ├── sendgrid.ts       # Email helpers
│   ├── stripe.ts         # Stripe client (DB keys + env fallback)
│   └── utils.ts          # Shared utilities
└── types/
    └── next-auth.d.ts    # NextAuth type extensions
```

---

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import repo in [Vercel](https://vercel.com)
3. Set environment variables in Vercel dashboard
4. Deploy

### Cron Job (Free Vote Reset)

Set up a cron job to hit `/api/cron/reset-free-votes` at the configured interval.

**Vercel Cron** (in `vercel.json`):
```json
{
  "crons": [{
    "path": "/api/cron/reset-free-votes",
    "schedule": "59 19 * * 0"
  }]
}
```

The schedule should match admin settings (default: weekly on Sunday at 19:59 UTC / 11:59 AM PST).

### Stripe Webhook

Set your Stripe webhook endpoint to:
```
https://yourdomain.com/api/stripe/webhook
```

Listen for event: `checkout.session.completed`

---

## License

Private — All rights reserved.
