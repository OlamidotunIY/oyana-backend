import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Load environment variables
config();

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DIRECT_URL!,
  }),
});

/**
 * Seed application data
 */
async function seedApplicationData() {
  console.log('No default seed records are configured.');
}

/**
 * Main seed function
 */
async function main() {
  console.log('🌱 Starting database seed...\n');
  await seedApplicationData();
  // await seedPermissions(); // Uncomment when ready

  console.log('\n✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
