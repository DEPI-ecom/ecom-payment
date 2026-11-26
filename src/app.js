import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import client from 'prom-client';
import paymentRoutes from './routes/payment.routes.js';
import { notFound, errorHandler } from './middleware/error.middleware.js';

const app = express();
const register = new client.Registry();
client.collectDefaultMetrics({ register });
const httpRequests = new client.Counter({ name: 'http_requests_total', help: 'Total HTTP requests', labelNames: ['method', 'route', 'status'], registers: [register] });
const httpDuration = new client.Histogram({ name: 'http_request_duration_seconds', help: 'HTTP request duration in seconds', labelNames: ['method', 'route', 'status'], registers: [register] });

app.use(helmet());
app.use(express.json({ limit: '16kb' }));
app.use(pinoHttp({ level: process.env.LOG_LEVEL || 'info' }));
app.use((req, res, next) => {
  const started = process.hrtime.bigint();
  res.on('finish', () => {
    const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path;
    const labels = { method: req.method, route, status: String(res.statusCode) };
    httpRequests.inc(labels);
    httpDuration.observe(labels, Number(process.hrtime.bigint() - started) / 1e9);
  });
  next();
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'ecom-payment' }));
app.get('/metrics', async (req, res, next) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) { next(error); }
});
app.use('/internal/payments', paymentRoutes);
app.use(notFound);
app.use(errorHandler);
export default app;
