const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

/**
 * Verify JWT and attach user to req.user
 */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    }
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub, deletedAt: null },
      select: { id: true, role: true, fullName: true, email: true, status: true }
    });

    if (!user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not found.' } });
    if (user.status === 'suspended') return res.status(403).json({ error: { code: 'SUSPENDED', message: 'Account suspended.' } });

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: { code: 'TOKEN_EXPIRED', message: 'Token expired.' } });
    }
    return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid token.' } });
  }
}

/**
 * Restrict to specific roles
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have permission to perform this action.' } });
    }
    next();
  };
}

/**
 * Verify content ownership or admin
 */
async function requireContentOwnership(req, res, next) {
  try {
    const content = await prisma.content.findUnique({
      where: { id: req.params.id },
      select: { uploadedById: true }
    });
    if (!content) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Content not found.' } });
    if (req.user.role !== 'admin' && content.uploadedById !== req.user.id) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not own this content.' } });
    }
    req.content = content;
    next();
  } catch (err) { next(err); }
}

/**
 * Verify student has been assigned this content (or is teacher/admin)
 */
async function requireAssignment(req, res, next) {
  try {
    if (['admin', 'teacher'].includes(req.user.role)) return next();

    const assignment = await prisma.contentAssignment.findUnique({
      where: { contentId_studentId: { contentId: req.params.id, studentId: req.user.id } }
    });
    if (!assignment) {
      return res.status(403).json({ error: { code: 'NOT_ASSIGNED', message: 'This content has not been assigned to you.' } });
    }
    next();
  } catch (err) { next(err); }
}

module.exports = { requireAuth, requireRole, requireContentOwnership, requireAssignment };
