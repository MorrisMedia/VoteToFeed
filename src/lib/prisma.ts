import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Only instantiate if DATABASE_URL is present
const createPrismaClient = () => {
  if (!process.env.DATABASE_URL) {
    console.warn(
      "⚠️ DATABASE_URL not set. Prisma client will not be initialized. " +
      "Set DATABASE_URL in environment variables to enable database functionality."
    );
    return null;
  }
  
  return new PrismaClient();
};

export const prisma = (globalForPrisma.prisma ?? createPrismaClient()) as PrismaClient | null;

if (process.env.NODE_ENV !== "production" && prisma) {
  globalForPrisma.prisma = prisma;
}

export default prisma;
