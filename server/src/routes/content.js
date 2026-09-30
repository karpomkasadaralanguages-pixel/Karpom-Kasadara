const router = require('express').Router();
const multer = require('multer');
const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/prisma');
const { requireAuth, requireRole, requireContentOwnership, requireAssignment } = require('../middleware/auth');
const { uploadFile, getSignedDownloadUrl } = require('../config/storage');
const { convertAndStore } = require('../services/converter');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only PDF and PowerPoint files are allowed.'));
  }
});

// ── GET /content — list content visible to user ───────────────────────────────
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { category, difficulty, classLevel, contentType, sort = 'recent', cursor, limit = 20 } = req.query;
    const where = { deletedAt: null, status: 'ready' };

    if (req.user.role === 'student') {
      const assignments = await prisma.contentAssignment.findMany({ where: { studentId: req.user.id }, select: { contentId: true } });
      where.id = { in: assignments.map(a => a.contentId) };
      // Teaching guides are never visible to students, even if directly assigned
      where.contentType = { not: 'teaching_guide' };
    } else if (req.user.role === 'teacher') {
      const shares = await prisma.contentTeacherShare.findMany({ where: { teacherId: req.user.id }, select: { contentId: true } });
      where.OR = [
        { uploadedById: req.user.id },
        { isShared: true },
        { id: { in: shares.map(s => s.contentId) } }
      ];
    }

    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;
    if (classLevel) where.classLevel = classLevel;
    if (contentType) {
      // Don't let a student override the teaching_guide exclusion via query param
      if (!(req.user.role === 'student' && contentType === 'teaching_guide')) where.contentType = contentType;
    }

    const orderBy = sort === 'alpha' ? { title: 'asc' } : { createdAt: 'desc' };

    const content = await prisma.content.findMany({
      where,
      select: {
        id: true, title: true, category: true, difficulty: true,
        classLevel: true, contentType: true,
        originalFormat: true, pageCount: true, isShared: true,
        status: true, createdAt: true,
        uploadedBy: { select: { id: true, fullName: true } }
      },
      orderBy,
      take: parseInt(limit),
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    res.json({ content });
  } catch (err) { next(err); }
});

// ── GET /content/failed — admin/teacher sees their own failed conversions ──────
router.get('/failed', requireAuth, requireRole('admin', 'teacher'), async (req, res, next) => {
  try {
    const where = { deletedAt: null, status: 'failed' };
    if (req.user.role === 'teacher') where.uploadedById = req.user.id;
    const content = await prisma.content.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json({ content });
  } catch (err) { next(err); }
});

// ── POST /content — upload file ───────────────────────────────────────────────
router.post('/', requireAuth, requireRole('admin', 'teacher'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: { code: 'NO_FILE', message: 'No file uploaded.' } });

    const meta = z.object({
      title: z.string().min(1).max(255),
      category: z.string().min(1).max(100),
      difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
      classLevel: z.enum(['kg', 'class_1', 'class_2', 'class_3', 'class_4', 'class_5', 'class_6', 'class_7', 'class_8']),
      contentType: z.enum(['book', 'workbook', 'worksheet', 'question_paper', 'teaching_guide']),
      isShared: z.string().optional().transform(v => v === 'true'),
    }).parse(req.body);

    const fileId = uuidv4();
    const isPdf = req.file.mimetype === 'application/pdf';
    const ext = isPdf ? 'pdf' : req.file.originalname.endsWith('.ppt') ? 'ppt' : 'pptx';
    const rawPath = `raw/${req.user.id}/${fileId}.${ext}`;

    await uploadFile(rawPath, req.file.buffer, req.file.mimetype);

    // Count PDF pages by scanning buffer for /Type /Page entries
    let pageCount = null;
    if (isPdf) {
      try {
        const pdfStr = req.file.buffer.toString('binary');
        const re = new RegExp('/Type\\s*/Page[^s]', 'g');
        const matches = pdfStr.match(re);
        pageCount = matches ? matches.length : null;
      } catch (e) {
        pageCount = null;
      }
    }

    const originalFormat = isPdf ? 'pdf' : ext === 'ppt' ? 'ppt' : 'pptx';

    const content = await prisma.content.create({
      data: {
        uploadedById: req.user.id,
        title: meta.title,
        category: meta.category,
        difficulty: meta.difficulty,
        classLevel: meta.classLevel,
        contentType: meta.contentType,
        originalFormat,
        rawStoragePath: rawPath,
        pdfStoragePath: isPdf ? rawPath : null,
        fileSizeBytes: req.file.size,
        status: isPdf ? 'ready' : 'processing',
        isShared: meta.isShared || false,
        pageCount,
      }
    });

    // Respond immediately for PDFs; for PPTX, respond then convert in background
    res.status(201).json({ content: { id: content.id, title: content.title, status: content.status } });

    if (!isPdf) {
      // Fire-and-forget: convert via Cloudmersive, update record when done
      convertAndStore({ contentId: content.id, fileBuffer: req.file.buffer, fileId }).catch(err => {
        console.error('Background conversion error:', err.message);
      });
    }
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION', message: err.errors[0].message } });
    next(err);
  }
});

