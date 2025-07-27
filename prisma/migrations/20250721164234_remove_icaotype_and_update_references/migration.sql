/*
  Warnings:

  - You are about to drop the `icaotype` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "fleet_management" DROP CONSTRAINT "fleet_management_aircraftId_fkey";

-- DropForeignKey
ALTER TABLE "icaotype" DROP CONSTRAINT "icaotype_baseAirfieldId_fkey";

-- DropForeignKey
ALTER TABLE "icaotype" DROP CONSTRAINT "icaotype_createdById_fkey";

-- DropTable
DROP TABLE "icaotype";

-- AddForeignKey
ALTER TABLE "fleet_management" ADD CONSTRAINT "fleet_management_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "icao_reference_type"("id") ON DELETE CASCADE ON UPDATE CASCADE;
