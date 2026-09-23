-- Phase 4.1: add tenant_id to the 14 tables that didn't have it, backfill it
-- from each table's existing location_id/customer_id/partner_id relation
-- (all of which already resolve to a tenant), then add the FK + index.
--
-- Backfill MUST run before any tenant-scoped query goes live: tenant_id
-- starts NULL on every existing row, and TenantContextService-based
-- filtering (`where: { tenant_id: <context tenant> }`) would otherwise make
-- every pre-existing row invisible to its own tenant the moment this
-- deploys - not a cosmetic gap, a full outage of existing data for every
-- tenant already using the app.
--
-- onDelete is intentionally NO ACTION (omitted), matching the other 9
-- tenant_id relations already in schema.prisma - see the Phase 2.3 baseline
-- note in roadmap.md for why (the live DB never actually had ON DELETE SET
-- NULL despite schema.prisma once claiming it did).

-- AlterTable: add nullable tenant_id columns
ALTER TABLE "bookings" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "staff" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "equipment" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "boat_preps" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "boats" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "dive_sites" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "customer_stays" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "customer_bills" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "partner_invoices" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "pricing_configs" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "customer_consents" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "customer_certifications" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "data_subject_access_requests" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "bono_usage" ADD COLUMN "tenant_id" UUID;

-- Backfill via location_id -> locations.tenant_id
UPDATE "bookings" b SET "tenant_id" = l."tenant_id" FROM "locations" l WHERE b."location_id" = l."id";
UPDATE "staff" s SET "tenant_id" = l."tenant_id" FROM "locations" l WHERE s."location_id" = l."id";
UPDATE "equipment" e SET "tenant_id" = l."tenant_id" FROM "locations" l WHERE e."location_id" = l."id";
UPDATE "boat_preps" bp SET "tenant_id" = l."tenant_id" FROM "locations" l WHERE bp."location_id" = l."id";
UPDATE "boats" bo SET "tenant_id" = l."tenant_id" FROM "locations" l WHERE bo."location_id" = l."id";
UPDATE "dive_sites" ds SET "tenant_id" = l."tenant_id" FROM "locations" l WHERE ds."location_id" = l."id";
UPDATE "customer_bills" cb SET "tenant_id" = l."tenant_id" FROM "locations" l WHERE cb."location_id" = l."id";
UPDATE "partner_invoices" pi SET "tenant_id" = l."tenant_id" FROM "locations" l WHERE pi."location_id" = l."id";
UPDATE "pricing_configs" pc SET "tenant_id" = l."tenant_id" FROM "locations" l WHERE pc."location_id" IS NOT NULL AND pc."location_id" = l."id";

-- Backfill via customer_id -> customers.tenant_id
UPDATE "customer_stays" cs SET "tenant_id" = c."tenant_id" FROM "customers" c WHERE cs."customer_id" = c."id";
UPDATE "customer_consents" cc SET "tenant_id" = c."tenant_id" FROM "customers" c WHERE cc."customer_id" = c."id";
UPDATE "customer_certifications" ccert SET "tenant_id" = c."tenant_id" FROM "customers" c WHERE ccert."customer_id" = c."id";
UPDATE "data_subject_access_requests" dsar SET "tenant_id" = c."tenant_id" FROM "customers" c WHERE dsar."customer_id" = c."id";
UPDATE "bono_usage" bu SET "tenant_id" = c."tenant_id" FROM "customers" c WHERE bu."customer_id" = c."id";

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "staff" ADD CONSTRAINT "staff_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "boat_preps" ADD CONSTRAINT "boat_preps_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "boats" ADD CONSTRAINT "boats_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "dive_sites" ADD CONSTRAINT "dive_sites_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "customer_stays" ADD CONSTRAINT "customer_stays_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "customer_bills" ADD CONSTRAINT "customer_bills_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "partner_invoices" ADD CONSTRAINT "partner_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "pricing_configs" ADD CONSTRAINT "pricing_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "customer_consents" ADD CONSTRAINT "customer_consents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "customer_certifications" ADD CONSTRAINT "customer_certifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "data_subject_access_requests" ADD CONSTRAINT "data_subject_access_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "bono_usage" ADD CONSTRAINT "bono_usage_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- CreateIndex
CREATE INDEX "idx_bookings_tenant" ON "bookings"("tenant_id");
CREATE INDEX "idx_staff_tenant" ON "staff"("tenant_id");
CREATE INDEX "idx_equipment_tenant" ON "equipment"("tenant_id");
CREATE INDEX "idx_boat_preps_tenant" ON "boat_preps"("tenant_id");
CREATE INDEX "idx_boats_tenant" ON "boats"("tenant_id");
CREATE INDEX "idx_dive_sites_tenant" ON "dive_sites"("tenant_id");
CREATE INDEX "idx_customer_stays_tenant" ON "customer_stays"("tenant_id");
CREATE INDEX "idx_customer_bills_tenant" ON "customer_bills"("tenant_id");
CREATE INDEX "idx_partner_invoices_tenant" ON "partner_invoices"("tenant_id");
CREATE INDEX "idx_pricing_configs_tenant" ON "pricing_configs"("tenant_id");
CREATE INDEX "idx_customer_consents_tenant" ON "customer_consents"("tenant_id");
CREATE INDEX "idx_customer_certifications_tenant" ON "customer_certifications"("tenant_id");
CREATE INDEX "idx_dsar_tenant" ON "data_subject_access_requests"("tenant_id");
CREATE INDEX "idx_bono_usage_tenant" ON "bono_usage"("tenant_id");
