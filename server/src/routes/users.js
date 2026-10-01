const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');

const CLASS_LEVEL_ENUM = z.enum(['kg', 'class_1', 'class_2', 'class_3', 'class_4', 'class_5', 'class_6', 'class_7', 'class_8']);

function canManageAccount(req, accountId) {
  return req.user.role === 'admin' || req.user.id === accountId;
}

// Passwords are only ever stored as a one-way bcrypt hash — nobody, including
// an admin with full database access, can "look up" an existing password.
// What an admin CAN do is set a new one. This generates a secure, easy-to-read
// one (no visually ambiguous characters like 0/O or 1/l/I, since these often
// go to kids) when the admin doesn't want to type one themselves.
function generateReadablePassword(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(length);
  let pw = '';
  for (let i = 0; i < length; i++) pw += chars[bytes[i] % chars.length];
  return pw;
}

// ── GET /users — admin only ───────────────────────────────────────────────────
router.get('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { role, cursor, limit = 20 } = req.query;
    const where = { deletedAt: null };
    if (role) where.role = role;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, role: true, fullName: true, email: true, status: true, createdAt: true, lastLoginAt: true, parentPhone: true,
        studentProfiles: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' }, select: { id: true, fullName: true, age: true, classLevel: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    // Keep the response shape close to before (profiles is additive), and map
    // studentProfiles -> profiles for a clearer name on the wire.
    res.json({ users: users.map(({ studentProfiles, ...u }) => ({ ...u, profiles: studentProfiles })) });
  } catch (err) { next(err); }
});

// ── POST /users — admin creates teacher, student, or admin ────────────────────
router.post('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const data = z.object({
      role: z.enum(['teacher', 'student', 'admin']),
      fullName: z.string().min(2).max(255),
      email: z.string().email(),
      password: z.string().min(8),
      age: z.number().int().optional(),
      parentPhone: z.string().optional(),
      classLevel: CLASS_LEVEL_ENUM.optional(),
    }).parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) return res.status(409).json({ error: { code: 'EMAIL_TAKEN', message: 'Email already in use.' } });

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.$transaction(async tx => {
      const user = await tx.user.create({
        data: {
          role: data.role,
          fullName: data.fullName,
          email: data.email.toLowerCase(),
          passwordHash,
          parentPhone: data.role === 'student' ? data.parentPhone : undefined,
        }
      });
      if (data.role === 'student') {
        await tx.studentProfile.create({
          data: { accountId: user.id, fullName: data.fullName, age: data.age, classLevel: data.classLevel }
        });
      }
      return user;
    });

    const profiles = data.role === 'student'
      ? await prisma.studentProfile.findMany({ where: { accountId: user.id }, select: { id: true, fullName: true, age: true, classLevel: true } })
      : undefined;

    res.status(201).json({ user: { id: user.id, role: user.role, fullName: user.fullName, email: user.email, createdAt: user.createdAt, profiles } });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION', message: err.errors[0].message } });
    next(err);
  }
});

// ── GET /users/:id ────────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!canManageAccount(req, req.params.id)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied.' } });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.params.id, deletedAt: null },
      select: {
        id: true, role: true, fullName: true, email: true, status: true, parentPhone: true, createdAt: true, lastLoginAt: true,
        studentProfiles: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' }, select: { id: true, fullName: true, age: true, classLevel: true } },
      }
    });
    if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found.' } });

    const { studentProfiles, ...rest } = user;
    res.json({ user: { ...rest, profiles: studentProfiles } });
  } catch (err) { next(err); }
});

// ── PATCH /users/:id — account-level fields only (name, contact, status) ───────
// Per-child fields (age, classLevel) live on profiles now — see the
// /:id/profiles endpoints below.
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!canManageAccount(req, req.params.id)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied.' } });
    }

    const data = z.object({
      fullName: z.string().min(2).max(255).optional(),
      parentPhone: z.union([z.string(), z.null()]).optional()
        .transform(v => (v === null ? undefined : v)),
      status: z.enum(['active', 'suspended']).optional(),
    }).parse(req.body);

    // Only admin can change status
    if (data.status && req.user.role !== 'admin') delete data.status;
    // Strip undefined keys so they aren't sent to Prisma at all
    Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, role: true, fullName: true, email: true, status: true, parentPhone: true }
    });

    res.json({ user });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION', message: err.errors[0].message } });
    next(err);
  }
});

