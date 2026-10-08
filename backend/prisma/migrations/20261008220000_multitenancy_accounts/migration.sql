-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('ADMIN', 'INSTRUCTOR');

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "role" "MembershipRole" NOT NULL DEFAULT 'INSTRUCTOR',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Membership" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isSuperadmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PlatformAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "tenantId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformAuditLog_tenantId_idx" ON "PlatformAuditLog"("tenantId");

-- CreateIndex
CREATE INDEX "PlatformAuditLog_createdAt_idx" ON "PlatformAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "PlatformAuditLog" ADD CONSTRAINT "PlatformAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAuditLog" ADD CONSTRAINT "PlatformAuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Staff roles move onto the membership: each existing membership keeps the
-- account's current role.
UPDATE "Membership" m SET "role" = 'ADMIN'
  FROM "User" u WHERE u."id" = m."userId" AND u."role" = 'ADMIN';

-- An existing installation gets its earliest admin as superadmin.
UPDATE "User" SET "isSuperadmin" = true
  WHERE "id" = (SELECT "id" FROM "User" WHERE "role" = 'ADMIN' ORDER BY "createdAt", "id" LIMIT 1)
    AND NOT EXISTS (SELECT 1 FROM "User" WHERE "isSuperadmin");

-- A new installation: the first account created, whichever way, becomes the
-- superadmin. The lock makes two concurrent first sign-ups take turns.
CREATE FUNCTION first_user_superadmin() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT NEW."isSuperadmin" THEN
    PERFORM pg_advisory_xact_lock(hashtext('first_user_superadmin'));
    IF NOT EXISTS (SELECT 1 FROM "User") THEN
      NEW."isSuperadmin" := true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "User_first_superadmin" BEFORE INSERT ON "User"
  FOR EACH ROW EXECUTE FUNCTION first_user_superadmin();
