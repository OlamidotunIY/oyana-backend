import { PrismaClient } from "@prisma/client";


const prisma = new PrismaClient();

/**
 * Seed roles
 */
async function seedRoles() {
  console.log('📝 Seeding roles...');

  const roles = [
    { key: 'admin', name: 'Admin' },
    { key: 'provider', name: 'Provider' },
    { key: 'user', name: 'User' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { key: role.key },
      update: {},
      create: role,
    });
    console.log(`  ✅ Role "${role.name}" seeded`);
  }
}

/**
 * Seed permissions
 * Uncomment and modify when you're ready to seed permissions
 */
async function seedPermissions() {
  console.log('📝 Seeding permissions...');

  // Example permissions structure
  // const permissions = [
  //   { key: 'manage_users', name: 'Manage Users', description: 'Can create, edit, and delete users' },
  //   { key: 'manage_deliveries', name: 'Manage Deliveries', description: 'Can manage all deliveries' },
  //   { key: 'view_analytics', name: 'View Analytics', description: 'Can view analytics dashboard' },
  // ];

  // for (const permission of permissions) {
  //   await prisma.permission.upsert({
  //     where: { key: permission.key },
  //     update: {},
  //     create: permission,
  //   });
  //   console.log(`  ✅ Permission "${permission.name}" seeded`);
  // }
}

/**
 * Main seed function
 */
async function main() {
  console.log('🌱 Starting database seed...\n');

  await seedRoles();
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
