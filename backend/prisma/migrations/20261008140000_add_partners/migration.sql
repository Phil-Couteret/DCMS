-- CreateEnum
CREATE TYPE "PartnerInvoiceStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'CANCELLED');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "partnerId" TEXT,
ADD COLUMN     "partnerInvoiceId" TEXT;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "partnerId" TEXT;

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "commissionRate" DECIMAL(5,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "apiKey" TEXT NOT NULL,
    "apiSecretHash" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerInvoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "periodFrom" DATE NOT NULL,
    "periodTo" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "commissionRate" DECIMAL(5,2) NOT NULL,
    "gross" DECIMAL(10,2) NOT NULL,
    "commission" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "taxName" TEXT NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL,
    "tax" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "PartnerInvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerInvoiceLine" (
    "id" TEXT NOT NULL,
    "partnerInvoiceId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "PartnerInvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Partner_contactEmail_key" ON "Partner"("contactEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_apiKey_key" ON "Partner"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerInvoice_invoiceNumber_key" ON "PartnerInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "PartnerInvoice_partnerId_idx" ON "PartnerInvoice"("partnerId");

-- CreateIndex
CREATE INDEX "PartnerInvoiceLine_partnerInvoiceId_idx" ON "PartnerInvoiceLine"("partnerInvoiceId");

-- CreateIndex
CREATE INDEX "Booking_partnerId_idx" ON "Booking"("partnerId");

-- CreateIndex
CREATE INDEX "Booking_partnerInvoiceId_idx" ON "Booking"("partnerInvoiceId");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_partnerInvoiceId_fkey" FOREIGN KEY ("partnerInvoiceId") REFERENCES "PartnerInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerInvoice" ADD CONSTRAINT "PartnerInvoice_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerInvoiceLine" ADD CONSTRAINT "PartnerInvoiceLine_partnerInvoiceId_fkey" FOREIGN KEY ("partnerInvoiceId") REFERENCES "PartnerInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

