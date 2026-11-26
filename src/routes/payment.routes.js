import { Router } from 'express';
import { requireCustomerToken } from '../middleware/auth.middleware.js';
import { mockPayment } from '../controllers/payment.controller.js';

const router = Router();
router.post('/mock', requireCustomerToken, mockPayment);
export default router;
