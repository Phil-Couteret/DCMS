-- Every existing center: the transfer fee of the original price list (15,
-- per booking). Prisma runs a migration outside a transaction, where SET
-- LOCAL has no effect: the bypass is set for the session and cleared below.
SELECT set_config('app.rls_bypass', 'on', false);
INSERT INTO "AddOnPrice" ("tenantId", "addOn", "price", "updatedAt")
  SELECT t.id, 'TRANSFER'::"BookingAddOn", 15.00, now() FROM "Tenant" t
  ON CONFLICT DO NOTHING;
SELECT set_config('app.rls_bypass', '', false);
