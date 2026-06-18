const router = require('express').Router();
const { z } = require('zod');
const prisma = require('../config/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');

// ── GET /quizzes ───────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const where = { deletedAt: null };
    if (req.user.role === 'teacher') where.createdById = req.user.id;
    if (req.user.role === 'student') {
      const assignments = await prisma.contentAssignment.findMany({ where: { studentId: req.user.id }, select: { contentId: true } });
      where.contentId = { in: assignments.map(a => a.contentId) };
    }

    const quizzes = await prisma.quiz.findMany({
      where,
      include: {
        content: { select: { id: true, title: true } },
        createdBy: { select: { id: true, fullName: true } },
        _count: { select: { questions: true, attempts: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ quizzes });
  } catch (err) { next(err); }
});

// ── POST /quizzes ──────────────────────────────────────────────────────────────
router.post('/', requireAuth, requireRole('admin', 'teacher'), async (req, res, next) => {
  try {
    const data = z.object({
      contentId: z.string().uuid(),
      title: z.string().min(1).max(255),
      questions: z.array(z.object({
        type: z.enum(['multiple_choice', 'true_false', 'flashcard']),
        questionText: z.string().min(1),
        options: z.any().optional(),
        correctAnswer: z.string().min(1),
        orderIndex: z.number().int().min(0),
      })).min(1),
    }).parse(req.body);

    const quiz = await prisma.quiz.create({
      data: {
        contentId: data.contentId,
        createdById: req.user.id,
        title: data.title,
        questions: { create: data.questions }
      },
      include: { questions: true, _count: { select: { questions: true } } }
    });

    res.status(201).json({ quiz });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION', message: err.errors[0].message } });
    next(err);
  }
});

// ── GET /quizzes/:id ───────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: req.params.id, deletedAt: null },
      include: { questions: { orderBy: { orderIndex: 'asc' } }, content: { select: { id: true, title: true } } }
    });
    if (!quiz) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Quiz not found.' } });
    res.json({ quiz });
  } catch (err) { next(err); }
});

// ── POST /quizzes/:id/attempt — student submits answers ───────────────────────
router.post('/:id/attempt', requireAuth, requireRole('student'), async (req, res, next) => {
  try {
    const { answers } = z.object({ answers: z.record(z.string()) }).parse(req.body);

    const quiz = await prisma.quiz.findUnique({
      where: { id: req.params.id },
      include: { questions: true }
    });
    if (!quiz) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Quiz not found.' } });

    // Calculate score
    let correct = 0;
    quiz.questions.forEach(q => {
      if (answers[q.id] && answers[q.id].toLowerCase().trim() === q.correctAnswer.toLowerCase().trim()) correct++;
    });
    const score = quiz.questions.length > 0 ? (correct / quiz.questions.length) * 100 : 0;

    const attempt = await prisma.quizAttempt.create({
      data: { quizId: quiz.id, userId: req.user.id, answers, score }
    });

    res.status(201).json({ attempt: { id: attempt.id, score, correct, total: quiz.questions.length } });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION', message: err.errors[0].message } });
    next(err);
  }
});

// ── GET /quizzes/:id/results ───────────────────────────────────────────────────
router.get('/:id/results', requireAuth, requireRole('admin', 'teacher'), async (req, res, next) => {
  try {
    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId: req.params.id },
      include: { user: { select: { id: true, fullName: true, email: true } } },
      orderBy: { completedAt: 'desc' }
    });
    res.json({ attempts });
  } catch (err) { next(err); }
});

// ── DELETE /quizzes/:id ────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, requireRole('admin', 'teacher'), async (req, res, next) => {
  try {
    await prisma.quiz.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    res.json({ message: 'Quiz deleted.' });
  } catch (err) { next(err); }
});

module.exports = router;
