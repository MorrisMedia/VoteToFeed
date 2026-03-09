import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Helpers
function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Contest week ID (current week starting Sunday)
function getCurrentWeekId(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const sunday = new Date(now);
  sunday.setUTCDate(now.getUTCDate() - day);
  sunday.setUTCHours(0, 0, 0, 0);
  const startOfYear = new Date(Date.UTC(sunday.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(
    ((sunday.getTime() - startOfYear.getTime()) / 86400000 + 1) / 7
  );
  return `${sunday.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

async function main() {
  console.log("Seeding PetVoter...");
  const weekId = getCurrentWeekId();

  // ─── Admin Settings ──────────────────────────────────
  for (const s of [
    { key: "meal_rate", value: "10.0" },
    { key: "animal_type", value: "dogs" },
    { key: "weekly_vote_goal", value: "100000" },
  ]) {
    await prisma.adminSetting.upsert({ where: { key: s.key }, create: s, update: {} });
  }

  // ─── Users ──────────────────────────────────────────
  const passwordHash = await bcrypt.hash("password123", 12);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@petvoter.com" },
    create: {
      name: "Admin User",
      email: "admin@petvoter.com",
      password: passwordHash,
      role: "ADMIN",
      freeVotesRemaining: 1,
      paidVoteBalance: 500,
      votingStreak: 12,
      state: "CA",
      city: "San Francisco",
    },
    update: { role: "ADMIN" },
  });

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@petvoter.com" },
    create: {
      name: "Demo User",
      email: "demo@petvoter.com",
      password: passwordHash,
      role: "USER",
      freeVotesRemaining: 1,
      paidVoteBalance: 25,
      votingStreak: 3,
      state: "NY",
      city: "New York",
    },
    update: {},
  });

  const voterNames = [
    { name: "Sarah M.", email: "sarah@example.com", state: "TX", city: "Austin" },
    { name: "Mike R.", email: "mike@example.com", state: "FL", city: "Miami" },
    { name: "Emma L.", email: "emma@example.com", state: "WA", city: "Seattle" },
    { name: "James K.", email: "james@example.com", state: "IL", city: "Chicago" },
    { name: "Olivia P.", email: "olivia@example.com", state: "CO", city: "Denver" },
    { name: "Noah W.", email: "noah@example.com", state: "PA", city: "Philadelphia" },
    { name: "Ava D.", email: "ava@example.com", state: "GA", city: "Atlanta" },
    { name: "Liam B.", email: "liam@example.com", state: "AZ", city: "Phoenix" },
    { name: "Sophia T.", email: "sophia@example.com", state: "OR", city: "Portland" },
    { name: "Lucas H.", email: "lucas@example.com", state: "MA", city: "Boston" },
  ];

  const voters = [];
  for (const v of voterNames) {
    const user = await prisma.user.upsert({
      where: { email: v.email },
      create: { name: v.name, email: v.email, password: passwordHash, state: v.state, city: v.city, freeVotesRemaining: 0, paidVoteBalance: randomInt(0, 50) },
      update: {},
    });
    voters.push(user);
  }

  const allUsers = [adminUser, demoUser, ...voters];

  // ─── Pets (Dogs) ───────────────────────────────────
  const dogData = [
    { name: "Buddy", breed: "Golden Retriever", bio: "The goodest boy who loves belly rubs and long walks at sunset.", ownerIdx: 0, state: "CA", city: "San Francisco", photo: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=600&h=600&fit=crop" },
    { name: "Luna", breed: "Husky", bio: "Blue-eyed beauty with endless energy and a dramatic howl.", ownerIdx: 1, state: "NY", city: "Brooklyn", photo: "https://images.unsplash.com/photo-1605568427561-40dd23c2acea?w=600&h=600&fit=crop" },
    { name: "Max", breed: "German Shepherd", bio: "Loyal protector and champion frisbee catcher.", ownerIdx: 2, state: "TX", city: "Austin", photo: "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=600&h=600&fit=crop" },
    { name: "Charlie", breed: "Labrador", bio: "Never met a tennis ball he didn't love.", ownerIdx: 3, state: "FL", city: "Miami", photo: "https://images.unsplash.com/photo-1579213838058-1e10e1f54a23?w=600&h=600&fit=crop" },
    { name: "Cooper", breed: "Beagle", bio: "Nose to the ground, always on an adventure.", ownerIdx: 4, state: "WA", city: "Seattle", photo: "https://images.unsplash.com/photo-1505628346881-b72b27e84530?w=600&h=600&fit=crop" },
    { name: "Rocky", breed: "Bulldog", bio: "Couch potato extraordinaire with a heart of gold.", ownerIdx: 5, state: "IL", city: "Chicago", photo: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600&h=600&fit=crop" },
    { name: "Bear", breed: "Bernese Mountain Dog", bio: "Giant fluffball who thinks he's a lap dog.", ownerIdx: 6, state: "CO", city: "Denver", photo: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=600&fit=crop" },
    { name: "Daisy", breed: "Poodle", bio: "Elegant, intelligent, and always ready for a photoshoot.", ownerIdx: 7, state: "PA", city: "Philadelphia", photo: "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=600&h=600&fit=crop" },
    { name: "Tucker", breed: "Corgi", bio: "Short legs, big personality. Ruler of the household.", ownerIdx: 8, state: "GA", city: "Atlanta", photo: "https://images.unsplash.com/photo-1612536057832-2ff7ead58194?w=600&h=600&fit=crop" },
    { name: "Sadie", breed: "Australian Shepherd", bio: "Herding champion with the most beautiful merle coat.", ownerIdx: 9, state: "AZ", city: "Scottsdale", photo: "https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=600&h=600&fit=crop" },
  ];

  const catData = [
    { name: "Whiskers", breed: "Tabby", bio: "Professional napper and window-watcher.", ownerIdx: 0, state: "CA", city: "Los Angeles", photo: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&h=600&fit=crop" },
    { name: "Shadow", breed: "Black Cat", bio: "Mysterious and majestic. Not bad luck, just pure love.", ownerIdx: 1, state: "NY", city: "Manhattan", photo: "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=600&h=600&fit=crop" },
    { name: "Milo", breed: "Orange Tabby", bio: "One brain cell, infinite charm.", ownerIdx: 3, state: "FL", city: "Tampa", photo: "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=600&h=600&fit=crop" },
    { name: "Cleo", breed: "Siamese", bio: "Vocal, elegant, and demands to be worshipped.", ownerIdx: 5, state: "IL", city: "Evanston", photo: "https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=600&h=600&fit=crop" },
    { name: "Oliver", breed: "Maine Coon", bio: "Gentle giant with magnificent ear tufts.", ownerIdx: 7, state: "PA", city: "Pittsburgh", photo: "https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=600&h=600&fit=crop" },
    { name: "Nala", breed: "Bengal", bio: "Wild looks, sweet soul. Loves playing fetch.", ownerIdx: 9, state: "OR", city: "Portland", photo: "https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=600&h=600&fit=crop" },
  ];

  const createdPets = [];

  for (const d of dogData) {
    const owner = allUsers[d.ownerIdx];
    const pet = await prisma.pet.create({
      data: {
        name: d.name,
        type: "DOG",
        breed: d.breed,
        bio: d.bio,
        ownerName: owner.name || d.name + "'s Owner",
        city: d.city,
        state: d.state,
        photos: [d.photo],
        userId: owner.id,
        createdAt: new Date(Date.now() - randomInt(0, 5) * 24 * 60 * 60 * 1000),
      },
    });
    createdPets.push(pet);
  }

  for (const c of catData) {
    const owner = allUsers[c.ownerIdx];
    const pet = await prisma.pet.create({
      data: {
        name: c.name,
        type: "CAT",
        breed: c.breed,
        bio: c.bio,
        ownerName: owner.name || c.name + "'s Owner",
        city: c.city,
        state: c.state,
        photos: [c.photo],
        userId: owner.id,
        createdAt: new Date(Date.now() - randomInt(0, 5) * 24 * 60 * 60 * 1000),
      },
    });
    createdPets.push(pet);
  }

  console.log(`Created ${createdPets.length} pets`);

  // ─── Votes ───────────────────────────────────────────
  let totalVotes = 0;
  for (const pet of createdPets) {
    const numVotes = randomInt(5, 80);
    for (let i = 0; i < numVotes; i++) {
      // Pick a voter who isn't the pet owner
      let voter = pick(allUsers);
      while (voter.id === pet.userId) voter = pick(allUsers);

      await prisma.vote.create({
        data: {
          petId: pet.id,
          userId: voter.id,
          voteType: Math.random() > 0.3 ? "PAID" : "FREE",
          quantity: 1,
          contestWeek: weekId,
          createdAt: new Date(Date.now() - randomInt(0, 6 * 24 * 60) * 60 * 1000),
        },
      });
      totalVotes++;
    }
  }
  console.log(`Created ${totalVotes} votes`);

  // ─── Weekly Stats ─────────────────────────────────────
  for (const pet of createdPets) {
    const voteCount = await prisma.vote.count({ where: { petId: pet.id, contestWeek: weekId } });
    const paidCount = await prisma.vote.count({ where: { petId: pet.id, contestWeek: weekId, voteType: "PAID" } });
    await prisma.petWeeklyStats.upsert({
      where: { petId_weekId: { petId: pet.id, weekId } },
      create: {
        petId: pet.id,
        weekId,
        totalVotes: voteCount,
        freeVotes: voteCount - paidCount,
        paidVotes: paidCount,
      },
      update: {
        totalVotes: voteCount,
        freeVotes: voteCount - paidCount,
        paidVotes: paidCount,
      },
    });
  }

  // Compute ranks per pet type
  for (const petType of ["DOG", "CAT"] as const) {
    const stats = await prisma.petWeeklyStats.findMany({
      where: { weekId, pet: { type: petType } },
      orderBy: { totalVotes: "desc" },
    });
    for (let i = 0; i < stats.length; i++) {
      await prisma.petWeeklyStats.update({
        where: { id: stats[i].id },
        data: { rank: i + 1 },
      });
    }
  }

  console.log("Computed weekly ranks");

  // ─── Comments ─────────────────────────────────────────
  const commentTexts = [
    "So adorable! 😍", "What a cutie!", "I voted!", "Love this pet!",
    "Best looking pet in the contest!", "Gorgeous eyes!", "Such a good boy!",
    "This one deserves to win!", "Absolutely precious!", "Can't stop looking at this photo!",
    "What breed is this? So beautiful!", "My favorite entry this week!",
    "Those eyes are mesmerizing!", "Winner material right here!",
  ];

  let commentCount = 0;
  for (const pet of createdPets) {
    const numComments = randomInt(1, 5);
    for (let i = 0; i < numComments; i++) {
      let commenter = pick(allUsers);
      while (commenter.id === pet.userId) commenter = pick(allUsers);

      await prisma.comment.create({
        data: {
          petId: pet.id,
          userId: commenter.id,
          text: pick(commentTexts),
          createdAt: new Date(Date.now() - randomInt(0, 5 * 24 * 60) * 60 * 1000),
        },
      });
      commentCount++;
    }
  }
  console.log(`Created ${commentCount} comments`);

  // ─── National Contests ────────────────────────────────
  const now = new Date();
  const day = now.getUTCDay();
  const sundayStart = new Date(now);
  sundayStart.setUTCDate(now.getUTCDate() - day);
  sundayStart.setUTCHours(0, 0, 0, 0);
  const sundayEnd = new Date(sundayStart);
  sundayEnd.setUTCDate(sundayStart.getUTCDate() + 7);

  for (const petType of ["DOG", "CAT"] as const) {
    let contest = await prisma.contest.findFirst({
      where: { type: "NATIONAL", petType, weekId },
    });
    if (!contest) {
      contest = await prisma.contest.create({
        data: {
          name: `National ${petType === "DOG" ? "Dog" : "Cat"} Contest`,
          type: "NATIONAL",
          typeLabel: "Weekly",
          petType,
          state: "",
          weekId,
          startDate: sundayStart,
          endDate: sundayEnd,
          isActive: true,
          isFeatured: true,
        },
      });
    }

    // Enter all pets of this type
    const petsOfType = createdPets.filter((p) => p.type === petType);
    for (const pet of petsOfType) {
      await prisma.contestEntry.upsert({
        where: { contestId_petId: { contestId: contest.id, petId: pet.id } },
        create: { contestId: contest.id, petId: pet.id },
        update: {},
      });
    }

    // Create prizes
    const prizeData = [
      { placement: 1, title: "1st Place Prize Pack", value: 200000, items: ["12-month premium pet food", "Custom pet portrait", "Annual grooming package", "Designer accessories"] },
      { placement: 2, title: "2nd Place Prize Pack", value: 50000, items: ["6-month pet food supply", "Custom photo printing", "Pet wellness bundle"] },
      { placement: 3, title: "3rd Place Prize Pack", value: 25000, items: ["3-month pet food supply", "Eco-friendly accessories set"] },
    ];
    for (const pd of prizeData) {
      await prisma.prize.upsert({
        where: { contestId_placement: { contestId: contest.id, placement: pd.placement } },
        create: { contestId: contest.id, ...pd },
        update: {},
      });
    }
  }

  console.log("Created contests with prizes");

  console.log("\n✅ Seed complete!");
  console.log("─────────────────────────────");
  console.log("Admin login:  admin@petvoter.com / password123");
  console.log("Demo login:   demo@petvoter.com / password123");
  console.log("─────────────────────────────\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
