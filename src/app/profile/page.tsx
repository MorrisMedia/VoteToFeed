import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ProfileClient } from "./ProfileClient";

export const metadata = {
  title: "Edit Profile | VoteToFeed",
  description: "Update your profile, photo, and password",
};

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin?callbackUrl=/profile");

  const userId = (session.user as { id: string }).id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      city: true,
      state: true,
      country: true,
      zipCode: true,
      password: true,
      createdAt: true,
      accounts: { select: { provider: true } },
      _count: { select: { pets: true, votes: true } },
    },
  });

  if (!user) redirect("/auth/signin");

  return (
    <ProfileClient
      user={{
        id: user.id,
        name: user.name || "",
        email: user.email || "",
        image: user.image || "",
        city: user.city || "",
        state: user.state || "",
        country: user.country || "",
        zipCode: user.zipCode || "",
        hasPassword: !!user.password,
        isOAuth: user.accounts.length > 0,
        oauthProviders: user.accounts.map((a) => a.provider),
        createdAt: user.createdAt.toISOString(),
        petCount: user._count.pets,
        voteCount: user._count.votes,
      }}
    />
  );
}
