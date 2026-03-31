import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { runAutoEngagement } from "@/lib/engagement";
import { getCurrentWeekId } from "@/lib/utils";
import bcrypt from "bcryptjs";

/**
 * âš ï¸ CRITICAL: Seed accounts can ONLY create their own pets.
 * Seed accounts MUST NEVER:
 * - Modify real user pets
 * - Upload images to other users' pets
 * - Access or modify pet.photos for non-seed-account pets
 */

const STABLE_DOG_PHOTOS = [
  "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1525253086316-d0c936c814f8?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80",
];

const STABLE_CAT_PHOTOS = [
  "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1495360010541-f48722b34f7d?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1519052537078-e6302a4968d4?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1513245543132-31f507417b26?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=1200&q=80",
];

function stablePhotoFor(type: "DOG" | "CAT", key: string) {
  const list = type === "DOG" ? STABLE_DOG_PHOTOS : STABLE_CAT_PHOTOS;
  const hash = Array.from(key).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return list[hash % list.length];
}

function normalizeSeedPhoto(photoUrl: string, type: "DOG" | "CAT", key: string) {
  try {
    const parsed = new URL(photoUrl);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return photoUrl;
    }
  } catch {
    return stablePhotoFor(type, key);
  }
  return stablePhotoFor(type, key);
}

