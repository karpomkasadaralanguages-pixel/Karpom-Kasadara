function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.code === 'P2002') {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'A record with this value already exists.' } });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Record not found.' } });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred.';
  res.status(status).json({ error: { code: err.code || 'SERVER_ERROR', message } });
}

module.exports = { errorHandler };
