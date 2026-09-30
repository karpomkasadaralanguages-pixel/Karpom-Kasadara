// One-time migration: introduces StudentProfile (multi-child-per-login support).
//
// RUN ORDER MATTERS:
//   1. Pull the new code and rebuild the container (new schema.prisma included).
//   2. Run THIS script:  docker compose exec api node scripts/migrate-student-profiles.js
//   3. THEN run:         docker compose exec api npx prisma db push
//
// Running this before `prisma db push` avoids any "data loss" prompts — it
// manually renames the old user_id columns to profile_id, creates the new
// student_profiles table, and seeds one profile per existing student account,
// reusing the account's own id as that first profile's id. Because of that,
// every existing content_assignments / teacher_students / progress /
// bookmarks / notes / quiz_attempts row keeps pointing at a valid id with no
// rewriting needed — `prisma db push` afterwards just adjusts the foreign key
// targets, which validate immediately since the same ids already exist in the
// new student_profiles table.
//
// Safe to re-run — every step checks before acting.

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function columnExists(table, column) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
    table, column
  );
  return rows.length > 0;
}

async function tableExists(table) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT 1 FROM information_schema.tables WHERE table_name = $1`,
    table
  );
  return rows.length > 0;
}

async function main() {
  console.log('Starting student-profile migration...\n');

  // 1. Rename user_id -> profile_id on the per-student tables, if not already done.
  for (const table of ['progress', 'bookmarks', 'notes', 'quiz_attempts']) {
    const hasOld = await columnExists(table, 'user_id');
    const hasNew = await columnExists(table, 'profile_id');
    if (hasOld && !hasNew) {
      console.log(`Renaming ${table}.user_id -> ${table}.profile_id`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" RENAME COLUMN "user_id" TO "profile_id"`);
    } else {
      console.log(`${table}: already migrated (or no such column), skipping rename.`);
    }
  }

  // 2. Create student_profiles table if it doesn't exist yet.
  const hasProfilesTable = await tableExists('student_profiles');
  if (!hasProfilesTable) {
    console.log('\nCreating student_profiles table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "student_profiles" (
        "id" TEXT NOT NULL,
        "account_id" TEXT NOT NULL,
        "full_name" TEXT NOT NULL,
        "age" INTEGER,
        "class_level" "ClassLevel",
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP(3),
        CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
      );
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_account_id_fkey"
      FOREIGN KEY ("account_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `);
  } else {
    console.log('\nstudent_profiles table already exists, skipping creation.');
  }

  // 3. Seed one profile per existing student account, reusing the account's
  //    own id as the profile id.
  const students = await prisma.$queryRawUnsafe(`
    SELECT id, full_name, age, class_level, created_at FROM "users"
    WHERE role = 'student' AND deleted_at IS NULL
  `);

  let seeded = 0;
  for (const s of students) {
    const existing = await prisma.$queryRawUnsafe(
      `SELECT 1 FROM "student_profiles" WHERE "id" = $1`, s.id
    );
    if (existing.length > 0) continue;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "student_profiles" ("id", "account_id", "full_name", "age", "class_level", "created_at")
       VALUES ($1, $2, $3, $4, $5, $6)`,
      s.id, s.id, s.full_name, s.age, s.class_level, s.created_at
    );
    seeded++;
  }

  console.log(`\nSeeded ${seeded} new student profile(s) (${students.length} existing student account(s) total).`);
  console.log('\nMigration complete. Now run: npx prisma db push');
}

main()
  .catch(e => { console.error('\nMigration failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