const SEED_ACCOUNTS = [
  {
    email: "vote@iheartdogs.com",
    name: "Max the Golden",
    dog: { name: "Max", breed: "Golden Retriever", photo: "https://images.dog.ceo/breeds/retriever-golden/n02099601_1722.jpg", bio: "Hi! I'm Max, a Golden Retriever who loves belly rubs! ðŸ¾" },
    cat: { name: "Whiskers", breed: "Maine Coon", photo: "https://cdn.pixabay.com/photo/2017/02/20/18/03/cat-2083492_640.jpg", bio: "I'm Whiskers, a majestic Maine Coon! ðŸ±" },
  },
  {
    email: "vote+1@iheartdogs.com",
    name: "Luna Belle",
    dog: { name: "Luna", breed: "Siberian Husky", photo: "https://images.dog.ceo/breeds/husky/n02110185_10047.jpg", bio: "I'm Luna, a Siberian Husky who loves the snow! â„ï¸" },
    cat: { name: "Shadow", breed: "Russian Blue", photo: "https://cdn.pixabay.com/photo/2018/01/28/12/37/cat-3113513_640.jpg", bio: "I'm Shadow, a sleek Russian Blue! ðŸ–¤" },
  },
  {
    email: "vote+2@iheartdogs.com",
    name: "Cooper & Friends",
    dog: { name: "Cooper", breed: "Labrador Retriever", photo: "https://images.dog.ceo/breeds/labrador/n02099712_4323.jpg", bio: "I'm Cooper, a Lab who loves fetch! ðŸŽ¾" },
    cat: { name: "Mittens", breed: "Ragdoll", photo: "https://cdn.pixabay.com/photo/2019/11/08/11/36/cat-4611189_640.jpg", bio: "I'm Mittens, a fluffy Ragdoll! ðŸ’™" },
  },
  {
    email: "vote+3@iheartdogs.com",
    name: "Daisy Mae",
    dog: { name: "Daisy", breed: "Corgi", photo: "https://images.dog.ceo/breeds/corgi-cardigan/n02113186_10475.jpg", bio: "I'm Daisy, a Corgi with the cutest wiggle! ðŸŒ¼" },
    cat: { name: "Luna", breed: "Siamese", photo: "https://cdn.pixabay.com/photo/2017/07/25/01/22/cat-2536662_640.jpg", bio: "I'm Luna, a chatty Siamese! ðŸŒ™" },
  },
  {
    email: "vote+4@iheartdogs.com",
    name: "Bear Hudson",
    dog: { name: "Bear", breed: "German Shepherd", photo: "https://images.dog.ceo/breeds/germanshepherd/n02106662_20841.jpg", bio: "I'm Bear, a loyal German Shepherd! ðŸ»" },
    cat: { name: "Ginger", breed: "Orange Tabby", photo: "https://cdn.pixabay.com/photo/2024/02/28/07/42/european-shorthair-8601492_640.jpg", bio: "I'm Ginger, an orange tabby with cattitude! ðŸ§¡" },
  },
  {
    email: "vote+5@iheartdogs.com",
    name: "Rosie Posie",
    dog: { name: "Rosie", breed: "Poodle", photo: "https://images.dog.ceo/breeds/poodle-standard/n02113799_2506.jpg", bio: "I'm Rosie, a fabulous Poodle! ðŸŒ¹" },
    cat: { name: "Cleo", breed: "Abyssinian", photo: "https://cdn.pixabay.com/photo/2020/10/05/10/51/cat-5628953_640.jpg", bio: "I'm Cleo, an adventurous Abyssinian! ðŸ‘‘" },
  },
  {
    email: "vote+6@iheartdogs.com",
    name: "Duke Wellington",
    dog: { name: "Duke", breed: "Beagle", photo: "https://images.dog.ceo/breeds/beagle/n02088364_11136.jpg", bio: "I'm Duke, a Beagle with the best nose! ðŸ‘ƒ" },
    cat: { name: "Oliver", breed: "British Shorthair", photo: "https://cdn.pixabay.com/photo/2017/11/14/13/06/kitty-2948404_640.jpg", bio: "I'm Oliver, a proper British Shorthair! ðŸŽ©" },
  },
  {
    email: "vote+7@iheartdogs.com",
    name: "Buster Brown",
    dog: { name: "Buster", breed: "Bulldog", photo: "https://images.dog.ceo/breeds/bulldog-english/jager-2.jpg", bio: "I'm Buster, a chill Bulldog! ðŸ˜Ž" },
    cat: { name: "Nala", breed: "Bengal", photo: "https://cdn.pixabay.com/photo/2019/02/06/15/18/cat-3979126_640.jpg", bio: "I'm Nala, a wild Bengal beauty! ðŸ†" },
  },
  {
    email: "vote+8@iheartdogs.com",
    name: "Willow Grace",
    dog: { name: "Willow", breed: "Australian Shepherd", photo: "https://images.dog.ceo/breeds/australian-shepherd/pepper.jpg", bio: "I'm Willow, an Aussie full of energy! ðŸŒ¿" },
    cat: { name: "Milo", breed: "Tuxedo", photo: "https://cdn.pixabay.com/photo/2018/10/01/09/21/pets-3715733_640.jpg", bio: "I'm Milo, always dressed to impress! ðŸ¤µ" },
  },
  {
    email: "vote+9@iheartdogs.com",
    name: "Rocky Mountain",
    dog: { name: "Rocky", breed: "Rottweiler", photo: "https://images.dog.ceo/breeds/rottweiler/n02106550_10174.jpg", bio: "I'm Rocky, a big softy Rottweiler! ðŸ”ï¸" },
    cat: { name: "Simba", breed: "Persian", photo: "https://cdn.pixabay.com/photo/2016/12/30/17/27/cat-1941089_640.jpg", bio: "I'm Simba, a fluffy Persian prince! ðŸ¦" },
  },
  {
    email: "vote+10@iheartdogs.com",
    name: "Penny Lane",
    dog: { name: "Penny", breed: "Dachshund", photo: "https://images.dog.ceo/breeds/dachshund/dachshund-2.jpg", bio: "I'm Penny, a tiny Dachshund with a big heart! ðŸ’•" },
    cat: { name: "Bella", breed: "Scottish Fold", photo: "https://cdn.pixabay.com/photo/2019/11/08/11/36/kitten-4611189_640.jpg", bio: "I'm Bella, a cute Scottish Fold! ðŸŽ€" },
  },
  {
    email: "vote+11@iheartdogs.com",
    name: "Tucker James",
    dog: { name: "Tucker", breed: "Boxer", photo: "https://images.dog.ceo/breeds/boxer/n02108089_14898.jpg", bio: "I'm Tucker, a bouncy Boxer! ðŸ¥Š" },
    cat: { name: "Felix", breed: "Tabby", photo: "https://cdn.pixabay.com/photo/2014/04/13/20/49/cat-323262_640.jpg", bio: "I'm Felix, a classic tabby cat! ðŸ±" },
  },
  {
    email: "vote+12@iheartdogs.com",
    name: "Sadie Sunshine",
    dog: { name: "Sadie", breed: "Shih Tzu", photo: "https://images.dog.ceo/breeds/shihtzu/n02086240_7832.jpg", bio: "I'm Sadie, a fluffy Shih Tzu! â˜€ï¸" },
    cat: { name: "Smokey", breed: "Chartreux", photo: "https://cdn.pixabay.com/photo/2015/11/16/14/43/cat-1045782_640.jpg", bio: "I'm Smokey, a mysterious Chartreux! ðŸŒ«ï¸" },
  },
  {
    email: "vote+13@iheartdogs.com",
    name: "Finn Adventure",
    dog: { name: "Finn", breed: "Border Collie", photo: "https://images.dog.ceo/breeds/collie-border/n02106166_3437.jpg", bio: "I'm Finn, the smartest Border Collie! ðŸ§ " },
    cat: { name: "Jasper", breed: "Birman", photo: "https://cdn.pixabay.com/photo/2017/12/21/12/26/glare-3031956_640.jpg", bio: "I'm Jasper, a gorgeous Birman! ðŸ’Ž" },
  },
  {
    email: "vote+14@iheartdogs.com",
    name: "Mochi Bear",
    dog: { name: "Mochi", breed: "Pomeranian", photo: "https://images.dog.ceo/breeds/pomeranian/n02112018_10129.jpg", bio: "I'm Mochi, a tiny Pom with big fluff! ðŸ¡" },
    cat: { name: "Pepper", breed: "Calico", photo: "https://cdn.pixabay.com/photo/2019/03/22/17/05/cat-4073717_640.jpg", bio: "I'm Pepper, a colorful Calico! ðŸŒ¶ï¸" },
  },
  {
    email: "vote+15@iheartdogs.com",
    name: "Scout Explorer",
    dog: { name: "Scout", breed: "Bernese Mountain Dog", photo: "https://images.dog.ceo/breeds/mountain-bernese/n02107683_5425.jpg", bio: "I'm Scout, a gentle Bernese giant! ðŸ•ï¸" },
    cat: { name: "Tigger", breed: "Orange Tabby", photo: "https://cdn.pixabay.com/photo/2016/01/20/13/05/cat-1151519_640.jpg", bio: "I'm Tigger, always bouncing around! ðŸ¯" },
  },
  {
    email: "vote+16@iheartdogs.com",
    name: "Chloe Buttons",
    dog: { name: "Chloe", breed: "French Bulldog", photo: "https://images.dog.ceo/breeds/bulldog-french/n02108915_5482.jpg", bio: "I'm Chloe, a sassy Frenchie! ðŸŽ€" },
    cat: { name: "Oreo", breed: "Tuxedo", photo: "https://cdn.pixabay.com/photo/2018/04/20/17/18/cat-3336579_640.jpg", bio: "I'm Oreo, black and white and loved all over! ðŸª" },
  },
  {
    email: "vote+17@iheartdogs.com",
    name: "Charlie Waffles",
    dog: { name: "Charlie", breed: "Cavalier King Charles", photo: "https://images.dog.ceo/breeds/spaniel-cocker/n02102318_5765.jpg", bio: "I'm Charlie, a royal Cavalier! ðŸ§‡" },
    cat: { name: "Leo", breed: "Maine Coon", photo: "https://cdn.pixabay.com/photo/2021/10/19/10/56/cat-6723256_640.jpg", bio: "I'm Leo, a big fluffy Maine Coon! ðŸ¦" },
  },
  {
    email: "vote+18@iheartdogs.com",
    name: "Ziggy Stardust",
    dog: { name: "Ziggy", breed: "Dalmatian", photo: "https://images.dog.ceo/breeds/dalmatian/cooper2.jpg", bio: "I'm Ziggy, a spotted Dalmatian rockstar! â­" },
    cat: { name: "Cinnamon", breed: "Abyssinian", photo: "https://cdn.pixabay.com/photo/2017/09/25/13/12/cat-2785241_640.jpg", bio: "I'm Cinnamon, a warm Abyssinian! ðŸ‚" },
  },
  {
    email: "vote+19@iheartdogs.com",
    name: "Maple Autumn",
    dog: { name: "Maple", breed: "Samoyed", photo: "https://images.dog.ceo/breeds/samoyed/n02111889_10032.jpg", bio: "I'm Maple, a fluffy cloud Samoyed! ðŸ" },
    cat: { name: "Snowball", breed: "White Persian", photo: "https://cdn.pixabay.com/photo/2018/11/30/05/17/kitten-3847422_640.jpg", bio: "I'm Snowball, a pure white Persian! â„ï¸" },
  },
];

