import { z } from 'zod';
import { createMockPayment } from '../services/payment.service.js';

const schema = z.object({
  orderId: z.string().uuid(),
  userId: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().regex(/^[A-Z]{3}$/),
  outcome: z.enum(['SUCCESS', 'FAILURE'])
}).strict();

export async function mockPayment(req, res, next) {
  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid payment request', details: parsed.error.flatten() } });
    }
    const result = await createMockPayment(parsed.data, req.auth.userId);
    req.log.info({ paymentId: result.payment.id, orderId: result.payment.orderId, status: result.payment.status, replayed: result.replayed }, 'Mock payment recorded');
    return res.status(result.replayed ? 200 : 201).json({ data: result.payment });
  } catch (error) {
    next(error);
  }
}
