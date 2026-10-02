const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');
const { sendInquiryNotificationEmail } = require('../services/email');

const inquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMIT', message: 'Too many submissions. Please try again later.' } }
});

// ── POST /inquiries — public, no auth required ────────────────────────────────
router.post('/', inquiryLimiter, async (req, res, next) => {
  try {
    const data = z.object({
      name: z.string().min(1).max(255),
      email: z.string().email(),
      phone: z.string().max(30).optional(),
      message: z.string().min(1).max(5000),
    }).parse(req.body);

    const inquiry = await prisma.inquiry.create({ data });

    // Email failure should not block the user's submission from succeeding
    try {
      await sendInquiryNotificationEmail(inquiry);
    } catch (emailErr) {
      console.error('Failed to send inquiry notification email:', emailErr.message);
    }

    res.status(201).json({ message: 'Thank you — we will get back to you soon.' });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION', message: err.errors[0].message } });
    next(err);
  }
});

// ── GET /inquiries — admin only ────────────────────────────────────────────────
router.get('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const inquiries = await prisma.inquiry.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ inquiries });
  } catch (err) { next(err); }
});

// ── GET /inquiries/unread-count — admin only, for the sidebar/dashboard badge ──
router.get('/unread-count', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const count = await prisma.inquiry.count({ where: { isRead: false } });
    res.json({ count });
  } catch (err) { next(err); }
});

// ── PATCH /inquiries/:id — mark read/unread (admin only) ──────────────────────
router.patch('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { isRead } = z.object({ isRead: z.boolean() }).parse(req.body);
    const inquiry = await prisma.inquiry.update({ where: { id: req.params.id }, data: { isRead } });
    res.json({ inquiry });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION', message: err.errors[0].message } });
    next(err);
  }
});

// ── DELETE /inquiries/:id — admin only ─────────────────────────────────────────
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    await prisma.inquiry.delete({ where: { id: req.params.id } });
    res.json({ message: 'Inquiry deleted.' });
  } catch (err) { next(err); }
});

module.exports = router;
