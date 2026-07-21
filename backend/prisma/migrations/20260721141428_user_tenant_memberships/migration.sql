-- Multi-tenant user memberships: some staff legitimately work at more than
-- one diving-center tenant. Rather than requiring a duplicate `users` row
-- per tenant (which would force duplicate usernames and collide on the
-- globally-unique `email` column the moment the same real email was reused),
-- a user keeps exactly one identity row (users.tenant_id stays their
-- primary/home tenant, unchanged) and gains additional tenants via this
-- join table, each with its own role/permissions/location_access.
--
-- Purely additive: no existing column changes, no backfill needed (every
-- current user already has their one tenant on users.tenant_id; this table
-- starts empty and is only populated when someone is explicitly granted a
-- second tenant).

-- CreateTable
CREATE TABLE "user_tenant_memberships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'admin',
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "location_access" UUID[] DEFAULT ARRAY[]::UUID[],
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_tenant_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_tenant_memberships_user_tenant_key" ON "user_tenant_memberships"("user_id", "tenant_id");
CREATE INDEX "idx_user_tenant_memberships_user" ON "user_tenant_memberships"("user_id");
CREATE INDEX "idx_user_tenant_memberships_tenant" ON "user_tenant_memberships"("tenant_id");

-- AddForeignKey
-- Cascade (unlike the NO ACTION convention used elsewhere for tenant_id
-- relations): this table only represents an access grant, not a business
-- record, so deleting the user or the tenant should simply remove the
-- grant rather than being blocked by or orphaning it.
ALTER TABLE "user_tenant_memberships" ADD CONSTRAINT "user_tenant_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "user_tenant_memberships" ADD CONSTRAINT "user_tenant_memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
