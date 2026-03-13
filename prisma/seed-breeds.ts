import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const DOG_BREEDS = [
  // Top entries
  "Other / Mixed / Rescued",
  // A
  "Affenpinscher",
  "Afghan Hound",
  "Airedale Terrier",
  "Akita",
  "Alaskan Malamute",
  "American Bulldog",
  "American English Coonhound",
  "American Eskimo Dog",
  "American Foxhound",
  "American Pit Bull Terrier",
  "American Staffordshire Terrier",
  "American Water Spaniel",
  "Anatolian Shepherd Dog",
  "Australian Cattle Dog",
  "Australian Shepherd",
  "Australian Terrier",
  // B
  "Basenji",
  "Basset Hound",
  "Beagle",
  "Bearded Collie",
  "Beauceron",
  "Bedlington Terrier",
  "Belgian Malinois",
  "Belgian Sheepdog",
  "Belgian Tervuren",
  "Bernese Mountain Dog",
  "Bichon Frise",
  "Black and Tan Coonhound",
  "Black Russian Terrier",
  "Bloodhound",
  "Bluetick Coonhound",
  "Border Collie",
  "Border Terrier",
  "Borzoi",
  "Boston Terrier",
  "Bouvier des Flandres",
  "Boxer",
  "Boykin Spaniel",
  "Briard",
  "Brittany",
  "Brussels Griffon",
  "Bull Terrier",
  "Bulldog",
  "Bullmastiff",
  // C
  "Cairn Terrier",
  "Canaan Dog",
  "Cane Corso",
  "Cardigan Welsh Corgi",
  "Cavalier King Charles Spaniel",
  "Chesapeake Bay Retriever",
  "Chihuahua",
  "Chinese Crested",
  "Chinese Shar-Pei",
  "Chinook",
  "Chow Chow",
  "Clumber Spaniel",
  "Cocker Spaniel",
  "Collie",
  "Coton de Tulear",
  "Curly-Coated Retriever",
  // D
  "Dachshund",
  "Dalmatian",
  "Dandie Dinmont Terrier",
  "Doberman Pinscher",
  "Dogo Argentino",
  "Dogue de Bordeaux",
  // E
  "English Cocker Spaniel",
  "English Bulldog",
  "English Foxhound",
  "English Setter",
  "English Springer Spaniel",
  "English Toy Spaniel",
  "Entlebucher Mountain Dog",
  // F
  "Field Spaniel",
  "Finnish Lapphund",
  "Finnish Spitz",
  "Flat-Coated Retriever",
  "Fox Terrier (Smooth)",
  "Fox Terrier (Wire)",
  "French Bulldog",
  // G
  "German Pinscher",
  "German Shepherd Dog",
  "German Shorthaired Pointer",
  "German Wirehaired Pointer",
  "Giant Schnauzer",
  "Glen of Imaal Terrier",
  "Golden Retriever",
  "Goldendoodle",
  "Gordon Setter",
  "Great Dane",
  "Great Pyrenees",
  "Greater Swiss Mountain Dog",
  "Greyhound",
  // H
  "Harrier",
  "Havanese",
  // I
  "Ibizan Hound",
  "Icelandic Sheepdog",
  "Irish Red and White Setter",
  "Irish Setter",
  "Irish Terrier",
  "Irish Water Spaniel",
  "Irish Wolfhound",
  "Italian Greyhound",
  // J
  "Jack Russell Terrier",
  "Japanese Chin",
  // K
  "Keeshond",
  "Kerry Blue Terrier",
  "Komondor",
  "Kuvasz",
  // L
  "Labradoodle",
  "Labrador Retriever",
  "Lagotto Romagnolo",
  "Lakeland Terrier",
  "Leonberger",
  "Lhasa Apso",
  "Lowchen",
  // M
  "Maltese",
  "Manchester Terrier",
  "Mastiff",
  "Miniature American Shepherd",
  "Miniature Bull Terrier",
  "Miniature Pinscher",
  "Miniature Schnauzer",
  // N
  "Neapolitan Mastiff",
  "Newfoundland",
  "Norfolk Terrier",
  "Norwegian Buhund",
  "Norwegian Elkhound",
  "Norwegian Lundehund",
  "Norwich Terrier",
  "Nova Scotia Duck Tolling Retriever",
  // O
  "Old English Sheepdog",
  "Otterhound",
  // P
  "Papillon",
  "Parson Russell Terrier",
  "Pekingese",
  "Pembroke Welsh Corgi",
  "Petit Basset Griffon Vendeen",
  "Pharaoh Hound",
  "Plott Hound",
  "Pointer",
  "Polish Lowland Sheepdog",
  "Pomeranian",
  "Poodle (Miniature)",
  "Poodle (Standard)",
  "Poodle (Toy)",
  "Portuguese Water Dog",
  "Pug",
  "Puli",
  "Pyrenean Shepherd",
  // R
  "Rat Terrier",
  "Redbone Coonhound",
  "Rhodesian Ridgeback",
  "Rottweiler",
  "Russell Terrier",
  // S
  "Saint Bernard",
  "Saluki",
  "Samoyed",
  "Schipperke",
  "Scottish Deerhound",
  "Scottish Terrier",
  "Sealyham Terrier",
  "Shetland Sheepdog",
  "Shiba Inu",
  "Shih Tzu",
  "Siberian Husky",
  "Silky Terrier",
  "Skye Terrier",
  "Sloughi",
  "Soft Coated Wheaten Terrier",
  "Spinone Italiano",
  "Staffordshire Bull Terrier",
  "Standard Schnauzer",
  "Sussex Spaniel",
  "Swedish Vallhund",
  // T
  "Tibetan Mastiff",
  "Tibetan Spaniel",
  "Tibetan Terrier",
  "Toy Fox Terrier",
  "Treeing Walker Coonhound",
  // V
  "Vizsla",
  // W
  "Weimaraner",
  "Welsh Springer Spaniel",
  "Welsh Terrier",
  "West Highland White Terrier",
  "Whippet",
  "Wirehaired Pointing Griffon",
  "Wirehaired Vizsla",
  // X
  "Xoloitzcuintli",
  // Y
  "Yorkshire Terrier",
];

