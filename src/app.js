import express from 'express';
import { randomUUID } from 'node:crypto';
import helmet from 'helmet';
import pino from 'pino';
import client from 'prom-client';
import paymentRoutes from './routes/payment.routes.js';
import { notFound, errorHandler } from './middleware/error.middleware.js';

export const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const register = new client.Registry();
client.collectDefaultMetrics({ register });
const httpRequests = new client.Counter({
  name: 'http_requests_total', help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status']
});
register.registerMetric(httpRequests);

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => {
  const started = process.hrtime.bigint();
  req.id = req.get('x-request-id') || randomUUID();
  req.log = logger.child({ requestId: req.id, service: 'ecom-payment' });
  res.setHeader('X-Request-Id', req.id);
  res.on('finish', () => {
    const route = req.route?.path || req.path;
    httpRequests.inc({ method: req.method, route, status: String(res.statusCode) });
    req.log.info({ method: req.method, route, status: res.statusCode, durationMs: Number(process.hrtime.bigint() - started) / 1e6 }, 'HTTP request');
  });
  next();
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'ecom-payment' }));
app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.end(await register.metrics());
});
app.use('/internal/payments', paymentRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