// ── GET /users/:id/profiles — list a student account's child profiles ─────────
router.get('/:id/profiles', requireAuth, async (req, res, next) => {
  try {
    if (!canManageAccount(req, req.params.id)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied.' } });
    }
    const profiles = await prisma.studentProfile.findMany({
      where: { accountId: req.params.id, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ profiles });
  } catch (err) { next(err); }
});

// ── POST /users/:id/profiles — add a sibling profile (self or admin) ──────────
router.post('/:id/profiles', requireAuth, async (req, res, next) => {
  try {
    if (!canManageAccount(req, req.params.id)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied.' } });
    }
    const account = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!account || account.role !== 'student') {
      return res.status(400).json({ error: { code: 'INVALID', message: 'Profiles can only be added to a student account.' } });
    }

    const data = z.object({
      fullName: z.string().min(2).max(255),
      age: z.number().int().min(1).max(120).optional(),
      classLevel: CLASS_LEVEL_ENUM.optional(),
    }).parse(req.body);

    const profile = await prisma.studentProfile.create({
      data: { accountId: req.params.id, fullName: data.fullName, age: data.age, classLevel: data.classLevel }
    });

    res.status(201).json({ profile });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION', message: err.errors[0].message } });
    next(err);
  }
});

// ── PATCH /users/:id/profiles/:profileId — edit a child profile ───────────────
router.patch('/:id/profiles/:profileId', requireAuth, async (req, res, next) => {
  try {
    if (!canManageAccount(req, req.params.id)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied.' } });
    }

    const data = z.object({
      fullName: z.string().min(2).max(255).optional(),
      age: z.union([z.number().int().min(1).max(120), z.literal(''), z.null()]).optional()
        .transform(v => (v === '' || v === null ? undefined : v)),
      classLevel: z.union([CLASS_LEVEL_ENUM, z.literal(''), z.null()]).optional()
        .transform(v => (v === '' || v === null ? null : v)),
    }).parse(req.body);
    Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);

    const profile = await prisma.studentProfile.update({
      where: { id: req.params.profileId, accountId: req.params.id },
      data,
    });

    res.json({ profile });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION', message: err.errors[0].message } });
    if (err.code === 'P2025') return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Profile not found.' } });
    next(err);
  }
});

// ── DELETE /users/:id/profiles/:profileId — admin only (removes a child) ──────
router.delete('/:id/profiles/:profileId', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const remaining = await prisma.studentProfile.count({ where: { accountId: req.params.id, deletedAt: null } });
    if (remaining <= 1) {
      return res.status(400).json({ error: { code: 'LAST_PROFILE', message: 'Cannot remove the only profile on this account — delete the account instead.' } });
    }
    await prisma.studentProfile.update({ where: { id: req.params.profileId, accountId: req.params.id }, data: { deletedAt: new Date() } });
    res.json({ message: 'Profile removed.' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Profile not found.' } });
    next(err);
  }
});

// ── DELETE /users/:id — admin only ────────────────────────────────────────────
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: { code: 'CANNOT_DELETE_SELF', message: 'You cannot delete your own account.' } });
    }

    const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { role: true } });
    if (!target) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found.' } });

    // Transfer content to admin if teacher
    if (target.role === 'teacher') {
      const admin = await prisma.user.findFirst({ where: { role: 'admin', id: req.user.id } });
      await prisma.content.updateMany({ where: { uploadedById: req.params.id }, data: { uploadedById: admin.id } });
    }

    await prisma.user.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    res.json({ message: 'User deleted successfully.' });
  } catch (err) { next(err); }
});

// ── GET /users/:id/students — teacher or admin. :id is the teacher's account ───
// id; the returned "students" are StudentProfile rows (one per child), each
// carrying the parent account's email/status/lastLoginAt for display.
router.get('/:id/students', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role === 'student') return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied.' } });
    if (req.user.role === 'teacher' && req.user.id !== req.params.id) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied.' } });
    }

    const relations = await prisma.teacherStudent.findMany({
      where: { teacherId: req.params.id },
      include: {
        student: {
          select: {
            id: true, fullName: true, age: true, classLevel: true,
            account: { select: { email: true, status: true, lastLoginAt: true } },
          }
        }
      }
    });

    res.json({
      students: relations.map(r => ({
        id: r.student.id,
        fullName: r.student.fullName,
        age: r.student.age,
        classLevel: r.student.classLevel,
        email: r.student.account.email,
        status: r.student.account.status,
        lastLoginAt: r.student.account.lastLoginAt,
      }))
    });
  } catch (err) { next(err); }
});