const CAT_BREEDS = [
  // Top entries
  "Other / Mixed / Rescued",
  // A
  "Abyssinian",
  "American Bobtail",
  "American Curl",
  "American Shorthair",
  "American Wirehair",
  // B
  "Balinese",
  "Bengal",
  "Birman",
  "Bombay",
  "British Longhair",
  "British Shorthair",
  "Burmese",
  "Burmilla",
  // C
  "Chartreux",
  "Chausie",
  "Cornish Rex",
  "Cymric",
  // D
  "Devon Rex",
  "Domestic Longhair",
  "Domestic Medium Hair",
  "Domestic Shorthair",
  // E
  "Egyptian Mau",
  "European Burmese",
  "Exotic Shorthair",
  // H
  "Havana Brown",
  "Himalayan",
  // J
  "Japanese Bobtail",
  "Javanese",
  // K
  "Khao Manee",
  "Korat",
  // L
  "LaPerm",
  "Lykoi",
  // M
  "Maine Coon",
  "Manx",
  "Munchkin",
  // N
  "Nebelung",
  "Norwegian Forest Cat",
  // O
  "Ocicat",
  "Oriental Longhair",
  "Oriental Shorthair",
  // P
  "Persian",
  "Peterbald",
  "Pixie-Bob",
  // R
  "Ragamuffin",
  "Ragdoll",
  "Russian Blue",
  // S
  "Savannah",
  "Scottish Fold",
  "Selkirk Rex",
  "Siamese",
  "Siberian",
  "Singapura",
  "Snowshoe",
  "Somali",
  "Sphynx",
  // T
  "Tonkinese",
  "Toyger",
  "Turkish Angora",
  "Turkish Van",
  // Y
  "York Chocolate",
];

async function main() {
  console.log("Seeding breeds...");

  // Clear existing breeds
  await prisma.breed.deleteMany();

  let count = 0;

  // Seed dog breeds - "Other / Mixed / Rescued" first, then alphabetical
  for (let i = 0; i < DOG_BREEDS.length; i++) {
    const name = DOG_BREEDS[i];
    const sortKey = i === 0 ? "000" : name; // ensure first stays first
    await prisma.breed.create({
      data: {
        name,
        slug: `dog-${slug(name)}`,
        petType: "DOG",
        size: null,
        temperament: null,
        origin: null,
        description: null,
        lifespan: null,
        imageUrl: null,
      },
    });
    count++;
  }

  // Seed cat breeds - "Other / Mixed / Rescued" first, then alphabetical
  for (let i = 0; i < CAT_BREEDS.length; i++) {
    const name = CAT_BREEDS[i];
    await prisma.breed.create({
      data: {
        name,
        slug: `cat-${slug(name)}`,
        petType: "CAT",
        size: null,
        temperament: null,
        origin: null,
        description: null,
        lifespan: null,
        imageUrl: null,
      },
    });
    count++;
  }

  console.log(`✅ Seeded ${count} breeds (${DOG_BREEDS.length} dog, ${CAT_BREEDS.length} cat)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
