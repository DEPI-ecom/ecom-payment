import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/config/database.js', () => ({
  prisma: { payment: { findFirst: vi.fn(), create: vi.fn() } }
}));

import { prisma } from '../src/config/database.js';
import { createMockPayment } from '../src/services/mock-payment.service.js';

const input = {
  orderId: '3f2b8c1e-5d4a-4b7e-9a1c-0d2e4f6a8b10',
  userId: '7a1d9c3e-2b4f-4c6a-8e0d-1f3b5d7a9c21',
  amount: '159.98',
  currency: 'USD',
  outcome: 'SUCCESS'
};

beforeEach(() => {
  vi.resetAllMocks();
  prisma.payment.findFirst.mockResolvedValue(null);
  prisma.payment.create.mockImplementation(async ({ data }) => ({ id: 'pay1', ...data }));
});

describe('createMockPayment - SUCCESS', () => {
  it('records a SUCCEEDED payment with a generated mock reference', async () => {
    const result = await createMockPayment(input);

    expect(result).toMatchObject({ id: 'pay1', orderId: input.orderId, status: 'SUCCEEDED', amount: '159.98', currency: 'USD' });
    expect(result.mockReference).toMatch(/^MOCK-[A-Z0-9]{12}$/);
    expect(result).not.toHaveProperty('failureReason');

    const data = prisma.payment.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ orderId: input.orderId, userId: input.userId, status: 'SUCCEEDED', failureReason: null });
    expect(data.amount.toFixed(2)).toBe('159.98');
  });

  it('generates a different reference for each payment', async () => {
    const a = await createMockPayment(input);
    const b = await createMockPayment({ ...input, orderId: 'other-order' });
    expect(a.mockReference).not.toBe(b.mockReference);
  });
});

describe('createMockPayment - FAILURE', () => {
  it('records a FAILED payment with a safe failure reason', async () => {
    const result = await createMockPayment({ ...input, outcome: 'FAILURE' });

    expect(result.status).toBe('FAILED');
    expect(result.failureReason).toBe('Simulated payment failure');
    expect(prisma.payment.create.mock.calls[0][0].data).toMatchObject({
      status: 'FAILED', failureReason: 'Simulated payment failure'
    });
  });

  it('allows a retry after a failed payment (only SUCCEEDED payments block)', async () => {
    await createMockPayment({ ...input, outcome: 'FAILURE' });
    await createMockPayment(input);
    expect(prisma.payment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { orderId: input.orderId, status: 'SUCCEEDED' } })
    );
    expect(prisma.payment.create).toHaveBeenCalledTimes(2);
  });
});

describe('duplicate successful payments', () => {
  it.each(['SUCCESS', 'FAILURE'])('409 PAYMENT_ALREADY_SUCCEEDED when the order is already paid (%s)', async (outcome) => {
    prisma.payment.findFirst.mockResolvedValue({ id: 'existing' });
    await expect(createMockPayment({ ...input, outcome })).rejects.toMatchObject({
      statusCode: 409, code: 'PAYMENT_ALREADY_SUCCEEDED'
    });
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });
});

describe('errors', () => {
  it('rethrows database errors', async () => {
    prisma.payment.create.mockRejectedValue(new Error('db down'));
    await expect(createMockPayment(input)).rejects.toThrow('db down');
  });
});
