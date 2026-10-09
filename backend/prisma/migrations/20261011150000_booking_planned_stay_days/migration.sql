-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "plannedStayDays" INTEGER;


ALTER TABLE "Booking" ADD CONSTRAINT "Booking_plannedStayDays" CHECK ("plannedStayDays" BETWEEN 1 AND 3660);
