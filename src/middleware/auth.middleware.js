import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function requireCustomerToken(req, res, next) {
  const header = req.get('authorization') || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Bearer token required' } });
  }
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET);
    const userId = typeof payload === 'object' ? (payload.sub ?? payload.userId) : null;
    if (typeof userId !== 'string' || !userId) throw new Error('Missing subject');
    req.auth = { userId };
    next();
  } catch {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
  }
}
