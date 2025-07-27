/*
  Warnings:

  - You are about to drop the `aircraft` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "aircraft" DROP CONSTRAINT "aircraft_baseAirfieldId_fkey";

-- DropForeignKey
ALTER TABLE "aircraft" DROP CONSTRAINT "aircraft_createdById_fkey";

-- DropForeignKey
ALTER TABLE "fleet_management" DROP CONSTRAINT "fleet_management_aircraftId_fkey";

-- DropTable
DROP TABLE "aircraft";

-- CreateTable
CREATE TABLE "icaotype" (
    "id" TEXT NOT NULL,
    "registration" TEXT NOT NULL,
    "icaoTypeDesignator" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "description" TEXT,
    "engineType" "EngineType" NOT NULL,
    "engineCount" INTEGER NOT NULL DEFAULT 1,
    "wakeTurbulenceCategory" "WakeTurbulenceCategory" NOT NULL DEFAULT 'LIGHT',
    "yearOfManufacture" INTEGER,
    "totalFlightHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastMaintenance" TIMESTAMP(3),
    "nextMaintenance" TIMESTAMP(3),
    "status" "AircraftStatus" NOT NULL DEFAULT 'ACTIVE',
    "baseAirfieldId" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "purchasePrice" DOUBLE PRECISION,
    "insuranceExpiry" TIMESTAMP(3),
    "registrationExpiry" TIMESTAMP(3),
    "notes" TEXT,
    "isIcaoReference" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "icaotype_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "icaotype_registration_key" ON "icaotype"("registration");

-- AddForeignKey
ALTER TABLE "icaotype" ADD CONSTRAINT "icaotype_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icaotype" ADD CONSTRAINT "icaotype_baseAirfieldId_fkey" FOREIGN KEY ("baseAirfieldId") REFERENCES "airfields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_management" ADD CONSTRAINT "fleet_management_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "icaotype"("id") ON DELETE CASCADE ON UPDATE CASCADE;
