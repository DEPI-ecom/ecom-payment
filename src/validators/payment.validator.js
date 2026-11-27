import { z } from 'zod';
// User ids come from the User service, which generates cuids, so a UUID check would reject every real user.
const externalIdSchema = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/, 'Invalid id');
// Unknown fields (for example card details) are stripped by zod and never reach the service.
export const mockPaymentSchema = z.object({
  orderId: z.string().uuid(),
  userId: externalIdSchema,
  amount: z.string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Must be a decimal string with at most 2 decimal places')
    .refine((value) => Number(value) > 0, 'Must be greater than zero'),
  currency: z.string().regex(/^[A-Z]{3}$/, 'Must be a 3-letter uppercase currency code'),
  outcome: z.enum(['SUCCESS', 'FAILURE'])
});

export function parse(schema, value) {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const e = new Error('The request contains invalid fields.');
  e.statusCode = 400;
  e.code = 'VALIDATION_ERROR';
  e.details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
  throw e;
}
