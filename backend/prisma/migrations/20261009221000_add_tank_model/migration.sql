-- CreateEnum
CREATE TYPE "TankStatus" AS ENUM ('ACTIVE', 'RETIRED');

-- CreateTable
CREATE TABLE "Tank" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "locationId" TEXT,
    "serialNumber" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "visualInspectionDate" DATE,
    "hydrostaticTestDate" DATE,
    "status" "TankStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tank_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tank_tenantId_idx" ON "Tank"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Tank_tenantId_serialNumber_key" ON "Tank"("tenantId", "serialNumber");

-- AddForeignKey
ALTER TABLE "Tank" ADD CONSTRAINT "Tank_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tank" ADD CONSTRAINT "Tank_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "Tank" ADD CONSTRAINT "Tank_size" CHECK ("size" IN ('10L', '12L', '15L', 'Nitrox12L', 'Nitrox15L'));

-- Same-tenant checks (enforce_tenant) and row-level security, as on every
-- tenant table.
CREATE TRIGGER "Tank_enforce_tenant" BEFORE INSERT OR UPDATE ON "Tank"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant('locationId', 'Location');

ALTER TABLE "Tank" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tank" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Tank"
  USING ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '') OR current_setting('app.rls_bypass', true) = 'on')
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '') OR current_setting('app.rls_bypass', true) = 'on');
