-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('MINOR', 'MODERATE', 'SERIOUS', 'CRITICAL');

-- CreateTable
CREATE TABLE "DiveLog" (
    "id" TEXT NOT NULL,
    "logNumber" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "guideId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "entryTime" TIMESTAMP(3) NOT NULL,
    "exitTime" TIMESTAMP(3) NOT NULL,
    "maxDepth" INTEGER NOT NULL,
    "avgDepth" INTEGER,
    "duration" INTEGER NOT NULL,
    "visibility" INTEGER,
    "waterTemp" INTEGER,
    "weatherConditions" TEXT,
    "seaConditions" TEXT,
    "airStartBar" INTEGER,
    "airEndBar" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiveLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiveLogParticipant" (
    "id" TEXT NOT NULL,
    "diveLogId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'diver',

    CONSTRAINT "DiveLogParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiveLogSignature" (
    "id" TEXT NOT NULL,
    "diveLogId" TEXT NOT NULL,
    "signerType" TEXT NOT NULL,
    "signerId" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signatureData" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiveLogSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "diveLogId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "actionsTaken" TEXT NOT NULL,
    "reportedToAuthorities" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiveLog_logNumber_key" ON "DiveLog"("logNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DiveLog_bookingId_key" ON "DiveLog"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "DiveLogParticipant_diveLogId_customerId_key" ON "DiveLogParticipant"("diveLogId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Incident_diveLogId_key" ON "Incident"("diveLogId");

-- AddForeignKey
ALTER TABLE "DiveLog" ADD CONSTRAINT "DiveLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiveLog" ADD CONSTRAINT "DiveLog_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "DiveSite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiveLog" ADD CONSTRAINT "DiveLog_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiveLogParticipant" ADD CONSTRAINT "DiveLogParticipant_diveLogId_fkey" FOREIGN KEY ("diveLogId") REFERENCES "DiveLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiveLogParticipant" ADD CONSTRAINT "DiveLogParticipant_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiveLogSignature" ADD CONSTRAINT "DiveLogSignature_diveLogId_fkey" FOREIGN KEY ("diveLogId") REFERENCES "DiveLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_diveLogId_fkey" FOREIGN KEY ("diveLogId") REFERENCES "DiveLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
