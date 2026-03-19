"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";

type Props = {
  children: React.ReactNode;
  shelterCount: number;
  animalType: string;
  mealsHelped: number;
};

const CHROMELESS_PATHS = new Set(["/auth/signup", "/auth/signin"]);

export function AppChrome({ children, shelterCount, animalType, mealsHelped }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hideChrome = useMemo(() => {
    if (!pathname) return false;
    if (!CHROMELESS_PATHS.has(pathname)) return false;
    return searchParams?.get("chrome") !== "show";
  }, [pathname, searchParams]);

  if (hideChrome) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      <Nav
        shelterCount={shelterCount}
        animalType={animalType}
        mealsHelped={mealsHelped}
      />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
