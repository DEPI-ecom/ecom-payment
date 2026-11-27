export function notFound(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } });
}

export function errorHandler(err, req, res, next) {
  req.log?.error({ err }, 'Request failed');
  if (res.headersSent) return next(err);
  const status = err.statusCode || 500;
  res.status(status).json({
    error: {
      code: err.code || (status === 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR'),
      message: status === 500 ? 'An unexpected error occurred.' : err.message,
      ...(err.details ? { details: err.details } : {}),
      ...(req.id ? { requestId: req.id } : {})
    }
  });
}
