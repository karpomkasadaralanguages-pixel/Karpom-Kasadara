require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding database...');

  const admins = [
    { fullName: 'Anto', email: 'anto.libin@gmail.com', password: process.env.ADMIN_PASSWORD || 'ChangeMe123!' },
    { fullName: 'Udhaya', email: 'karpomkasadaralanguages@gmail.com', password: process.env.ADMIN2_PASSWORD || 'ChangeMe456!' },
  ];

  for (const admin of admins) {
    const existing = await prisma.user.findUnique({ where: { email: admin.email } });
    if (existing) {
      console.log(`Admin ${admin.email} already exists — skipping.`);
      continue;
    }
    const passwordHash = await bcrypt.hash(admin.password, 12);
    await prisma.user.create({
      data: { role: 'admin', fullName: admin.fullName, email: admin.email, passwordHash }
    });
    console.log(`Created admin: ${admin.fullName} (${admin.email})`);
  }

  console.log('Seed complete.');
  console.log('');
  console.log('IMPORTANT: Change admin passwords after first login!');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