export async function POST() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as Record<string, unknown>)?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Array<{ email: string; status: string; userId?: string; dogPetId?: string; catPetId?: string }> = [];
  const password = await bcrypt.hash("VoteToFeed2026!", 10);
  const weekId = getCurrentWeekId();

  for (const account of SEED_ACCOUNTS) {
    try {
      const dogPhoto = normalizeSeedPhoto(account.dog.photo, "DOG", `${account.email}-dog-${account.dog.name}`);
      const catPhoto = normalizeSeedPhoto(account.cat.photo, "CAT", `${account.email}-cat-${account.cat.name}`);

      // Create or find user
      let user = await prisma.user.findUnique({ where: { email: account.email } });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: account.email,
            name: account.name,
            password,
            role: "USER",
            image: dogPhoto,
            freeVotesRemaining: 999,
            paidVoteBalance: 999,
          },
        });
      } else if (user.image !== dogPhoto) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { image: dogPhoto },
        });
      }

      // Create or find DOG pet
      let dogPet = await prisma.pet.findFirst({
        where: { userId: user.id, type: "DOG" },
      });

      if (!dogPet) {
        dogPet = await prisma.pet.create({
          data: {
            name: account.dog.name,
            type: "DOG",
            breed: account.dog.breed,
            bio: account.dog.bio,
            ownerName: account.name,
            photos: [dogPhoto],
            tags: [account.dog.breed.toLowerCase(), "good-dog", "engagement"],
            isActive: true,
            userId: user.id,
          },
        });

        // Auto-enter active DOG contests
        const dogContests = await prisma.contest.findMany({
          where: { isActive: true, petType: "DOG", endDate: { gte: new Date() } },
          select: { id: true },
        });
        for (const contest of dogContests) {
          await prisma.contestEntry.create({
            data: { contestId: contest.id, petId: dogPet.id },
          }).catch(() => {}); // ignore if already entered
        }

        // Create weekly stats
        await prisma.petWeeklyStats.upsert({
          where: { petId_weekId: { petId: dogPet.id, weekId } },
          update: {},
          create: { petId: dogPet.id, weekId },
        });
      } else {
        // Update existing dog pet photo if it's missing or using an unreliable hotlinked source
        if (!dogPet.photos || dogPet.photos.length === 0 || dogPet.photos[0] !== dogPhoto) {
          await prisma.pet.update({
            where: { id: dogPet.id },
            data: { photos: [dogPhoto] },
          });
        }
      }

      // Create or find CAT pet
      let catPet = await prisma.pet.findFirst({
        where: { userId: user.id, type: "CAT" },
      });

      if (!catPet) {
        catPet = await prisma.pet.create({
          data: {
            name: account.cat.name,
            type: "CAT",
            breed: account.cat.breed,
            bio: account.cat.bio,
            ownerName: account.name,
            photos: [catPhoto],
            tags: [account.cat.breed.toLowerCase(), "good-cat", "engagement"],
            isActive: true,
            userId: user.id,
          },
        });

        // Auto-enter active CAT contests
        const catContests = await prisma.contest.findMany({
          where: { isActive: true, petType: "CAT", endDate: { gte: new Date() } },
          select: { id: true },
        });
        for (const contest of catContests) {
          await prisma.contestEntry.create({
            data: { contestId: contest.id, petId: catPet.id },
          }).catch(() => {}); // ignore if already entered
        }

        // Create weekly stats
        await prisma.petWeeklyStats.upsert({
          where: { petId_weekId: { petId: catPet.id, weekId } },
          update: {},
          create: { petId: catPet.id, weekId },
        });
      } else {
        // Update existing cat pet photo if it's missing or using an unreliable hotlinked source
        if (!catPet.photos || catPet.photos.length === 0 || catPet.photos[0] !== catPhoto) {
          await prisma.pet.update({
            where: { id: catPet.id },
            data: { photos: [catPhoto] },
          });
        }
      }

      results.push({
        email: account.email,
        status: "ok",
        userId: user.id,
        dogPetId: dogPet.id,
        catPetId: catPet.id,
      });
    } catch (error) {
      results.push({ email: account.email, status: `error: ${String(error)}` });
    }
  }

  const seededCount = results.filter((r) => r.status === "ok").length;
  const runResult = await runAutoEngagement({ manual: true });

  return NextResponse.json({
    message: `Seeded ${seededCount}/${SEED_ACCOUNTS.length} engagement accounts and ran engagement.`,
    seededCount,
    totalSeedAccounts: SEED_ACCOUNTS.length,
    results,
    runResult,
  });
}
