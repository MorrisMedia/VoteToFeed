import type { Metadata } from "next";
import { Inter, Nunito } from "next/font/google";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import prisma from "@/lib/prisma";
import { getCurrentWeekId, getWeekDateRange } from "@/lib/utils";
import { getAnimalType } from "@/lib/admin-settings";
import "./globals.css";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { MetaPixel } from "@/components/providers/MetaPixel";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", weight: ["900"] });

export const metadata: Metadata = {
  title: "Vote to Feed – Pet Photo Contests & Shelter Support | Powered by iHeartDogs & iHeartCats",
  description:
    "Vote for cute pets, win epic prize packs, and help feed shelter pets. Free weekly vote for everyone.",
  openGraph: {
    title: "Vote to Feed – Pet Photo Contests & Shelter Support",
    description: "Vote for adorable pets. Feed shelter pets in need.",
    images: ["/og-image.png"],
    url: "https://votetofeed.com",
    type: "website",
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
      // Use stored mealsProvided from actual purchases — not recalculated
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
      <head><MetaPixel /></head>
      <body className={`${inter.variable} ${nunito.variable} font-sans antialiased min-h-screen flex flex-col`}>
        <PostHogProvider>
        <SessionProvider>
          <Nav
            shelterCount={stats.count}
            animalType={stats.animalType}
            mealsHelped={stats.meals}
          />
          <main className="flex-1">{children}</main>
          <Footer />
        </SessionProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
