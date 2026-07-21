-- CreateTable
CREATE TABLE "customer_bills" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "bill_number" VARCHAR(100) NOT NULL,
    "stay_start_date" DATE NOT NULL,
    "bill_date" DATE NOT NULL,
    "booking_ids" JSONB NOT NULL DEFAULT '[]',
    "bill_items" JSONB NOT NULL DEFAULT '[]',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "tax" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "partner_paid_total" DECIMAL(10,2) DEFAULT 0,
    "customer_paid_total" DECIMAL(10,2) DEFAULT 0,
    "partner_tax" DECIMAL(10,2) DEFAULT 0,
    "customer_tax" DECIMAL(10,2) DEFAULT 0,
    "breakdown" JSONB DEFAULT '{}',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_bills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_bills_bill_number_key" ON "customer_bills"("bill_number");

-- CreateIndex
CREATE INDEX "idx_customer_bills_date" ON "customer_bills"("bill_date");

-- CreateIndex
CREATE INDEX "idx_customer_bills_number" ON "customer_bills"("bill_number");

-- CreateIndex
CREATE INDEX "idx_customer_bills_customer" ON "customer_bills"("customer_id");

-- CreateIndex
CREATE INDEX "idx_customer_bills_stay_start" ON "customer_bills"("stay_start_date");

-- AddForeignKey
ALTER TABLE "customer_bills" ADD CONSTRAINT "customer_bills_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customer_bills" ADD CONSTRAINT "customer_bills_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
