import { seedBadges } from "../src/lib/badges";

async function main() {
  console.log("🏅 Seeding badges...");
  await seedBadges();
  console.log("✅ Badges seeded successfully!");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
