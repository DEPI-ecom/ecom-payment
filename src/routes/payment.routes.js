import { Router } from 'express';
import { createMockPayment } from '../controllers/payment.controller.js';

// Internal only: called by ecom-order. Do not expose through the API gateway.
const router = Router();
router.post('/mock', createMockPayment);
export default router;
