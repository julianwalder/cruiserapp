-- AlterTable
ALTER TABLE "flight_logs" ADD COLUMN     "arrivalHobbs" DOUBLE PRECISION,
ADD COLUMN     "departureHobbs" DOUBLE PRECISION,
ADD COLUMN     "fuelAdded" INTEGER DEFAULT 0,
ADD COLUMN     "oilAdded" INTEGER DEFAULT 0;
