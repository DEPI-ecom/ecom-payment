CREATE TYPE "PaymentStatus" AS ENUM ('SUCCEEDED', 'FAILED');

CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "mock_reference" VARCHAR(40) NOT NULL,
    "failure_reason" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");
CREATE UNIQUE INDEX "payments_one_success_per_order_key" ON "payments"("order_id") WHERE "status" = 'SUCCEEDED';
CREATE UNIQUE INDEX "payments_mock_reference_key" ON "payments"("mock_reference");
CREATE INDEX "payments_user_id_created_at_idx" ON "payments"("user_id", "created_at");
