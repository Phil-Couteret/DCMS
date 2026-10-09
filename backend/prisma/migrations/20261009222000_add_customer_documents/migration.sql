-- CreateEnum
CREATE TYPE "CustomerDocumentType" AS ENUM ('MEDICAL_CERT', 'INSURANCE', 'CERTIFICATION', 'OTHER');

-- CreateTable
CREATE TABLE "CustomerDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "customerId" TEXT NOT NULL,
    "type" "CustomerDocumentType" NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerDocument_tenantId_idx" ON "CustomerDocument"("tenantId");

-- CreateIndex
CREATE INDEX "CustomerDocument_customerId_idx" ON "CustomerDocument"("customerId");

-- AddForeignKey
ALTER TABLE "CustomerDocument" ADD CONSTRAINT "CustomerDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerDocument" ADD CONSTRAINT "CustomerDocument_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Same-tenant checks (enforce_tenant) and row-level security, as on every
-- tenant table.
CREATE TRIGGER "CustomerDocument_enforce_tenant" BEFORE INSERT OR UPDATE ON "CustomerDocument"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant('customerId', 'Customer');

ALTER TABLE "CustomerDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerDocument" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CustomerDocument"
  USING ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '') OR current_setting('app.rls_bypass', true) = 'on')
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '') OR current_setting('app.rls_bypass', true) = 'on');
