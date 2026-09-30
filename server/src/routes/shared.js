// ── PROGRESS ──────────────────────────────────────────────────────────────────
const progressRouter = require('express').Router();
const { z } = require('zod');
const prisma = require('../config/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');

// Progress/bookmarks/notes are per student profile, not per account — so a
// parent account with several children keeps each child's data separate.
function requireProfile(req, res, next) {
  if (req.user.role !== 'student' || !req.user.profileId) {
    return res.status(403).json({ error: { code: 'NO_PROFILE', message: 'This requires an active student profile.' } });
  }
  next();
}

progressRouter.patch('/:contentId', requireAuth, requireProfile, async (req, res, next) => {
  try {
    const { lastPageViewed, pagesViewed, pageCount } = z.object({
      lastPageViewed: z.number().int().min(1),
      pagesViewed: z.array(z.number().int()).default([]),
      pageCount: z.number().int().min(1),
    }).parse(req.body);

    const uniquePages = [...new Set(pagesViewed)];
    const percentComplete = Math.min(100, (uniquePages.length / pageCount) * 100);

    const progress = await prisma.progress.upsert({
      where: { profileId_contentId: { profileId: req.user.profileId, contentId: req.params.contentId } },
      create: { profileId: req.user.profileId, contentId: req.params.contentId, lastPageViewed, pagesViewed: uniquePages, percentComplete, lastAccessedAt: new Date() },
      update: { lastPageViewed, pagesViewed: uniquePages, percentComplete, lastAccessedAt: new Date() },
    });

    res.json({ progress });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION', message: err.errors[0].message } });
    next(err);
  }
});

// ── BOOKMARKS ─────────────────────────────────────────────────────────────────
const bookmarkRouter = require('express').Router();

bookmarkRouter.get('/', requireAuth, requireProfile, async (req, res, next) => {
  try {
    const bookmarks = await prisma.bookmark.findMany({
      where: { profileId: req.user.profileId },
      include: { content: { select: { id: true, title: true, category: true, difficulty: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ bookmarks });
  } catch (err) { next(err); }
});

bookmarkRouter.post('/', requireAuth, requireProfile, async (req, res, next) => {
  try {
    const { contentId } = z.object({ contentId: z.string().uuid() }).parse(req.body);
    const bookmark = await prisma.bookmark.create({ data: { profileId: req.user.profileId, contentId } });
    res.status(201).json({ bookmark });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION', message: err.errors[0].message } });
    next(err);
  }
});

bookmarkRouter.delete('/:id', requireAuth, requireProfile, async (req, res, next) => {
  try {
    await prisma.bookmark.deleteMany({ where: { id: req.params.id, profileId: req.user.profileId } });
    res.json({ message: 'Bookmark removed.' });
  } catch (err) { next(err); }
});

// ── NOTES ─────────────────────────────────────────────────────────────────────
const noteRouter = require('express').Router();

noteRouter.get('/:contentId', requireAuth, requireProfile, async (req, res, next) => {
  try {
    const note = await prisma.note.findUnique({
      where: { profileId_contentId: { profileId: req.user.profileId, contentId: req.params.contentId } }
    });
    res.json({ note: note || null });
  } catch (err) { next(err); }
});

noteRouter.put('/:contentId', requireAuth, requireProfile, async (req, res, next) => {
  try {
    const { body } = z.object({ body: z.string().max(10000) }).parse(req.body);
    const note = await prisma.note.upsert({
      where: { profileId_contentId: { profileId: req.user.profileId, contentId: req.params.contentId } },
      create: { profileId: req.user.profileId, contentId: req.params.contentId, body },
      update: { body },
    });
    res.json({ note });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION', message: err.errors[0].message } });
    next(err);
  }
});

// ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────────
const announcementRouter = require('express').Router();

announcementRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const announcements = await prisma.announcement.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ announcements });
  } catch (err) { next(err); }
});

announcementRouter.post('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { title, body } = z.object({ title: z.string().min(1).max(255), body: z.string().min(1) }).parse(req.body);
    const announcement = await prisma.announcement.create({ data: { title, body } });
    res.status(201).json({ announcement });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION', message: err.errors[0].message } });
    next(err);
  }
});

announcementRouter.patch('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const data = z.object({ title: z.string().min(1).max(255).optional(), body: z.string().min(1).optional() }).parse(req.body);
    const announcement = await prisma.announcement.update({ where: { id: req.params.id }, data });
    res.json({ announcement });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION', message: err.errors[0].message } });
    next(err);
  }
});

announcementRouter.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    await prisma.announcement.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    res.json({ message: 'Announcement deleted.' });
  } catch (err) { next(err); }
});

module.exports = { progressRouter, bookmarkRouter, noteRouter, announcementRouter };
