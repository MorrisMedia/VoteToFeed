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
  "https://images.dog.ceo/breeds/retriever-golden/n02099601_1003.jpg",
  "https://images.dog.ceo/breeds/retriever-golden/n02099601_1004.jpg",
  "https://images.dog.ceo/breeds/labrador/n02099712_1003.jpg",
  "https://images.dog.ceo/breeds/labrador/n02099712_1004.jpg",
  "https://images.dog.ceo/breeds/husky/n02110185_11721.jpg",
];

const CAT_PHOTOS = [
  "https://cataas.com/cat/5e71343450d82d0011a669ba",
  "https://cataas.com/cat/5e6fbfae050d82000e8c456c",
  "https://cataas.com/cat/5e63c34350d82d00118c4e6d",
];

const getRandomPhoto = (list: string[]) => list[Math.floor(Math.random() * list.length)];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // Verify request with CRON_SECRET
  if (req.query.secret !== process.env.CRON_SECRET) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "Invalid or missing CRON_SECRET",
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

    // Find pets with no photos
    const petsNeedingPhotos = await prisma.pet.findMany({
      where: {
        isActive: true,
        OR: [
          { photos: { equals: [] } },
          { photos: { equals: {} } },
        ],
      },
    });

    console.log(`Found ${petsNeedingPhotos.length} pets needing photos`);

    let seededCount = 0;
    const seededPets = [];

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

        seededPets.push({
          name: pet.name,
          type: pet.type,
          photo: photoUrl,
        });
        seededCount++;
      } catch (error) {
        console.error(`Failed to update ${pet.name}:`, error);
      }
    }

    await prisma.$disconnect();

    return res.status(200).json({
      success: true,
      message: `Successfully seeded ${seededCount} of ${petsNeedingPhotos.length} pets`,
      details: {
        petCount: petsNeedingPhotos.length,
        seededCount,
        failedCount: petsNeedingPhotos.length - seededCount,
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