// ── POST /content/:id/retry — retry a failed PPTX conversion ───────────────────
router.post('/:id/retry', requireAuth, requireContentOwnership, async (req, res, next) => {
  try {
    const content = await prisma.content.findUnique({ where: { id: req.params.id } });
    if (!content) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Content not found.' } });
    if (content.originalFormat === 'pdf') {
      return res.status(400).json({ error: { code: 'INVALID', message: 'Only PPTX/PPT uploads can be retried.' } });
    }

    await prisma.content.update({ where: { id: req.params.id }, data: { status: 'processing' } });
    res.json({ message: 'Retry started.' });

    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data, error } = await sb.storage.from(process.env.SUPABASE_BUCKET_NAME || 'karpom-kasadara').download(content.rawStoragePath);
    if (error) throw new Error('Could not re-download original file: ' + error.message);

    const buffer = Buffer.from(await data.arrayBuffer());
    const fileId = content.rawStoragePath.split('/').pop().split('.')[0];
    convertAndStore({ contentId: content.id, fileBuffer: buffer, fileId }).catch(err => {
      console.error('Retry conversion error:', err.message);
    });
  } catch (err) { next(err); }
});

// ── GET /content/:id ──────────────────────────────────────────────────────────
router.get('/:id', requireAuth, requireAssignment, async (req, res, next) => {
  try {
    const content = await prisma.content.findUnique({
      where: { id: req.params.id, deletedAt: null },
      select: {
        id: true, title: true, category: true, difficulty: true,
        classLevel: true, contentType: true,
        originalFormat: true, pageCount: true, isShared: true,
        status: true, createdAt: true, fileSizeBytes: true,
        uploadedBy: { select: { id: true, fullName: true } },
        teacherShares: { select: { teacherId: true } }
      }
    });
    if (!content) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Content not found.' } });
    // Teaching guides are never visible to students, regardless of assignment
    if (content.contentType === 'teaching_guide' && req.user.role === 'student') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Content not found.' } });
    }
    res.json({ content });
  } catch (err) { next(err); }
});

// ── PATCH /content/:id ────────────────────────────────────────────────────────
router.patch('/:id', requireAuth, requireContentOwnership, async (req, res, next) => {
  try {
    const data = z.object({
      title: z.string().min(1).max(255).optional(),
      category: z.string().min(1).max(100).optional(),
      difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
      classLevel: z.enum(['kg', 'class_1', 'class_2', 'class_3', 'class_4', 'class_5', 'class_6', 'class_7', 'class_8']).optional(),
      contentType: z.enum(['book', 'workbook', 'worksheet', 'question_paper', 'teaching_guide']).optional(),
      isShared: z.boolean().optional(),
    }).parse(req.body);

    const content = await prisma.content.update({
      where: { id: req.params.id },
      data,
      select: { id: true, title: true, category: true, difficulty: true, classLevel: true, contentType: true, isShared: true }
    });

    res.json({ content });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION', message: err.errors[0].message } });
    next(err);
  }
});

// ── GET /content/:id/assignments — students currently assigned (teacher/admin) ─
router.get('/:id/assignments', requireAuth, requireRole('admin', 'teacher'), async (req, res, next) => {
  try {
    const assignments = await prisma.contentAssignment.findMany({
      where: { contentId: req.params.id },
      select: { studentId: true }
    });
    res.json({ studentIds: assignments.map(a => a.studentId) });
  } catch (err) { next(err); }
});

// ── GET /content/:id/shares — which teachers this is shared with (admin only) ──
router.get('/:id/shares', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const shares = await prisma.contentTeacherShare.findMany({
      where: { contentId: req.params.id },
      select: { teacherId: true }
    });
    res.json({ teacherIds: shares.map(s => s.teacherId) });
  } catch (err) { next(err); }
});

