-- CreateEnum
CREATE TYPE "BreachSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "BreachStatus" AS ENUM ('DETECTED', 'ASSESSED', 'REPORTED', 'RESOLVED');

-- CreateTable
CREATE TABLE "DataBreach" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "severity" "BreachSeverity" NOT NULL,
    "status" "BreachStatus" NOT NULL DEFAULT 'DETECTED',
    "description" TEXT NOT NULL,
    "affectedDataTypes" JSONB NOT NULL,
    "estimatedAffected" INTEGER,
    "reportedToAuthority" BOOLEAN NOT NULL DEFAULT false,
    "reportedAt" TIMESTAMP(3),
    "authorityReference" TEXT,
    "resolutionDetails" TEXT,
    "resolutionDate" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataBreach_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DataBreach_status_idx" ON "DataBreach"("status");

-- CreateIndex
CREATE INDEX "DataBreach_detectedAt_idx" ON "DataBreach"("detectedAt");

-- AddForeignKey
ALTER TABLE "DataBreach" ADD CONSTRAINT "DataBreach_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

