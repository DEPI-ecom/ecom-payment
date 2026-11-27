import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';

const FAILURE_REASON = 'Simulated payment failure';
const newReference = () => `MOCK-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;

function serialize(payment) {
  return {
    id: payment.id,
    orderId: payment.orderId,
    status: payment.status,
    mockReference: payment.mockReference,
    amount: payment.amount.toFixed(2),
    currency: payment.currency,
    ...(payment.failureReason ? { failureReason: payment.failureReason } : {})
  };
}

export async function createMockPayment({ orderId, userId, amount, currency, outcome }) {
  const alreadyPaid = await prisma.payment.findFirst({
    where: { orderId, status: 'SUCCEEDED' },
    select: { id: true }
  });
  if (alreadyPaid) {
    throw Object.assign(new Error('Order already has a successful payment.'), {
      statusCode: 409, code: 'PAYMENT_ALREADY_SUCCEEDED'
    });
  }

  const succeeded = outcome === 'SUCCESS';
  const payment = await prisma.payment.create({
    data: {
      orderId,
      userId,
      amount: new Prisma.Decimal(amount),
      currency,
      status: succeeded ? 'SUCCEEDED' : 'FAILED',
      mockReference: newReference(),
      failureReason: succeeded ? null : FAILURE_REASON
    }
  });
  return serialize(payment);
}
