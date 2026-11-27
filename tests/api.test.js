import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/config/database.js', () => ({ prisma: {} }));
vi.mock('../src/services/mock-payment.service.js', () => ({ createMockPayment: vi.fn() }));

import app from '../src/app.js';
import { createMockPayment } from '../src/services/mock-payment.service.js';

const body = {
  orderId: '3f2b8c1e-5d4a-4b7e-9a1c-0d2e4f6a8b10',
  userId: '7a1d9c3e-2b4f-4c6a-8e0d-1f3b5d7a9c21',
  amount: '159.98',
  currency: 'USD',
  outcome: 'SUCCESS'
};
const post = (b = body) => request(app).post('/internal/payments/mock').send(b);

beforeEach(() => vi.resetAllMocks());

describe('infra routes', () => {
  it('GET /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'ecom-payment' });
  });

  it('GET /metrics exposes prometheus text', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('http_requests_total');
  });

  it('unknown route -> 404 NOT_FOUND', async () => {
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('echoes X-Request-Id or generates one', async () => {
    expect((await request(app).get('/health').set('x-request-id', 'abc')).headers['x-request-id']).toBe('abc');
    expect((await request(app).get('/health')).headers['x-request-id']).toBeTruthy();
  });
});

describe('POST /internal/payments/mock', () => {
  it('201 returns the recorded payment (SUCCEEDED)', async () => {
    const payment = { id: 'pay1', orderId: body.orderId, status: 'SUCCEEDED', mockReference: 'MOCK-ABC123ABC123', amount: '159.98', currency: 'USD' };
    createMockPayment.mockResolvedValue(payment);
    const res = await post();
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: payment });
    expect(createMockPayment).toHaveBeenCalledWith(body);
  });

  it('201 also for a simulated failure, with failureReason', async () => {
    createMockPayment.mockResolvedValue({ id: 'pay2', status: 'FAILED', failureReason: 'Simulated payment failure' });
    const res = await post({ ...body, outcome: 'FAILURE' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('FAILED');
    expect(res.body.data.failureReason).toBe('Simulated payment failure');
  });

  it('never passes card details or other unknown fields to the service', async () => {
    createMockPayment.mockResolvedValue({ id: 'pay1' });
    await post({ ...body, cardNumber: '4242424242424242', cvv: '123' });
    expect(createMockPayment).toHaveBeenCalledWith(body);
  });

  it.each([
    [{ orderId: 'nope' }, 'orderId'],
    [{ userId: undefined }, 'userId'],
    [{ amount: '0' }, 'amount'],
    [{ amount: '-5' }, 'amount'],
    [{ amount: '10.999' }, 'amount'],
    [{ amount: 12.5 }, 'amount'],
    [{ currency: 'usd' }, 'currency'],
    [{ outcome: 'MAYBE' }, 'outcome']
  ])('400 VALIDATION_ERROR for %j', async (override, field) => {
    const res = await post({ ...body, ...override });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d) => d.field)).toContain(field);
    expect(createMockPayment).not.toHaveBeenCalled();
  });

  it('409 PAYMENT_ALREADY_SUCCEEDED is passed through', async () => {
    createMockPayment.mockRejectedValue(Object.assign(new Error('Order already has a successful payment.'), { statusCode: 409, code: 'PAYMENT_ALREADY_SUCCEEDED' }));
    const res = await post();
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PAYMENT_ALREADY_SUCCEEDED');
  });

  it('hides internal details on 500', async () => {
    createMockPayment.mockRejectedValue(new Error('secret db detail'));
    const res = await post();
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(JSON.stringify(res.body)).not.toContain('secret db detail');
  });
});
