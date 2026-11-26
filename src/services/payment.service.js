import { randomBytes, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';

const paymentSelect = {
  id: true, orderId: true, userId: true, status: true, mockReference: true,
  amount: true, currency: true, failureReason: true, createdAt: true
};

function serialize(payment) {
  return {
    id: payment.id,
    orderId: payment.orderId,
    status: payment.status,
    mockReference: payment.mockReference,
    amount: payment.amount.toFixed(2),
    currency: payment.currency,
    ...(payment.failureReason ? { failureReason: payment.failureReason } : {}),
    createdAt: payment.createdAt
  };
}

export async function createMockPayment(input, authenticatedUserId) {
  if (input.userId !== authenticatedUserId) {
    const error = new Error('The authenticated user does not match userId');
    error.status = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const amount = new Prisma.Decimal(input.amount);
  if (!amount.isFinite() || amount.lte(0) || amount.decimalPlaces() > 2 || amount.greaterThan('9999999999.99')) {
    const error = new Error('amount must be a positive monetary value with at most 2 decimal places');
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const existing = await prisma.payment.findFirst({ where: { orderId: input.orderId, status: 'SUCCEEDED' }, orderBy: { createdAt: 'desc' }, select: paymentSelect });
  if (existing) {
    const sameAttempt = existing.userId === input.userId
      && existing.amount.equals(amount)
      && existing.currency === input.currency
      && input.outcome === 'SUCCESS';
    if (!sameAttempt) {
      const error = new Error('A payment record already exists for this order');
      error.status = 409;
      error.code = 'PAYMENT_ALREADY_RECORDED';
      throw error;
    }
    return { payment: serialize(existing), replayed: true };
  }

  const status = input.outcome === 'SUCCESS' ? 'SUCCEEDED' : 'FAILED';
  let created;
  try {
    created = await prisma.payment.create({
    data: {
      id: randomUUID(),
      orderId: input.orderId,
      userId: input.userId,
      amount,
      currency: input.currency,
      status,
      mockReference: `MOCK-${randomBytes(6).toString('hex')}`,
      failureReason: status === 'FAILED' ? 'Simulated payment failure' : null
    },
    select: paymentSelect
    });
  } catch (error) {
    if (error.code === 'P2002' && input.outcome === 'SUCCESS') {
      const conflict = new Error('A successful payment already exists for this order');
      conflict.status = 409;
      conflict.code = 'PAYMENT_ALREADY_RECORDED';
      throw conflict;
    }
    throw error;
  }
  return { payment: serialize(created), replayed: false };
}
