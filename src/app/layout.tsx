import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Nunito } from "next/font/google";
import { SessionProvider } from "@/components/providers/SessionProvider";
import prisma from "@/lib/prisma";
import { getCurrentWeekId, getWeekDateRange } from "@/lib/utils";
import { getAnimalType } from "@/lib/admin-settings";
import "./globals.css";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { MetaPixel } from "@/components/providers/MetaPixel";
import { AppChrome } from "@/components/layout/AppChrome";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", weight: ["900"] });

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://votetofeed.com";
const siteTitle = "VoteToFeed – Pet Photo Contests & Shelter Support";
const siteDescription =
  "Vote for cute pets, win prize packs worth up to $2,000, and help feed shelter pets with every vote.";
const clarityProjectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    siteName: "VoteToFeed",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "VoteToFeed share image",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/twitter-image"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "64x64", type: "image/x-icon" },
      { url: "/icon", sizes: "32x32", type: "image/png" },
    ],
  },
  other: {
    "fb:app_id": "949563544407594",
  },
};

export const dynamic = "force-dynamic";

async function getShelterStats() {
  try {
    const weekId = getCurrentWeekId();
    const { start, end } = getWeekDateRange();
    const [agg, weeklyMealsAgg, animalType] = await Promise.all([
      prisma.petWeeklyStats.aggregate({
        where: { weekId },
        _sum: { totalVotes: true, paidVotes: true },
      }),
      prisma.purchase.aggregate({
        where: { status: "COMPLETED", createdAt: { gte: start, lt: end } },
        _sum: { mealsProvided: true },
      }),
      getAnimalType(),
    ]);
    const total = agg._sum.totalVotes ?? 0;
    const meals = Math.round(weeklyMealsAgg._sum.mealsProvided ?? 0);
    return { count: total, animalType, meals };
  } catch (_e) {
    return { count: 0, animalType: "animals", meals: 0 };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const stats = await getShelterStats();

  return (
    <html lang="en">
      <head>
        <MetaPixel />
        {clarityProjectId ? (
          <Script id="microsoft-clarity" strategy="afterInteractive">
            {`
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "${clarityProjectId}");
            `}
          </Script>
        ) : null}
      </head>
      <body className={`${inter.variable} ${nunito.variable} font-sans antialiased min-h-screen flex flex-col`}>
        <SessionProvider>
          <PostHogProvider>
            <AppChrome
              shelterCount={stats.count}
              animalType={stats.animalType}
              mealsHelped={stats.meals}
            >
              {children}
            </AppChrome>
          </PostHogProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
