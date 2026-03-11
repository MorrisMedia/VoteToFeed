import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * ⚠️ CRITICAL: Seed accounts can ONLY create their own pets.
 * Seed accounts MUST NEVER:
 * - Modify real user pets
 * - Upload images to other users' pets
 * - Access or modify pet.photos for non-seed-account pets
 */

const SEED_ACCOUNTS = [
  { email: "vote@iheartdogs.com", name: "Max the Golden", breed: "Golden Retriever", photo: "https://images.dog.ceo/breeds/retriever-golden/n02099601_1722.jpg" },
  { email: "vote+1@iheartdogs.com", name: "Luna Belle", breed: "Siberian Husky", photo: "https://images.dog.ceo/breeds/husky/n02110185_10047.jpg" },
  { email: "vote+2@iheartdogs.com", name: "Cooper & Friends", breed: "Labrador Retriever", photo: "https://images.dog.ceo/breeds/labrador/n02099712_4323.jpg" },
  { email: "vote+3@iheartdogs.com", name: "Daisy Mae", breed: "Corgi", photo: "https://images.dog.ceo/breeds/corgi-cardigan/n02113186_10475.jpg" },
  { email: "vote+4@iheartdogs.com", name: "Bear Hudson", breed: "German Shepherd", photo: "https://images.dog.ceo/breeds/germanshepherd/n02106662_20841.jpg" },
  { email: "vote+5@iheartdogs.com", name: "Rosie Posie", breed: "Poodle", photo: "https://images.dog.ceo/breeds/poodle-standard/n02113799_2506.jpg" },
  { email: "vote+6@iheartdogs.com", name: "Duke Wellington", breed: "Beagle", photo: "https://images.dog.ceo/breeds/beagle/n02088364_11136.jpg" },
  { email: "vote+7@iheartdogs.com", name: "Buster Brown", breed: "Bulldog", photo: "https://images.dog.ceo/breeds/bulldog-english/jager-2.jpg" },
  { email: "vote+8@iheartdogs.com", name: "Willow Grace", breed: "Australian Shepherd", photo: "https://images.dog.ceo/breeds/australian-shepherd/pepper.jpg" },
  { email: "vote+9@iheartdogs.com", name: "Rocky Mountain", breed: "Rottweiler", photo: "https://images.dog.ceo/breeds/rottweiler/n02106550_10174.jpg" },
  { email: "vote+10@iheartdogs.com", name: "Penny Lane", breed: "Dachshund", photo: "https://images.dog.ceo/breeds/dachshund/dachshund-2.jpg" },
  { email: "vote+11@iheartdogs.com", name: "Tucker James", breed: "Boxer", photo: "https://images.dog.ceo/breeds/boxer/n02108089_14898.jpg" },
  { email: "vote+12@iheartdogs.com", name: "Sadie Sunshine", breed: "Shih Tzu", photo: "https://images.dog.ceo/breeds/shihtzu/n02086240_7832.jpg" },
  { email: "vote+13@iheartdogs.com", name: "Finn Adventure", breed: "Border Collie", photo: "https://images.dog.ceo/breeds/collie-border/n02106166_3437.jpg" },
  { email: "vote+14@iheartdogs.com", name: "Mochi Bear", breed: "Pomeranian", photo: "https://images.dog.ceo/breeds/pomeranian/n02112018_10129.jpg" },
  { email: "vote+15@iheartdogs.com", name: "Scout Explorer", breed: "Bernese Mountain Dog", photo: "https://images.dog.ceo/breeds/mountain-bernese/n02107683_5425.jpg" },
  { email: "vote+16@iheartdogs.com", name: "Chloe Buttons", breed: "French Bulldog", photo: "https://images.dog.ceo/breeds/bulldog-french/n02108915_5482.jpg" },
  { email: "vote+17@iheartdogs.com", name: "Charlie Waffles", breed: "Cavalier King Charles", photo: "https://images.dog.ceo/breeds/spaniel-cocker/n02102318_5765.jpg" },
  { email: "vote+18@iheartdogs.com", name: "Ziggy Stardust", breed: "Dalmatian", photo: "https://images.dog.ceo/breeds/dalmatian/cooper2.jpg" },
  { email: "vote+19@iheartdogs.com", name: "Maple Autumn", breed: "Samoyed", photo: "https://images.dog.ceo/breeds/samoyed/n02111889_10032.jpg" },
];

export async function POST() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as Record<string, unknown>)?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Array<{ email: string; status: string; userId?: string; petId?: string }> = [];
  const password = await bcrypt.hash("VoteToFeed2026!", 10);

  for (const account of SEED_ACCOUNTS) {
    try {
      // Check if user exists
      let user = await prisma.user.findUnique({ where: { email: account.email } });
      
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: account.email,
            name: account.name,
            password,
            role: "USER",
            image: account.photo,
            freeVotesRemaining: 999,
            paidVoteBalance: 999,
          },
        });
      }

      // Check if pet exists for this user
      const existingPet = await prisma.pet.findFirst({ where: { userId: user.id } });
      
      let pet = existingPet;
      if (!pet) {
        pet = await prisma.pet.create({
          data: {
            name: account.name.split(" ")[0],
            type: "DOG",
            breed: account.breed,
            bio: `Hi! I'm ${account.name.split(" ")[0]}, a ${account.breed}! 🐾`,
            ownerName: account.name,
            photos: [account.photo],
            tags: [account.breed.toLowerCase(), "good-dog", "engagement"],
            isActive: true,
            userId: user.id,
          },
        });
      }

      results.push({ email: account.email, status: existingPet ? "exists" : "created", userId: user.id, petId: pet.id });
    } catch (error) {
      results.push({ email: account.email, status: `error: ${String(error)}` });
    }
  }

  return NextResponse.json({ message: "Seed complete", results });
}
