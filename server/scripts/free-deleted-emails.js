// One-time: free the emails of already soft-deleted users so they can be reused.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const users = await prisma.user.findMany({ where: { deletedAt: { not: null } }, select: { id: true, email: true } });
  let n = 0;
  for (const u of users) {
    if (u.email.startsWith('deleted-')) continue;
    await prisma.user.update({ where: { id: u.id }, data: { email: `deleted-${u.id}__${u.email}` } });
    n++;
  }
  console.log(`Freed ${n} email(s).`);
})().finally(() => prisma.$disconnect());