// ── PUT /content/:id/shares — set the full list of teachers this is shared with (admin only) ──
router.put('/:id/shares', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { teacherIds } = z.object({ teacherIds: z.array(z.string().uuid()) }).parse(req.body);

    await prisma.$transaction([
      prisma.contentTeacherShare.deleteMany({ where: { contentId: req.params.id } }),
      ...teacherIds.map(teacherId => prisma.contentTeacherShare.create({
        data: { contentId: req.params.id, teacherId }
      }))
    ]);

    res.json({ message: `Shared with ${teacherIds.length} teacher(s).` });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION', message: err.errors[0].message } });
    next(err);
  }
});

// ── DELETE /content/:id ───────────────────────────────────────────────────────
router.delete('/:id', requireAuth, requireContentOwnership, async (req, res, next) => {
  try {
    await prisma.content.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    res.json({ message: 'Content deleted.' });
  } catch (err) { next(err); }
});

// ── GET /content/:id/view/meta — metadata only ─────────────────────────────────
router.get('/:id/view/meta', requireAuth, requireAssignment, async (req, res, next) => {
  try {
    const content = await prisma.content.findUnique({
      where: { id: req.params.id, deletedAt: null, status: 'ready' },
      select: { pageCount: true, title: true }
    });
    if (!content) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Content not found or not ready.' } });
    res.json({ pageCount: content.pageCount, title: content.title });
  } catch (err) { next(err); }
});

// ── GET /content/:id/view — streams PDF through server (bypasses CORS) ─────────
router.get('/:id/view', requireAuth, requireAssignment, async (req, res, next) => {
  try {
    const content = await prisma.content.findUnique({
      where: { id: req.params.id, deletedAt: null, status: 'ready' },
      select: { pdfStoragePath: true, pageCount: true, title: true }
    });
    if (!content) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Content not found or not ready.' } });

    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data, error } = await sb.storage.from(process.env.SUPABASE_BUCKET_NAME || 'karpom-kasadara').download(content.pdfStoragePath);
    if (error) throw new Error('Storage download failed: ' + error.message);

    let buffer;
    if (data instanceof Blob || (data && typeof data.arrayBuffer === 'function')) {
      buffer = Buffer.from(await data.arrayBuffer());
    } else if (Buffer.isBuffer(data)) {
      buffer = data;
    } else {
      buffer = Buffer.from(data);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Page-Count', String(content.pageCount || 0));
    res.setHeader('X-Content-Title', encodeURIComponent(content.title));
    res.send(buffer);
  } catch (err) { next(err); }
});

// ── GET /content/:id/download — admin only ──────────────────────────────────────
router.get('/:id/download', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const content = await prisma.content.findUnique({
      where: { id: req.params.id, deletedAt: null },
      select: { rawStoragePath: true, title: true }
    });
    if (!content) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Content not found.' } });

    const signedUrl = await getSignedDownloadUrl(content.rawStoragePath);
    res.json({ signedUrl });
  } catch (err) { next(err); }
});

// ── POST /content/:id/assign ────────────────────────────────────────────────────
router.post('/:id/assign', requireAuth, requireRole('admin', 'teacher'), async (req, res, next) => {
  try {
    const { studentIds } = z.object({ studentIds: z.array(z.string().uuid()).min(1) }).parse(req.body);

    const assignments = await prisma.$transaction(
      studentIds.map(studentId => prisma.contentAssignment.upsert({
        where: { contentId_studentId: { contentId: req.params.id, studentId } },
        create: { contentId: req.params.id, studentId, assignedById: req.user.id },
        update: {},
      }))
    );

    res.status(201).json({ message: `Content assigned to ${assignments.length} student(s).` });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: { code: 'VALIDATION', message: err.errors[0].message } });
    next(err);
  }
});

// ── DELETE /content/:id/assign/:studentId ────────────────────────────────────────
router.delete('/:id/assign/:studentId', requireAuth, requireRole('admin', 'teacher'), async (req, res, next) => {
  try {
    await prisma.contentAssignment.deleteMany({
      where: { contentId: req.params.id, studentId: req.params.studentId }
    });
    res.json({ message: 'Assignment removed.' });
  } catch (err) { next(err); }
});

module.exports = router;
