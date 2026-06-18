const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');

// ── GET /users — admin only ───────────────────────────────────────────────────
router.get('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { role, cursor, limit = 20 } = req.query;
    const where = { deletedAt: null };
    if (role) where.role = role;

    const users = await prisma.user.findMany({
      where,
      select: { id: true, role: true, fullName: true, email: true, status: true, createdAt: true, lastLoginAt: true, age: true, parentPhone: true },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    res.json({ users });
  } catch (err) { next(err); }
});

// ── POST /users — admin creates teacher or student ────────────────────────────
router.post('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const data = z.object({
      role: z.enum(['teacher', 'student']),
      fullName: z.string().min(2).max(255),
      email: z.string().email(),
      password: z.string().min(8),
      age: z.number().int().optional(),
      parentPhone: z.string().optional(),
    }).parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) return res.status(409).json({ error: { code: 'EMAIL_TAKEN', message: 'Email already in use.' } });

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: { ...data, email: data.email.toLowerCase(), passwordHash, password: undefined },
      select: { id: true, role: true, fullName: true, email: true, createdAt: true }
    });

    res.status(201).json({ user });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION', message: err.errors[0].message } });
    next(err);
  }
});

// ── GET /users/:id ────────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied.' } });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.params.id, deletedAt: null },
      select: { id: true, role: true, fullName: true, email: true, status: true, age: true, parentPhone: true, createdAt: true, lastLoginAt: true }
    });
    if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found.' } });

    res.json({ user });
  } catch (err) { next(err); }
});

// ── PATCH /users/:id ──────────────────────────────────────────────────────────
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied.' } });
    }

    const data = z.object({
      fullName: z.string().min(2).max(255).optional(),
      age: z.number().int().optional(),
      parentPhone: z.string().optional(),
      status: z.enum(['active', 'suspended']).optional(),
    }).parse(req.body);

    // Only admin can change status
    if (data.status && req.user.role !== 'admin') delete data.status;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, role: true, fullName: true, email: true, status: true }
    });

    res.json({ user });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION', message: err.errors[0].message } });
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

// ── GET /users/:id/students — teacher or admin ────────────────────────────────
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
          select: { id: true, fullName: true, email: true, age: true, status: true, lastLoginAt: true }
        }
      }
    });

    res.json({ students: relations.map(r => r.student) });
  } catch (err) { next(err); }
});

// ── POST /users/:id/students — assign student to teacher ──────────────────────
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

// ── DELETE /users/:id/students/:sid ───────────────────────────────────────────
router.delete('/:id/students/:sid', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role === 'student') return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied.' } });
    await prisma.teacherStudent.deleteMany({ where: { teacherId: req.params.id, studentId: req.params.sid } });
    res.json({ message: 'Student removed from teacher.' });
  } catch (err) { next(err); }
});

// ── GET /users/:id/progress — teacher sees their student's progress ────────────
router.get('/:id/progress', requireAuth, async (req, res, next) => {
  try {
    // Admin can see anyone, teacher only their students, student only self
    if (req.user.role === 'student' && req.user.id !== req.params.id) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied.' } });
    }
    if (req.user.role === 'teacher') {
      const relation = await prisma.teacherStudent.findFirst({ where: { teacherId: req.user.id, studentId: req.params.id } });
      if (!relation) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'This student is not assigned to you.' } });
    }

    const progress = await prisma.progress.findMany({
      where: { userId: req.params.id },
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
    const { newPassword } = z.object({ newPassword: z.string().min(8) }).parse(req.body);
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash } });
    // Invalidate all sessions for this user
    await prisma.refreshToken.deleteMany({ where: { userId: req.params.id } });
    res.json({ message: 'Password reset successfully.' });
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
