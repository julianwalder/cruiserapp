/*
  Warnings:

  - The values [TRAINING,PERSONAL,MAINTENANCE,OTHER] on the enum `FlightType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "FlightType_new" AS ENUM ('INVOICED', 'SCHOOL', 'FERRY', 'CHARTER', 'DEMO');
ALTER TABLE "flight_logs" ALTER COLUMN "flightType" TYPE "FlightType_new" USING ("flightType"::text::"FlightType_new");
ALTER TYPE "FlightType" RENAME TO "FlightType_old";
ALTER TYPE "FlightType_new" RENAME TO "FlightType";
DROP TYPE "FlightType_old";
COMMIT;
