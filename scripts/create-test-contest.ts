import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const startDate = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000); // started 4 days ago
  const endDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days from now

  const contest = await prisma.contest.create({
    data: {
      name: "April Cutest Dog Contest 2026",
      type: "NATIONAL",
      petType: "DOG",
      startDate,
      endDate,
      isActive: true,
      isFeatured: true,
      isRecurring: true,
      recurringInterval: "biweekly",
      description:
        "Vote for the cutest dog! Top 3 win prizes. Every paid vote helps feed shelter pets.",
      prizeDescription:
        "Top 3 placements plus one random participant win prize packs.",
      rules: "Winners are determined by votes cast during the contest window.",
      prizes: {
        create: [
          {
            placement: 1,
            title: "Grand Prize",
            value: 30000,
            items: ["$250 product bundle", "$50 Gift Card", "Featured post"],
          },
          {
            placement: 2,
            title: "Runner-Up",
            value: 5000,
            items: ["$50 Gift Card"],
          },
          {
            placement: 3,
            title: "Third Place",
            value: 2500,
            items: ["$25 Gift Card"],
          },
        ],
      },
    },
    include: { prizes: true },
  });

  console.log("Contest created:", contest.id, contest.name);

  const pets = await prisma.pet.findMany({
    where: { isActive: true, type: "DOG" },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  console.log("Found", pets.length, "dogs to enter");

  for (const pet of pets) {
    await prisma.contestEntry
      .create({
        data: { contestId: contest.id, petId: pet.id },
      })
      .catch(() => {});
  }

  console.log("Entered", pets.length, "pets into contest");
  console.log("");
  console.log("View at: http://localhost:3001/contests/" + contest.id);

  await prisma.$disconnect();
}

main().catch(console.error);
