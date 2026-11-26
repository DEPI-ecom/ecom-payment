# ecom-payment

Internal mock-payment microservice for Marketly. It records simulated payment outcomes in its own PostgreSQL database. It does not process real cards or connect to a payment provider.

## Stack

- Node.js 22, Express 5, JavaScript ES modules
- PostgreSQL and Prisma
- JWT verification using the shared development `JWT_SECRET`
- Zod validation, Pino HTTP logs, Prometheus metrics

## API

### `POST /internal/payments/mock`

Internal only. The Order service calls this endpoint. Forward the customer's verified JWT in the `Authorization` header. The payment service verifies it and checks that the token subject matches `userId` in the request.

Request:

```json
{
  "orderId": "order-uuid",
  "userId": "user-uuid",
  "amount": "159.98",
  "currency": "USD",
  "outcome": "SUCCESS"
}
```

`outcome` must be `SUCCESS` or `FAILURE`. A successful result is stored as `SUCCEEDED`; a failure is stored as `FAILED` with `failureReason: "Simulated payment failure"`. The service generates `mockReference`. The response is `{ "data": { "id", "orderId", "status", "mockReference", "amount", "currency", ... } }`.

A partial unique database index permits failed attempts to be retried but prevents more than one successful payment for the same order. There is no card data, payment-provider integration, webhook, refund, or public payment endpoint.

### Operational endpoints

- `GET /health`: lightweight liveness response.
- `GET /metrics`: Prometheus exposition. Keep it on the internal network.

## Run locally

Requirements: Node.js 22 and PostgreSQL.

1. Create the logical database `payments_db` in your local PostgreSQL instance.
2. Copy `.env.example` to `.env` (PowerShell: `Copy-Item .env.example .env`).
3. Set `DATABASE_URL` and set `JWT_SECRET` to the same secret used by the User and Order services.
4. Install and migrate:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

The default port is `3006`.

## Docker

Build from this directory:

```bash
docker build -t marketly/ecom-payment:local .
```

Run it with `DATABASE_URL` and `JWT_SECRET` supplied through your container environment. The container applies Prisma migrations before starting. In Compose/Kubernetes, use the PostgreSQL service DNS name rather than `localhost` in `DATABASE_URL`.

## Order service integration

Configure Order's `PAYMENT_SERVICE_URL` as `http://localhost:3006` locally or `http://ecom-payment:3006` on the shared Docker network. Its HTTP request should be:

```http
POST /internal/payments/mock
Authorization: Bearer <customer-jwt>
Content-Type: application/json
```

The request body must match the example above. This matches the documented internal payment contract. Do not expose `/internal/payments/mock` through the public API Gateway.

## Known contract notes

- The API specification says the endpoint is internal but leaves the internal authentication choice open. This implementation follows the documented option of forwarding the verified customer JWT and checking `userId` against its subject. All participating services must share the same JWT verification secret/algorithm.
- The API example uses USD. The service accepts any three-letter uppercase currency code because the project-wide currency is still a team decision.
- The database stores each attempt. A partial unique index blocks a second successful payment for an order while allowing a failed attempt followed by a successful retry. This is slightly more explicit than the API document's brief duplicate-success rule.
- No public `GET /payments/:paymentId` endpoint is included, as the API document makes it optional and recommends exposing payment details through Order instead.
