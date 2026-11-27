# ecom-payment

Mock payment service for Marketly. It simulates a payment outcome and records it.
It never handles card details and is not a real payment processor.

## Endpoints
- `POST /internal/payments/mock` is called by `ecom-order` only. Do not expose it publicly or through the gateway.
  Body: `{ orderId, userId, amount, currency, outcome }` where `outcome` is `SUCCESS` or `FAILURE`.
  Returns `201` with `{ data: { id, orderId, status, mockReference, amount, currency, failureReason? } }`.
  Returns `409 PAYMENT_ALREADY_SUCCEEDED` if the order already has a successful payment.
- `GET /health` and `GET /metrics`

## Setup
```bash
cp .env.example .env        # then edit DATABASE_URL
npm install
npx prisma migrate dev --name init
npm run dev                 # http://localhost:3006
npm test
```
Requires a PostgreSQL database named `payments_db`.
