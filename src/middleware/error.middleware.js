export function notFound(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
}

export function errorHandler(err, req, res, next) {
  req.log?.error({ err }, 'Request failed');
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    error: { code: err.code || 'INTERNAL_SERVER_ERROR', message: err.status ? err.message : 'An unexpected error occurred' }
  });
}
