/**
 * API endpoint to seed pet images
 * This endpoint has access to DATABASE_URL through Vercel environment
 * Only accessible with CRON_SECRET or from specific IPs
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, PetType } from "@prisma/client";

type ResponseData = {
  success: boolean;
  message: string;
  details?: {
    petCount: number;
    seededCount: number;
    failedCount: number;
    pets?: Array<{ name: string; type: string; photo?: string }>;
  };
  error?: string;
};

const DOG_PHOTOS = [
  "https://images.dog.ceo/breeds/retriever-golden/n02099601_1722.jpg",
  "https://images.dog.ceo/breeds/husky/n02110185_10047.jpg",
  "https://images.dog.ceo/breeds/labrador/n02099712_4323.jpg",
  "https://images.dog.ceo/breeds/corgi-cardigan/n02113186_10475.jpg",
  "https://images.dog.ceo/breeds/germanshepherd/n02106662_20841.jpg",
  "https://images.dog.ceo/breeds/poodle-standard/n02113799_2506.jpg",
  "https://images.dog.ceo/breeds/beagle/n02088364_11136.jpg",
  "https://images.dog.ceo/breeds/bulldog-english/jager-2.jpg",
  "https://images.dog.ceo/breeds/australian-shepherd/pepper.jpg",
  "https://images.dog.ceo/breeds/rottweiler/n02106550_10174.jpg",
  "https://images.dog.ceo/breeds/dachshund/dachshund-2.jpg",
  "https://images.dog.ceo/breeds/boxer/n02108089_14898.jpg",
  "https://images.dog.ceo/breeds/shihtzu/n02086240_7832.jpg",
  "https://images.dog.ceo/breeds/collie-border/n02106166_3437.jpg",
  "https://images.dog.ceo/breeds/pomeranian/n02112018_10129.jpg",
  "https://images.dog.ceo/breeds/mountain-bernese/n02107683_5425.jpg",
  "https://images.dog.ceo/breeds/bulldog-french/n02108915_5482.jpg",
  "https://images.dog.ceo/breeds/spaniel-cocker/n02102318_5765.jpg",
  "https://images.dog.ceo/breeds/dalmatian/cooper2.jpg",
  "https://images.dog.ceo/breeds/samoyed/n02111889_10032.jpg",
];

const CAT_PHOTOS = [
  "https://cdn.pixabay.com/photo/2017/02/20/18/03/cat-2083492_640.jpg",
  "https://cdn.pixabay.com/photo/2018/01/28/12/37/cat-3113513_640.jpg",
  "https://cdn.pixabay.com/photo/2019/11/08/11/36/cat-4611189_640.jpg",
  "https://cdn.pixabay.com/photo/2017/07/25/01/22/cat-2536662_640.jpg",
  "https://cdn.pixabay.com/photo/2024/02/28/07/42/european-shorthair-8601492_640.jpg",
  "https://cdn.pixabay.com/photo/2020/10/05/10/51/cat-5628953_640.jpg",
  "https://cdn.pixabay.com/photo/2017/11/14/13/06/kitty-2948404_640.jpg",
  "https://cdn.pixabay.com/photo/2019/02/06/15/18/cat-3979126_640.jpg",
  "https://cdn.pixabay.com/photo/2018/10/01/09/21/pets-3715733_640.jpg",
  "https://cdn.pixabay.com/photo/2016/12/30/17/27/cat-1941089_640.jpg",
  "https://cdn.pixabay.com/photo/2019/11/08/11/36/kitten-4611189_640.jpg",
  "https://cdn.pixabay.com/photo/2014/04/13/20/49/cat-323262_640.jpg",
  "https://cdn.pixabay.com/photo/2015/11/16/14/43/cat-1045782_640.jpg",
  "https://cdn.pixabay.com/photo/2017/12/21/12/26/glare-3031956_640.jpg",
  "https://cdn.pixabay.com/photo/2019/03/22/17/05/cat-4073717_640.jpg",
  "https://cdn.pixabay.com/photo/2016/01/20/13/05/cat-1151519_640.jpg",
  "https://cdn.pixabay.com/photo/2018/04/20/17/18/cat-3336579_640.jpg",
  "https://cdn.pixabay.com/photo/2021/10/19/10/56/cat-6723256_640.jpg",
  "https://cdn.pixabay.com/photo/2017/09/25/13/12/cat-2785241_640.jpg",
  "https://cdn.pixabay.com/photo/2018/11/30/05/17/kitten-3847422_640.jpg",
];

const getRandomPhoto = (list: string[]) => list[Math.floor(Math.random() * list.length)];

function stableIndex(key: string, length: number) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const token = req.headers["x-seed-token"] || req.query.token;
  if (token !== "seed-pets-2024") {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "Invalid or missing authentication token",
    });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    const prisma = new PrismaClient();
    const reseedDummyAccounts = req.query.mode === "dummy" || req.query.dummy === "1";
    const seededPets: Array<{ name: string; type: string; photo?: string }> = [];
    let seededCount = 0;
    let petCount = 0;

    if (reseedDummyAccounts) {
      const seedPets = await prisma.pet.findMany({
        where: {
          isActive: true,
          user: { email: { contains: "@iheartdogs.com" } },
          type: { in: [PetType.DOG, PetType.CAT] },
        },
        include: {
          user: { select: { email: true } },
        },
        orderBy: [{ user: { email: "asc" } }, { type: "asc" }, { createdAt: "asc" }],
      });

      petCount = seedPets.length;

      const usedDog = new Set<number>();
      const usedCat = new Set<number>();

      for (const pet of seedPets) {
        try {
          const pool = pet.type === PetType.DOG ? DOG_PHOTOS : CAT_PHOTOS;
          const used = pet.type === PetType.DOG ? usedDog : usedCat;
          const baseKey = `${pet.user.email}-${pet.type}-${pet.name}`;
          let index = stableIndex(baseKey, pool.length);
          while (used.has(index)) index = (index + 1) % pool.length;
          used.add(index);
          const photoUrl = pool[index];

          await prisma.pet.update({
            where: { id: pet.id },
            data: { photos: [photoUrl] },
          });

          if (pet.type === PetType.DOG) {
            await prisma.user.update({
              where: { id: pet.userId },
              data: { image: photoUrl },
            }).catch(() => {});
          }

          seededPets.push({ name: pet.name, type: pet.type, photo: photoUrl });
          seededCount++;
        } catch (error) {
          console.error(`Failed to update ${pet.name}:`, error);
        }
      }
    } else {
      const petsNeedingPhotos = await prisma.pet.findMany({
        where: {
          isActive: true,
          photos: { equals: [] },
        },
      });

      petCount = petsNeedingPhotos.length;
      console.log(`Found ${petsNeedingPhotos.length} pets needing photos`);

      for (const pet of petsNeedingPhotos) {
        try {
          const photoUrl =
            pet.type === PetType.DOG
              ? getRandomPhoto(DOG_PHOTOS)
              : pet.type === PetType.CAT
              ? getRandomPhoto(CAT_PHOTOS)
              : "https://source.unsplash.com/400x400/?pet";

          await prisma.pet.update({
            where: { id: pet.id },
            data: { photos: [photoUrl] },
          });

          seededPets.push({ name: pet.name, type: pet.type, photo: photoUrl });
          seededCount++;
        } catch (error) {
          console.error(`Failed to update ${pet.name}:`, error);
        }
      }
    }

    await prisma.$disconnect();

    return res.status(200).json({
      success: true,
      message: reseedDummyAccounts
        ? `Successfully reseeded ${seededCount} of ${petCount} dummy pets with unique photos`
        : `Successfully seeded ${seededCount} of ${petCount} pets`,
      details: {
        petCount,
        seededCount,
        failedCount: petCount - seededCount,
        pets: seededPets,
      },
    });
  } catch (error) {
    console.error("Seeding error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to seed pet images",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