// ── POST /users/:id/students — assign a student profile to teacher ────────────
// Body's studentId is a StudentProfile id (a specific child), not an account id.
router.post('/:id/students', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role === 'student') return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied.' } });

    const { studentId } = z.object({ studentId: z.string().uuid() }).parse(req.body);

    await prisma.teacherStudent.create({ data: { teacherId: req.params.id, studentId } });
    res.status(201).json({ message: 'Student assigned to teacher.' });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION', message: err.errors[0].message } });
    next(err);
  }
});

// ── DELETE /users/:id/students/:sid — :sid is a StudentProfile id ─────────────
router.delete('/:id/students/:sid', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role === 'student') return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied.' } });
    await prisma.teacherStudent.deleteMany({ where: { teacherId: req.params.id, studentId: req.params.sid } });
    res.json({ message: 'Student removed from teacher.' });
  } catch (err) { next(err); }
});

// ── GET /users/:id/progress — :id is a StudentProfile id ──────────────────────
router.get('/:id/progress', requireAuth, async (req, res, next) => {
  try {
    // Admin can see anyone, teacher only their assigned students, student only their own active profile
    if (req.user.role === 'student' && req.user.profileId !== req.params.id) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied.' } });
    }
    if (req.user.role === 'teacher') {
      const relation = await prisma.teacherStudent.findFirst({ where: { teacherId: req.user.id, studentId: req.params.id } });
      if (!relation) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'This student is not assigned to you.' } });
    }

    const progress = await prisma.progress.findMany({
      where: { profileId: req.params.id },
      include: { content: { select: { id: true, title: true, category: true, pageCount: true } } },
      orderBy: { lastAccessedAt: 'desc' }
    });

    res.json({ progress });
  } catch (err) { next(err); }
});

module.exports = router;

// ── POST /users/:id/reset-password — admin resets any user's password ─────────
router.post('/:id/reset-password', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { newPassword } = z.object({ newPassword: z.string().min(8).optional() }).parse(req.body);

    // Admin can either type a specific password, or leave it blank to have
    // one generated. Either way the plaintext is hashed immediately and only
    // ever returned once, right here — it is never stored or logged anywhere.
    const plainPassword = newPassword || generateReadablePassword();
    const passwordHash = await bcrypt.hash(plainPassword, 12);
    await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash } });
    // Invalidate all sessions for this user
    await prisma.refreshToken.deleteMany({ where: { userId: req.params.id } });

    res.json({
      message: 'Password reset successfully.',
      // Only echoed back when the server generated it — a password the admin
      // typed themselves is already known to them.
      ...(!newPassword && { generatedPassword: plainPassword }),
    });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION', message: err.errors[0].message } });
    next(err);
  }
});

// ── POST /users/:id/transfer — transfer teacher's students and content ─────────
router.post('/:id/transfer', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { toTeacherId } = z.object({ toTeacherId: z.string().uuid() }).parse(req.body);

    const fromTeacher = await prisma.user.findUnique({ where: { id: req.params.id, role: 'teacher' } });
    if (!fromTeacher) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Teacher not found.' } });

    const toTeacher = await prisma.user.findUnique({ where: { id: toTeacherId, role: 'teacher' } });
    if (!toTeacher) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Target teacher not found.' } });

    await prisma.$transaction([
      // Transfer all content
      prisma.content.updateMany({
        where: { uploadedById: req.params.id },
        data: { uploadedById: toTeacherId }
      }),
      // Transfer all student assignments
      prisma.teacherStudent.updateMany({
        where: { teacherId: req.params.id },
        data: { teacherId: toTeacherId }
      }),
    ]);

    res.json({ message: `All students and content transferred from ${fromTeacher.fullName} to ${toTeacher.fullName}.` });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION', message: err.errors[0].message } });
    next(err);
  }
});
