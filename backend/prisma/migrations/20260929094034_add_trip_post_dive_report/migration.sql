-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "entryTime" VARCHAR(5),
ADD COLUMN     "exitTime" VARCHAR(5),
ADD COLUMN     "reportNotes" TEXT;

