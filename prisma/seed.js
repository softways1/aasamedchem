import { db } from '../src/lib/db.js';
import { hashPassword } from '../src/lib/auth.js';

async function seed() {
  console.log('--- Database Seeding Started ---');

  // 1. Create Admin User
  const adminPasswordHash = await hashPassword('admin123');

  const admin = await db.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: adminPasswordHash },
    create: {
      username: 'admin',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      name: 'ASSAMEDCHEM Admin Panel'
    }
  });
  console.log(`✓ Admin user seeded: ${admin.username}`);

  console.log('--- Database Seeding Completed Successfully ---');
}

seed()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
