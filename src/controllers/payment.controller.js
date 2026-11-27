import { createMockPayment as runMockPayment } from '../services/mock-payment.service.js';
import { parse, mockPaymentSchema } from '../validators/payment.validator.js';

export async function createMockPayment(req, res, next) {
  try {
    const body = parse(mockPaymentSchema, req.body);
    res.status(201).json({ data: await runMockPayment(body) });
  } catch (error) { next(error); }
}
