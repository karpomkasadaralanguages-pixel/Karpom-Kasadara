const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { requireAuth } = require('../middleware/auth');
const { sendInviteEmail, sendPasswordResetEmail } = require('../services/email');

// ── RATE LIMITERS ─────────────────────────────────────────────────────────────
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5,
  message: { error: { code: 'RATE_LIMIT', message: 'Too many login attempts. Try again in 15 minutes.' } } });
const resetLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 3,
  message: { error: { code: 'RATE_LIMIT', message: 'Too many reset requests. Try again in an hour.' } } });

// ── TOKEN HELPERS ─────────────────────────────────────────────────────────────
function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

async function generateRefreshToken(userId) {
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await prisma.refreshToken.create({ data: { userId, token, expiresAt } });
  return token;
}

// ── POST /login ───────────────────────────────────────────────────────────────
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase(), deletedAt: null } });
    if (!user) return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });
    if (user.status === 'suspended') return res.status(403).json({ error: { code: 'SUSPENDED', message: 'Account suspended.' } });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user.id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      accessToken,
      user: { id: user.id, role: user.role, fullName: user.fullName, email: user.email }
    });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION', message: err.errors[0].message } });
    next(err);
  }
});

// ── POST /refresh ─────────────────────────────────────────────────────────────
router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ error: { code: 'NO_REFRESH_TOKEN', message: 'No refresh token.' } });

    const stored = await prisma.refreshToken.findUnique({ where: { token }, include: { user: true } });
    if (!stored || stored.expiresAt < new Date()) {
      return res.status(401).json({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid or expired refresh token.' } });
    }

    // Rotate token
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    const newRefreshToken = await generateRefreshToken(stored.userId);
    const accessToken = generateAccessToken(stored.user);

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken });
  } catch (err) { next(err); }
});

// ── POST /logout ──────────────────────────────────────────────────────────────
router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) await prisma.refreshToken.deleteMany({ where: { token } });
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully.' });
  } catch (err) { next(err); }
});

// ── POST /register (student self-registration) ────────────────────────────────
router.post('/register', async (req, res, next) => {
  try {
    const data = z.object({
      fullName: z.string().min(2).max(255),
      email: z.string().email(),
      password: z.string().min(8),
      age: z.number().int().min(1).max(120),
      parentPhone: z.string().min(7).max(30),
    }).parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) return res.status(409).json({ error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists.' } });

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        role: 'student',
        fullName: data.fullName,
        email: data.email.toLowerCase(),
        passwordHash,
        age: data.age,
        parentPhone: data.parentPhone,
      }
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user.id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      accessToken,
      user: { id: user.id, role: user.role, fullName: user.fullName, email: user.email }
    });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION', message: err.errors[0].message } });
    next(err);
  }
});

// ── POST /invite ──────────────────────────────────────────────────────────────
router.post('/invite', requireAuth, async (req, res, next) => {
  try {
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only admins and teachers can send invites.' } });
    }

    const { email, fullName } = z.object({
      email: z.string().email(),
      fullName: z.string().min(2).max(255),
    }).parse(req.body);

    const token = uuidv4();
    const inviteUrl = `${process.env.APP_URL}/register?invite=${token}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(fullName)}`;

    await sendInviteEmail({ to: email, fullName, inviteUrl, invitedByName: req.user.fullName });

    res.json({ message: `Invite sent to ${email}` });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION', message: err.errors[0].message } });
    next(err);
  }
});

// ── POST /forgot-password ─────────────────────────────────────────────────────
router.post('/forgot-password', resetLimiter, async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase(), deletedAt: null } });
    // Always return success to prevent email enumeration
    if (!user) return res.json({ message: 'If an account exists, a reset email has been sent.' });

    const token = uuidv4();
    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordReset.create({ data: { userId: user.id, tokenHash, expiresAt } });

    const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}&userId=${user.id}`;
    await sendPasswordResetEmail({ to: user.email, fullName: user.fullName, resetUrl });

    res.json({ message: 'If an account exists, a reset email has been sent.' });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION', message: err.errors[0].message } });
    next(err);
  }
});

// ── POST /reset-password ──────────────────────────────────────────────────────
router.post('/reset-password', async (req, res, next) => {
  try {
    const { userId, token, newPassword } = z.object({
      userId: z.string().uuid(),
      token: z.string(),
      newPassword: z.string().min(8),
    }).parse(req.body);

    const resets = await prisma.passwordReset.findMany({
      where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    let validReset = null;
    for (const reset of resets) {
      if (await bcrypt.compare(token, reset.tokenHash)) { validReset = reset; break; }
    }

    if (!validReset) return res.status(400).json({ error: { code: 'INVALID_RESET_TOKEN', message: 'Invalid or expired reset link.' } });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      prisma.passwordReset.update({ where: { id: validReset.id }, data: { usedAt: new Date() } }),
      prisma.refreshToken.deleteMany({ where: { userId } }),
    ]);

    res.json({ message: 'Password reset successfully. Please log in.' });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION', message: err.errors[0].message } });
    next(err);
  }
});

module.exports = router;
