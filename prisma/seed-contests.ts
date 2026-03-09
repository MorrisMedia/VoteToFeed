import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sundayStart(): Date {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function sundayEnd(): Date {
  const d = sundayStart();
  d.setDate(d.getDate() + 7);
  return d;
}

function weekId(): string {
  const s = sundayStart();
  const startOfYear = new Date(Date.UTC(s.getUTCFullYear(), 0, 1));
  const wn = Math.ceil(((s.getTime() - startOfYear.getTime()) / 86400000 + 1) / 7);
  return `${s.getUTCFullYear()}-W${String(wn).padStart(2, "0")}`;
}

async function main() {
  console.log("Seeding contests...");

  // Clean old contest data
  await prisma.contestEntry.deleteMany();
  await prisma.prize.deleteMany();
  await prisma.contest.deleteMany();

  const wid = weekId();

  // ─── WEEKLY NATIONAL CONTESTS (always running) ───────
  const nationalDog = await prisma.contest.create({
    data: {
      name: "National Dog Contest",
      type: "NATIONAL",
      typeLabel: "Weekly",
      petType: "DOG",
      weekId: wid,
      startDate: sundayStart(),
      endDate: sundayEnd(),
      isActive: true,
      isFeatured: true,
      description: "The weekly national dog contest. Top dogs compete for epic prize packs every week!",
      rules: "All dogs welcome. One entry per dog per week. Votes reset every Sunday at midnight UTC.",
      coverImage: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1200&h=400&fit=crop",
      prizeDescription: "1st: $2,000 Prize Pack | 2nd: $500 Prize Pack | 3rd: $250 Prize Pack",
      prizes: {
        create: [
          { placement: 1, title: "Grand Champion Pack", value: 200000, items: ["12-month premium pet food", "Custom pet portrait", "Annual grooming package", "Designer accessories", "Professional photo shoot", "1-year pet insurance"], description: "The ultimate prize for the #1 dog of the week" },
          { placement: 2, title: "Runner-Up Pack", value: 50000, items: ["6-month premium pet food", "Custom photo printing & framing", "Pet wellness bundle"], description: "An amazing prize for our silver champion" },
          { placement: 3, title: "Bronze Pack", value: 25000, items: ["3-month premium pet food", "Eco-friendly pet accessories"], description: "A fantastic prize for our bronze winner" },
        ],
      },
    },
  });

  const nationalCat = await prisma.contest.create({
    data: {
      name: "National Cat Contest",
      type: "NATIONAL",
      typeLabel: "Weekly",
      petType: "CAT",
      weekId: wid,
      startDate: sundayStart(),
      endDate: sundayEnd(),
      isActive: true,
      isFeatured: true,
      description: "The weekly national cat contest. Top cats compete for purr-fect prize packs every week!",
      rules: "All cats welcome. One entry per cat per week. Votes reset every Sunday at midnight UTC.",
      coverImage: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=1200&h=400&fit=crop",
      prizeDescription: "1st: $2,000 Prize Pack | 2nd: $500 Prize Pack | 3rd: $250 Prize Pack",
      prizes: {
        create: [
          { placement: 1, title: "Grand Champion Pack", value: 200000, items: ["12-month premium cat food", "Custom cat portrait", "Annual grooming package", "Designer accessories", "Professional photo shoot", "1-year pet insurance"], description: "The ultimate prize for the #1 cat of the week" },
          { placement: 2, title: "Runner-Up Pack", value: 50000, items: ["6-month premium cat food", "Custom photo printing & framing", "Cat wellness bundle"], description: "An amazing prize for our silver champion" },
          { placement: 3, title: "Bronze Pack", value: 25000, items: ["3-month premium cat food", "Eco-friendly cat accessories"], description: "A fantastic prize for our bronze winner" },
        ],
      },
    },
  });

  // ─── SEASONAL CONTEST (longer running) ────────────
  const summerDog = await prisma.contest.create({
    data: {
      name: "Summer Fun Dog Photo Contest",
      type: "SEASONAL",
      petType: "DOG",
      startDate: daysFromNow(-3),
      endDate: daysFromNow(25),
      isActive: true,
      isFeatured: true,
      description: "Show us your pup living their best summer life! Beach days, pool parties, ice cream treats — we want to see it all.",
      rules: "Photos must show a summery theme. One entry per dog. Voting is open to all registered users. Top 3 win prizes.",
      coverImage: "https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=1200&h=400&fit=crop",
      prizeDescription: "1st: $500 Summer Adventure Pack | 2nd: $200 Beach Day Bundle | 3rd: $100 Treat Box",
      sponsorName: "BarkBox",
      sponsorUrl: "https://barkbox.com",
      prizes: {
        create: [
          { placement: 1, title: "Summer Adventure Pack", value: 50000, items: ["Portable dog pool", "Outdoor adventure harness", "Cooling vest", "Travel water bottle", "Sunscreen for dogs", "$100 BarkBox gift card"] },
          { placement: 2, title: "Beach Day Bundle", value: 20000, items: ["Beach towel set", "Water-safe fetch toys", "Dog-safe sunscreen", "$50 BarkBox gift card"] },
          { placement: 3, title: "Summer Treat Box", value: 10000, items: ["Frozen treat maker", "Summer-themed treats", "Bandana collection"] },
        ],
      },
    },
  });

  const summerCat = await prisma.contest.create({
    data: {
      name: "Coolest Cat Summer Contest",
      type: "SEASONAL",
      petType: "CAT",
      startDate: daysFromNow(-3),
      endDate: daysFromNow(25),
      isActive: true,
      isFeatured: false,
      description: "Is your cat too cool for summer? Show us your cat chilling, sunbathing, or being their fabulous selves.",
      rules: "Photos must feature a summery or relaxed vibe. One entry per cat. Top 3 win prizes.",
      coverImage: "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=1200&h=400&fit=crop",
      prizeDescription: "1st: $400 Luxury Cat Pack | 2nd: $150 Comfort Bundle | 3rd: $75 Treat Box",
      prizes: {
        create: [
          { placement: 1, title: "Luxury Cat Pack", value: 40000, items: ["Cat tree with hammock", "Premium cat bed", "Gourmet treat sampler", "Interactive toys", "Grooming spa kit"] },
          { placement: 2, title: "Comfort Bundle", value: 15000, items: ["Window perch", "Catnip collection", "Cozy blanket", "Feather toys"] },
          { placement: 3, title: "Treat Box", value: 7500, items: ["Gourmet cat treats", "Toys bundle", "Bandana"] },
        ],
      },
    },
  });

  // ─── CHARITY CONTEST ─────────────────────────────
  await prisma.contest.create({
    data: {
      name: "VotesForShelters: Rescue Heroes",
      type: "CHARITY",
      petType: "DOG",
      startDate: daysFromNow(-1),
      endDate: daysFromNow(13),
      isActive: true,
      isFeatured: true,
      description: "Celebrate rescue dogs! Enter your adopted or rescued pup and help us raise awareness for shelter animals. Every vote donated helps feed shelter dogs in need.",
      rules: "Open to all rescued/adopted dogs. Share your rescue story in the bio. All vote proceeds go to partner shelters.",
      coverImage: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=1200&h=400&fit=crop",
      prizeDescription: "1st: $1,000 Rescue Hero Pack + $500 donated to shelter of choice | 2nd: $300 Pack | 3rd: $150 Pack",
      sponsorName: "Best Friends Animal Society",
      sponsorUrl: "https://bestfriends.org",
      prizes: {
        create: [
          { placement: 1, title: "Rescue Hero Pack", value: 100000, items: ["$500 donation to shelter of choice", "Premium food 6-month supply", "Custom 'Rescue Hero' portrait", "Designer collar & leash set", "Professional photo session"] },
          { placement: 2, title: "Rescue Champion", value: 30000, items: ["$200 donation to shelter of choice", "Premium food 3-month supply", "Rescue-themed accessories"] },
          { placement: 3, title: "Rescue Star", value: 15000, items: ["$100 donation to shelter of choice", "Treat sampler pack", "Rescue dog bandana set"] },
        ],
      },
    },
  });

  // ─── CALENDAR CONTEST ─────────────────────────────
  await prisma.contest.create({
    data: {
      name: "2026 Cutest Pet Calendar Contest",
      type: "CALENDAR",
      petType: "DOG",
      startDate: daysFromNow(-5),
      endDate: daysFromNow(55),
      isActive: true,
      isFeatured: false,
      description: "Top 12 dogs will be featured in the official 2026 Vote to Feed Calendar, sold nationwide! Your pup could be a star.",
      rules: "High-resolution photos only. Must be your own pet. Top 12 by votes will each get a month in the calendar. Grand prize for #1 (cover photo).",
      coverImage: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1200&h=400&fit=crop",
      prizeDescription: "Top 12 featured in official calendar | #1 gets cover + $1,000 Pack | All 12 get free calendars & merch",
      prizes: {
        create: [
          { placement: 1, title: "Calendar Cover Star", value: 100000, items: ["Cover of 2026 Calendar", "$500 in pet products", "50 free calendars to share", "Magazine feature", "Social media spotlight"] },
          { placement: 2, title: "Calendar Feature (Month)", value: 25000, items: ["Featured month in calendar", "10 free calendars", "Pet product bundle"] },
          { placement: 3, title: "Calendar Feature (Month)", value: 25000, items: ["Featured month in calendar", "10 free calendars", "Pet product bundle"] },
        ],
      },
    },
  });

  // ─── BREED-SPECIFIC CONTEST ───────────────────────
  await prisma.contest.create({
    data: {
      name: "Golden Retriever Showdown",
      type: "BREED",
      petType: "DOG",
      startDate: daysFromNow(0),
      endDate: daysFromNow(14),
      isActive: true,
      isFeatured: false,
      description: "Calling all Golden Retrievers! Show off that golden smile and fluffy coat. The most lovable goldens compete head to head.",
      rules: "Must be a Golden Retriever (or Golden mix). Photos should clearly show the dog. One entry per dog.",
      coverImage: "https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=1200&h=400&fit=crop",
      prizeDescription: "1st: $300 Golden Pack | 2nd: $150 Treat Bundle | 3rd: $75 Toy Box",
      prizes: {
        create: [
          { placement: 1, title: "Golden Champion Pack", value: 30000, items: ["Premium Golden Retriever food", "Grooming kit", "Golden-themed accessories", "Plush toys bundle"] },
          { placement: 2, title: "Golden Treat Bundle", value: 15000, items: ["Gourmet treats", "Dental chews", "Training treats collection"] },
          { placement: 3, title: "Golden Toy Box", value: 7500, items: ["Durable chew toys", "Fetch toys", "Puzzle toys"] },
        ],
      },
    },
  });

  // ─── Auto-enter existing pets into national contests ─────
  const dogs = await prisma.pet.findMany({ where: { type: "DOG", isActive: true }, select: { id: true } });
  const cats = await prisma.pet.findMany({ where: { type: "CAT", isActive: true }, select: { id: true } });

  for (const dog of dogs) {
    await prisma.contestEntry.create({ data: { contestId: nationalDog.id, petId: dog.id } }).catch(() => {});
  }
  for (const cat of cats) {
    await prisma.contestEntry.create({ data: { contestId: nationalCat.id, petId: cat.id } }).catch(() => {});
  }

  // Enter some dogs into seasonal/charity
  for (const dog of dogs.slice(0, 6)) {
    await prisma.contestEntry.create({ data: { contestId: summerDog.id, petId: dog.id } }).catch(() => {});
  }
  for (const cat of cats.slice(0, 4)) {
    await prisma.contestEntry.create({ data: { contestId: summerCat.id, petId: cat.id } }).catch(() => {});
  }

  const allContests = await prisma.contest.count();
  console.log(`✅ Seeded ${allContests} contests with prizes and entries`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
