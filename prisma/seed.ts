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
 * Seed profiles for existing Supabase users
 */
async function seedProfilesForExistingUsers() {
  console.log('📝 Seeding profiles for existing Supabase users...');

  // Query existing Supabase auth users
  const authUsers = await prisma.$queryRaw<
    Array<{ id: string; email: string; created_at: Date }>
  >`SELECT id, email, created_at FROM auth.users ORDER BY created_at ASC`;

  console.log(`  Found ${authUsers.length} existing auth users`);

  for (const authUser of authUsers) {
    // Check if profile already exists
    const existingProfile = await prisma.profile.findUnique({
      where: { id: authUser.id },
    });

    if (existingProfile) {
      console.log(`  ⏭️  Profile already exists for ${authUser.email}`);
      continue;
    }

    // Extract first name from email (before @)
    const emailUsername = authUser.email.split('@')[0];
    const firstName =
      emailUsername.charAt(0).toUpperCase() + emailUsername.slice(1);

    // Create profile with default values
    await prisma.profile.create({
      data: {
        id: authUser.id,
        email: authUser.email,
        userType: 'individual', // Default to individual
        firstName: firstName,
        lastName: 'User', // Default last name
        state: 'Lagos', // Default state
      },
    });

    console.log(`  ✅ Profile created for ${authUser.email}`);
  }
}

/**
 * Main seed function
 */
async function main() {
  console.log('🌱 Starting database seed...\n');
  await seedProfilesForExistingUsers();
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
